import mongoose from 'mongoose';

const globalScaleSchema = new mongoose.Schema(
   {
      key: {
         type: String,
         enum: ['GLOBAL'],
         default: 'GLOBAL',
         unique: true,
      },
      resultScale: {
         type: Number,
         required: true,
         min: [
            Number.MIN_VALUE,
            'Le barème global doit être supérieur à zéro.',
         ],
      },
      admissionThreshold: {
         type: Number,
         required: true,
         min: [0, 'Le seuil d’admission ne peut pas être négatif.'],
      },
      calculationRules: {
         overallMethod: {
            type: String,
            enum: ['ARITHMETIC_MEAN', 'WEIGHTED_MEAN'],
            required: true,
         },
      },
   },
   { timestamps: true }
);

const GlobalScale = mongoose.model('GlobalScale', globalScaleSchema);

export default GlobalScale;
