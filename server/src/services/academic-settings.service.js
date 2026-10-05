import GlobalScale from '../models/GlobalScale.js';
import AuditLog from '../models/AuditLog.js';
import AppError from '../utils/AppError.js';

export const getAcademicSettings = () => GlobalScale.findOne({ key: 'GLOBAL' });

export const saveAcademicSettings = async (data, actorId) => {
   if (data.admissionThreshold > data.resultScale) {
      throw new AppError('Le seuil d’admission dépasse le barème global.', 400);
   }

   let settings = await getAcademicSettings();
   const oldValue = settings ? settings.toObject() : null;
   if (!settings) settings = new GlobalScale({ ...data, key: 'GLOBAL' });
   else Object.assign(settings, data);

   const log = await AuditLog.create({
      actor: actorId,
      action: 'GLOBAL_SETTINGS_UPDATED',
      entityType: 'GlobalScale',
      entityId: settings._id,
      oldValue,
      newValue: data,
   });
   try {
      await settings.save();
   } catch (error) {
      await AuditLog.deleteOne({ _id: log._id });
      throw error;
   }

   return settings;
};
