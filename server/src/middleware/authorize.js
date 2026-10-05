const authorize = (...allowedRoles) => {
   return (req, res, next) => {
      // Vérifier que l'utilisateur est bien authentifié
      if (!req.user) {
         return res.status(401).json({
            success: false,
            message: 'Utilisateur non authentifié.',
         });
      }

      if (req.user.mustChangePassword) {
         return res.status(403).json({
            success: false,
            message: 'Vous devez modifier votre mot de passe avant de continuer.',
         });
      }

      // Vérifier que le rôle de l'utilisateur est autorisé
      if (!allowedRoles.includes(req.user.role)) {
         return res.status(403).json({
            success: false,
            message:
               "Accès interdit. Vous n'avez pas les permissions nécessaires.",
         });
      }

      next();
   };
};

export default authorize;
