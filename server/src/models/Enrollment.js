import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
   {
      student: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Student',
         required: true,
         index: true,
      },

      academicYear: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'AcademicYear',
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

      status: {
         type: String,
         enum: ['PENDING', 'APPROVED', 'REJECTED'],
         default: 'PENDING',
         index: true,
      },

      administrativeInfo: {
         registrationDate: {
            type: Date,
            default: Date.now,
         },

         registrationNumber: {
            type: String,
            trim: true,
            default: '',
         },

         observation: {
            type: String,
            trim: true,
            default: '',
         },
      },

      submittedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true,
      },

      reviewedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         default: null,
      },

      reviewedAt: {
         type: Date,
         default: null,
      },

      rejectionReason: {
         type: String,
         trim: true,
         default: '',
      },
   },
   {
      timestamps: true,
   }
);

/**
 * Un élève ne peut normalement avoir qu'une
 * inscription dans une même année scolaire.
 */
enrollmentSchema.index(
   {
      student: 1,
      academicYear: 1,
   },
   {
      unique: true,
   }
);

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
