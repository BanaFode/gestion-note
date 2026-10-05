import {
   createTeachingAssignment,
   getTeachingAssignments,
} from '../services/subject.service.js';

export const getTeachingAssignmentsController = async (req, res) => {
   const assignments = await getTeachingAssignments(req.query, req.user);
   return res.status(200).json({ success: true, data: assignments });
};

export const createTeachingAssignmentController = async (req, res) => {
   const assignment = await createTeachingAssignment(req.body, req.user._id);
   return res.status(201).json({ success: true, data: assignment });
};
