import { Router } from 'express';
import { getAuditLogsController } from '../controllers/audit.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { auditLogListValidator } from '../validators/audit.validator.js';

const router = Router();

router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN),
   auditLogListValidator,
   validate,
   getAuditLogsController
);

export default router;
