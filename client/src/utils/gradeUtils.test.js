import test from 'node:test';
import assert from 'node:assert/strict';

import {
   calculateGradeScore,
   isGradeEditable,
   pickPreferredEvaluation,
} from './gradeUtils.js';

test('calculateGradeScore uses configurable component weights', () => {
   const components = { oral: '10', written: '14', composition: '18' };

   assert.equal(calculateGradeScore(components), 14);
   assert.equal(
      calculateGradeScore(components, { oral: 1, written: 2, composition: 3 }),
      92 / 6
   );
});

test('calculateGradeScore requires complete scores and positive weights', () => {
   assert.equal(calculateGradeScore({ oral: 10, written: 12 }), null);
   assert.equal(
      calculateGradeScore(
         { oral: 10, written: 12, composition: 14 },
         { oral: 1, written: 0, composition: 1 }
      ),
      null
   );
});

test('pickPreferredEvaluation prefers the first open evaluation', () => {
   const evaluations = [
      { _id: '1', status: 'CLOSED' },
      { _id: '2', status: 'OPEN' },
      { _id: '3', status: 'OPEN' },
   ];

   assert.equal(pickPreferredEvaluation(evaluations)._id, '2');
});

test('pickPreferredEvaluation falls back to first evaluation when none are open', () => {
   const evaluations = [
      { _id: '1', status: 'CLOSED' },
      { _id: '2', status: 'CLOSED' },
   ];

   assert.equal(pickPreferredEvaluation(evaluations)._id, '1');
});

test('pickPreferredEvaluation returns null when no evaluation exists', () => {
   assert.equal(pickPreferredEvaluation([]), null);
});

test('isGradeEditable keeps local draft edits enabled before a real status is set', () => {
   assert.equal(isGradeEditable({ components: { oral: 12 } }), true);
   assert.equal(isGradeEditable({ status: 'DRAFT' }), true);
   assert.equal(isGradeEditable({ status: 'SUBMITTED' }), false);
   assert.equal(isGradeEditable({ status: 'VALIDATED' }), false);
});
