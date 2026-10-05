import express from 'express';

import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';

import { ROLES } from '../constants/roles.js';

import {
   createEnrollmentValidator,
   enrollmentListValidator,
   enrollmentIdValidator,
   reviewEnrollmentValidator,
   resubmitEnrollmentValidator,
} from '../validators/enrollment.validator.js';

import {
   createEnrollmentController,
   getEnrollmentsController,
   getEnrollmentController,
   reviewEnrollmentController,
   resubmitEnrollmentController,
} from '../controllers/enrollment.controller.js';

const router = express.Router();

/**
 * GET /api/enrollments
 *
 * Consultation des inscriptions.
 */
router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_SCOLARITE, ROLES.DIRECTEUR_ETUDES),
   enrollmentListValidator,
   validate,
   getEnrollmentsController
);

/**
 * GET /api/enrollments/:id
 */
router.get(
   '/:id',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_SCOLARITE, ROLES.DIRECTEUR_ETUDES),
   enrollmentIdValidator,
   validate,
   getEnrollmentController
);

/**
 * POST /api/enrollments
 *
 * Création par la scolarité.
 */
router.post(
   '/',
   authenticate,
   authorize(ROLES.DIRECTEUR_SCOLARITE),
   createEnrollmentValidator,
   validate,
   createEnrollmentController
);

/**
 * PATCH /api/enrollments/:id/review
 *
 * Approbation ou rejet par ADMIN uniquement.
 */
router.patch(
   '/:id/review',
   authenticate,
   authorize(ROLES.ADMIN),
   enrollmentIdValidator,
   reviewEnrollmentValidator,
   validate,
   reviewEnrollmentController
);

/**
 * PATCH /api/enrollments/:id/resubmit
 *
 * Correction + resoumission par la scolarité.
 */
router.patch(
   '/:id/resubmit',
   authenticate,
   authorize(ROLES.DIRECTEUR_SCOLARITE),
   resubmitEnrollmentValidator,
   validate,
   resubmitEnrollmentController
);

export default router;
