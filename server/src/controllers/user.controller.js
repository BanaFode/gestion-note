import {
   createStaffUser,
   getUsers,
   updateUserStatus,
   deleteUser,
} from '../services/user.service.js';
import { ROLES } from '../constants/roles.js';
import User from '../models/User.js';

export const getTeachersController = async (_req, res) => {
   const teachers = await User.find({ role: ROLES.ENSEIGNANT, status: 'ACTIVE', deletedAt: null })
      .sort({ lastName: 1, firstName: 1 });
   return res.status(200).json({ success: true, data: teachers });
};

export const getUsersController = async (req, res) => {
   const users = await getUsers({
      role: req.query.role,
      status: req.query.status,
   });

   return res.status(200).json({
      success: true,
      message: 'Liste des utilisateurs récupérée.',
      data: users,
   });
};

export const createStaffUserController = async (req, res) => {
   const result = await createStaffUser(req.body, req.user._id);

   return res.status(201).json({
      success: true,
      message: 'Compte créé. Le mot de passe temporaire doit être transmis de manière sécurisée.',
      data: result,
   });
};

export const createTeacherController = async (req, res) => {
   const result = await createStaffUser(
      { ...req.body, role: ROLES.ENSEIGNANT },
      req.user._id
   );

   return res.status(201).json({
      success: true,
      message: 'Compte enseignant créé avec un mot de passe temporaire.',
      data: result,
   });
};

export const updateUserStatusController = async (req, res) => {
   const user = await updateUserStatus(
      req.params.id,
      req.body.status,
      req.user._id
   );

   return res.status(200).json({
      success: true,
      message: 'Statut utilisateur mis à jour.',
      data: user,
   });
};

export const deleteUserController = async (req, res) => {
   await deleteUser(req.params.id, req.user._id);
   return res.status(200).json({ success: true, message: 'Compte supprimé.' });
};
