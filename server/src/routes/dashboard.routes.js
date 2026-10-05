import { Router } from 'express';
import { getDashboardController } from '../controllers/dashboard.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.get(
   '/me',
   authenticate,
   authorize(...Object.values(ROLES)),
   getDashboardController
);

export default router;
