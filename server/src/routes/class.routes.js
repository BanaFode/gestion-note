import { Router } from 'express';

import SchoolClass from '../models/Class.js';
import AcademicYear from '../models/AcademicYear.js';
import Program from '../models/Program.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import validate from '../middleware/validate.js';
import { body, param } from 'express-validator';
import { ROLES } from '../constants/roles.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();
const createClassValidator = [
   body('name').trim().notEmpty().withMessage('Le nom de la classe est obligatoire.'),
   body('level').trim().notEmpty().withMessage('Le niveau est obligatoire.'),
   body('academicYear')
      .notEmpty()
      .isMongoId()
      .withMessage("L'identifiant de l'année académique est invalide."),
   body('program')
      .notEmpty()
      .isMongoId()
      .withMessage('L’identifiant du programme est invalide.'),
   body('capacity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La capacité doit être un entier supérieur à zéro.')
      .toInt(),
];
const updateClassStatusValidator = [
   param('id').isMongoId().withMessage("L'identifiant de la classe est invalide."),
   body('isActive').isBoolean().withMessage('Le statut actif est invalide.').toBoolean(),
];

router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES, ROLES.DIRECTEUR_SCOLARITE),
   async (req, res, next) => {
      try {
         const classes = await SchoolClass.find()
            .populate('academicYear', 'label status')
            .populate('program', 'name code')
            .sort({ name: 1 });

         res.json({
            success: true,
            message: 'Classes récupérées',
            data: classes,
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
   createClassValidator,
   validate,
   async (req, res, next) => {
      try {
         const { name, level, academicYear, program, capacity } = req.body;

         const [year, existingProgram] = await Promise.all([
            AcademicYear.findById(academicYear),
            Program.findById(program),
         ]);
         if (!year || !existingProgram) {
            return res.status(404).json({
               success: false,
               message: 'Année académique ou programme introuvable.',
               errors: [],
            });
         }
         if (year.status === 'CLOSED') {
            return res.status(400).json({
               success: false,
               message: 'Une année clôturée ne peut plus être modifiée.',
               errors: [],
            });
         }
         if (!existingProgram.isActive) {
            return res.status(400).json({
               success: false,
               message: 'Un programme inactif ne peut pas recevoir de classe.',
               errors: [],
            });
         }

         const schoolClass = await SchoolClass.create({
            name,
            level,
            academicYear,
            program,
            capacity,
         });

         try {
            await AuditLog.create({
               actor: req.user._id,
               action: 'CLASS_CREATED',
               entityType: 'Class',
               entityId: schoolClass._id,
               newValue: { name: schoolClass.name, level: schoolClass.level, academicYear, program, capacity: schoolClass.capacity },
            });
         } catch (error) {
            await SchoolClass.deleteOne({ _id: schoolClass._id });
            throw error;
         }

         const populatedClass = await schoolClass.populate([
            {
               path: 'academicYear',
               select: 'label status',
            },
            {
               path: 'program',
               select: 'name code',
            },
         ]);

         res.status(201).json({
            success: true,
            message: 'Classe créée',
            data: populatedClass,
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
   updateClassStatusValidator,
   validate,
   async (req, res, next) => {
      try {
         const schoolClass = await SchoolClass.findById(req.params.id);
         if (!schoolClass) return res.status(404).json({ success: false, message: 'Classe introuvable.', errors: [] });
         if (schoolClass.isActive === req.body.isActive) return res.json({ success: true, data: schoolClass });
         const year = await AcademicYear.findById(schoolClass.academicYear);
         if (!year) return res.status(404).json({ success: false, message: 'Année académique introuvable.', errors: [] });
         if (year.status === 'CLOSED') {
            return res.status(400).json({ success: false, message: 'Une année clôturée ne peut plus être modifiée.', errors: [] });
         }

         const previousStatus = schoolClass.isActive;
         schoolClass.isActive = req.body.isActive;
         const log = await AuditLog.create({
            actor: req.user._id,
            action: 'CLASS_STATUS_CHANGED',
            entityType: 'Class',
            entityId: schoolClass._id,
            oldValue: { isActive: previousStatus },
            newValue: { isActive: schoolClass.isActive },
         });
         try {
            await schoolClass.save();
         } catch (error) {
            await AuditLog.deleteOne({ _id: log._id });
            throw error;
         }
         return res.json({ success: true, data: schoolClass });
      } catch (error) {
         return next(error);
      }
   }
);

export default router;
