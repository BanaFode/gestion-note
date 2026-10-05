import mongoose from 'mongoose';

const programSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: [true, 'Le nom de la filière est obligatoire'],
         trim: true,
         unique: true,
         minlength: 2,
         maxlength: 150,
      },

      code: {
         type: String,
         required: [true, 'Le code de la filière est obligatoire'],
         trim: true,
         uppercase: true,
         unique: true,
         maxlength: 30,
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
   {
      timestamps: true,
   }
);

const Program = mongoose.model('Program', programSchema);

export default Program;
