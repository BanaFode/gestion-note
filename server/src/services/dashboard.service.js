import User from '../models/User.js';
import Student from '../models/Student.js';
import Enrollment from '../models/Enrollment.js';
import AcademicYear from '../models/AcademicYear.js';
import Program from '../models/Program.js';
import SchoolClass from '../models/Class.js';
import Subject from '../models/Subject.js';
import TeachingAssignment from '../models/TeachingAssignment.js';
import Evaluation from '../models/Evaluation.js';
import Grade from '../models/Grade.js';
import AuditLog from '../models/AuditLog.js';
import { ENROLLMENT_STATUS } from '../constants/statuses.js';
import { ROLES } from '../constants/roles.js';
import { getMyResults } from './result.service.js';
import AppError from '../utils/AppError.js';

const getGradeStatusesForAcademicYear = async (academicYearId) => {
   const assignmentFilter = academicYearId
      ? { academicYear: academicYearId }
      : {};
   const assignmentIds = await TeachingAssignment.distinct(
      '_id',
      assignmentFilter
   );
   const evaluationIds = await Evaluation.distinct('_id', {
      assignment: { $in: assignmentIds },
   });
   return countByStatusForEvaluationIds(evaluationIds);
};

const getAdminDashboard = async (academicYearId) => {
   const yearFilter = academicYearId ? { academicYear: academicYearId } : {};
   const [
      users,
      pendingEnrollments,
      approvedEnrollments,
      rejectedEnrollments,
      academicYears,
      academicYearCount,
      classes,
      gradeStatuses,
      recentActivity,
   ] = await Promise.all([
      User.countDocuments(),
      Enrollment.countDocuments({
         ...yearFilter,
         status: ENROLLMENT_STATUS.PENDING,
      }),
      Enrollment.countDocuments({
         ...yearFilter,
         status: ENROLLMENT_STATUS.APPROVED,
      }),
      Enrollment.countDocuments({
         ...yearFilter,
         status: ENROLLMENT_STATUS.REJECTED,
      }),
      AcademicYear.find().sort({ label: -1 }).limit(5),
      AcademicYear.countDocuments(),
      SchoolClass.countDocuments(yearFilter),
      getGradeStatusesForAcademicYear(academicYearId),
      AuditLog.find()
         .populate('actor', 'firstName lastName role')
         .sort({ createdAt: -1 })
         .limit(10),
   ]);

   return {
      role: ROLES.ADMIN,
      users,
      enrollments: {
         pending: pendingEnrollments,
         approved: approvedEnrollments,
         rejected: rejectedEnrollments,
      },
      academicYears,
      academicYearCount,
      classes,
      gradeStatuses,
      recentActivity,
   };
};

const getRegistrarDashboard = async (academicYearId) => {
   const yearFilter = academicYearId ? { academicYear: academicYearId } : {};
   const [studentIds, enrollments, pending, rejected, approved] =
      await Promise.all([
         Enrollment.distinct('student', yearFilter),
         Enrollment.countDocuments(yearFilter),
         Enrollment.countDocuments({
            ...yearFilter,
            status: ENROLLMENT_STATUS.PENDING,
         }),
         Enrollment.countDocuments({
            ...yearFilter,
            status: ENROLLMENT_STATUS.REJECTED,
         }),
         Enrollment.countDocuments({
            ...yearFilter,
            status: ENROLLMENT_STATUS.APPROVED,
         }),
      ]);

   return {
      role: ROLES.DIRECTEUR_SCOLARITE,
      students: studentIds.length,
      enrollments,
      enrollmentStatuses: { pending, rejected, approved },
   };
};

