import Grade from '../models/Grade.js';
import Evaluation from '../models/Evaluation.js';
import Enrollment from '../models/Enrollment.js';
import TeachingAssignment from '../models/TeachingAssignment.js';
import AcademicYear from '../models/AcademicYear.js';
import AuditLog from '../models/AuditLog.js';
import { GRADE_STATUS } from '../constants/statuses.js';
import { ROLES } from '../constants/roles.js';
import AppError from '../utils/AppError.js';
import {
   canRequestGradeCorrection,
   canReviewGradeCorrectionRequest,
} from '../utils/gradePermissions.js';
import { calculateGradeScore } from '../utils/resultCalculations.js';

const GRADE_COMPONENTS = ['oral', 'written', 'composition'];

const componentsAreComplete = (components, weights) =>
   calculateGradeScore(components, weights) !== null;

const loadEvaluation = async (
   evaluationId,
   requester,
   requireTeacher = true
) => {
   const evaluation =
      await Evaluation.findById(evaluationId).populate('assignment');
   if (!evaluation) throw new AppError('Évaluation introuvable.', 404);
   if (!evaluation.assignment) {
      throw new AppError('Affectation pédagogique introuvable.', 404);
   }

   if (
      requireTeacher &&
      requester.role === ROLES.ENSEIGNANT &&
      evaluation.assignment.teacher.toString() !== requester._id.toString()
   ) {
      throw new AppError('Cette évaluation ne vous est pas affectée.', 403);
   }

   return evaluation;
};

const ensureEvaluationYearOpen = async (evaluation) => {
   const academicYear = await AcademicYear.findById(
      evaluation.assignment.academicYear
   );
   if (!academicYear) throw new AppError('Année académique introuvable.', 404);
   if (academicYear.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }
};

const writeAuditBeforeSave = async (
   grade,
   actorId,
   action,
   reason,
   oldValue,
   newValue
) => {
   const log = await AuditLog.create({
      actor: actorId,
      action,
      entityType: 'Grade',
      entityId: grade._id,
      oldValue,
      newValue,
      reason,
   });

   try {
      await grade.save();
   } catch (error) {
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }

   return grade;
};

export const getGradesForEvaluation = async (evaluationId, requester) => {
   await loadEvaluation(evaluationId, requester);
   return Grade.find({ evaluation: evaluationId })
      .populate({
         path: 'enrollment',
         populate: { path: 'student', select: 'matricule firstName lastName' },
      })
      .sort({ createdAt: 1 });
};

export const getEvaluationRoster = async (evaluationId, requester) => {
   const evaluation = await loadEvaluation(evaluationId, requester);
   const { assignment } = evaluation;
   if (!assignment.isActive) {
      throw new AppError('Cette affectation pédagogique est inactive.', 400);
   }
   const enrollments = await Enrollment.find({
      class: assignment.class,
      academicYear: assignment.academicYear,
      program: assignment.program,
      status: 'APPROVED',
   })
      .populate('student', 'matricule firstName lastName')
      .sort({ createdAt: 1 });

   const grades = await Grade.find({ evaluation: evaluationId });
   const gradesByEnrollment = new Map(
      grades.map((grade) => [grade.enrollment.toString(), grade])
   );

   return enrollments.map((enrollment) => {
      const grade = gradesByEnrollment.get(enrollment._id.toString());
      return {
         enrollment: enrollment._id,
         student: enrollment.student,
         grade: grade
            ? {
                 id: grade._id,
                 score: grade.score,
                 components: grade.components,
                 status: grade.status,
                 correctionReason: grade.correctionReason,
                 correctionRequest: grade.correctionRequests?.length
                    ? {
                         status: grade.correctionRequests.at(-1).status,
                         reason: grade.correctionRequests.at(-1).reason,
                         reviewReason:
                            grade.correctionRequests.at(-1).reviewReason,
                      }
                    : null,
              }
            : null,
      };
   });
};

