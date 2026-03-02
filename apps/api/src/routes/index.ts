import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import studentsRoutes from './students.routes';
import facultyRoutes from './faculty.routes';
import departmentsRoutes from './departments.routes';
import coursesRoutes from './courses.routes';
import termsRoutes from './terms.routes';
import offeringsRoutes from './offerings.routes';
import sessionsRoutes from './sessions.routes';
import enrollmentsRoutes from './enrollments.routes';
import attendanceRoutes from './attendance.routes';
import reportsRoutes from './reports.routes';
import auditRoutes from './audit.routes';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ERP API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
// Public routes (no authentication required)
router.use('/auth', authRoutes);

// Protected routes (authentication required)
router.use('/users', authenticate, usersRoutes);
router.use('/students', authenticate, studentsRoutes);
router.use('/faculty', authenticate, facultyRoutes);
router.use('/departments', authenticate, departmentsRoutes);
router.use('/courses', authenticate, coursesRoutes);
router.use('/terms', authenticate, termsRoutes);
router.use('/offerings', authenticate, offeringsRoutes);
router.use('/sessions', authenticate, sessionsRoutes);
router.use('/enrollments', authenticate, enrollmentsRoutes);
router.use('/attendance', authenticate, attendanceRoutes);
router.use('/reports', authenticate, reportsRoutes);

// Admin-only routes (authentication + authorization required)
router.use('/audit', authenticate, authorize('super_admin', 'college_admin'), auditRoutes);

export default router;
