import mongoose from 'mongoose';
import GlobalScale from '../models/GlobalScale.js';
import AcademicYear from '../models/AcademicYear.js';
import Enrollment from '../models/Enrollment.js';
import Grade from '../models/Grade.js';
import SchoolClass from '../models/Class.js';
import SubjectConfiguration from '../models/SubjectConfiguration.js';
import TeachingAssignment from '../models/TeachingAssignment.js';
import Evaluation from '../models/Evaluation.js';
import Student from '../models/Student.js';
import {
   EVALUATION_PERIOD,
   EVALUATION_TYPE,
   GRADE_STATUS,
   RESULT_DECISION,
   RESULT_STATUS,
} from '../constants/statuses.js';
import { ROLES } from '../constants/roles.js';
import AppError from '../utils/AppError.js';
import {
   calculateModuleAverages,
   calculateOverallAverage,
   calculateRetakeAdjustedAverage,
} from '../utils/resultCalculations.js';
import { lockGrade, reviewGrade } from './grade.service.js';

const FINAL_GRADE_STATUSES = [GRADE_STATUS.VALIDATED, GRADE_STATUS.LOCKED];

const getStudentAcademicYearIds = async (requestedYearId) => {
   const [activeYear, latestClosedYear, latestYear, requestedYear] =
      await Promise.all([
         AcademicYear.findOne({ status: 'ACTIVE' }).select('label'),
         AcademicYear.findOne({ status: 'CLOSED' })
            .sort({ label: -1 })
            .select('label'),
         AcademicYear.findOne().sort({ label: -1 }).select('label'),
         requestedYearId
            ? AcademicYear.findById(requestedYearId).select('label')
            : null,
      ]);

   if (requestedYearId && !requestedYear) {
      throw new AppError('Année scolaire introuvable.', 404);
   }

   const currentYear = activeYear || latestClosedYear || latestYear;
   if (!currentYear) return [];

   const cutoffLabel =
      requestedYear && requestedYear.label < currentYear.label
         ? requestedYear.label
         : currentYear.label;

   return AcademicYear.find({
      status: { $in: ['ACTIVE', 'CLOSED'] },
      label: { $lte: cutoffLabel },
   }).distinct('_id');
};

