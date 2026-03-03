import { Router } from 'express';
import { StudentsController } from '../controllers/students.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateStudentCreate, validateStudentUpdate, validateUUIDParam } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student listing (accessible to all authenticated users)
router.get(
  '/',
  StudentsController.list
);

// Get specific student
router.get(
  '/:id',
  validateUUIDParam(),
  StudentsController.getById
);

// Student enrollment history
router.get(
  '/:id/enrollments',
  validateUUIDParam(),
  StudentsController.getEnrollments
);

// Student attendance summary
router.get(
  '/:id/attendance',
  validateUUIDParam(),
  StudentsController.getAttendance
);

// Create student (admin, dept_head only)
router.post(
  '/',
  authorize('college_admin', 'department_head'),
  validateStudentCreate,
  StudentsController.create
);

// Update student (admin, dept_head only)
router.put(
  '/:id',
  authorize('college_admin', 'department_head'),
  validateUUIDParam(),
  validateStudentUpdate,
  StudentsController.update
);

// Delete student (admin only)
router.delete(
  '/:id',
  authorize('college_admin'),
  validateUUIDParam(),
  StudentsController.delete
);

// Bulk import students (admin, dept_head only)
router.post(
  '/bulk-import',
  authorize('college_admin', 'department_head'),
  StudentsController.bulkImport
);

export default router;
