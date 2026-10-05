import mongoose from 'mongoose';
import { env } from './env.js';
import Student from '../models/Student.js';

const ensureStudentIndexes = async () => {
   let indexes;
   try {
      indexes = await Student.collection.indexes();
   } catch (error) {
      if (error.code !== 26) throw error;
      await Student.createCollection();
      indexes = await Student.collection.indexes();
   }
   const matriculeIndex = indexes.find(
      (index) => index.key.matricule === 1 && index.unique
   );

   if (!matriculeIndex) {
      await Student.collection.createIndex(
         { matricule: 1 },
         { name: 'matricule_1', unique: true }
      );
   }

   const userIndex = indexes.find((index) => index.key.user === 1);
   const isCorrectUserIndex =
      userIndex?.unique &&
      userIndex.partialFilterExpression?.user?.$type === 'objectId';

   if (userIndex && !isCorrectUserIndex) {
      await Student.collection.dropIndex(userIndex.name);
   }

   if (!isCorrectUserIndex) {
      await Student.collection.createIndex(
         { user: 1 },
         {
            name: 'user_1',
            unique: true,
            partialFilterExpression: { user: { $type: 'objectId' } },
         }
      );
   }
};

export const connectDB = async () => {
   try {
      await mongoose.connect(env.mongodbUri);
      await ensureStudentIndexes();

      console.log('MongoDB connecté');
      console.log(`Base de données : ${mongoose.connection.name}`);
   } catch (error) {
      console.error('Erreur de connexion MongoDB');
      console.error(error.message);

      process.exit(1);
   }
};
