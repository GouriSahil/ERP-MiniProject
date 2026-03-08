import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate, checkPermission } from '../middleware/auth.middleware';
import { validateUUIDParam, validatePagination } from '../middleware/validate.middleware';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All audit routes require view permission (except create)
router.get(
  '{/*path}',
  checkPermission('audit', 'view')
);

// List audit logs - view permission
router.get(
  '/',
  validatePagination,
  AuditController.list
);

// Get audit log by ID - view permission
router.get(
  '/:id',
  validateUUIDParam(),
  AuditController.getById
);

// Get audit logs by user - view permission
router.get(
  '/user/:userId',
  validateUUIDParam('userId'),
  validatePagination,
  AuditController.getByUser
);

// Get audit logs by target - view permission
router.get(
  '/target/:targetType/:targetId',
  validatePagination,
  AuditController.getByTarget
);

// Get audit logs by action - view permission
router.get(
  '/action/:action',
  validatePagination,
  AuditController.getByAction
);

// Get activity summary - view permission
router.get(
  '/summary/activity',
  AuditController.getActivitySummary
);

// Get user activity statistics - view permission
router.get(
  '/user/:userId/stats',
  validateUUIDParam('userId'),
  AuditController.getUserStats
);

// Export audit logs - view permission
router.get(
  '/export',
  AuditController.exportLogs
);

// Get security logs - view permission
router.get(
  '/security/logs',
  validatePagination,
  AuditController.getSecurityLogs
);

// Manual audit log entry - audit permission (for system operations)
router.post(
  '/',
  checkPermission('audit', 'view'),
  [
    body('action').trim().notEmpty().withMessage('Action is required'),
    body('targetType').trim().notEmpty().withMessage('Target type is required'),
    body('targetId').trim().notEmpty().withMessage('Target ID is required'),
    body('status').optional().isIn(['success', 'failure']).withMessage('Invalid status')
  ],
  AuditController.createLog
);

export default router;