export const saveDraftGrade = async (evaluationId, data, teacher) => {
   const evaluation = await loadEvaluation(evaluationId, teacher);
   await ensureEvaluationYearOpen(evaluation);
   if (teacher.role !== ROLES.ENSEIGNANT) {
      throw new AppError(
         'Seul l’enseignant affecté peut saisir une note.',
         403
      );
   }
   if (evaluation.status !== 'OPEN') {
      throw new AppError('Cette évaluation est fermée.', 400);
   }
   if (!evaluation.assignment.isActive) {
      throw new AppError('Cette affectation pédagogique est inactive.', 400);
   }
   const componentValues = GRADE_COMPONENTS.map(
      (component) => data.components?.[component]
   );
   if (
      componentValues.some(
         (value) => value !== null && value > evaluation.scale
      )
   ) {
      throw new AppError(
         `Chaque note doit être comprise entre 0 et ${evaluation.scale}.`,
         400
      );
   }

   const { assignment } = evaluation;
   const enrollment = await Enrollment.findOne({
      _id: data.enrollment,
      class: assignment.class,
      academicYear: assignment.academicYear,
      program: assignment.program,
      status: 'APPROVED',
   });
   if (!enrollment) {
      throw new AppError(
         'L’élève ne possède pas d’inscription approuvée dans cette classe.',
         404
      );
   }

   let grade = await Grade.findOne({
      evaluation: evaluationId,
      enrollment: enrollment._id,
   });
   if (
      grade &&
      ![GRADE_STATUS.DRAFT, GRADE_STATUS.NEEDS_CORRECTION].includes(
         grade.status
      )
   ) {
      throw new AppError(
         'Cette note ne peut plus être modifiée à ce stade.',
         400
      );
   }

   if (!grade) {
      grade = new Grade({
         evaluation: evaluationId,
         enrollment: enrollment._id,
      });
   }

   const oldValue = grade.isNew
      ? null
      : {
           score: grade.score,
           components: grade.components,
           status: grade.status,
        };
   grade.components = data.components;
   grade.score = calculateGradeScore(
      grade.components,
      evaluation.componentWeights
   );
   return writeAuditBeforeSave(
      grade,
      teacher._id,
      oldValue ? 'GRADE_DRAFT_UPDATED' : 'GRADE_DRAFT_CREATED',
      '',
      oldValue,
      { score: grade.score, components: grade.components, status: grade.status }
   );
};

export const submitEvaluationGrades = async (evaluationId, teacher) => {
   const evaluation = await loadEvaluation(evaluationId, teacher);
   await ensureEvaluationYearOpen(evaluation);
   if (teacher.role !== ROLES.ENSEIGNANT) {
      throw new AppError(
         'Seul l’enseignant affecté peut soumettre les notes.',
         403
      );
   }
   if (evaluation.status !== 'OPEN') {
      throw new AppError('Cette évaluation est fermée.', 400);
   }
   if (!evaluation.assignment.isActive) {
      throw new AppError('Cette affectation pédagogique est inactive.', 400);
   }

   const approvedEnrollments = await Enrollment.find({
      class: evaluation.assignment.class,
      academicYear: evaluation.assignment.academicYear,
      program: evaluation.assignment.program,
      status: 'APPROVED',
   }).select('_id');
   const evaluationGrades = await Grade.find({ evaluation: evaluationId });
   const gradesByEnrollment = new Map(
      evaluationGrades.map((grade) => [grade.enrollment.toString(), grade])
   );
   const incompleteCount = approvedEnrollments.filter(
      (enrollment) =>
         !componentsAreComplete(
            gradesByEnrollment.get(enrollment._id.toString())?.components,
            evaluation.componentWeights
         )
   ).length;
   if (incompleteCount) {
      throw new AppError(
         `Complétez les trois notes pour les ${incompleteCount} élève(s) restant(s) avant la soumission.`,
         400
      );
   }

   const drafts = await Grade.find({
      evaluation: evaluationId,
      status: { $in: [GRADE_STATUS.DRAFT, GRADE_STATUS.NEEDS_CORRECTION] },
      score: { $ne: null },
   });

   if (!drafts.length) {
      throw new AppError('Aucune note renseignée à soumettre.', 400);
   }

   for (const grade of drafts) {
      const oldValue = {
         score: grade.score,
         components: grade.components,
         status: grade.status,
      };
      grade.status = GRADE_STATUS.SUBMITTED;
      grade.submittedAt = new Date();
      grade.reviewedBy = null;
      grade.reviewedAt = null;
      grade.correctionReason = '';
      await writeAuditBeforeSave(
         grade,
         teacher._id,
         'GRADE_SUBMITTED',
         '',
         oldValue,
         {
            score: grade.score,
            components: grade.components,
            status: grade.status,
         }
      );
   }

   return Grade.find({ evaluation: evaluationId }).populate('enrollment');
};

