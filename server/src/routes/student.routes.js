import express from 'express';

import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';

import {
   createStudentValidator,
   studentIdValidator,
} from '../validators/student.validator.js';

import {
   createStudentController,
   getStudentsController,
   getStudentController,
   getStudentByMatriculeController,
   getMyStudentProfileController,
   deleteStudentController,
} from '../controllers/student.controller.js';

import { ROLES } from '../constants/roles.js';

const router = express.Router();

router.get(
   '/me',
   authenticate,
   authorize(ROLES.ELEVE),
   getMyStudentProfileController
);

/**
 * GET /api/students
 * Liste des élèves
 */
router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_SCOLARITE, ROLES.DIRECTEUR_ETUDES),
   getStudentsController
);

/**
 * GET /api/students/matricule/:matricule
 */
router.get(
   '/matricule/:matricule',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_SCOLARITE, ROLES.DIRECTEUR_ETUDES),
   getStudentByMatriculeController
);

/**
 * GET /api/students/:id
 */
router.get(
   '/:id',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_SCOLARITE, ROLES.DIRECTEUR_ETUDES),
   studentIdValidator,
   validate,
   getStudentController
);

/**
 * POST /api/students
 * Seule la scolarité crée un élève.
 */
router.post(
   '/',
   authenticate,
   authorize(ROLES.DIRECTEUR_SCOLARITE),
   createStudentValidator,
   validate,
   createStudentController
);

router.delete(
   '/:id',
   authenticate,
   authorize(ROLES.ADMIN),
   studentIdValidator,
   validate,
   deleteStudentController
);

export default router;