const getStudiesDashboard = async (academicYearId) => {
   const assignmentFilter = {
      isActive: true,
      ...(academicYearId ? { academicYear: academicYearId } : {}),
   };
   const classFilter = {
      isActive: true,
      ...(academicYearId ? { academicYear: academicYearId } : {}),
   };
   const [assignmentIds, programs, classes, subjectIds, teacherIds] =
      await Promise.all([
         TeachingAssignment.distinct('_id', assignmentFilter),
         SchoolClass.distinct('program', classFilter),
         SchoolClass.countDocuments(classFilter),
         TeachingAssignment.distinct('subject', assignmentFilter),
         TeachingAssignment.distinct('teacher', assignmentFilter),
      ]);
   const evaluationIds = await Evaluation.distinct('_id', {
      assignment: { $in: assignmentIds },
   });
   const [evaluations, gradeStatuses] = await Promise.all([
      Evaluation.countDocuments({ _id: { $in: evaluationIds } }),
      countByStatusForEvaluationIds(evaluationIds),
   ]);

   return {
      role: ROLES.DIRECTEUR_ETUDES,
      programs: await Program.countDocuments({
         _id: { $in: programs },
         isActive: true,
      }),
      classes,
      subjects: await Subject.countDocuments({
         _id: { $in: subjectIds },
         isActive: true,
      }),
      teachers: await User.countDocuments({
         _id: { $in: teacherIds },
         role: ROLES.ENSEIGNANT,
         status: 'ACTIVE',
      }),
      assignments: assignmentIds.length,
      evaluations,
      gradeStatuses,
   };
};

const getTeacherDashboard = async (userId, academicYearId) => {
   const assignments = await TeachingAssignment.find({
      teacher: userId,
      isActive: true,
      ...(academicYearId ? { academicYear: academicYearId } : {}),
   })
      .populate('subject', 'name code')
      .populate('class', 'name level')
      .populate('academicYear', 'label status');

   const assignmentIds = assignments.map(({ _id }) => _id);
   const evaluations = await Evaluation.find({
      assignment: { $in: assignmentIds },
   }).populate({
      path: 'assignment',
      populate: [
         { path: 'teacher', select: 'firstName lastName email' },
         { path: 'subject', select: 'name code' },
         { path: 'program', select: 'name code' },
         { path: 'class', select: 'name level' },
         { path: 'academicYear', select: 'label status' },
      ],
   });
   const evaluationIds = evaluations.map(({ _id }) => _id);
   const grades = await countByStatusForEvaluationIds(evaluationIds);

   return { role: ROLES.ENSEIGNANT, assignments, evaluations, grades };
};

const countByStatusForEvaluationIds = async (evaluationIds) => {
   const grouped = await Grade.aggregate([
      { $match: { evaluation: { $in: evaluationIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
   ]);
   return Object.fromEntries(grouped.map(({ _id, count }) => [_id, count]));
};

const getStudentDashboard = async (user, academicYearId) => {
   const [student, results] = await Promise.all([
      Student.findOne({ user: user._id }).select(
         'matricule firstName lastName'
      ),
      getMyResults(user, academicYearId),
   ]);

   return { role: ROLES.ELEVE, student, results };
};

export const getDashboard = async (user, requestedAcademicYearId) => {
   const academicYears = await AcademicYear.find().sort({ label: -1 });
   const selectedAcademicYear = requestedAcademicYearId
      ? academicYears.find(
           (year) => year._id.toString() === requestedAcademicYearId.toString()
        )
      : academicYears.find((year) => year.status === 'ACTIVE') ||
        academicYears[0];

   if (requestedAcademicYearId && !selectedAcademicYear) {
      throw new AppError('Année scolaire introuvable.', 404);
   }

   const academicYearId = selectedAcademicYear?._id;
   let dashboard;
   switch (user.role) {
      case ROLES.ADMIN:
         dashboard = await getAdminDashboard(academicYearId);
         break;
      case ROLES.DIRECTEUR_SCOLARITE:
         dashboard = await getRegistrarDashboard(academicYearId);
         break;
      case ROLES.DIRECTEUR_ETUDES:
         dashboard = await getStudiesDashboard(academicYearId);
         break;
      case ROLES.ENSEIGNANT:
         dashboard = await getTeacherDashboard(user._id, academicYearId);
         break;
      case ROLES.ELEVE:
         dashboard = await getStudentDashboard(user, academicYearId);
         break;
      default:
         dashboard = { role: user.role };
   }
   return {
      ...dashboard,
      academicYears,
      selectedAcademicYearId: academicYearId?.toString() || '',
   };
};
