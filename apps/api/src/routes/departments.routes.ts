import { Router } from 'express';
import { DepartmentsController } from '../controllers/departments.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateDepartmentCreate, validateDepartmentUpdate, validateUUIDParam } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Department listing (accessible to all authenticated users)
router.get(
  '/',
  DepartmentsController.list
);

// Get specific department
router.get(
  '/:id',
  validateUUIDParam(),
  DepartmentsController.getById
);

// Get department faculty
router.get(
  '/:id/faculty',
  validateUUIDParam(),
  DepartmentsController.getFaculty
);

// Get department courses
router.get(
  '/:id/courses',
  validateUUIDParam(),
  DepartmentsController.getCourses
);

// Create department (admin only)
router.post(
  '/',
  authorize('college_admin'),
  validateDepartmentCreate,
  DepartmentsController.create
);

// Update department (admin only)
router.put(
  '/:id',
  authorize('college_admin'),
  validateUUIDParam(),
  validateDepartmentUpdate,
  DepartmentsController.update
);

// Delete department (admin only)
router.delete(
  '/:id',
  authorize('college_admin'),
  validateUUIDParam(),
  DepartmentsController.delete
);

export default router;
