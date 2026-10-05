import {
   getAcademicSettings,
   saveAcademicSettings,
} from '../services/academic-settings.service.js';

export const getAcademicSettingsController = async (req, res) => {
   const settings = await getAcademicSettings();
   return res.status(200).json({ success: true, data: settings });
};

export const saveAcademicSettingsController = async (req, res) => {
   const settings = await saveAcademicSettings(req.body, req.user._id);
   return res.status(200).json({ success: true, data: settings });
};
