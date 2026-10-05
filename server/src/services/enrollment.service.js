import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import AcademicYear from '../models/AcademicYear.js';
import Program from '../models/Program.js';
import SchoolClass from '../models/Class.js';
import AppError from '../utils/AppError.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Créer une inscription
 *
 * Seul le Directeur de la scolarité peut appeler
 * cette fonction via le middleware d'autorisation.
 */
export const createEnrollment = async (data, userId) => {
   const {
      student,
      academicYear,
      program,
      class: classId,
      administrativeInfo,
   } = data;

   // Vérifier l'élève
   const existingStudent = await Student.findById(student);

   if (!existingStudent) {
      throw new AppError('Élève introuvable.', 404);
   }

   // Vérifier l'année académique
   const existingAcademicYear = await AcademicYear.findById(academicYear);

   if (existingAcademicYear?.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }

   if (!existingAcademicYear) {
      throw new AppError('Année académique introuvable.', 404);
   }

   // Vérifier le programme
   const existingProgram = await Program.findById(program);

   if (!existingProgram) {
      throw new AppError('Filière ou programme introuvable.', 404);
   }

   // Vérifier la classe
   const existingClass = await SchoolClass.findById(classId);

   if (!existingProgram.isActive) {
      throw new AppError('Ce programme est inactif.', 400);
   }

   if (!existingClass) {
      throw new AppError('Classe introuvable.', 404);
   }
   if (!existingClass.isActive) {
      throw new AppError('Cette classe est inactive.', 400);
   }

   /*
    * IMPORTANT :
    * La classe doit appartenir à la même année
    * et au même programme que l'inscription.
    */
   if (existingClass.academicYear.toString() !== academicYear.toString()) {
      throw new AppError(
         "La classe sélectionnée n'appartient pas à cette année académique.",
         400
      );
   }

   if (existingClass.program.toString() !== program.toString()) {
      throw new AppError(
         "La classe sélectionnée n'appartient pas à cette filière.",
         400
      );
   }

   const activeEnrollmentCount = await Enrollment.countDocuments({
      class: classId,
      status: { $in: ['PENDING', 'APPROVED'] },
   });
   if (activeEnrollmentCount >= existingClass.capacity) {
      throw new AppError('La capacité de cette classe est atteinte.', 409);
   }

   // Vérifier si l'élève est déjà inscrit cette année
   const existingEnrollment = await Enrollment.findOne({
      student,
      academicYear,
   });

   if (existingEnrollment) {
      throw new AppError(
         'Cet élève possède déjà une inscription pour cette année académique.',
         409
      );
   }

   // Création toujours en PENDING
   const enrollment = await Enrollment.create({
      student,
      academicYear,
      program,
      class: classId,

      status: 'PENDING',

      administrativeInfo: {
         registrationDate: administrativeInfo?.registrationDate || new Date(),

         registrationNumber: administrativeInfo?.registrationNumber || '',

         observation: administrativeInfo?.observation || '',
      },

      submittedBy: userId,
   });

   try {
      await AuditLog.create({
         actor: userId,
         action: 'ENROLLMENT_CREATED',
         entityType: 'Enrollment',
         entityId: enrollment._id,
         newValue: {
            student,
            academicYear,
            program,
            class: classId,
            status: enrollment.status,
         },
      });
   } catch (error) {
      await Enrollment.deleteOne({ _id: enrollment._id });
      throw error;
   }

   return Enrollment.findById(enrollment._id)
      .populate('student')
      .populate('academicYear')
      .populate('program')
      .populate('class')
      .populate('submittedBy', 'firstName lastName email role');
};

/**
 * Récupérer les inscriptions
 */
export const getAllEnrollments = async (filters = {}) => {
   const query = {};

   if (filters.status) {
      query.status = filters.status;
   }

   if (filters.academicYear) {
      query.academicYear = filters.academicYear;
   }

   if (filters.program) {
      query.program = filters.program;
   }

   if (filters.class) {
      query.class = filters.class;
   }

   const enrollments = await Enrollment.find(query)
      .populate('student')
      .populate('academicYear')
      .populate('program')
      .populate('class')
      .populate('submittedBy', 'firstName lastName email role')
      .populate('reviewedBy', 'firstName lastName email role')
      .sort({ createdAt: -1 });

   return enrollments;
};

/**
 * Récupérer une inscription
 */
export const getEnrollmentById = async (enrollmentId) => {
   const enrollment = await Enrollment.findById(enrollmentId)
      .populate('student')
      .populate('academicYear')
      .populate('program')
      .populate('class')
      .populate('submittedBy', 'firstName lastName email role')
      .populate('reviewedBy', 'firstName lastName email role');

   if (!enrollment) {
      throw new AppError('Inscription introuvable.', 404);
   }

   return enrollment;
};

/**
 * Approuver ou rejeter une inscription
 *
 * Cette fonction sera accessible uniquement à ADMIN.
 */
