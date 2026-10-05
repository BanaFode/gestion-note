import { body, param } from 'express-validator';
import { ACADEMIC_YEAR_STATUS } from '../constants/statuses.js';

export const createAcademicYearValidator = [
   body('label')
      .trim()
      .notEmpty()
      .withMessage("Le libellé de l'année scolaire est obligatoire.")
      .matches(/^\d{4}-\d{4}$/)
      .withMessage('Le format attendu est YYYY-YYYY.'),
   body('startDate')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('La date de début est invalide.'),
   body('endDate')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('La date de fin est invalide.'),
   body().custom((bodyValue) => {
      if (!bodyValue.startDate || !bodyValue.endDate) return true;
      return new Date(bodyValue.endDate) > new Date(bodyValue.startDate);
   }).withMessage('La date de fin doit être postérieure à la date de début.'),
];

export const updateAcademicYearStatusValidator = [
   param('id')
      .isMongoId()
      .withMessage("L'identifiant de l'année scolaire est invalide."),
   body('status')
      .notEmpty()
      .withMessage('Le statut est obligatoire.')
      .isIn(Object.values(ACADEMIC_YEAR_STATUS))
      .withMessage('Le statut de l’année scolaire est invalide.'),
];
