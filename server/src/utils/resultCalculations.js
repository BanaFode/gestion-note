import { EVALUATION_PERIOD } from '../constants/statuses.js';

export const calculateGradeScore = (components, weights = {}) => {
   const names = ['oral', 'written', 'composition'];
   const values = names.map((name) => components?.[name]);
   const componentWeights = names.map((name) => weights?.[name] ?? 1);
   if (
      !values.every(Number.isFinite) ||
      !componentWeights.every((weight) => Number.isFinite(weight) && weight > 0)
   ) {
      return null;
   }

   const totalWeight = componentWeights.reduce(
      (total, weight) => total + weight,
      0
   );
   return (
      values.reduce(
         (total, value, index) => total + value * componentWeights[index],
         0
      ) / totalWeight
   );
};

export const calculateOverallAverage = (subjects, method) => {
   const gradedSubjects = subjects.filter(
      (subject) =>
         Number.isFinite(subject.normalizedAverage) &&
         Number.isFinite(subject.coefficient) &&
         subject.coefficient > 0
   );
   if (!gradedSubjects.length) return null;

   if (method === 'ARITHMETIC_MEAN') {
      return (
         gradedSubjects.reduce(
            (total, subject) => total + subject.normalizedAverage,
            0
         ) / gradedSubjects.length
      );
   }

   if (method !== 'WEIGHTED_MEAN') return null;

   const totalCoefficient = gradedSubjects.reduce(
      (total, subject) => total + subject.coefficient,
      0
   );
   return (
      gradedSubjects.reduce(
         (total, subject) =>
            total + subject.normalizedAverage * subject.coefficient,
         0
      ) / totalCoefficient
   );
};

export const calculateRetakeAdjustedAverage = (
   overallAverage,
   retakeScores
) => {
   if (!Number.isFinite(overallAverage)) return null;
   const validScores = retakeScores.filter(Number.isFinite);
   if (!validScores.length) return overallAverage;

   const retakeAverage =
      validScores.reduce((total, score) => total + score, 0) /
      validScores.length;
   return (overallAverage + retakeAverage) / 2;
};

export const calculateModuleAverages = (subjects, resultScale) =>
   Object.fromEntries(
      Object.values(EVALUATION_PERIOD).map((period) => {
         if (!Number.isFinite(resultScale) || resultScale <= 0) {
            return [period, null];
         }

         const gradedSubjects = subjects.filter(
            (subject) =>
               Number.isFinite(subject.moduleSummary?.[period]) &&
               Number.isFinite(subject.scale) &&
               subject.scale > 0 &&
               Number.isFinite(subject.coefficient) &&
               subject.coefficient > 0
         );
         const totalCoefficient = gradedSubjects.reduce(
            (total, subject) => total + subject.coefficient,
            0
         );
         if (!totalCoefficient) return [period, null];

         const weightedTotal = gradedSubjects.reduce(
            (total, subject) =>
               total +
               (subject.moduleSummary[period] / subject.scale) *
                  resultScale *
                  subject.coefficient,
            0
         );

         return [period, weightedTotal / totalCoefficient];
      })
   );