const calculateEnrollmentResult = async (enrollment) => {
   const classId = enrollment.class?._id ?? enrollment.class;
   const academicYearId =
      enrollment.academicYear?._id ?? enrollment.academicYear;
   const programId = enrollment.program?._id ?? enrollment.program;
   const schoolClass = await SchoolClass.findById(classId);
   if (!schoolClass) throw new AppError('Classe introuvable.', 404);

   const [globalSettings, configurations, assignments] = await Promise.all([
      GlobalScale.findOne({ key: 'GLOBAL' }),
      SubjectConfiguration.find({
         academicYear: academicYearId,
         program: programId,
         level: schoolClass.level,
      }).populate('subject', 'name code'),
      TeachingAssignment.find({
         academicYear: academicYearId,
         program: programId,
         class: schoolClass._id,
      }),
   ]);

   const reasons = [];
   if (!globalSettings) reasons.push('GLOBAL_SETTINGS_MISSING');
   if (
      globalSettings &&
      !['ARITHMETIC_MEAN', 'WEIGHTED_MEAN'].includes(
         globalSettings.calculationRules?.overallMethod
      )
   ) {
      reasons.push('UNSUPPORTED_OVERALL_RULE');
   }
   if (!configurations.length) reasons.push('SUBJECT_CONFIGURATION_MISSING');

   const assignmentIds = assignments.map(({ _id }) => _id);
   const evaluations = assignmentIds.length
      ? await Evaluation.find({ assignment: { $in: assignmentIds } })
      : [];
   const evaluationIds = evaluations.map(({ _id }) => _id);
   const grades = evaluationIds.length
      ? await Grade.find({
           enrollment: enrollment._id,
           evaluation: { $in: evaluationIds },
        })
      : [];

   const assignmentById = new Map(
      assignments.map((assignment) => [assignment._id.toString(), assignment])
   );
   const gradeByEvaluationId = new Map(
      grades.map((grade) => [grade.evaluation.toString(), grade])
   );
   const retakeScores = [];

   const subjects = configurations.map((configuration) => {
      const subjectId = configuration.subject?._id ?? configuration.subject;
      const subjectAssignments = assignments.filter(
         (assignment) => assignment.subject.toString() === subjectId.toString()
      );
      const subjectEvaluations = evaluations.filter(
         (evaluation) =>
            assignmentById
               .get(evaluation.assignment.toString())
               ?.subject.toString() === subjectId.toString()
      );
      const normalEvaluations = subjectEvaluations.filter(
         (evaluation) => evaluation.type === EVALUATION_TYPE.NORMAL
      );
      const retakeEvaluations = subjectEvaluations.filter(
         (evaluation) => evaluation.type === EVALUATION_TYPE.RETAKE
      );

      if (!subjectAssignments.length || !normalEvaluations.length) {
         reasons.push(`NO_EVALUATIONS:${subjectId}`);
      }
      const moduleEvaluations = Object.values(EVALUATION_PERIOD).map((period) =>
         normalEvaluations.find((evaluation) => evaluation.period === period)
      );
      moduleEvaluations.forEach((evaluation, index) => {
         if (!evaluation)
            reasons.push(`MODULE_EVALUATION_MISSING:${subjectId}:${index + 1}`);
      });

      const method = configuration.calculationRules?.evaluationMethod;
      if (!['ARITHMETIC_MEAN', 'WEIGHTED_MEAN'].includes(method)) {
         reasons.push(`UNSUPPORTED_SUBJECT_RULE:${subjectId}`);
      }

      const entries = moduleEvaluations.filter(Boolean).map((evaluation) => {
         const grade = gradeByEvaluationId.get(evaluation._id.toString());
         const componentsComplete = Boolean(
            grade &&
            ['oral', 'written', 'composition'].every((component) =>
               Number.isFinite(grade.components?.[component])
            )
         );
         const entered = Boolean(
            componentsComplete && Number.isFinite(grade?.score)
         );
         const validated = Boolean(
            entered && FINAL_GRADE_STATUSES.includes(grade.status)
         );

         if (!entered) reasons.push(`GRADE_MISSING:${evaluation._id}`);
         else if (!validated)
            reasons.push(`GRADE_NOT_VALIDATED:${evaluation._id}`);

         return {
            evaluation: evaluation._id,
            score: entered ? grade.score : null,
            components: grade?.components ?? {
               oral: null,
               written: null,
               composition: null,
            },
            weight: evaluation.weight,
            status: grade?.status ?? 'NOT_ENTERED',
            period: evaluation.period,
         };
      });

      let average = null;
      const gradedEntries = entries.filter((entry) =>
         Number.isFinite(entry.score)
      );
      if (
         gradedEntries.length &&
         ['ARITHMETIC_MEAN', 'WEIGHTED_MEAN'].includes(method)
      ) {
         const totalWeight = gradedEntries.reduce(
            (sum, entry) =>
               sum + (method === 'WEIGHTED_MEAN' ? entry.weight : 1),
            0
         );
         average =
            gradedEntries.reduce(
               (sum, entry) =>
                  sum +
                  entry.score * (method === 'WEIGHTED_MEAN' ? entry.weight : 1),
               0
            ) / totalWeight;
      }

      retakeEvaluations.forEach((evaluation) => {
         const grade = gradeByEvaluationId.get(evaluation._id.toString());
         const componentsComplete = Boolean(
            grade &&
            ['oral', 'written', 'composition'].every((component) =>
               Number.isFinite(grade.components?.[component])
            )
         );
         const entered = Boolean(
            componentsComplete && Number.isFinite(grade?.score)
         );
         const validated = Boolean(
            entered && FINAL_GRADE_STATUSES.includes(grade.status)
         );

         if (!entered) reasons.push(`RETAKE_GRADE_MISSING:${evaluation._id}`);
         else if (!validated)
            reasons.push(`RETAKE_GRADE_NOT_VALIDATED:${evaluation._id}`);
         else retakeScores.push(grade.score);
      });

      const normalizedAverage =
         average === null || !globalSettings ? null : average;

      const moduleSummary = Object.fromEntries(
         Object.values(EVALUATION_PERIOD).map((period) => {
            const periodEntries = entries.filter(
               (entry) => entry.period === period
            );
            const values = periodEntries
               .map((entry) => entry.score)
               .filter((score) => Number.isFinite(score));
            return [
               period,
               values.length
                  ? values.reduce((sum, value) => sum + value, 0) /
                    values.length
                  : null,
            ];
         })
      );

      return {
         subject: configuration.subject,
         coefficient: configuration.coefficient,
         scale: globalSettings?.resultScale ?? null,
         average,
         normalizedAverage,
         evaluations: entries,
         retakeEvaluations: retakeEvaluations.map((item) => item._id),
         moduleSummary,
      };
   });

   const validSettings = globalSettings && configurations.length > 0;
   const unsupportedRules = reasons.some(
      (reason) =>
         reason === 'UNSUPPORTED_OVERALL_RULE' ||
         reason === 'SUBJECT_CONFIGURATION_MISSING' ||
         reason.startsWith('UNSUPPORTED_SUBJECT_RULE:')
   );
   const overallAverage =
      validSettings && !unsupportedRules
         ? calculateOverallAverage(
              subjects,
              globalSettings.calculationRules?.overallMethod
           )
         : null;
   const average = calculateRetakeAdjustedAverage(overallAverage, retakeScores);
   const moduleSummary = calculateModuleAverages(
      subjects,
      globalSettings?.resultScale
   );
   const status = reasons.length
      ? RESULT_STATUS.PROVISIONAL
      : RESULT_STATUS.FINAL;

   return {
      enrollment: enrollment._id,
      student: enrollment.student,
      academicYear: enrollment.academicYear,
      program: enrollment.program,
      class: enrollment.class,
      scale: globalSettings?.resultScale ?? null,
      average,
      modules: moduleSummary,
      decision:
         status === RESULT_STATUS.FINAL && average !== null
            ? average >= globalSettings.admissionThreshold
               ? RESULT_DECISION.ADMIS
               : RESULT_DECISION.NON_ADMIS
            : null,
      status,
      reasons: [...new Set(reasons)],
      subjects,
   };
};

