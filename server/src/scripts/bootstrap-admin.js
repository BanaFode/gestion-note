import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/statuses.js';
import User from '../models/User.js';

const bootstrapAdmin = async () => {
   const { ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } =
      process.env;

   if (!ADMIN_FIRST_NAME || !ADMIN_LAST_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error(
         'Définissez ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL et ADMIN_PASSWORD avant le bootstrap.'
      );
   }

   if (ADMIN_PASSWORD.length < 12) {
      throw new Error('ADMIN_PASSWORD doit contenir au moins 12 caractères.');
   }

   await mongoose.connect(env.mongodbUri);

   const [existingAdmin, existingUserCount] = await Promise.all([
      User.findOne({ role: ROLES.ADMIN, deletedAt: null }),
      User.countDocuments({ deletedAt: null }),
   ]);
   if (existingAdmin) {
      console.log('Un Administrateur général existe déjà. Aucun changement effectué.');
      return;
   }

   if (existingUserCount > 0) {
      throw new Error(
         'La base contient déjà des comptes sans Administrateur général. Le bootstrap initial est refusé.'
      );
   }

   const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();
   const existingEmail = await User.findOne({ email: normalizedEmail });
   if (existingEmail) {
      throw new Error('ADMIN_EMAIL est déjà utilisé par un autre compte.');
   }

   await User.create({
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      email: normalizedEmail,
      password: ADMIN_PASSWORD,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: true,
   });

   console.log(`Compte Administrateur général créé pour ${normalizedEmail}.`);
};

try {
   await bootstrapAdmin();
} catch (error) {
   console.error(error.message);
   process.exitCode = 1;
} finally {
   await mongoose.disconnect();
}