export const reviewGrade = async (gradeId, decision, reason, reviewerId) => {
   const grade = await Grade.findById(gradeId);
   if (!grade) throw new AppError('Note introuvable.', 404);
   if (grade.status !== GRADE_STATUS.SUBMITTED) {
      throw new AppError('Seule une note soumise peut être contrôlée.', 400);
   }
   const evaluation = await loadEvaluation(
      grade.evaluation,
      {
         _id: reviewerId,
         role: ROLES.DIRECTEUR_ETUDES,
      },
      false
   );
   await ensureEvaluationYearOpen(evaluation);
   if (
      ![GRADE_STATUS.VALIDATED, GRADE_STATUS.NEEDS_CORRECTION].includes(
         decision
      )
   ) {
      throw new AppError('La décision de contrôle est invalide.', 400);
   }
   if (decision === GRADE_STATUS.NEEDS_CORRECTION && !reason?.trim()) {
      throw new AppError(
         'La raison du retour en correction est obligatoire.',
         400
      );
   }

   const oldValue = {
      score: grade.score,
      components: grade.components,
      status: grade.status,
   };
   grade.status = decision;
   grade.reviewedBy = reviewerId;
   grade.reviewedAt = new Date();
   grade.correctionReason =
      decision === GRADE_STATUS.NEEDS_CORRECTION ? reason.trim() : '';
   if (decision === GRADE_STATUS.VALIDATED) grade.lockedAt = null;

   return writeAuditBeforeSave(
      grade,
      reviewerId,
      decision === GRADE_STATUS.VALIDATED
         ? 'GRADE_VALIDATED'
         : 'GRADE_RETURNED',
      reason || '',
      oldValue,
      { score: grade.score, components: grade.components, status: grade.status }
   );
};

export const lockGrade = async (gradeId, actorId) => {
   const grade = await Grade.findById(gradeId);
   if (!grade) throw new AppError('Note introuvable.', 404);
   if (grade.status !== GRADE_STATUS.VALIDATED) {
      throw new AppError('Seule une note validée peut être verrouillée.', 400);
   }
   const evaluation = await loadEvaluation(
      grade.evaluation,
      {
         _id: actorId,
         role: ROLES.DIRECTEUR_ETUDES,
      },
      false
   );
   await ensureEvaluationYearOpen(evaluation);

   const oldValue = {
      score: grade.score,
      components: grade.components,
      status: grade.status,
   };
   grade.status = GRADE_STATUS.LOCKED;
   grade.lockedAt = new Date();

   return writeAuditBeforeSave(grade, actorId, 'GRADE_LOCKED', '', oldValue, {
      score: grade.score,
      components: grade.components,
      status: grade.status,
   });
};

export const requestGradeCorrection = async (gradeId, reason, requester) => {
   if (!canRequestGradeCorrection(requester.role)) {
      throw new AppError(
         'Seul un Directeur des études peut demander une correction.',
         403
      );
   }
   if (!reason?.trim()) {
      throw new AppError('Le motif de la demande est obligatoire.', 400);
   }

   const grade = await Grade.findById(gradeId);
   if (!grade) throw new AppError('Note introuvable.', 404);
   if (grade.status !== GRADE_STATUS.LOCKED) {
      throw new AppError(
         'Seule une note verrouillée peut être contestée.',
         400
      );
   }
   if (
      grade.correctionRequests.some((request) => request.status === 'PENDING')
   ) {
      throw new AppError('Une demande de correction est déjà en attente.', 409);
   }

   const evaluation = await loadEvaluation(grade.evaluation, requester);
   await ensureEvaluationYearOpen(evaluation);
   if (evaluation.status !== 'OPEN') {
      throw new AppError(
         'Une correction ne peut pas être demandée pour une évaluation clôturée.',
         400
      );
   }
   if (!evaluation.assignment.isActive) {
      throw new AppError(
         'Une correction ne peut pas être demandée pour une affectation inactive.',
         400
      );
   }

   const oldValue = {
      status: grade.status,
      correctionRequests: grade.correctionRequests.length,
   };
   grade.correctionRequests.push({
      requestedBy: requester._id,
      reason: reason.trim(),
   });
   const request = grade.correctionRequests.at(-1);

   return writeAuditBeforeSave(
      grade,
      requester._id,
      'GRADE_CORRECTION_REQUESTED',
      reason.trim(),
      oldValue,
      {
         status: grade.status,
         correctionRequest: request.toObject(),
      }
   );
};

