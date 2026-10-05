import { randomInt } from 'node:crypto';
import User from '../models/User.js';
import { ROLE_VALUES, ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/statuses.js';
import AppError from '../utils/AppError.js';
import AuditLog from '../models/AuditLog.js';
import Student from '../models/Student.js';
import { retireUserAccount } from './account-retirement.js';

const STAFF_ROLES = ROLE_VALUES.filter((role) => role !== ROLES.ELEVE);
const CONSONANTS = 'bcdfghjkmnpqrstvwxyz';
const VOWELS = 'aeou';

const createTemporaryPassword = () => {
   const syllable = () =>
      CONSONANTS[randomInt(CONSONANTS.length)] +
      VOWELS[randomInt(VOWELS.length)] +
      CONSONANTS[randomInt(CONSONANTS.length)];

   return `${syllable()}${syllable()}${syllable()}${String(randomInt(100)).padStart(2, '0')}`;
};

export const getUsers = async ({ role, status } = {}) => {
   const filter = { deletedAt: null };

   if (role) filter.role = role;
   if (status) filter.status = status;

   return User.find(filter).sort({ lastName: 1, firstName: 1 });
};

export const createStaffUser = async (
   { firstName, lastName, email, role, phone },
   actorId
) => {
   if (!STAFF_ROLES.includes(role)) {
      throw new AppError('Le rôle demandé ne peut pas être créé ici.', 400);
   }

   const temporaryPassword = createTemporaryPassword();
   const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      ...(phone ? { phone } : {}),
      password: temporaryPassword,
      role,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: true,
   });

   try {
      await AuditLog.create({
         actor: actorId,
         action: 'USER_CREATED',
         entityType: 'User',
         entityId: user._id,
         newValue: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status,
         },
      });
   } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
   }

   return { user, temporaryPassword };
};

export const updateUserStatus = async (userId, status, requesterId) => {
   if (!Object.values(USER_STATUS).includes(status)) {
      throw new AppError('Le statut utilisateur est invalide.', 400);
   }

   const user = await User.findById(userId);
   if (!user || user.deletedAt) {
      throw new AppError('Utilisateur introuvable.', 404);
   }

   if (
      user._id.toString() === requesterId.toString() &&
      status !== USER_STATUS.ACTIVE
   ) {
      throw new AppError(
         'Vous ne pouvez pas désactiver votre propre compte.',
         400
      );
   }

   if (
      user.role === ROLES.ADMIN &&
      user.status === USER_STATUS.ACTIVE &&
      status !== USER_STATUS.ACTIVE
   ) {
      const activeAdminCount = await User.countDocuments({
         role: ROLES.ADMIN,
         status: USER_STATUS.ACTIVE,
      });

      if (activeAdminCount <= 1) {
         throw new AppError(
            'Le dernier compte ADMIN actif ne peut pas être désactivé.',
            409
         );
      }
   }

   const previousStatus = user.status;
   user.status = status;
   const log = await AuditLog.create({
      actor: requesterId,
      action: 'USER_STATUS_CHANGED',
      entityType: 'User',
      entityId: user._id,
      oldValue: { status: previousStatus },
      newValue: { status },
   });
   try {
      await user.save();
   } catch (error) {
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }
   return user;
};

export const deleteUser = async (userId, requesterId) => {
   if (userId.toString() === requesterId.toString()) {
      throw new AppError('Vous ne pouvez pas supprimer votre propre compte.', 400);
   }
   const user = await User.findById(userId);
   if (!user) throw new AppError('Utilisateur introuvable.', 404);

   if (user.role === ROLES.ADMIN && user.status === USER_STATUS.ACTIVE) {
      const activeAdminCount = await User.countDocuments({ role: ROLES.ADMIN, status: USER_STATUS.ACTIVE });
      if (activeAdminCount <= 1) throw new AppError('Le dernier compte ADMIN actif ne peut pas être supprimé.', 409);
   }

   const linkedStudent = await Student.findOne({ user: user._id });
   const log = await AuditLog.create({
      actor: requesterId,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: user._id,
      oldValue: { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, status: user.status },
   });
   try {
      // Remove only the login account; preserve the student file and all academic records.
      if (linkedStudent) await Student.updateOne({ _id: linkedStudent._id }, { $unset: { user: 1 } });
      await retireUserAccount(user);
   } catch (error) {
      if (linkedStudent) await Student.updateOne({ _id: linkedStudent._id }, { $set: { user: user._id } });
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }
};
