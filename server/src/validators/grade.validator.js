import { body, param } from 'express-validator';
import { GRADE_STATUS } from '../constants/statuses.js';

const componentNames = ['oral', 'written', 'composition'];
const componentValidators = componentNames.flatMap((name) => [
   body(`components.${name}`)
      .custom(
         (value) =>
            value === null ||
            (value !== '' &&
               Number.isFinite(Number(value)) &&
               Number(value) >= 0)
      )
      .withMessage('Chaque note doit être un nombre positif ou vide.')
      .customSanitizer((value) =>
         value === null || value === '' ? null : Number(value)
      ),
]);

export const gradeIdValidator = [
   param('id')
      .isMongoId()
      .withMessage("L'identifiant de la note est invalide."),
];

export const saveDraftGradeValidator = [
   param('id')
      .isMongoId()
      .withMessage("L'identifiant de l’évaluation est invalide."),
   body('enrollment')
      .notEmpty()
      .withMessage('L’inscription est obligatoire.')
      .isMongoId()
      .withMessage('L’identifiant de l’inscription est invalide.'),
   body('components')
      .isObject()
      .withMessage('Les trois composantes de note sont obligatoires.'),
   ...componentValidators,
];

export const reviewGradeValidator = [
   ...gradeIdValidator,
   body('decision')
      .notEmpty()
      .withMessage('La décision de contrôle est obligatoire.')
      .isIn([GRADE_STATUS.VALIDATED, GRADE_STATUS.NEEDS_CORRECTION])
      .withMessage('La décision de contrôle est invalide.'),
   body('reason').optional().trim().isLength({ max: 500 }),
];

export const correctionRequestValidator = [
   ...gradeIdValidator,
   body('reason')
      .trim()
      .notEmpty()
      .withMessage('Le motif de la demande est obligatoire.')
      .isLength({ max: 500 })
      .withMessage('Le motif ne peut pas dépasser 500 caractères.'),
];

export const reviewCorrectionRequestValidator = [
   ...gradeIdValidator,
   param('requestId')
      .isMongoId()
      .withMessage("L'identifiant de la demande est invalide."),
   body('decision')
      .isIn(['APPROVED', 'REJECTED'])
      .withMessage('La décision doit être APPROVED ou REJECTED.'),
   body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Le motif ne peut pas dépasser 500 caractères.'),
];
