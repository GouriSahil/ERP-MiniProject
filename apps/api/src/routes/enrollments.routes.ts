import { Router } from 'express';
import { EnrollmentsController } from '../controllers/enrollments.controller';
import { authenticate, checkPermission } from '../middleware/auth.middleware';
import { validateEnrollmentCreate, validateEnrollmentUpdate, validateUUIDParam, validatePagination } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List enrollments - view permission
router.get(
  '/',
  checkPermission('enrollments', 'view'),
  validatePagination,
  EnrollmentsController.list
);

// Get available offerings for student self-enrollment (must be before /:id)
router.get(
  '/available',
  EnrollmentsController.getAvailableOfferings
);

// Get my enrollments - for authenticated student
router.get(
  '/my-enrollments',
  checkPermission('enrollments', 'view'),
  EnrollmentsController.getMyEnrollments
);

// Get enrollment by ID - view permission
router.get(
  '/:id',
  checkPermission('enrollments', 'view'),
  validateUUIDParam(),
  EnrollmentsController.getById
);

// Create enrollment - create permission
router.post(
  '/',
  checkPermission('enrollments', 'create'),
  validateEnrollmentCreate,
  EnrollmentsController.create
);

// Update enrollment - update permission
router.put(
  '/:id',
  checkPermission('enrollments', 'update'),
  validateUUIDParam(),
  validateEnrollmentUpdate,
  EnrollmentsController.update
);

// Delete enrollment - delete permission
router.delete(
  '/:id',
  checkPermission('enrollments', 'delete'),
  validateUUIDParam(),
  EnrollmentsController.delete
);

// Get enrollments by student - view permission
router.get(
  '/student/:studentId',
  checkPermission('enrollments', 'view'),
  validateUUIDParam('studentId'),
  EnrollmentsController.getByStudent
);

// Get enrollments by offering - view permission
router.get(
  '/offering/:offeringId',
  checkPermission('enrollments', 'view'),
  validateUUIDParam('offeringId'),
  EnrollmentsController.getByOffering
);

// Bulk enroll students - create permission
router.post(
  '/bulk',
  checkPermission('enrollments', 'create'),
  EnrollmentsController.bulkEnroll
);

// Drop enrollment - update permission
router.patch(
  '/:id/drop',
  checkPermission('enrollments', 'update'),
  validateUUIDParam(),
  EnrollmentsController.drop
);

// Self-enrollment endpoint for students
router.post(
  '/self-enroll',
  checkPermission('enrollments', 'create'),
  EnrollmentsController.selfEnroll
);

export default router;
