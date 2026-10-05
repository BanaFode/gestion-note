import { getDashboard } from '../services/dashboard.service.js';
import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';

export const getDashboardController = async (req, res) => {
   const academicYearId = req.query.academicYear;
   if (academicYearId && !mongoose.isValidObjectId(academicYearId)) {
      throw new AppError('L’identifiant de l’année scolaire est invalide.', 400);
   }
   const dashboard = await getDashboard(req.user, academicYearId);
   return res.status(200).json({ success: true, data: dashboard });
};
