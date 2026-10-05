import { Router } from 'express';
import {
   closeEvaluationController,
   createEvaluationController,
   getEvaluationController,
   getEvaluationsController,
} from '../controllers/evaluation.controller.js';
import {
   getEvaluationRosterController,
   getGradesController,
   saveDraftGradeController,
   submitGradesController,
} from '../controllers/grade.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
   createEvaluationValidator,
   evaluationIdValidator,
   evaluationListValidator,
} from '../validators/evaluation.validator.js';
import { saveDraftGradeValidator } from '../validators/grade.validator.js';

const router = Router();

router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES, ROLES.ENSEIGNANT),
   evaluationListValidator,
   validate,
   getEvaluationsController
);
router.post(
   '/',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   createEvaluationValidator,
   validate,
   createEvaluationController
);
router.get(
   '/:id',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES, ROLES.ENSEIGNANT),
   evaluationIdValidator,
   validate,
   getEvaluationController
);
router.patch(
   '/:id/close',
   authenticate,
   authorize(ROLES.DIRECTEUR_ETUDES),
   evaluationIdValidator,
   validate,
   closeEvaluationController
);
router.get(
   '/:id/grades',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES, ROLES.ENSEIGNANT),
   evaluationIdValidator,
   validate,
   getGradesController
);
router.get(
   '/:id/roster',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES, ROLES.ENSEIGNANT),
   evaluationIdValidator,
   validate,
   getEvaluationRosterController
);
router.post(
   '/:id/grades',
   authenticate,
   authorize(ROLES.ENSEIGNANT),
   saveDraftGradeValidator,
   validate,
   saveDraftGradeController
);
router.patch(
   '/:id/submit',
   authenticate,
   authorize(ROLES.ENSEIGNANT),
   evaluationIdValidator,
   validate,
   submitGradesController
);

export default router;
