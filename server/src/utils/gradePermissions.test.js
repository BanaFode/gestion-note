import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES } from '../constants/roles.js';
import {
   canRequestGradeCorrection,
   canReviewGradeCorrectionRequest,
} from './gradePermissions.js';

test('grade correction requests are only allowed for study directors', () => {
   assert.equal(canRequestGradeCorrection(ROLES.DIRECTEUR_ETUDES), true);
   assert.equal(canRequestGradeCorrection(ROLES.ENSEIGNANT), false);
   assert.equal(canRequestGradeCorrection(ROLES.ADMIN), false);
   assert.equal(canRequestGradeCorrection(ROLES.ELEVE), false);
});

test('only an admin can approve or reject a correction request', () => {
   assert.equal(canReviewGradeCorrectionRequest(ROLES.ADMIN), true);
   assert.equal(canReviewGradeCorrectionRequest(ROLES.DIRECTEUR_ETUDES), false);
   assert.equal(canReviewGradeCorrectionRequest(ROLES.ENSEIGNANT), false);
   assert.equal(canReviewGradeCorrectionRequest(ROLES.ELEVE), false);
});
