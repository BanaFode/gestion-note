import {
   getEvaluationRoster,
   getGradesForEvaluation,
   getPendingGradeCorrectionRequests,
   lockGrade,
   requestGradeCorrection,
   reviewGradeCorrectionRequest,
   reviewGrade,
   saveDraftGrade,
   submitEvaluationGrades,
} from '../services/grade.service.js';

export const getEvaluationRosterController = async (req, res) => {
   const roster = await getEvaluationRoster(req.params.id, req.user);
   return res.status(200).json({ success: true, data: roster });
};

export const getGradesController = async (req, res) => {
   const grades = await getGradesForEvaluation(req.params.id, req.user);
   return res.status(200).json({ success: true, data: grades });
};

export const saveDraftGradeController = async (req, res) => {
   const grade = await saveDraftGrade(req.params.id, req.body, req.user);
   return res.status(200).json({ success: true, data: grade });
};

export const submitGradesController = async (req, res) => {
   const grades = await submitEvaluationGrades(req.params.id, req.user);
   return res.status(200).json({ success: true, data: grades });
};

export const reviewGradeController = async (req, res) => {
   const grade = await reviewGrade(
      req.params.id,
      req.body.decision,
      req.body.reason,
      req.user._id
   );
   return res.status(200).json({ success: true, data: grade });
};

export const lockGradeController = async (req, res) => {
   const grade = await lockGrade(req.params.id, req.user._id);
   return res.status(200).json({ success: true, data: grade });
};

export const requestGradeCorrectionController = async (req, res) => {
   const grade = await requestGradeCorrection(
      req.params.id,
      req.body.reason,
      req.user
   );
   return res.status(201).json({ success: true, data: grade });
};

export const getPendingGradeCorrectionRequestsController = async (req, res) => {
   const requests = await getPendingGradeCorrectionRequests(req.user);
   return res.status(200).json({ success: true, data: requests });
};

export const reviewGradeCorrectionRequestController = async (req, res) => {
   const grade = await reviewGradeCorrectionRequest(
      req.params.id,
      req.params.requestId,
      req.body.decision,
      req.body.reason,
      req.user
   );
   return res.status(200).json({ success: true, data: grade });
};
