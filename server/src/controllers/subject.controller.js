import {
   createSubject,
   getSubjectConfigurations,
   getSubjects,
   updateSubject,
} from '../services/subject.service.js';

export const getSubjectsController = async (_req, res) => {
   const subjects = await getSubjects();
   return res.status(200).json({ success: true, data: subjects });
};

export const createSubjectController = async (req, res) => {
   const subject = await createSubject(req.body, req.user._id);
   return res.status(201).json({ success: true, data: subject });
};

export const updateSubjectController = async (req, res) => {
   const subject = await updateSubject(req.params.id, req.body, req.user._id);
   return res.status(200).json({ success: true, data: subject });
};

export const getSubjectConfigurationsController = async (req, res) => {
   const configurations = await getSubjectConfigurations(req.query);
   return res.status(200).json({ success: true, data: configurations });
};
