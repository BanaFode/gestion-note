import { Router } from 'express';
import {
   createTeachingAssignmentController,
   getTeachingAssignmentsController,
} from '../controllers/teaching-assignment.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
   createTeachingAssignmentValidator,
   teachingAssignmentListValidator,
} from '../validators/subject.validator.js';

const router = Router();

router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES, ROLES.ENSEIGNANT),
   teachingAssignmentListValidator,
   validate,
   getTeachingAssignmentsController
);
router.post(
   '/',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   createTeachingAssignmentValidator,
   validate,
   createTeachingAssignmentController
);

export default router;
