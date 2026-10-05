import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
   {
      matricule: {
         type: String,
         required: [true, 'Le matricule est obligatoire'],
         trim: true,
         uppercase: true,
         unique: true,
      },

      firstName: {
         type: String,
         required: [true, 'Le prénom est obligatoire'],
         trim: true,
         minlength: 2,
         maxlength: 100,
      },

      lastName: {
         type: String,
         required: [true, 'Le nom est obligatoire'],
         trim: true,
         minlength: 2,
         maxlength: 100,
      },

      dateOfBirth: {
         type: Date,
         default: null,
      },

      placeOfBirth: {
         type: String,
         trim: true,
         default: '',
      },

      gender: {
         type: String,
         enum: ['M', 'F', 'OTHER'],
         default: null,
      },

      phone: {
         type: String,
         trim: true,
         default: '',
      },

      email: {
         type: String,
         lowercase: true,
         trim: true,
         default: null,
      },

      photo: {
         type: String,
         default: null,
      },

      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         default: undefined,
      },
   },
   {
      timestamps: true,
      autoIndex: false,
   }
);

studentSchema.index(
   { user: 1 },
   {
      unique: true,
      partialFilterExpression: { user: { $type: 'objectId' } },
   }
);

const Student = mongoose.model('Student', studentSchema);

export default Student;
