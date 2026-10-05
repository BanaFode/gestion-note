import {
   getMyResults,
   getResultForEnrollment,
   getTeacherClassResults,
   finalizeResults,
} from '../services/result.service.js';

export const getMyResultsController = async (req, res) => {
   const results = await getMyResults(req.user, req.query.academicYear);
   return res.status(200).json({ success: true, data: results });
};

export const getEnrollmentResultController = async (req, res) => {
   const result = await getResultForEnrollment(req.params.id, req.user);
   return res.status(200).json({ success: true, data: result });
};

export const getTeacherClassResultsController = async (req, res) => {
   const results = await getTeacherClassResults(
      req.user,
      req.query.academicYear
   );
   return res.status(200).json({ success: true, data: results });
};

export const finalizeResultsController = async (req, res) => {
   const result = await finalizeResults(req.user, req.body);
   return res.status(200).json({ success: true, data: result });
};
