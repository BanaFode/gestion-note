import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: [true, 'Le nom de la matière est obligatoire.'],
         trim: true,
         minlength: 2,
         maxlength: 150,
      },
      code: {
         type: String,
         required: [true, 'Le code de la matière est obligatoire.'],
         trim: true,
         uppercase: true,
         maxlength: 30,
         unique: true,
      },
      description: {
         type: String,
         trim: true,
         default: '',
      },
      isActive: {
         type: Boolean,
         default: true,
      },
   },
   { timestamps: true }
);

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
