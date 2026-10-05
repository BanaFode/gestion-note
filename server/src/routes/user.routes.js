import { Router } from 'express';
import {
   createStaffUserController,
   createTeacherController,
   getTeachersController,
   getUsersController,
   deleteUserController,
   updateUserStatusController,
} from '../controllers/user.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
   createStaffUserValidator,
   createTeacherValidator,
   updateUserStatusValidator,
   userIdValidator,
   userListValidator,
} from '../validators/user.validator.js';

const router = Router();
const adminOnly = [authenticate, authorize(ROLES.ADMIN)];

router.post(
   '/teachers',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   createTeacherValidator,
   validate,
   createTeacherController
);
router.get(
   '/teachers',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES),
   getTeachersController
);

router.get('/', ...adminOnly, userListValidator, validate, getUsersController);
router.post(
   '/',
   ...adminOnly,
   createStaffUserValidator,
   validate,
   createStaffUserController
);
router.patch(
   '/:id/status',
   ...adminOnly,
   updateUserStatusValidator,
   validate,
   updateUserStatusController
);
router.delete('/:id', ...adminOnly, userIdValidator, validate, deleteUserController);

export default router;
