import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema(
   {
      label: {
         type: String,
         required: [true, "Le libellé de l'année scolaire est obligatoire"],
         trim: true,
         unique: true,
         match: [
            /^\d{4}-\d{4}$/,
            'Le format doit être YYYY-YYYY, par exemple 2026-2027',
         ],
      },

      status: {
         type: String,
         enum: ['PENDING', 'ACTIVE', 'CLOSED'],
         default: 'PENDING',
      },

      startDate: {
         type: Date,
         default: null,
      },

      endDate: {
         type: Date,
         default: null,
      },
   },
   {
      timestamps: true,
   }
);

const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);

export default AcademicYear;
