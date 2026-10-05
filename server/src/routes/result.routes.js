import { Router } from 'express';
import {
   getEnrollmentResultController,
   finalizeResultsController,
   getMyResultsController,
   getTeacherClassResultsController,
} from '../controllers/result.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
   enrollmentResultIdValidator,
   finalizeResultsValidator,
   myResultsValidator,
   teacherResultsValidator,
} from '../validators/result.validator.js';

const router = Router();

router.post(
   '/finalize',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   finalizeResultsValidator,
   validate,
   finalizeResultsController
);

router.get(
   '/my',
   authenticate,
   authorize(ROLES.ELEVE),
   myResultsValidator,
   validate,
   getMyResultsController
);
router.get(
   '/teacher',
   authenticate,
   authorize(ROLES.ENSEIGNANT),
   teacherResultsValidator,
   validate,
   getTeacherClassResultsController
);
router.get(
   '/enrollments/:id',
   authenticate,
   authorize(
      ROLES.ADMIN,
      ROLES.DIRECTEUR_ETUDES,
      ROLES.ENSEIGNANT,
      ROLES.ELEVE
   ),
   enrollmentResultIdValidator,
   validate,
   getEnrollmentResultController
);

export default router;
