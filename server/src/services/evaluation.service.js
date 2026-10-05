import Evaluation from '../models/Evaluation.js';
import TeachingAssignment from '../models/TeachingAssignment.js';
import SubjectConfiguration from '../models/SubjectConfiguration.js';
import GlobalScale from '../models/GlobalScale.js';
import AcademicYear from '../models/AcademicYear.js';
import AuditLog from '../models/AuditLog.js';
import { ROLES } from '../constants/roles.js';
import { EVALUATION_PERIOD, EVALUATION_TYPE } from '../constants/statuses.js';
import AppError from '../utils/AppError.js';

const ensureEvaluationAccess = async (evaluationId, requester) => {
   const evaluation =
      await Evaluation.findById(evaluationId).populate('assignment');

   if (!evaluation) throw new AppError('Évaluation introuvable.', 404);
   if (!evaluation.assignment) {
      throw new AppError('Affectation pédagogique introuvable.', 404);
   }
   if (
      requester.role === ROLES.ENSEIGNANT &&
      evaluation.assignment.teacher.toString() !== requester._id.toString()
   ) {
      throw new AppError('Cette évaluation ne vous est pas affectée.', 403);
   }

   return evaluation;
};

export const createEvaluation = async (data, creatorId) => {
   const type = data.type || EVALUATION_TYPE.NORMAL;
   if (!Object.values(EVALUATION_PERIOD).includes(data.period)) {
      throw new AppError(
         'Une évaluation doit appartenir au premier ou au deuxième module.',
         400
      );
   }

   const existingEvaluation = await Evaluation.exists({
      assignment: data.assignment,
      period: data.period,
      type,
   });
   if (existingEvaluation) {
      const moduleLabel =
         data.period === EVALUATION_PERIOD.MODULE_1 ? 'premier' : 'deuxième';
      const typeLabel =
         type === EVALUATION_TYPE.RETAKE
            ? 'rattrapage'
            : 'évaluation principale';
      throw new AppError(
         `Une ${typeLabel} existe déjà pour le ${moduleLabel} module de cette affectation.`,
         409
      );
   }
   if (type === EVALUATION_TYPE.RETAKE) {
      const mainEvaluation = await Evaluation.exists({
         assignment: data.assignment,
         period: data.period,
         type: EVALUATION_TYPE.NORMAL,
      });
      if (!mainEvaluation) {
         const moduleLabel =
            data.period === EVALUATION_PERIOD.MODULE_1 ? 'premier' : 'deuxième';
         throw new AppError(
            `Créez d’abord l’évaluation principale du ${moduleLabel} module avant son rattrapage.`,
            400
         );
      }
   }

   const assignment = await TeachingAssignment.findById(data.assignment);
   if (!assignment || !assignment.isActive) {
      throw new AppError('Affectation introuvable ou inactive.', 404);
   }

   const academicYear = await AcademicYear.findById(assignment.academicYear);
   if (!academicYear) throw new AppError('Année académique introuvable.', 404);
   if (academicYear.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }

   const schoolClass = await assignment.populate('class', 'level');
   if (!schoolClass.class) throw new AppError('Classe introuvable.', 404);

   const subjectConfiguration = await SubjectConfiguration.findOne({
      academicYear: assignment.academicYear,
      program: assignment.program,
      level: schoolClass.class.level,
      subject: assignment.subject,
   });

   if (!subjectConfiguration) {
      throw new AppError(
         'La matière n’est pas configurée pour cette classe.',
         400
      );
   }
   const globalSettings = await GlobalScale.findOne({ key: 'GLOBAL' });
   if (!globalSettings) {
      throw new AppError(
         'Les règles de résultats communes doivent être configurées avant la création d’une évaluation.',
         400
      );
   }

   const evaluation = await Evaluation.create({
      ...data,
      scale: globalSettings.resultScale,
      componentWeights: subjectConfiguration.calculationRules?.componentWeights,
      createdBy: creatorId,
   });
   try {
      await AuditLog.create({
         actor: creatorId,
         action: 'EVALUATION_CREATED',
         entityType: 'Evaluation',
         entityId: evaluation._id,
         newValue: {
            name: evaluation.name,
            type: evaluation.type,
            assignment: evaluation.assignment,
            period: evaluation.period,
            scale: evaluation.scale,
            weight: evaluation.weight,
         },
      });
   } catch (error) {
      await Evaluation.deleteOne({ _id: evaluation._id });
      throw error;
   }
   return evaluation;
};

export const getEvaluations = async (filters = {}, requester) => {
   const assignmentQuery = {};
   if (requester.role === ROLES.ENSEIGNANT) {
      assignmentQuery.teacher = requester._id;
   } else if (filters.assignment) {
      assignmentQuery._id = filters.assignment;
   }

   const assignments =
      await TeachingAssignment.find(assignmentQuery).select('_id');
   const query = { assignment: { $in: assignments.map(({ _id }) => _id) } };
   if (filters.type) query.type = filters.type;
   if (filters.status) query.status = filters.status;

   return Evaluation.find(query)
      .populate({
         path: 'assignment',
         populate: [
            { path: 'teacher', select: 'firstName lastName email' },
            { path: 'subject', select: 'name code' },
            { path: 'program', select: 'name code' },
            { path: 'class', select: 'name level' },
            { path: 'academicYear', select: 'label status' },
         ],
      })
      .sort({ createdAt: -1 });
};

export const getEvaluation = (evaluationId, requester) =>
   ensureEvaluationAccess(evaluationId, requester);

export const closeEvaluation = async (evaluationId, actorId) => {
   const evaluation = await Evaluation.findById(evaluationId);
   if (!evaluation) throw new AppError('Évaluation introuvable.', 404);
   if (evaluation.status === 'CLOSED') return evaluation;
   const assignment = await TeachingAssignment.findById(evaluation.assignment);
   if (!assignment)
      throw new AppError('Affectation pédagogique introuvable.', 404);
   const academicYear = await AcademicYear.findById(assignment.academicYear);
   if (!academicYear) throw new AppError('Année académique introuvable.', 404);
   if (academicYear.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }
   const oldValue = { status: evaluation.status };
   evaluation.status = 'CLOSED';
   const log = await AuditLog.create({
      actor: actorId,
      action: 'EVALUATION_CLOSED',
      entityType: 'Evaluation',
      entityId: evaluation._id,
      oldValue,
      newValue: { status: evaluation.status },
   });
   try {
      await evaluation.save();
   } catch (error) {
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }
   return evaluation;
};
