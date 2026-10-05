import { Router } from 'express';
import {
   createSubjectController,
   getSubjectConfigurationsController,
   getSubjectsController,
   updateSubjectController,
} from '../controllers/subject.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
   createSubjectValidator,
   subjectConfigurationListValidator,
   subjectIdValidator,
   updateSubjectValidator,
} from '../validators/subject.validator.js';

const router = Router();
const administrators = [ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES];

router.get(
   '/',
   authenticate,
   authorize(...administrators),
   getSubjectsController
);
router.post(
   '/',
   authenticate,
   authorize(...administrators),
   createSubjectValidator,
   validate,
   createSubjectController
);
router.patch(
   '/:id',
   authenticate,
   authorize(...administrators),
   updateSubjectValidator,
   validate,
   updateSubjectController
);

router.get(
   '/configurations',
   authenticate,
   authorize(...administrators),
   subjectConfigurationListValidator,
   validate,
   getSubjectConfigurationsController
);
export default router;
