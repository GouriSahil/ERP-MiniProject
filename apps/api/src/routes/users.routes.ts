import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { validateUserCreate, validateUserUpdate, validateUUIDParam } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User management routes (admin only)
router.get(
  '/',
  UsersController.list
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

export default router;
