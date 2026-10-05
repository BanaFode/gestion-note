import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVariables = ['MONGODB_URI', 'JWT_SECRET'];

for (const variable of requiredEnvVariables) {
   if (!process.env[variable]) {
      throw new Error(
         `La variable d'environnement ${variable} est obligatoire.`
      );
   }
}

export const env = {
   port: Number(process.env.PORT) || 5000,

   mongodbUri: process.env.MONGODB_URI,

   jwtSecret: process.env.JWT_SECRET,

   jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

   clientUrl:
      process.env.CLIENT_URL ||
      'https://gestion-note-e8kc7iwg4-banafode24-6170.vercel.app',

   resendApiKey: process.env.RESEND_API_KEY || '',

   mailFrom: process.env.MAIL_FROM || '',

   nodeEnv: process.env.NODE_ENV || 'development',
};
