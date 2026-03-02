import { Router } from 'express';
import { SessionsController } from '../controllers/sessions.controller';
import { authenticate, checkPermission } from '../middleware/auth.middleware';
import { validateSessionCreate, validateSessionUpdate, validateUUIDParam, validatePagination } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List sessions - view permission
router.get(
  '/',
  checkPermission('sessions', 'view'),
  validatePagination,
  SessionsController.list
);

// Get session by ID - view permission
router.get(
  '/:id',
  checkPermission('sessions', 'view'),
  validateUUIDParam(),
  SessionsController.getById
);

// Create session - create permission
router.post(
  '/',
  checkPermission('sessions', 'create'),
  validateSessionCreate,
  SessionsController.create
);

// Update session - update permission
router.put(
  '/:id',
  checkPermission('sessions', 'update'),
  validateUUIDParam(),
  validateSessionUpdate,
  SessionsController.update
);

// Delete session - delete permission
router.delete(
  '/:id',
  checkPermission('sessions', 'delete'),
  validateUUIDParam(),
  SessionsController.delete
);

// Get sessions by offering - view permission
router.get(
  '/offering/:offeringId',
  checkPermission('sessions', 'view'),
  validateUUIDParam('offeringId'),
  SessionsController.getByOffering
);

// Get sessions by term - view permission
router.get(
  '/term/:termId',
  checkPermission('sessions', 'view'),
  validateUUIDParam('termId'),
  SessionsController.getByTerm
);

// Update session status - update permission
router.patch(
  '/:id/status',
  checkPermission('sessions', 'update'),
  validateUUIDParam(),
  SessionsController.updateStatus
);

// Bulk create sessions - create permission
router.post(
  '/bulk',
  checkPermission('sessions', 'create'),
  SessionsController.bulkCreate
);

export default router;