const getApprovedEnrollment = async (enrollmentId, requester) => {
   const enrollment = await Enrollment.findById(enrollmentId)
      .populate('student', 'matricule firstName lastName user')
      .populate('academicYear', 'label status')
      .populate('program', 'name code')
      .populate('class', 'name level');

   if (!enrollment || enrollment.status !== 'APPROVED') {
      throw new AppError('Inscription approuvée introuvable.', 404);
   }

   if (
      requester.role === ROLES.ELEVE &&
      enrollment.student.user?.toString() !== requester._id.toString()
   ) {
      throw new AppError(
         'Vous ne pouvez consulter que vos propres résultats.',
         403
      );
   }

   if (requester.role === ROLES.ELEVE) {
      const allowedYearIds = await getStudentAcademicYearIds();
      const enrollmentYearId =
         enrollment.academicYear?._id ?? enrollment.academicYear;
      if (
         !allowedYearIds.some(
            (yearId) => yearId.toString() === enrollmentYearId.toString()
         )
      ) {
         throw new AppError(
            'Vous ne pouvez consulter que vos résultats de l’année actuelle et des années précédentes.',
            403
         );
      }
   }

   if (requester.role === ROLES.ENSEIGNANT) {
      const assignments = await TeachingAssignment.find({
         teacher: requester._id,
         class: enrollment.class?._id ?? enrollment.class,
         academicYear: enrollment.academicYear?._id ?? enrollment.academicYear,
         program: enrollment.program?._id ?? enrollment.program,
      }).select('_id');
      const evaluationIds = await Evaluation.distinct('_id', {
         assignment: { $in: assignments.map(({ _id }) => _id) },
      });
      const hasGrade = evaluationIds.length
         ? await Grade.exists({
              evaluation: { $in: evaluationIds },
              score: { $ne: null },
           })
         : false;
      if (!hasGrade) {
         throw new AppError(
            'Vous ne pouvez consulter que les classes dans lesquelles vous avez saisi au moins une note.',
            403
         );
      }
   }

   return enrollment;
};

export const getResultForEnrollment = async (enrollmentId, requester) => {
   if (!mongoose.isValidObjectId(enrollmentId)) {
      throw new AppError('L’identifiant de l’inscription est invalide.', 400);
   }
   const enrollment = await getApprovedEnrollment(enrollmentId, requester);
   return calculateEnrollmentResult(enrollment);
};

export const getMyResults = async (requester, academicYearId) => {
   const student = await Student.findOne({ user: requester._id });
   if (!student) throw new AppError('Profil élève introuvable.', 404);

   const allowedYearIds = await getStudentAcademicYearIds(academicYearId);
   const query = {
      student: student._id,
      status: 'APPROVED',
      academicYear: { $in: allowedYearIds },
   };
   const enrollments = await Enrollment.find(query)
      .populate('student', 'matricule firstName lastName')
      .populate('academicYear', 'label status')
      .populate('program', 'name code')
      .populate('class', 'name level')
      .sort({ createdAt: -1 });

   const results = await Promise.all(
      enrollments.map((enrollment) => calculateEnrollmentResult(enrollment))
   );
   return results.sort((first, second) =>
      (second.academicYear?.label || '').localeCompare(
         first.academicYear?.label || '',
         'fr',
         { numeric: true }
      )
   );
};

