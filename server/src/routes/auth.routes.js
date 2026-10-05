import { Router } from 'express';
import {
   changePasswordController,
   forgotPasswordController,
   loginController,
   registerStudentController,
   resetPasswordController,
} from '../controllers/auth.controller.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import rateLimit from '../middleware/rate-limit.js';
import {
   changePasswordValidator,
   forgotPasswordValidator,
   loginValidator,
   registerStudentValidator,
   resetPasswordValidator,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', rateLimit({ limit: 10, windowMs: 15 * 60 * 1000, keyPrefix: 'login' }), loginValidator, validate, loginController);
router.post('/forgot-password', rateLimit({ limit: 3, windowMs: 15 * 60 * 1000, keyPrefix: 'forgot-password' }), forgotPasswordValidator, validate, forgotPasswordController);
router.post('/reset-password', rateLimit({ limit: 10, windowMs: 15 * 60 * 1000, keyPrefix: 'reset-password' }), resetPasswordValidator, validate, resetPasswordController);
router.post(
   '/change-password',
   authenticate,
   changePasswordValidator,
   validate,
   changePasswordController
);
router.post(
   '/register-student',
   rateLimit({ limit: 5, windowMs: 60 * 60 * 1000, keyPrefix: 'register-student' }),
   registerStudentValidator,
   validate,
   registerStudentController
);

export default router;
