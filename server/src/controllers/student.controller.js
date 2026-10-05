import {
   createStudent,
   getAllStudents,
   getStudentById,
   getStudentByMatricule,
   getStudentProfileByUser,
   deleteStudent,
} from '../services/student.service.js';

export const getMyStudentProfileController = async (req, res) => {
   const profile = await getStudentProfileByUser(req.user._id);
   return res.status(200).json({
      success: true,
      message: 'Profil scolaire récupéré.',
      data: profile,
   });
};

export const createStudentController = async (req, res) => {
   const student = await createStudent(req.body, req.user._id);

   return res.status(201).json({
      success: true,
      message: 'Élève créé avec succès.',
      data: student,
   });
};

export const getStudentsController = async (req, res) => {
   const students = await getAllStudents({
      search: req.query.search,
   });

   return res.status(200).json({
      success: true,
      message: 'Liste des élèves récupérée avec succès.',
      data: students,
   });
};

export const getStudentController = async (req, res) => {
   const student = await getStudentById(req.params.id);

   return res.status(200).json({
      success: true,
      message: 'Élève récupéré avec succès.',
      data: student,
   });
};

export const getStudentByMatriculeController = async (req, res) => {
   const student = await getStudentByMatricule(req.params.matricule);

   return res.status(200).json({
      success: true,
      message: 'Élève récupéré avec succès.',
      data: student,
   });
};

export const deleteStudentController = async (req, res) => {
   const removed = await deleteStudent(req.params.id, req.user._id);
   return res.status(200).json({ success: true, message: 'Élève et données associées supprimés.', data: removed });
};
