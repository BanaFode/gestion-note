import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { ROLE_VALUES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/statuses.js';

const userSchema = new mongoose.Schema(
   {
      firstName: {
         type: String,
         required: [true, 'Le prénom est obligatoire.'],
         trim: true,
         minlength: 2,
         maxlength: 100,
      },
      lastName: {
         type: String,
         required: [true, 'Le nom est obligatoire.'],
         trim: true,
         minlength: 2,
         maxlength: 100,
      },
      email: {
         type: String,
         required: [true, "L'adresse email est obligatoire."],
         lowercase: true,
         trim: true,
         unique: true,
      },
      phone: {
         type: String,
         trim: true,
         maxlength: 30,
         default: '',
      },
      password: {
         type: String,
         required: [true, 'Le mot de passe est obligatoire.'],
         minlength: 8,
         select: false,
      },
      role: {
         type: String,
         enum: ROLE_VALUES,
         required: true,
      },
      status: {
         type: String,
         enum: Object.values(USER_STATUS),
         default: USER_STATUS.ACTIVE,
         index: true,
      },
      mustChangePassword: {
         type: Boolean,
         default: false,
      },
      tokenVersion: {
         type: Number,
         default: 0,
      },
      deletedAt: {
         type: Date,
         default: null,
         index: true,
      },
      passwordResetTokenHash: {
         type: String,
         select: false,
         index: true,
      },
      passwordResetExpiresAt: {
         type: Date,
         select: false,
      },
      passwordResetRequestedAt: {
         type: Date,
         select: false,
      },
   },
   {
      timestamps: true,
      toJSON: {
         transform(_document, result) {
            delete result.password;
            delete result.__v;
            return result;
         },
      },
   }
);

userSchema.pre('save', async function hashPassword() {
   if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, 12);
   }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
   return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
