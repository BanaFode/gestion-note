import { randomBytes } from 'node:crypto';
import { USER_STATUS } from '../constants/statuses.js';

/** Retire la connexion tout en conservant les références historiques vers le compte. */
export const retireUserAccount = async (user, deletedAt = new Date()) => {
   user.firstName = 'Compte';
   user.lastName = 'supprimé';
   user.email = `deleted-${user._id}@deleted.invalid`;
   user.password = randomBytes(48).toString('base64url');
   user.status = USER_STATUS.DISABLED;
   user.mustChangePassword = false;
   user.deletedAt = deletedAt;
   user.tokenVersion = (user.tokenVersion || 0) + 1;
   user.passwordResetTokenHash = undefined;
   user.passwordResetExpiresAt = undefined;
   user.passwordResetRequestedAt = undefined;
   await user.save();
   return user;
};
