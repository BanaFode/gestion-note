import { body } from 'express-validator';

export const saveAcademicSettingsValidator = [
   body('resultScale')
      .isFloat({ gt: 0 })
      .withMessage('Le barème général doit être supérieur à zéro.')
      .toFloat(),
   body('admissionThreshold')
      .isFloat({ min: 0 })
      .withMessage('Le seuil d’admission ne peut pas être négatif.')
      .toFloat(),
   body('calculationRules')
      .custom(
         (value) =>
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.keys(value).every((key) => key === 'overallMethod')
      )
      .withMessage(
         'Les règles de calcul doivent contenir uniquement les options prises en charge.'
      ),
   body('calculationRules.overallMethod')
      .notEmpty()
      .withMessage('La méthode de calcul général est obligatoire.')
      .isIn(['ARITHMETIC_MEAN', 'WEIGHTED_MEAN'])
      .withMessage('La méthode de calcul général est invalide.'),
];
