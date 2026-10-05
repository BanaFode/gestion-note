import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import academicYearRoutes from './routes/academic-year.routes.js';
import programRoutes from './routes/program.routes.js';
import classRoutes from './routes/class.routes.js';
import studentRoutes from './routes/student.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import teachingAssignmentRoutes from './routes/teaching-assignment.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';
import gradeRoutes from './routes/grade.routes.js';
import auditRoutes from './routes/audit.routes.js';
import academicSettingsRoutes from './routes/academic-settings.routes.js';
import resultRoutes from './routes/result.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { isAllowedClientOrigin } from './utils/clientOrigin.js';
const app = express();

/**
 * ==============================
 * MIDDLEWARES GLOBAUX
 * ==============================
 */

app.use(helmet());

app.use(
   cors({
      origin: (origin, callback) =>
         callback(
            null,
            isAllowedClientOrigin(origin, env.clientUrl, env.nodeEnv)
         ),
      credentials: true,
   })
);

app.use(
   express.json({
      limit: '10kb',
   })
);

app.use(
   express.urlencoded({
      extended: true,
      limit: '10kb',
   })
);

if (env.nodeEnv !== 'test') {
   app.use(morgan('dev'));
}

/**
 * ==============================
 * ROUTES
 * ==============================
 */

app.get('/', (req, res) => {
   res.json({
      success: true,
      message: 'API Gestion des Notes opérationnelle',
   });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/teaching-assignments', teachingAssignmentRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/academic-settings', academicSettingsRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/academic-years', academicYearRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/enrollments', enrollmentRoutes);

/**
 * ==============================
 * ERREURS
 * ==============================
 */

app.use(notFound);
app.use(errorHandler);
export default app;
