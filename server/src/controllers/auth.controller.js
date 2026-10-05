import {
   changePassword,
   requestPasswordReset,
   login,
   registerStudent,
   resetPassword,
} from '../services/auth.service.js';

export const loginController = async (req, res) => {
   const result = await login(req.body);

   return res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
      data: result,
   });
};

export const registerStudentController = async (req, res) => {
   const result = await registerStudent(req.body);

   return res.status(201).json({
      success: true,
      message: 'Compte élève créé avec succès.',
      data: result,
   });
};

export const changePasswordController = async (req, res) => {
   const result = await changePassword(req.user._id, req.body);

   return res.status(200).json({
      success: true,
      message: 'Mot de passe modifié avec succès.',
      data: result,
   });
};

export const forgotPasswordController = async (req, res) => {
   await requestPasswordReset(req.body.email);
   return res.status(200).json({
      success: true,
      message: 'Si un compte actif correspond à cette adresse, un lien de réinitialisation lui sera envoyé.',
      data: null,
   });
};

export const resetPasswordController = async (req, res) => {
   await resetPassword(req.body);
   return res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.',
      data: null,
   });
};
