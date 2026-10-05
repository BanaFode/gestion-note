import {
   closeEvaluation,
   createEvaluation,
   getEvaluation,
   getEvaluations,
} from '../services/evaluation.service.js';

export const createEvaluationController = async (req, res) => {
   const evaluation = await createEvaluation(req.body, req.user._id);
   return res.status(201).json({ success: true, data: evaluation });
};

export const getEvaluationsController = async (req, res) => {
   const evaluations = await getEvaluations(req.query, req.user);
   return res.status(200).json({ success: true, data: evaluations });
};

export const getEvaluationController = async (req, res) => {
   const evaluation = await getEvaluation(req.params.id, req.user);
   return res.status(200).json({ success: true, data: evaluation });
};

export const closeEvaluationController = async (req, res) => {
   const evaluation = await closeEvaluation(req.params.id, req.user._id);
   return res.status(200).json({ success: true, data: evaluation });
};
