import { Router } from 'express';
import {
   getAcademicSettingsController,
   saveAcademicSettingsController,
} from '../controllers/academic-settings.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { saveAcademicSettingsValidator } from '../validators/academic-settings.validator.js';

const router = Router();

router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES),
   getAcademicSettingsController
);
router.put(
   '/',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   saveAcademicSettingsValidator,
   validate,
   saveAcademicSettingsController
);

export default router;
