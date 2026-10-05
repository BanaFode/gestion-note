import { body, param } from 'express-validator';

export const createStudentValidator = [
   body('matricule')
      .trim()
      .notEmpty()
      .withMessage('Le matricule est obligatoire.')
      .isLength({ min: 3, max: 30 })
      .withMessage('Le matricule doit contenir entre 3 et 30 caractères.'),

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

   body('dateOfBirth')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('La date de naissance est invalide.'),

   body('gender')
      .optional({ nullable: true, checkFalsy: true })
      .isIn(['M', 'F', 'OTHER'])
      .withMessage('Le sexe doit être M, F.'),

   body('email')
      .trim()
      .notEmpty()
      .withMessage("L'adresse email est obligatoire pour créer le compte élève.")
      .isEmail()
      .withMessage("L'adresse email est invalide.")
      .toLowerCase(),

   body('phone').optional().trim(),

   body('placeOfBirth').optional().trim(),

   body('photo').optional().trim(),
];

export const studentIdValidator = [
   param('id')
      .isMongoId()
      .withMessage("L'identifiant de l'élève est invalide."),
];
