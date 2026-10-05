import { body, param, query } from 'express-validator';
import { EVALUATION_PERIOD, EVALUATION_TYPE } from '../constants/statuses.js';

export const evaluationIdValidator = [
   param('id').isMongoId().withMessage("L'identifiant de l’évaluation est invalide."),
];

export const createEvaluationValidator = [
   body('assignment')
      .notEmpty()
      .withMessage('L’affectation est obligatoire.')
      .isMongoId()
      .withMessage('L’identifiant de l’affectation est invalide.'),
   body('name')
      .trim()
      .notEmpty()
      .withMessage('Le nom de l’évaluation est obligatoire.')
      .isLength({ max: 150 })
      .withMessage('Le nom ne peut pas dépasser 150 caractères.'),
   body('type')
      .optional()
      .isIn(Object.values(EVALUATION_TYPE))
      .withMessage('Le type d’évaluation est invalide.'),
   body('period')
      .trim()
      .notEmpty()
      .withMessage('Le module est obligatoire.')
      .isIn(Object.values(EVALUATION_PERIOD))
      .withMessage('Choisissez le premier ou le deuxième module.'),
   body('weight')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('Le poids doit être supérieur à zéro.')
      .toFloat(),
];

export const evaluationListValidator = [
   query('assignment')
      .optional()
      .isMongoId()
      .withMessage('Le filtre affectation est invalide.'),
   query('type')
      .optional()
      .isIn(Object.values(EVALUATION_TYPE))
      .withMessage('Le filtre type est invalide.'),
   query('status')
      .optional()
      .isIn(['OPEN', 'CLOSED'])
      .withMessage('Le filtre statut est invalide.'),
];
