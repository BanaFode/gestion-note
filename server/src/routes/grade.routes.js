import { Router } from 'express';
import {
   getPendingGradeCorrectionRequestsController,
   lockGradeController,
   requestGradeCorrectionController,
   reviewGradeCorrectionRequestController,
   reviewGradeController,
} from '../controllers/grade.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
   correctionRequestValidator,
   gradeIdValidator,
   reviewCorrectionRequestValidator,
   reviewGradeValidator,
} from '../validators/grade.validator.js';

const router = Router();

router.get(
   '/correction-requests',
   authenticate,
   authorize(ROLES.ADMIN),
   getPendingGradeCorrectionRequestsController
);
router.post(
   '/:id/correction-requests',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   correctionRequestValidator,
   validate,
   requestGradeCorrectionController
);
router.patch(
   '/:id/correction-requests/:requestId/review',
   authenticate,
   authorize(ROLES.ADMIN),
   reviewCorrectionRequestValidator,
   validate,
   reviewGradeCorrectionRequestController
);
router.patch(
   '/:id/review',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   reviewGradeValidator,
   validate,
   reviewGradeController
);
router.patch(
   '/:id/lock',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   gradeIdValidator,
   validate,
   lockGradeController
);
export default router;
