import { Router } from 'express';
import { FacultyController } from '../controllers/faculty.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateFacultyCreate, validateFacultyUpdate, validateUUIDParam } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Faculty listing (accessible to all authenticated users)
router.get(
  '/',
  FacultyController.list
);

// Get specific faculty
router.get(
  '/:id',
  validateUUIDParam(),
  FacultyController.getById
);

// Get faculty assigned offerings
router.get(
  '/:id/offerings',
  validateUUIDParam(),
  FacultyController.getOfferings
);

// Get faculty teaching load
router.get(
  '/:id/teaching-load',
  validateUUIDParam(),
  FacultyController.getTeachingLoad
);

// Create faculty (admin, dept_head only)
router.post(
  '/',
  authorize('college_admin', 'department_head'),
  validateFacultyCreate,
  FacultyController.create
);

// Update faculty (admin, dept_head only)
router.put(
  '/:id',
  authorize('college_admin', 'department_head'),
  validateUUIDParam(),
  validateFacultyUpdate,
  FacultyController.update
);

// Delete faculty (admin only)
router.delete(
  '/:id',
  authorize('college_admin'),
  validateUUIDParam(),
  FacultyController.delete
);

export default router;
