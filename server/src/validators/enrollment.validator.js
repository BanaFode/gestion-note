import { body, param, query } from 'express-validator';
import { ENROLLMENT_STATUS } from '../constants/statuses.js';

export const enrollmentListValidator = [
   query('status')
      .optional()
      .isIn(Object.values(ENROLLMENT_STATUS))
      .withMessage('Le statut d’inscription est invalide.'),
   query('academicYear')
      .optional()
      .isMongoId()
      .withMessage('L’identifiant de l’année académique est invalide.'),
   query('program')
      .optional()
      .isMongoId()
      .withMessage('L’identifiant du programme est invalide.'),
   query('class')
      .optional()
      .isMongoId()
      .withMessage('L’identifiant de la classe est invalide.'),
];

export const createEnrollmentValidator = [
   body('student')
      .notEmpty()
      .withMessage("L'élève est obligatoire.")
      .isMongoId()
      .withMessage("L'identifiant de l'élève est invalide."),

   body('academicYear')
      .notEmpty()
      .withMessage("L'année académique est obligatoire.")
      .isMongoId()
      .withMessage("L'identifiant de l'année académique est invalide."),

   body('program')
      .notEmpty()
      .withMessage('Le programme est obligatoire.')
      .isMongoId()
      .withMessage("L'identifiant du programme est invalide."),

   body('class')
      .notEmpty()
      .withMessage('La classe est obligatoire.')
      .isMongoId()
      .withMessage("L'identifiant de la classe est invalide."),

   body('administrativeInfo.registrationDate')
      .optional()
      .isISO8601()
      .withMessage("La date d'inscription est invalide."),

   body('administrativeInfo.registrationNumber').optional().trim(),

   body('administrativeInfo.observation').optional().trim(),
];

export const enrollmentIdValidator = [
   param('id')
      .isMongoId()
      .withMessage("L'identifiant de l'inscription est invalide."),
];

export const reviewEnrollmentValidator = [
   body('decision')
      .notEmpty()
      .withMessage('La décision est obligatoire.')
      .isIn(['APPROVED', 'REJECTED'])
      .withMessage('La décision doit être APPROVED ou REJECTED.'),

   body('rejectionReason').optional().trim(),
];

export const resubmitEnrollmentValidator = [
   param('id')
      .isMongoId()
      .withMessage("L'identifiant de l'inscription est invalide."),

   body('student')
      .optional()
      .isMongoId()
      .withMessage("L'identifiant de l'élève est invalide."),

   body('academicYear')
      .optional()
      .isMongoId()
      .withMessage("L'identifiant de l'année académique est invalide."),

   body('program')
      .optional()
      .isMongoId()
      .withMessage("L'identifiant du programme est invalide."),

   body('class')
      .optional()
      .isMongoId()
      .withMessage("L'identifiant de la classe est invalide."),

   body('administrativeInfo.registrationDate')
      .optional()
      .isISO8601()
      .withMessage("La date d'inscription est invalide."),

   body('administrativeInfo.registrationNumber').optional().trim(),

   body('administrativeInfo.observation').optional().trim(),
];
