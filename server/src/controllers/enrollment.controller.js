import {
   createEnrollment,
   getAllEnrollments,
   getEnrollmentById,
   reviewEnrollment,
   resubmitEnrollment,
} from '../services/enrollment.service.js';

export const createEnrollmentController = async (req, res) => {
   const enrollment = await createEnrollment(req.body, req.user._id);

   return res.status(201).json({
      success: true,
      message: 'Inscription créée et envoyée pour validation.',
      data: enrollment,
   });
};

export const getEnrollmentsController = async (req, res) => {
   const enrollments = await getAllEnrollments({
      status: req.query.status,
      academicYear: req.query.academicYear,
      program: req.query.program,
      class: req.query.class,
   });

   return res.status(200).json({
      success: true,
      message: 'Liste des inscriptions récupérée avec succès.',
      data: enrollments,
   });
};

export const getEnrollmentController = async (req, res) => {
   const enrollment = await getEnrollmentById(req.params.id);

   return res.status(200).json({
      success: true,
      message: 'Inscription récupérée avec succès.',
      data: enrollment,
   });
};

export const reviewEnrollmentController = async (req, res) => {
   const enrollment = await reviewEnrollment(
      req.params.id,
      req.body.decision,
      req.body.rejectionReason,
      req.user._id
   );

   const message =
      req.body.decision === 'APPROVED'
         ? 'Inscription approuvée avec succès.'
         : 'Inscription rejetée avec succès.';

   return res.status(200).json({
      success: true,
      message,
      data: enrollment,
   });
};

export const resubmitEnrollmentController = async (req, res) => {
   const enrollment = await resubmitEnrollment(
      req.params.id,
      req.body,
      req.user._id
   );

   return res.status(200).json({
      success: true,
      message: 'Inscription corrigée et resoumise avec succès.',
      data: enrollment,
   });
};
