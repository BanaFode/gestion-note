import Student from '../models/Student.js';
import Enrollment from '../models/Enrollment.js';
import Grade from '../models/Grade.js';
import User from '../models/User.js';
import { retireUserAccount } from './account-retirement.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/statuses.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createStudent = async (data, actorId) => {
   const existingStudent = await Student.findOne({
      matricule: data.matricule.toUpperCase(),
   });

   if (existingStudent) {
      throw new AppError('Un élève avec ce matricule existe déjà.', 409);
   }

   const student = await Student.create({
      matricule: data.matricule.toUpperCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth || null,
      placeOfBirth: data.placeOfBirth || '',
      gender: data.gender || null,
      phone: data.phone || '',
      email: data.email || null,
      photo: data.photo || null,
   });

   try {
      await AuditLog.create({
         actor: actorId,
         action: 'STUDENT_CREATED',
         entityType: 'Student',
         entityId: student._id,
         newValue: { matricule: student.matricule, firstName: student.firstName, lastName: student.lastName },
      });
   } catch (error) {
      await Student.deleteOne({ _id: student._id });
      throw error;
   }

   return student;
};

export const getAllStudents = async (filters = {}) => {
   const query = {};

   if (filters.search) {
      const search = escapeRegExp(filters.search.trim());
      query.$or = [
         { matricule: { $regex: search, $options: 'i' } },
         { firstName: { $regex: search, $options: 'i' } },
         { lastName: { $regex: search, $options: 'i' } },
      ];
   }

   const students = await Student.find(query).sort({ createdAt: -1 });

   return students;
};

export const deleteStudent = async (studentId, actorId) => {
   const student = await Student.findById(studentId);
   if (!student) throw new AppError('Élève introuvable.', 404);
   const studentSnapshot = student.toObject({ depopulate: true });

   const enrollments = await Enrollment.find({ student: student._id }).lean();
   const enrollmentIds = enrollments.map((enrollment) => enrollment._id);
   const grades = enrollmentIds.length
      ? await Grade.find({ enrollment: { $in: enrollmentIds } }).lean()
      : [];
   const gradeCount = enrollmentIds.length
      ? grades.length
      : 0;
   const linkedUser = student.user
      ? await User.findById(student.user).select('+password +passwordResetTokenHash +passwordResetExpiresAt +passwordResetRequestedAt')
      : null;
   const linkedUserSnapshot = linkedUser?.toObject({ depopulate: true });
   if (linkedUser?.role === ROLES.ADMIN && linkedUser.status === USER_STATUS.ACTIVE) {
      const activeAdminCount = await User.countDocuments({ role: ROLES.ADMIN, status: USER_STATUS.ACTIVE, deletedAt: null });
      if (activeAdminCount <= 1) throw new AppError('Le dernier compte administrateur actif ne peut pas être retiré avec ce dossier.', 409);
   }

   const logs = await AuditLog.insertMany([
      ...(linkedUser ? [{
         actor: actorId,
         action: 'USER_DELETED',
         entityType: 'User',
         entityId: linkedUser._id,
         oldValue: { firstName: linkedUser.firstName, lastName: linkedUser.lastName, email: linkedUser.email, role: linkedUser.role, reason: 'STUDENT_DELETED' },
      }] : []),
      {
      actor: actorId,
      action: 'STUDENT_DELETED',
      entityType: 'Student',
      entityId: student._id,
      oldValue: {
         matricule: student.matricule,
         firstName: student.firstName,
         lastName: student.lastName,
         enrollmentCount: enrollments.length,
         gradeCount,
         linkedAccountRemoved: Boolean(linkedUser),
      },
      },
   ]);
   try {
      if (enrollmentIds.length) {
         await Grade.deleteMany({ enrollment: { $in: enrollmentIds } });
         await Enrollment.deleteMany({ _id: { $in: enrollmentIds } });
      }
      if (linkedUser) await retireUserAccount(linkedUser);
      const deletion = await Student.deleteOne({ _id: student._id });
      if (!deletion.deletedCount) throw new AppError('Le dossier élève a déjà été supprimé.', 409);
   } catch (error) {
      try {
         if (grades.length) await Grade.collection.bulkWrite(grades.map((document) => ({ replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true } })));
         if (enrollments.length) await Enrollment.collection.bulkWrite(enrollments.map((document) => ({ replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true } })));
         if (linkedUserSnapshot) await User.collection.replaceOne({ _id: linkedUserSnapshot._id }, linkedUserSnapshot, { upsert: true });
         await Student.collection.replaceOne({ _id: studentSnapshot._id }, studentSnapshot, { upsert: true });
      } catch (rollbackError) {
         console.error('[student-delete] Restauration après échec impossible:', rollbackError.message);
      }
      await AuditLog.deleteMany({ _id: { $in: logs.map((log) => log._id) } });
      throw error;
   }

   return { enrollmentCount: enrollments.length, gradeCount, linkedAccountRemoved: Boolean(linkedUser) };
};

export const getStudentById = async (studentId) => {
   const student = await Student.findById(studentId);

   if (!student) {
      throw new AppError('Élève introuvable.', 404);
   }

   return student;
};

export const getStudentByMatricule = async (matricule) => {
   const student = await Student.findOne({
      matricule: matricule.toUpperCase(),
   });

   if (!student) {
      throw new AppError('Élève introuvable.', 404);
   }

   return student;
};

export const getStudentProfileByUser = async (userId) => {
   const student = await Student.findOne({ user: userId });

   if (!student) {
      const error = new Error('Profil élève introuvable.');
      error.statusCode = 404;
      throw error;
   }

   const enrollments = await Enrollment.find({
      student: student._id,
      status: 'APPROVED',
   })
      .populate('academicYear', 'label status')
      .populate('program', 'name code')
      .populate('class', 'name level')
      .sort({ createdAt: -1 });

   return { student, enrollments };
};
