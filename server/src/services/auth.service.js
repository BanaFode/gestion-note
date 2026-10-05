import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Enrollment from '../models/Enrollment.js';
import { ROLES } from '../constants/roles.js';
import AppError from '../utils/AppError.js';
import { generateToken } from '../utils/jwt.js';
import { USER_STATUS } from '../constants/statuses.js';
import { env } from '../config/env.js';

const RESET_LINK_TTL_MS = 60 * 60 * 1000;
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
const hashResetToken = (token) => createHash('sha256').update(token).digest('hex');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
   '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export const login = async ({ email, password }) => {
   const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null }).select(
      '+password'
   );

   if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Email ou mot de passe incorrect.', 401);
   }

   if (user.status !== USER_STATUS.ACTIVE) {
      throw new AppError('Ce compte utilisateur est désactivé.', 403);
   }

   return {
      token: generateToken(user),
      user,
   };
};

export const changePassword = async (
   userId,
   { currentPassword, newPassword }
) => {
   const user = await User.findById(userId).select('+password');

   if (!user || !(await user.comparePassword(currentPassword))) {
      throw new AppError('Mot de passe actuel incorrect.', 401);
   }

   if (currentPassword === newPassword) {
      throw new AppError('Le nouveau mot de passe doit être différent.', 400);
   }

   user.password = newPassword;
   user.mustChangePassword = false;
   user.tokenVersion = (user.tokenVersion || 0) + 1;
   user.passwordResetTokenHash = undefined;
   user.passwordResetExpiresAt = undefined;
   user.passwordResetRequestedAt = undefined;
   await user.save();

   return {
      token: generateToken(user),
      user,
   };
};

export const requestPasswordReset = async (email) => {
   const user = await User.findOne({ email: email.toLowerCase(), status: USER_STATUS.ACTIVE, deletedAt: null })
      .select('+passwordResetRequestedAt');
   if (!user) return;

   const now = new Date();
   if (user.passwordResetRequestedAt && now - user.passwordResetRequestedAt < RESET_REQUEST_COOLDOWN_MS) return;

   if (!env.resendApiKey || !env.mailFrom) {
      console.error('[password-reset] Configurez RESEND_API_KEY et MAIL_FROM pour envoyer les liens.');
      return;
   }

   const token = randomBytes(32).toString('hex');
   user.passwordResetTokenHash = hashResetToken(token);
   user.passwordResetExpiresAt = new Date(now.getTime() + RESET_LINK_TTL_MS);
   user.passwordResetRequestedAt = now;
   await user.save();

   const resetUrl = `${env.clientUrl.replace(/\/$/, '')}/?resetToken=${token}`;
   const firstName = escapeHtml(user.firstName);
   try {
      const response = await fetch('https://api.resend.com/emails', {
         method: 'POST',
         headers: {
            Authorization: `Bearer ${env.resendApiKey}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            from: env.mailFrom,
            to: [user.email],
            subject: 'IPROFIC Nelson Mandela · Réinitialisation du mot de passe',
            text: `Bonjour ${user.firstName}, utilisez ce lien dans l'heure pour choisir un nouveau mot de passe : ${resetUrl}\n\nIPROFIC Nelson Mandela\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
            html: `<p>Bonjour ${firstName},</p><p>Utilisez ce lien dans l'heure pour choisir un nouveau mot de passe :</p><p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p><p>IPROFIC Nelson Mandela</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
         }),
         signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Le service d'envoi a répondu ${response.status}.`);
   } catch (error) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save();
      console.error('[password-reset] Envoi du courriel impossible:', error.message);
   }
};

export const resetPassword = async ({ token, newPassword }) => {
   const user = await User.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
      status: USER_STATUS.ACTIVE,
      deletedAt: null,
   }).select('+password +passwordResetTokenHash +passwordResetExpiresAt');

   if (!user) throw new AppError('Ce lien est invalide ou expiré. Demandez une nouvelle réinitialisation.', 400);
   if (await user.comparePassword(newPassword)) {
      throw new AppError('Le nouveau mot de passe doit être différent de l’ancien.', 400);
   }

   user.password = newPassword;
   user.mustChangePassword = false;
   user.tokenVersion = (user.tokenVersion || 0) + 1;
   user.passwordResetTokenHash = undefined;
   user.passwordResetExpiresAt = undefined;
   user.passwordResetRequestedAt = undefined;
   await user.save();
};

export const registerStudent = async ({ matricule, email, password }) => {
   const registrationError = () => new AppError(
      'Impossible de créer le compte. Vérifiez le matricule et l’adresse email, ou contactez la scolarité.',
      400
   );
   // 1. Rechercher l'élève avec son matricule
   const student = await Student.findOne({
      matricule: matricule.toUpperCase(),
   });

   if (!student) {
      throw registrationError();
   }

   if (!student.email || student.email.toLowerCase() !== email.toLowerCase()) {
      throw registrationError();
   }

   // 2. Vérifier si un compte existe déjà
   if (student.user) {
      throw registrationError();
   }

   // 3. Vérifier qu'il existe une inscription APPROVED
   const approvedEnrollment = await Enrollment.findOne({
      student: student._id,
      status: 'APPROVED',
   });

   if (!approvedEnrollment) {
      throw registrationError();
   }

   // 4. Vérifier que l'email n'est pas déjà utilisé
   const existingUser = await User.findOne({
      email: email.toLowerCase(),
   });

   if (existingUser) {
      throw registrationError();
   }

   // 5. Créer le compte
   const user = await User.create({
      firstName: student.firstName,
      lastName: student.lastName,
      email: email.toLowerCase(),
      password,
      role: ROLES.ELEVE,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: false,
   });

   // 6. Relier le compte à l'élève
   let linkedStudent;
   try {
      linkedStudent = await Student.findOneAndUpdate(
         { _id: student._id, user: null },
         { $set: { user: user._id } },
         { new: true, runValidators: true }
      );
   } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
   }

   if (!linkedStudent) {
      await User.deleteOne({ _id: user._id });
      throw registrationError();
   }

   // 7. Générer directement le token
   const token = generateToken(user);

   return {
      token,
      user,
      student: linkedStudent,
   };
};
