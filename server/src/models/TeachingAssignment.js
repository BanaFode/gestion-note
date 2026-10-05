import mongoose from 'mongoose';

const teachingAssignmentSchema = new mongoose.Schema(
   {
      teacher: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true,
         index: true,
      },
      subject: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Subject',
         required: true,
         index: true,
      },
      program: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Program',
         required: true,
         index: true,
      },
      class: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Class',
         required: true,
         index: true,
      },
      academicYear: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AcademicYear',
         required: true,
         index: true,
      },
      isActive: {
         type: Boolean,
         default: true,
      },
   },
   { timestamps: true }
);

teachingAssignmentSchema.index(
   { teacher: 1, subject: 1, class: 1, academicYear: 1 },
   { unique: true }
);

const TeachingAssignment = mongoose.model(
   'TeachingAssignment',
   teachingAssignmentSchema
);

export default TeachingAssignment;
