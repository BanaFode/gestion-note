import { Router } from 'express';

import AcademicYear from '../models/AcademicYear.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../constants/roles.js';
import validate from '../middleware/validate.js';
import {
   createAcademicYearValidator,
   updateAcademicYearStatusValidator,
} from '../validators/academic-year.validator.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();

/**
 * GET /api/academic-years
 */
router.get(
   '/',
   authenticate,
   authorize(ROLES.ADMIN, ROLES.DIRECTEUR_ETUDES, ROLES.DIRECTEUR_SCOLARITE),
   async (req, res, next) => {
      try {
         const years = await AcademicYear.find().sort({ label: -1 });

         res.json({
            success: true,
            message: 'Années scolaires récupérées',
            data: years,
         });
      } catch (error) {
         next(error);
      }
   }
);

/**
 * POST /api/academic-years
 */
router.post(
   '/',
   authenticate,
   authorize(ROLES.ADMIN),
   createAcademicYearValidator,
   validate,
   async (req, res, next) => {
      try {
         const { label, startDate, endDate } = req.body;

         const existing = await AcademicYear.findOne({
            label,
         });

         if (existing) {
            return res.status(409).json({
               success: false,
               message: 'Cette année scolaire existe déjà',
               errors: [],
            });
         }

         const year = await AcademicYear.create({
            label,
            startDate,
            endDate,
         });

         try {
            await AuditLog.create({
               actor: req.user._id,
               action: 'ACADEMIC_YEAR_CREATED',
               entityType: 'AcademicYear',
               entityId: year._id,
               newValue: { label: year.label, status: year.status, startDate: year.startDate, endDate: year.endDate },
            });
         } catch (error) {
            await AcademicYear.deleteOne({ _id: year._id });
            throw error;
         }

         res.status(201).json({
            success: true,
            message: 'Année scolaire créée',
            data: year,
         });
      } catch (error) {
         next(error);
      }
   }
);

router.patch(
   '/:id/status',
   authenticate,
   authorize(ROLES.ADMIN),
   updateAcademicYearStatusValidator,
   validate,
   async (req, res, next) => {
      try {
         const year = await AcademicYear.findById(req.params.id);
         if (!year) {
            return res.status(404).json({
               success: false,
               message: 'Année scolaire introuvable.',
               errors: [],
            });
         }

         const nextStatus = req.body.status;
         if (year.status === nextStatus) {
            return res.json({ success: true, data: year });
         }
         if (nextStatus === 'ACTIVE') {
            const otherActiveYear = await AcademicYear.findOne({
               status: 'ACTIVE',
               _id: { $ne: year._id },
            }).select('label');
            if (otherActiveYear) {
               return res.status(409).json({
                  success: false,
                  message: `Clôturez d’abord l’année ${otherActiveYear.label} avant d’activer une autre année.`,
                  errors: [],
               });
            }
         }
         const allowedTransitions = {
            PENDING: ['ACTIVE', 'CLOSED'],
            ACTIVE: ['CLOSED'],
            CLOSED: [],
         };
         if (!allowedTransitions[year.status]?.includes(nextStatus)) {
            return res.status(400).json({
               success: false,
               message: 'Transition de statut impossible pour cette année.',
               errors: [],
            });
         }

         const previousStatus = year.status;
         year.status = nextStatus;
         const log = await AuditLog.create({
            actor: req.user._id,
            action: 'ACADEMIC_YEAR_STATUS_CHANGED',
            entityType: 'AcademicYear',
            entityId: year._id,
            oldValue: { status: previousStatus },
            newValue: { status: nextStatus },
         });

         try {
            await year.save();
         } catch (error) {
            await AuditLog.deleteOne({ _id: log._id });
            throw error;
         }

         return res.json({ success: true, data: year });
      } catch (error) {
         return next(error);
      }
   }
);

export default router;
