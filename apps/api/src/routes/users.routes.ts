import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticate, authorize } from "../middleware/auth";
import { requireApprovalPermission } from "../middleware/approval.middleware";
import { validateUserCreate, validateUserUpdate, validateUUIDParam } from '../middleware/validate.middleware';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// User management routes (admin only)
router.get(
  '/',
  UsersController.list
);

// Pending users list - for admin approval
router.get(
  '/pending',
  requireApprovalPermission,
  UsersController.listPending
);

router.post(
  '/',
  validateUserCreate,
  UsersController.create
);

router.get(
  '/:id',
  validateUUIDParam(),
  UsersController.getById
);

router.put(
  '/:id',
  validateUUIDParam(),
  validateUserUpdate,
  UsersController.update
);

router.delete(
  '/:id',
  validateUUIDParam(),
  UsersController.delete
);

// User status management
router.patch(
  '/:id/deactivate',
  validateUUIDParam(),
  UsersController.deactivate
);

router.patch(
  '/:id/reactivate',
  validateUUIDParam(),
  UsersController.reactivate
);

router.post(
  '/:id/reset-password',
  validateUUIDParam(),
  UsersController.resetPassword
);

// User approval routes - admin/department head only
router.post(
  '/:id/approve',
  requireApprovalPermission,
  UsersController.approveUser
);

router.post(
  '/:id/reject',
  requireApprovalPermission,
  UsersController.rejectUser
);

router.post(
  '/:id/suspend',
  authorize('super_admin', 'admin', 'dept_head'),
  UsersController.suspendUser
);

router.post(
  '/:id/activate',
  authorize('super_admin', 'admin', 'dept_head'),
  UsersController.activateUser
);

export default router;
