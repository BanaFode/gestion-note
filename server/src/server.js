import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const startServer = async () => {
   try {
      await connectDB();

      app.listen(env.port, () => {
         console.log('');
         console.log('=================================');
         console.log('🚀 API Gestion des Notes');
         console.log('=================================');
         console.log(`📡 Port : ${env.port}`);
         console.log(`🌍 URL  : http://localhost:${env.port}`);
         console.log(`⚙️ Mode : ${env.nodeEnv}`);
         console.log('=================================');
      });
   } catch (error) {
      console.error('❌ Impossible de démarrer le serveur');
      console.error(error);
      process.exit(1);
   }
};

startServer();
