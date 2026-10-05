export const pickPreferredEvaluation = (evaluations = []) => {
   if (!Array.isArray(evaluations) || !evaluations.length) {
      return null;
   }

   return (
      evaluations.find((evaluation) => evaluation?.status === 'OPEN') ||
      evaluations[0]
   );
};

export const isGradeEditable = (grade) => {
   if (!grade) {
      return true;
   }

   const nonEditableStatuses = ['SUBMITTED', 'VALIDATED', 'LOCKED'];
   return !grade.status || !nonEditableStatuses.includes(grade.status);
};

export const calculateGradeScore = (components, weights = {}) => {
   const names = ['oral', 'written', 'composition'];
   const values = names.map((name) => {
      const value = components?.[name];
      return value === null || value === '' || value === undefined
         ? null
         : Number(value);
   });
   const componentWeights = names.map((name) => Number(weights?.[name] ?? 1));
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
