export const USER_STATUS = Object.freeze({
   ACTIVE: 'ACTIVE',
   BLOCKED: 'BLOCKED',
   DISABLED: 'DISABLED',
});

export const ACADEMIC_YEAR_STATUS = Object.freeze({
   PENDING: 'PENDING',
   ACTIVE: 'ACTIVE',
   CLOSED: 'CLOSED',
});

export const ENROLLMENT_STATUS = Object.freeze({
   PENDING: 'PENDING',
   APPROVED: 'APPROVED',
   REJECTED: 'REJECTED',
});

export const GRADE_STATUS = Object.freeze({
   DRAFT: 'DRAFT',
   SUBMITTED: 'SUBMITTED',
   NEEDS_CORRECTION: 'NEEDS_CORRECTION',
   VALIDATED: 'VALIDATED',
   LOCKED: 'LOCKED',
});

export const RESULT_STATUS = Object.freeze({
   PROVISIONAL: 'PROVISIONAL',
   FINAL: 'FINAL',
});

export const RESULT_DECISION = Object.freeze({
   ADMIS: 'ADMIS',
   NON_ADMIS: 'NON_ADMIS',
});

export const EVALUATION_TYPE = Object.freeze({
   NORMAL: 'NORMAL',
   RETAKE: 'RETAKE',
});

export const EVALUATION_PERIOD = Object.freeze({
   MODULE_1: 'MODULE_1',
   MODULE_2: 'MODULE_2',
});
