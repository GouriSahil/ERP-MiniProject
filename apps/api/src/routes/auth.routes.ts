import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../utils/validation.utils';
import { registerSchema, loginSchema, refreshTokenSchema } from '../utils/validation.utils';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post(
  '/register',
  validate(registerSchema),
  AuthController.register
);

router.post(
  '/login',
  validate(loginSchema),
  AuthController.login
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  AuthController.refreshToken
);

// Protected routes (require authentication)
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

router.get(
  '/me',
  authenticate,
  AuthController.me
);

router.post(
  '/change-password',
  authenticate,
  AuthController.changePassword
);

export default router;
