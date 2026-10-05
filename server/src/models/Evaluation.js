import mongoose from 'mongoose';
import { EVALUATION_PERIOD, EVALUATION_TYPE } from '../constants/statuses.js';

const evaluationSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: [true, 'Le nom de l’évaluation est obligatoire.'],
         trim: true,
         maxlength: 150,
      },
      assignment: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'TeachingAssignment',
         required: true,
         index: true,
      },
      type: {
         type: String,
         enum: Object.values(EVALUATION_TYPE),
         default: EVALUATION_TYPE.NORMAL,
      },
      period: {
         type: String,
         enum: Object.values(EVALUATION_PERIOD),
         required: [true, 'La période est obligatoire.'],
         trim: true,
         maxlength: 100,
      },
      scale: {
         type: Number,
         required: true,
         min: [Number.MIN_VALUE, 'Le barème doit être supérieur à zéro.'],
      },
      componentWeights: {
         oral: { type: Number, default: 1, min: Number.MIN_VALUE },
         written: { type: Number, default: 1, min: Number.MIN_VALUE },
         composition: { type: Number, default: 1, min: Number.MIN_VALUE },
      },
      weight: {
         type: Number,
         default: 1,
         min: [Number.MIN_VALUE, 'Le poids doit être supérieur à zéro.'],
      },
      status: {
         type: String,
         enum: ['OPEN', 'CLOSED'],
         default: 'OPEN',
         index: true,
      },
      createdBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true,
      },
   },
   { timestamps: true }
);

evaluationSchema.index(
   { assignment: 1, period: 1, name: 1, type: 1 },
   { unique: true }
);

const Evaluation = mongoose.model('Evaluation', evaluationSchema);

export default Evaluation;
