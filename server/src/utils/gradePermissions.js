import { ROLES } from '../constants/roles.js';

export const canRequestGradeCorrection = (role) =>
   role === ROLES.DIRECTEUR_ETUDES;

export const canReviewGradeCorrectionRequest = (role) => role === ROLES.ADMIN;