export const reviewEnrollment = async (
   enrollmentId,
   decision,
   rejectionReason,
   adminId
) => {
   const enrollment = await Enrollment.findById(enrollmentId);

   if (!enrollment) {
      throw new AppError('Inscription introuvable.', 404);
   }

   // Une inscription déjà approuvée ne peut plus être revue
   if (enrollment.status !== 'PENDING') {
      throw new AppError('Seule une inscription en attente peut être revue.', 400);
   }

   const academicYear = await AcademicYear.findById(enrollment.academicYear);
   if (!academicYear) throw new AppError('Année académique introuvable.', 404);
   if (academicYear.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }

   if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new AppError('La décision doit être APPROVED ou REJECTED.', 400);
   }

   // Si rejet, la raison est obligatoire
   if (
      decision === 'REJECTED' &&
      (!rejectionReason || !rejectionReason.trim())
   ) {
      throw new AppError('La raison du rejet est obligatoire.', 400);
   }

   const previousValue = {
      status: enrollment.status,
      rejectionReason: enrollment.rejectionReason,
   };
   enrollment.status = decision;

   enrollment.reviewedBy = adminId;
   enrollment.reviewedAt = new Date();

   if (decision === 'REJECTED') {
      enrollment.rejectionReason = rejectionReason.trim();
   } else {
      enrollment.rejectionReason = '';
   }

   const log = await AuditLog.create({
      actor: adminId,
      action:
         decision === 'APPROVED'
            ? 'ENROLLMENT_APPROVED'
            : 'ENROLLMENT_REJECTED',
      entityType: 'Enrollment',
      entityId: enrollment._id,
      oldValue: previousValue,
      newValue: {
         status: enrollment.status,
         rejectionReason: enrollment.rejectionReason,
      },
      reason: enrollment.rejectionReason,
   });

   try {
      await enrollment.save();
   } catch (error) {
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }

   return Enrollment.findById(enrollment._id)
      .populate('student')
      .populate('academicYear')
      .populate('program')
      .populate('class')
      .populate('submittedBy', 'firstName lastName email role')
      .populate('reviewedBy', 'firstName lastName email role');
};

/**
 * Corriger et resoumettre une inscription rejetée
 */
export const resubmitEnrollment = async (enrollmentId, data, userId) => {
   const enrollment = await Enrollment.findById(enrollmentId);

   if (!enrollment) {
      throw new AppError('Inscription introuvable.', 404);
   }

   if (enrollment.status !== 'REJECTED') {
      throw new AppError(
         'Seule une inscription rejetée peut être corrigée et resoumise.',
         400
      );
   }

   /*
    * Vérifier les nouvelles références si elles sont modifiées.
    */
   const studentId = data.student || enrollment.student;
   const academicYearId = data.academicYear || enrollment.academicYear;
   const programId = data.program || enrollment.program;
   const classId = data.class || enrollment.class;

   const student = await Student.findById(studentId);

   if (!student) {
      throw new AppError('Élève introuvable.', 404);
   }

   const academicYear = await AcademicYear.findById(academicYearId);

   if (academicYear?.status === 'CLOSED') {
      throw new AppError('Une année clôturée ne peut plus être modifiée.', 400);
   }

   if (!academicYear) {
      throw new AppError('Année académique introuvable.', 404);
   }

   const program = await Program.findById(programId);

   if (!program) {
      throw new AppError('Programme introuvable.', 404);
   }

   const schoolClass = await SchoolClass.findById(classId);

   if (!schoolClass) {
      throw new AppError('Classe introuvable.', 404);
   }
   if (!program.isActive) {
      throw new AppError('Ce programme est inactif.', 400);
   }
   if (!schoolClass.isActive) {
      throw new AppError('Cette classe est inactive.', 400);
   }

   const activeEnrollmentCount = await Enrollment.countDocuments({
      class: classId,
      status: { $in: ['PENDING', 'APPROVED'] },
      _id: { $ne: enrollment._id },
   });
   if (activeEnrollmentCount >= schoolClass.capacity) {
      throw new AppError('La capacité de cette classe est atteinte.', 409);
   }

   // Vérification cohérence classe / année
   if (schoolClass.academicYear.toString() !== academicYearId.toString()) {
      throw new AppError(
         "La classe ne correspond pas à l'année académique.",
         400
      );
   }

   // Vérification cohérence classe / programme
   if (schoolClass.program.toString() !== programId.toString()) {
      throw new AppError('La classe ne correspond pas au programme.', 400);
   }

   /*
    * Mise à jour.
    */
   const oldValue = {
      student: enrollment.student,
      academicYear: enrollment.academicYear,
      program: enrollment.program,
      class: enrollment.class,
      status: enrollment.status,
      rejectionReason: enrollment.rejectionReason,
      administrativeInfo: enrollment.administrativeInfo?.toObject?.() ?? enrollment.administrativeInfo,
   };

   enrollment.student = studentId;
   enrollment.academicYear = academicYearId;
   enrollment.program = programId;
   enrollment.class = classId;

   if (data.administrativeInfo) {
      enrollment.administrativeInfo = {
         registrationDate:
            data.administrativeInfo.registrationDate ||
            enrollment.administrativeInfo.registrationDate,

         registrationNumber:
            data.administrativeInfo.registrationNumber ??
            enrollment.administrativeInfo.registrationNumber,

         observation:
            data.administrativeInfo.observation ??
            enrollment.administrativeInfo.observation,
      };
   }

   /*
    * Très important :
    * après correction, on repart à PENDING.
    */
   enrollment.status = 'PENDING';
   enrollment.rejectionReason = '';
   enrollment.reviewedBy = null;
   enrollment.reviewedAt = null;
   enrollment.submittedBy = userId;

   const log = await AuditLog.create({
      actor: userId,
      action: 'ENROLLMENT_RESUBMITTED',
      entityType: 'Enrollment',
      entityId: enrollment._id,
      oldValue,
      newValue: {
         student: enrollment.student,
         academicYear: enrollment.academicYear,
         program: enrollment.program,
         class: enrollment.class,
         status: enrollment.status,
         administrativeInfo: enrollment.administrativeInfo?.toObject?.() ?? enrollment.administrativeInfo,
      },
   });
   try {
      await enrollment.save();
   } catch (error) {
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }

   return Enrollment.findById(enrollment._id)
      .populate('student')
      .populate('academicYear')
      .populate('program')
      .populate('class')
      .populate('submittedBy', 'firstName lastName email role');
};
