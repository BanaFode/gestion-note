import mongoose from 'mongoose';
import { EVALUATION_PERIOD } from '../constants/statuses.js';

const subjectConfigurationSchema = new mongoose.Schema(
   {
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
      level: {
         type: String,
         required: [true, 'Le niveau est obligatoire.'],
         trim: true,
         maxlength: 50,
      },
      module: {
         type: String,
         enum: Object.values(EVALUATION_PERIOD),
         required: [true, 'Le module est obligatoire.'],
         index: true,
      },
      subject: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Subject',
         required: true,
         index: true,
      },
      coefficient: {
         type: Number,
         required: true,
         min: [Number.MIN_VALUE, 'Le coefficient doit être supérieur à zéro.'],
      },
      calculationRules: {
         type: mongoose.Schema.Types.Mixed,
         required: [true, 'Les règles de calcul doivent être configurées.'],
      },
   },
   { timestamps: true }
);

subjectConfigurationSchema.index(
   { academicYear: 1, program: 1, level: 1, subject: 1 },
   { unique: true }
);
subjectConfigurationSchema.index({
   academicYear: 1,
   program: 1,
   level: 1,
   module: 1,
});

const SubjectConfiguration = mongoose.model(
   'SubjectConfiguration',
   subjectConfigurationSchema
);

export default SubjectConfiguration;
