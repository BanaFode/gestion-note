import { body, param, query } from 'express-validator';

export const enrollmentResultIdValidator = [
   param('id')
      .isMongoId()
      .withMessage("L'identifiant de l'inscription est invalide."),
];

export const myResultsValidator = [
   query('academicYear')
      .optional()
      .isMongoId()
      .withMessage("L'identifiant de l'année académique est invalide."),
];

export const teacherResultsValidator = [...myResultsValidator];

export const finalizeResultsValidator = [
   body('academicYearId')
      .isMongoId()
      .withMessage("L'identifiant de l'année académique est invalide."),
   body('classId')
      .optional()
      .isMongoId()
      .withMessage("L'identifiant de la classe est invalide."),
];