export const getTeacherClassResults = async (requester, academicYearId) => {
   if (requester.role !== ROLES.ENSEIGNANT) {
      throw new AppError(
         'Cette consultation est réservée aux enseignants.',
         403
      );
   }

   const assignmentQuery = { teacher: requester._id };
   if (academicYearId) assignmentQuery.academicYear = academicYearId;
   const assignments =
      await TeachingAssignment.find(assignmentQuery).select('_id');
   if (!assignments.length) return [];

   const evaluationIds = await Evaluation.distinct('_id', {
      assignment: { $in: assignments.map(({ _id }) => _id) },
   });
   if (!evaluationIds.length) return [];

   const gradedEnrollmentIds = await Grade.distinct('enrollment', {
      evaluation: { $in: evaluationIds },
      score: { $ne: null },
   });
   if (!gradedEnrollmentIds.length) return [];

   const gradedEnrollments = await Enrollment.find({
      _id: { $in: gradedEnrollmentIds },
      status: 'APPROVED',
   }).select('class academicYear program');
   const scopes = new Map();
   gradedEnrollments.forEach((enrollment) => {
      const scope = {
         class: enrollment.class,
         academicYear: enrollment.academicYear,
         program: enrollment.program,
      };
      scopes.set(
         `${scope.class}:${scope.academicYear}:${scope.program}`,
         scope
      );
   });
   if (!scopes.size) return [];

   const enrollments = await Enrollment.find({
      status: 'APPROVED',
      $or: [...scopes.values()],
   })
      .populate('student', 'matricule firstName lastName')
      .populate('academicYear', 'label status')
      .populate('program', 'name code')
      .populate('class', 'name level');

   return Promise.all(
      enrollments.map((enrollment) => calculateEnrollmentResult(enrollment))
   );
};

export const finalizeResults = async (
   requester,
   { academicYearId, classId }
) => {
   if (requester.role !== ROLES.DIRECTEUR_ETUDES) {
      throw new AppError(
         'Seul le directeur des études peut finaliser les résultats.',
         403
      );
   }
   if (!mongoose.isValidObjectId(academicYearId)) {
      throw new AppError(
         "L'identifiant de l'année académique est invalide.",
         400
      );
   }
   if (classId && !mongoose.isValidObjectId(classId)) {
      throw new AppError("L'identifiant de la classe est invalide.", 400);
   }

   const academicYear = await AcademicYear.findById(academicYearId);
   if (!academicYear) throw new AppError('Année académique introuvable.', 404);
   if (academicYear.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }

   const enrollmentQuery = {
      academicYear: academicYear._id,
      status: 'APPROVED',
   };
   if (classId) enrollmentQuery.class = classId;
   const enrollments = await Enrollment.find(enrollmentQuery)
      .populate('student', 'matricule firstName lastName')
      .populate('academicYear', 'label status')
      .populate('program', 'name code')
      .populate('class', 'name level');

   if (!enrollments.length) {
      throw new AppError(
         'Aucune inscription approuvée dans cette sélection.',
         404
      );
   }

   const currentResults = await Promise.all(
      enrollments.map((enrollment) => calculateEnrollmentResult(enrollment))
   );
   const blockingReasons = currentResults.flatMap((result) =>
      result.reasons.filter(
         (reason) => !reason.startsWith('GRADE_NOT_VALIDATED:')
      )
   );
   if (blockingReasons.length) {
      throw new AppError(
         'Finalisation impossible : des notes sont manquantes ou en correction, ou des règles de calcul ne sont pas configurées.',
         400
      );
   }

   const enrollmentIds = enrollments.map(({ _id }) => _id);
   const classIds = [
      ...new Set(enrollments.map(({ class: item }) => item._id.toString())),
   ];
   const assignments = await TeachingAssignment.find({
      academicYear: academicYear._id,
      class: { $in: classIds },
   }).select('_id');
   const evaluationIds = assignments.length
      ? await Evaluation.distinct('_id', {
           assignment: { $in: assignments.map(({ _id }) => _id) },
        })
      : [];
   const grades = evaluationIds.length
      ? await Grade.find({
           enrollment: { $in: enrollmentIds },
           evaluation: { $in: evaluationIds },
        })
      : [];
   const allowedStatuses = [
      GRADE_STATUS.SUBMITTED,
      GRADE_STATUS.VALIDATED,
      GRADE_STATUS.LOCKED,
   ];
   if (
      !grades.length ||
      grades.some((grade) => !allowedStatuses.includes(grade.status))
   ) {
      throw new AppError(
         'Finalisation impossible : toutes les notes doivent être soumises et complètes.',
         400
      );
   }

   let updatedGrades = 0;
   for (const grade of grades) {
      if (grade.status === GRADE_STATUS.SUBMITTED) {
         await reviewGrade(
            grade._id,
            GRADE_STATUS.VALIDATED,
            '',
            requester._id
         );
         await lockGrade(grade._id, requester._id);
         updatedGrades += 1;
      } else if (grade.status === GRADE_STATUS.VALIDATED) {
         await lockGrade(grade._id, requester._id);
         updatedGrades += 1;
      }
   }

   return {
      updatedGrades,
      finalResults: currentResults.length,
   };
};
