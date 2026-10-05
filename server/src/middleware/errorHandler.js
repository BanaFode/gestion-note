export const errorHandler = (err, req, res, next) => {
   if (res.headersSent) return next(err);

   console.error('❌ ERREUR :', err);

   if (err.type === 'entity.parse.failed' || err.name === 'CastError') {
      return res.status(400).json({
         success: false,
         message: 'La requête contient des données invalides.',
         errors: [],
      });
   }

   // Erreur de validation MongoDB
   if (err.name === 'ValidationError') {
      return res.status(400).json({
         success: false,
         message: 'Données invalides.',
         errors: Object.values(err.errors).map((error) => error.message),
      });
   }

   // Doublon MongoDB
   if (err.code === 11000) {
      return res.status(409).json({
         success: false,
         message: 'Une donnée existe déjà.',
         errors: Object.keys(err.keyPattern || {}),
      });
   }

   const statusCode = err.statusCode || 500;

   return res.status(statusCode).json({
      success: false,
      message:
         statusCode === 500 ? 'Une erreur interne est survenue.' : err.message,
      errors: [],
   });
};