export const getPendingGradeCorrectionRequests = async (requester) => {
   if (!canReviewGradeCorrectionRequest(requester.role)) {
      throw new AppError('Seul un ADMIN peut traiter ces demandes.', 403);
   }

   const grades = await Grade.find({
      correctionRequests: { $elemMatch: { status: 'PENDING' } },
   })
      .populate({
         path: 'evaluation',
         populate: {
            path: 'assignment',
            populate: [
               { path: 'teacher', select: 'firstName lastName email' },
               { path: 'subject', select: 'name code' },
               { path: 'class', select: 'name level' },
               { path: 'academicYear', select: 'label status' },
               { path: 'program', select: 'name code' },
            ],
         },
      })
      .populate({
         path: 'enrollment',
         populate: { path: 'student', select: 'matricule firstName lastName' },
      })
      .populate('correctionRequests.requestedBy', 'firstName lastName email')
      .sort({ updatedAt: 1 });

   return grades.flatMap((grade) =>
      grade.correctionRequests
         .filter((request) => request.status === 'PENDING')
         .map((request) => ({
            _id: request._id,
            reason: request.reason,
            requestedAt: request.requestedAt,
            requestedBy: request.requestedBy,
            grade,
         }))
   );
};

export const reviewGradeCorrectionRequest = async (
   gradeId,
   requestId,
   decision,
   reviewReason,
   reviewer
) => {
   if (!canReviewGradeCorrectionRequest(reviewer.role)) {
      throw new AppError('Seul un ADMIN peut traiter ces demandes.', 403);
   }
   if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new AppError('La décision de correction est invalide.', 400);
   }
   if (decision === 'REJECTED' && !reviewReason?.trim()) {
      throw new AppError('Le motif du refus est obligatoire.', 400);
   }

   const grade = await Grade.findById(gradeId);
   if (!grade) throw new AppError('Note introuvable.', 404);
   const correctionRequest = grade.correctionRequests.id(requestId);
   if (!correctionRequest || correctionRequest.status !== 'PENDING') {
      throw new AppError('Demande de correction en attente introuvable.', 404);
   }
   if (grade.status !== GRADE_STATUS.LOCKED) {
      throw new AppError('La note concernée n’est plus verrouillée.', 409);
   }

   if (decision === 'APPROVED') {
      const evaluation = await loadEvaluation(
         grade.evaluation,
         reviewer,
         false
      );
      await ensureEvaluationYearOpen(evaluation);
      if (evaluation.status !== 'OPEN') {
         throw new AppError(
            'Une note d’évaluation clôturée ne peut pas être rouverte.',
            400
         );
      }
      if (!evaluation.assignment.isActive) {
         throw new AppError(
            'Une note d’affectation inactive ne peut pas être rouverte.',
            400
         );
      }
   }

   const oldValue = {
      status: grade.status,
      correctionRequest: correctionRequest.toObject(),
   };
   correctionRequest.status = decision;
   correctionRequest.reviewedBy = reviewer._id;
   correctionRequest.reviewedAt = new Date();
   correctionRequest.reviewReason = reviewReason?.trim() || '';
   if (decision === 'APPROVED') {
      grade.status = GRADE_STATUS.NEEDS_CORRECTION;
      grade.lockedAt = null;
      grade.correctionReason = correctionRequest.reason;
      grade.reviewedBy = null;
      grade.reviewedAt = null;
   }

   return writeAuditBeforeSave(
      grade,
      reviewer._id,
      `GRADE_CORRECTION_${decision}`,
      reviewReason?.trim() || correctionRequest.reason,
      oldValue,
      {
         status: grade.status,
         correctionRequest: correctionRequest.toObject(),
      }
   );
};
