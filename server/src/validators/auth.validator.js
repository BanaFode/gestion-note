import { body } from 'express-validator';

export const loginValidator = [
   body('email')
      .trim()
      .notEmpty()
      .withMessage("L'adresse email est obligatoire.")
      .isEmail()
      .withMessage("L'adresse email est invalide.")
      .toLowerCase(),
   body('password')
      .isString()
      .withMessage('Le mot de passe est obligatoire.')
      .notEmpty()
      .withMessage('Le mot de passe est obligatoire.'),
];

export const registerStudentValidator = [
   body('matricule')
      .trim()
      .notEmpty()
      .withMessage('Le matricule est obligatoire.')
      .isLength({ min: 3, max: 30 })
      .withMessage('Le matricule doit contenir entre 3 et 30 caractères.')
      .toUpperCase(),
   body('email')
      .trim()
      .notEmpty()
      .withMessage("L'adresse email est obligatoire.")
      .isEmail()
      .withMessage("L'adresse email est invalide.")
      .toLowerCase(),
   body('password')
      .isString()
      .withMessage('Le mot de passe doit être une chaîne de caractères.')
      .isLength({ min: 8, max: 128 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères.'),
];

export const changePasswordValidator = [
   body('currentPassword')
      .isString()
      .withMessage('Le mot de passe actuel est obligatoire.')
      .notEmpty()
      .withMessage('Le mot de passe actuel est obligatoire.'),
   body('newPassword')
      .isString()
      .withMessage('Le nouveau mot de passe doit être une chaîne de caractères.')
      .isLength({ min: 8, max: 128 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères.'),
];

export const forgotPasswordValidator = [
   body('email')
      .trim()
      .notEmpty()
      .withMessage("L'adresse email est obligatoire.")
      .isEmail()
      .withMessage("L'adresse email est invalide.")
      .toLowerCase(),
];

export const resetPasswordValidator = [
   body('token')
      .isString()
      .withMessage('Le lien de réinitialisation est invalide.')
      .isLength({ min: 64, max: 64 })
      .isHexadecimal()
      .withMessage('Le lien de réinitialisation est invalide.'),
   body('newPassword')
      .isString()
      .withMessage('Le nouveau mot de passe est obligatoire.')
      .isLength({ min: 8, max: 128 })
      .withMessage('Le nouveau mot de passe doit contenir entre 8 et 128 caractères.'),
];
