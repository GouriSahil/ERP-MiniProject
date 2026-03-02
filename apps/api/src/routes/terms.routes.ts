import { Router } from 'express';
import { TermsController } from '../controllers/terms.controller';
import { authenticate, checkPermission } from '../middleware/auth.middleware';
import { validateTermCreate, validateTermUpdate, validateUUIDParam, validatePagination } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List terms - view permission
router.get(
  '/',
  checkPermission('terms', 'view'),
  validatePagination,
  TermsController.list
);

// Get term by ID - view permission
router.get(
  '/:id',
  checkPermission('terms', 'view'),
  validateUUIDParam(),
  TermsController.getById
);

// Create term - create permission
router.post(
  '/',
  checkPermission('terms', 'create'),
  validateTermCreate,
  TermsController.create
);

// Update term - update permission
router.put(
  '/:id',
  checkPermission('terms', 'update'),
  validateUUIDParam(),
  validateTermUpdate,
  TermsController.update
);

// Delete term - delete permission
router.delete(
  '/:id',
  checkPermission('terms', 'delete'),
  validateUUIDParam(),
  TermsController.delete
);

// Get active term - view permission
router.get(
  '/active/current',
  checkPermission('terms', 'view'),
  TermsController.getActive
);

// Update term status - update permission
router.patch(
  '/:id/status',
  checkPermission('terms', 'update'),
  validateUUIDParam(),
  TermsController.updateStatus
);

// Get term statistics - view permission
router.get(
  '/:id/statistics',
  checkPermission('terms', 'view'),
  validateUUIDParam(),
  TermsController.getStatistics
);

export default router;
