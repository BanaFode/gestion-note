import { Router } from 'express';

import Program from '../models/Program.js';
import AuditLog from '../models/AuditLog.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../constants/roles.js';
import validate from '../middleware/validate.js';
import { body, param } from 'express-validator';

const router = Router();
const programIdValidator = [param('id').isMongoId().withMessage("L'identifiant du programme est invalide.")];
const createProgramValidator = [
   body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Le nom doit contenir entre 2 et 150 caractères.'),
   body('code').trim().isLength({ min: 1, max: 30 }).withMessage('Le code doit contenir entre 1 et 30 caractères.').toUpperCase(),
   body('description').optional().trim().isLength({ max: 1000 }),
];
const updateProgramStatusValidator = [
   ...programIdValidator,
   body('isActive').isBoolean().withMessage('Le statut actif est invalide.').toBoolean(),
];

router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES, ROLES.DIRECTEUR_SCOLARITE),
   async (req, res, next) => {
      try {
         const programs = await Program.find().sort({ name: 1 });

         res.json({
            success: true,
            message: 'Filières récupérées',
            data: programs,
         });
      } catch (error) {
         next(error);
      }
   }
);

router.post(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES),
   createProgramValidator,
   validate,
   async (req, res, next) => {
      try {
         const { name, code, description } = req.body;

         const program = await Program.create({
            name,
            code,
            description,
         });

         try {
            await AuditLog.create({
               actor: req.user._id,
               action: 'PROGRAM_CREATED',
               entityType: 'Program',
               entityId: program._id,
               newValue: { name: program.name, code: program.code, isActive: program.isActive },
            });
         } catch (error) {
            await Program.deleteOne({ _id: program._id });
            throw error;
         }

         res.status(201).json({
            success: true,
            message: 'Filière créée',
            data: program,
         });
      } catch (error) {
         next(error);
      }
   }
);

router.patch(
   '/:id/status',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES),
   updateProgramStatusValidator,
   validate,
   async (req, res, next) => {
      try {
         const program = await Program.findById(req.params.id);
         if (!program) return res.status(404).json({ success: false, message: 'Programme introuvable.', errors: [] });
         if (program.isActive === req.body.isActive) return res.json({ success: true, data: program });
         const previousStatus = program.isActive;
         program.isActive = req.body.isActive;
         const log = await AuditLog.create({
            actor: req.user._id,
            action: 'PROGRAM_STATUS_CHANGED',
            entityType: 'Program',
            entityId: program._id,
            oldValue: { isActive: previousStatus },
            newValue: { isActive: program.isActive },
         });
         try {
            await program.save();
         } catch (error) {
            await AuditLog.deleteOne({ _id: log._id });
            throw error;
         }
         return res.json({ success: true, data: program });
      } catch (error) {
         return next(error);
      }
   }
);

export default router;
