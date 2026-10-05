import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: [true, 'Le nom de la classe est obligatoire'],
         trim: true,
         maxlength: 100,
      },

      level: {
         type: String,
         required: [true, 'Le niveau est obligatoire'],
         trim: true,
         maxlength: 50,
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

      capacity: {
         type: Number,
         min: 1,
         default: 50,
      },

      isActive: {
         type: Boolean,
         default: true,
      },
   },
   {
      timestamps: true,
   }
);

classSchema.index(
   {
      academicYear: 1,
      program: 1,
      name: 1,
   },
   {
      unique: true,
   }
);

const SchoolClass = mongoose.model('Class', classSchema);

export default SchoolClass;
