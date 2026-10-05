import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateToken = (user) =>
   jwt.sign({ sub: user._id.toString(), ver: user.tokenVersion || 0 }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
   });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);
