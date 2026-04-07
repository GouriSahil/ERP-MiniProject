import { Router } from 'express';
import { UserSessionsController } from '../controllers/user-sessions.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/user-sessions/current:
 *   get:
 *     summary: Get current session info
 *     tags: [User Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current session details
 */
router.get(
  '/current',
  authenticate,
  UserSessionsController.getCurrentSession
);

/**
 * @swagger
 * /api/user-sessions/user/{userId}:
 *   get:
 *     summary: List all sessions for a user
 *     tags: [User Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user sessions
 */
router.get(
  '/user/:userId',
  authenticate,
  UserSessionsController.listSessions
);

/**
 * @swagger
 * /api/user-sessions/all:
 *   get:
 *     summary: Get all active sessions (admin only)
 *     tags: [User Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all active sessions
 */
router.get(
  '/all',
  authenticate,
  authorize('super_admin', 'admin'),
  UserSessionsController.getAllActiveSessions
);

/**
 * @swagger
 * /api/user-sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [User Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session revoked successfully
 */
router.delete(
  '/:sessionId',
  authenticate,
  UserSessionsController.revokeSession
);

/**
 * @swagger
 * /api/user-sessions/user/{userId}/revoke-all:
 *   post:
 *     summary: Revoke all sessions for a user
 *     tags: [User Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               excludeCurrent:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Sessions revoked successfully
 */
router.post(
  '/user/:userId/revoke-all',
  authenticate,
  UserSessionsController.revokeAllUserSessions
);

/**
 * @swagger
 * /api/user-sessions/cleanup:
 *   post:
 *     summary: Clean up expired sessions (admin only)
 *     tags: [User Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired sessions cleaned up
 */
router.post(
  '/cleanup',
  authenticate,
  authorize('super_admin', 'admin'),
  UserSessionsController.cleanupExpiredSessions
);

export default router;
