import Subject from '../models/Subject.js';
import SubjectConfiguration from '../models/SubjectConfiguration.js';
import GlobalScale from '../models/GlobalScale.js';
import AcademicYear from '../models/AcademicYear.js';
import Program from '../models/Program.js';
import SchoolClass from '../models/Class.js';
import TeachingAssignment from '../models/TeachingAssignment.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/statuses.js';
import AppError from '../utils/AppError.js';

export const getSubjects = async () => Subject.find().sort({ name: 1 });

export const createSubject = async (data, actorId) => {
   const { configuration: configurationData, ...subjectData } = data;
   const subject = await Subject.create(subjectData);
   let subjectLog;
   try {
      subjectLog = await AuditLog.create({
         actor: actorId,
         action: 'SUBJECT_CREATED',
         entityType: 'Subject',
         entityId: subject._id,
         newValue: {
            name: subject.name,
            code: subject.code,
            isActive: subject.isActive,
         },
      });
      await saveSubjectConfiguration(
         { ...configurationData, subject: subject._id },
         actorId
      );
   } catch (error) {
      await AuditLog.deleteOne({ _id: subjectLog?._id });
      await Subject.deleteOne({ _id: subject._id });
      throw error;
   }
   return subject;
};

export const updateSubject = async (subjectId, data, actorId) => {
   const subject = await Subject.findById(subjectId);
   if (!subject) throw new AppError('Matière introuvable.', 404);

   const oldValue = {
      name: subject.name,
      code: subject.code,
      description: subject.description,
      isActive: subject.isActive,
   };
   Object.assign(subject, data);
   const log = await AuditLog.create({
      actor: actorId,
      action: 'SUBJECT_UPDATED',
      entityType: 'Subject',
      entityId: subject._id,
      oldValue,
      newValue: {
         name: subject.name,
         code: subject.code,
         description: subject.description,
         isActive: subject.isActive,
      },
   });
   try {
      await subject.save();
   } catch (error) {
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }
   return subject;
};

export const getSubjectConfigurations = async (filters = {}) => {
   const query = {};
   for (const field of ['academicYear', 'program', 'level', 'subject']) {
      if (filters[field]) query[field] = filters[field];
   }

   return SubjectConfiguration.find(query)
      .populate('academicYear', 'label status')
      .populate('program', 'name code')
      .populate('subject', 'name code')
      .sort({ level: 1, subject: 1 });
};

const saveSubjectConfiguration = async (data, actorId) => {
   const [academicYear, program, subject, matchingClasses] = await Promise.all([
      AcademicYear.findById(data.academicYear),
      Program.findById(data.program),
      Subject.findById(data.subject),
      SchoolClass.find({
         academicYear: data.academicYear,
         program: data.program,
         level: data.level,
      }).select('_id isActive'),
   ]);

   if (!data.module || !['MODULE_1', 'MODULE_2'].includes(data.module)) {
      throw new AppError(
         'Le module est obligatoire et doit être MODULE_1 ou MODULE_2.',
         400
      );
   }

   if (!academicYear) throw new AppError('Année académique introuvable.', 404);
   if (academicYear.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }
   if (!program || !program.isActive) {
      throw new AppError('Programme introuvable ou inactif.', 404);
   }
   if (!subject || !subject.isActive) {
      throw new AppError('Matière introuvable ou inactive.', 404);
   }
   if (!matchingClasses.some((schoolClass) => schoolClass.isActive)) {
      throw new AppError(
         'Aucune classe active ne correspond à ce niveau.',
         400
      );
   }
   const globalSettings = await GlobalScale.exists({ key: 'GLOBAL' });
   if (!globalSettings) {
      throw new AppError(
         'Configurez d’abord les règles de résultats communes à tout l’établissement.',
         400
      );
   }

   let configuration = await SubjectConfiguration.findOne({
      academicYear: data.academicYear,
      program: data.program,
      level: data.level,
      subject: data.subject,
   });
   const existingModuleConfiguration = await SubjectConfiguration.findOne({
      academicYear: data.academicYear,
      program: data.program,
      level: data.level,
      subject: data.subject,
      module: { $ne: data.module },
   });
   if (existingModuleConfiguration && !configuration) {
      throw new AppError(
         'Une matière ne peut pas être configurée dans les deux modules pour le même niveau.',
         409
      );
   }
   const oldValue = configuration ? configuration.toObject() : null;

   const created = !configuration;
   if (!configuration) configuration = new SubjectConfiguration(data);
   else Object.assign(configuration, data);

   const log = await AuditLog.create({
      actor: actorId,
      action: created
         ? 'SUBJECT_CONFIGURATION_CREATED'
         : 'SUBJECT_CONFIGURATION_UPDATED',
      entityType: 'SubjectConfiguration',
      entityId: configuration._id,
      oldValue,
      newValue: data,
   });
   try {
      await configuration.save();
   } catch (error) {
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }
   return configuration;
};

export const getTeachingAssignments = async (filters = {}, requester) => {
   const query = {};
   if (requester.role === ROLES.ENSEIGNANT) {
      query.teacher = requester._id;
   } else {
      for (const field of [
         'teacher',
         'subject',
         'program',
         'class',
         'academicYear',
      ]) {
         if (filters[field]) query[field] = filters[field];
      }
   }

   return TeachingAssignment.find(query)
      .populate('teacher', 'firstName lastName email role')
      .populate('subject', 'name code')
      .populate('program', 'name code')
      .populate('class', 'name level')
      .populate('academicYear', 'label status')
      .sort({ createdAt: -1 });
};

export const createTeachingAssignment = async (data, actorId) => {
   const [teacher, subject, program, schoolClass, academicYear] =
      await Promise.all([
         User.findById(data.teacher),
         Subject.findById(data.subject),
         Program.findById(data.program),
         SchoolClass.findById(data.class),
         AcademicYear.findById(data.academicYear),
      ]);

   if (!teacher || teacher.role !== ROLES.ENSEIGNANT) {
      throw new AppError('Le compte indiqué n’est pas un enseignant.', 400);
   }
   if (teacher.status !== USER_STATUS.ACTIVE) {
      throw new AppError('Le compte enseignant est inactif.', 400);
   }
   if (!subject || !subject.isActive) {
      throw new AppError('Matière introuvable ou inactive.', 404);
   }
   if (!program || !program.isActive) {
      throw new AppError('Programme introuvable ou inactif.', 404);
   }
   if (!schoolClass || !schoolClass.isActive) {
      throw new AppError('Classe introuvable ou inactive.', 404);
   }
   if (!academicYear) throw new AppError('Année académique introuvable.', 404);
   if (academicYear.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }
   if (
      schoolClass.academicYear.toString() !== data.academicYear.toString() ||
      schoolClass.program.toString() !== data.program.toString()
   ) {
      throw new AppError(
         'La classe ne correspond pas au programme et à l’année indiqués.',
         400
      );
   }

   const subjectConfiguration = await SubjectConfiguration.exists({
      academicYear: data.academicYear,
      program: data.program,
      level: schoolClass.level,
      subject: data.subject,
   });

   if (!subjectConfiguration) {
      throw new AppError(
         'La matière doit être configurée pour le niveau avant son affectation.',
         400
      );
   }

   const assignment = await TeachingAssignment.create(data);
   try {
      await AuditLog.create({
         actor: actorId,
         action: 'TEACHING_ASSIGNMENT_CREATED',
         entityType: 'TeachingAssignment',
         entityId: assignment._id,
         newValue: data,
      });
   } catch (error) {
      await TeachingAssignment.deleteOne({ _id: assignment._id });
      throw error;
   }
   return assignment;
};
