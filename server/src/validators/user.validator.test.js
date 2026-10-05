import test from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import { createTeacherValidator } from './user.validator.js';

const validateTeacher = async (phone) => {
   const request = {
      body: {
         firstName: 'Ada',
         lastName: 'Lovelace',
         email: 'ada@example.com',
         ...(phone === undefined ? {} : { phone }),
      },
   };
   await Promise.all(
      createTeacherValidator.map((validator) => validator.run(request))
   );
   return validationResult(request).array();
};

test('teacher creation accepts an international phone number', async () => {
   assert.deepEqual(await validateTeacher('+225 07 00 00 00 00'), []);
});

test('teacher creation requires a valid phone number', async () => {
   for (const phone of [undefined, 'abc1234567', '12345']) {
      assert.ok((await validateTeacher(phone)).some((error) => error.path === 'phone'));
   }
});
