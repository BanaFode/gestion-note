import { query } from 'express-validator';

export const auditLogListValidator = [
   query('actor')
      .optional()
      .isMongoId()
      .withMessage('Le filtre utilisateur est invalide.'),
   query('entityId')
      .optional()
      .isMongoId()
      .withMessage('Le filtre entité est invalide.'),
   query('action')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Le filtre action est trop long.'),
   query('entityType')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Le filtre entité est trop long.'),
   query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('La limite doit être comprise entre 1 et 100.')
      .toInt(),
];
