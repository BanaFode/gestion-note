import mongoose from 'mongoose';
import User from '../models/User.js';
import { USER_STATUS } from '../constants/statuses.js';
import AppError from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

const authenticate = async (req, _res, next) => {
   try {
      const authorization = req.get('authorization');
      const [scheme, token] = authorization?.split(' ') ?? [];

      if (scheme !== 'Bearer' || !token) {
         throw new AppError('Authentification requise.', 401);
      }

      const payload = verifyToken(token);
      if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
         throw new AppError('Jeton d’authentification invalide.', 401);
      }

      if (!mongoose.isValidObjectId(payload.sub)) {
         throw new AppError('Jeton d’authentification invalide.', 401);
      }

      const user = await User.findById(payload.sub);
      if (!user) {
         throw new AppError('Compte utilisateur introuvable.', 401);
      }

      if (user.deletedAt || (payload.ver ?? 0) !== (user.tokenVersion || 0)) {
         throw new AppError('Cette session a expiré. Connectez-vous de nouveau.', 401);
      }

      if (user.status !== USER_STATUS.ACTIVE) {
         throw new AppError('Ce compte utilisateur est désactivé.', 403);
      }

      req.user = user;
      return next();
   } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
         return next(new AppError('Jeton d’authentification invalide ou expiré.', 401));
      }

      return next(error);
   }
};

export default authenticate;
