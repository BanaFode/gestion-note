import mongoose from 'mongoose';
import { GRADE_STATUS } from '../constants/statuses.js';

const gradeSchema = new mongoose.Schema(
   {
      evaluation: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Evaluation',
         required: true,
         index: true,
      },
      enrollment: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Enrollment',
         required: true,
         index: true,
      },
      score: {
         type: Number,
         default: null,
         min: [0, 'La note ne peut pas être négative.'],
      },
      components: {
         oral: {
            type: Number,
            default: null,
            min: [0, 'La note orale ne peut pas être négative.'],
         },
         written: {
            type: Number,
            default: null,
            min: [0, 'La note écrite ne peut pas être négative.'],
         },
         composition: {
            type: Number,
            default: null,
            min: [0, 'La note de composition ne peut pas être négative.'],
         },
      },
      status: {
         type: String,
         enum: Object.values(GRADE_STATUS),
         default: GRADE_STATUS.DRAFT,
         index: true,
      },
      correctionReason: {
         type: String,
         trim: true,
         default: '',
      },
      submittedAt: { type: Date, default: null },
      reviewedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         default: null,
      },
      reviewedAt: { type: Date, default: null },
      lockedAt: { type: Date, default: null },
      correctionRequests: [
         {
            requestedBy: {
               type: mongoose.Schema.Types.ObjectId,
               ref: 'User',
               required: true,
            },
            reason: {
               type: String,
               trim: true,
               required: true,
               maxlength: 500,
            },
            requestedAt: { type: Date, default: Date.now },
            status: {
               type: String,
               enum: ['PENDING', 'APPROVED', 'REJECTED'],
               default: 'PENDING',
            },
            reviewedBy: {
               type: mongoose.Schema.Types.ObjectId,
               ref: 'User',
               default: null,
            },
            reviewedAt: { type: Date, default: null },
            reviewReason: {
               type: String,
               trim: true,
               default: '',
               maxlength: 500,
            },
         },
      ],
   },
   { timestamps: true, optimisticConcurrency: true }
);

gradeSchema.index({ evaluation: 1, enrollment: 1 }, { unique: true });
gradeSchema.index({ 'correctionRequests.status': 1 });

const Grade = mongoose.model('Grade', gradeSchema);

export default Grade;
