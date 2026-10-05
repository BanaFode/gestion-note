import { body, param, query } from 'express-validator';
import { ROLE_VALUES, ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/statuses.js';

const STAFF_ROLES = ROLE_VALUES.filter((role) => role !== ROLES.ELEVE);
const USER_STATUSES = Object.values(USER_STATUS);

const staffIdentityValidators = [
   body('firstName')
      .trim()
      .notEmpty()
      .withMessage('Le prénom est obligatoire.')
      .isLength({ min: 2, max: 100 })
      .withMessage('Le prénom doit contenir entre 2 et 100 caractères.'),
   body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Le nom est obligatoire.')
      .isLength({ min: 2, max: 100 })
      .withMessage('Le nom doit contenir entre 2 et 100 caractères.'),
   body('email')
      .trim()
      .notEmpty()
      .withMessage("L'adresse email est obligatoire.")
      .isEmail()
      .withMessage("L'adresse email est invalide.")
      .toLowerCase(),
];

export const userListValidator = [
   query('role').optional().isIn(ROLE_VALUES).withMessage('Le rôle est invalide.'),
   query('status')
      .optional()
      .isIn(USER_STATUSES)
      .withMessage('Le statut utilisateur est invalide.'),
];

export const createStaffUserValidator = [
   ...staffIdentityValidators,
   body('role')
      .notEmpty()
      .withMessage('Le rôle est obligatoire.')
      .isIn(STAFF_ROLES)
      .withMessage('Ce rôle ne peut pas être créé comme compte du personnel.'),
];

export const createTeacherValidator = [
   ...staffIdentityValidators,
   body('phone')
      .trim()
      .notEmpty()
      .withMessage('Le numéro de téléphone est obligatoire.')
      .bail()
      .isLength({ max: 30 })
      .withMessage('Le numéro de téléphone ne peut pas dépasser 30 caractères.')
      .bail()
      .matches(/^\+?[0-9().\s-]+$/)
      .withMessage('Le numéro de téléphone contient des caractères invalides.')
      .bail()
      .custom((value) => {
         const digitCount = value.replace(/\D/g, '').length;
         return digitCount >= 7 && digitCount <= 15;
      })
      .withMessage(
         'Le numéro de téléphone doit contenir entre 7 et 15 chiffres.'
      ),
];

export const updateUserStatusValidator = [
   param('id').isMongoId().withMessage("L'identifiant utilisateur est invalide."),
   body('status')
      .notEmpty()
      .withMessage('Le statut est obligatoire.')
      .isIn(USER_STATUSES)
      .withMessage('Le statut utilisateur est invalide.'),
];

export const userIdValidator = [
   param('id').isMongoId().withMessage("L'identifiant utilisateur est invalide."),
];
