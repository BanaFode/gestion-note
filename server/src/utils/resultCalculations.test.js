import test from 'node:test';
import assert from 'node:assert/strict';

import {
   calculateModuleAverages,
   calculateOverallAverage,
   calculateRetakeAdjustedAverage,
   calculateGradeScore,
} from './resultCalculations.js';

test('grade score applies component weights and defaults to equal weights', () => {
   const components = { oral: 10, written: 14, composition: 18 };

   assert.equal(calculateGradeScore(components), 14);
   assert.equal(
      calculateGradeScore(components, { oral: 1, written: 2, composition: 3 }),
      92 / 6
   );
});

test('grade score remains unavailable for incomplete components or invalid weights', () => {
   assert.equal(calculateGradeScore({ oral: 10, written: 12 }), null);
   assert.equal(
      calculateGradeScore(
         { oral: 10, written: 12, composition: 14 },
         { oral: 1, written: 0, composition: 1 }
      ),
      null
   );
});

test('overall average applies the configured calculation method', () => {
   const subjects = [
      { normalizedAverage: 60, coefficient: 2 },
      { normalizedAverage: 90, coefficient: 1 },
   ];

   assert.equal(calculateOverallAverage(subjects, 'WEIGHTED_MEAN'), 70);
   assert.equal(calculateOverallAverage(subjects, 'ARITHMETIC_MEAN'), 75);
});

test('overall average ignores ungraded subjects and unsupported methods', () => {
   const subjects = [
      { normalizedAverage: 60, coefficient: 2 },
      { normalizedAverage: null, coefficient: 5 },
   ];

   assert.equal(calculateOverallAverage(subjects, 'ARITHMETIC_MEAN'), 60);
   assert.equal(calculateOverallAverage(subjects, 'UNSUPPORTED'), null);
   assert.equal(calculateOverallAverage([], 'WEIGHTED_MEAN'), null);
});

test('retake scores are averaged with the overall average', () => {
   assert.equal(calculateRetakeAdjustedAverage(70, [90]), 80);
   assert.equal(calculateRetakeAdjustedAverage(70, [80, 100]), 80);
   assert.equal(calculateRetakeAdjustedAverage(70, []), 70);
   assert.equal(calculateRetakeAdjustedAverage(null, [90]), null);
});

test('module averages normalize subject scales and apply coefficients', () => {
   const averages = calculateModuleAverages(
      [
         {
            scale: 20,
            coefficient: 2,
            moduleSummary: { MODULE_1: 10, MODULE_2: 18 },
         },
         {
            scale: 100,
            coefficient: 1,
            moduleSummary: { MODULE_1: 75, MODULE_2: 50 },
         },
      ],
      100
   );

   assert.equal(averages.MODULE_1, (50 * 2 + 75) / 3);
   assert.equal(averages.MODULE_2, (90 * 2 + 50) / 3);
});

test('module averages ignore subjects without a grade for that module', () => {
   const averages = calculateModuleAverages(
      [
         { scale: 20, coefficient: 3, moduleSummary: { MODULE_1: 12 } },
         { scale: 20, coefficient: 1, moduleSummary: { MODULE_2: 16 } },
      ],
      100
   );

   assert.equal(averages.MODULE_1, 60);
   assert.equal(averages.MODULE_2, 80);
});

test('module averages remain unavailable without usable grades or scale', () => {
   assert.deepEqual(
      calculateModuleAverages(
         [{ scale: 20, coefficient: 1, moduleSummary: {} }],
         100
      ),
      { MODULE_1: null, MODULE_2: null }
   );
   assert.deepEqual(
      calculateModuleAverages(
         [{ scale: 20, coefficient: 1, moduleSummary: { MODULE_1: 10 } }],
         null
      ),
      { MODULE_1: null, MODULE_2: null }
   );
});
