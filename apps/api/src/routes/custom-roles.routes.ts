import { Router } from 'express';
import { CustomRoleController } from '../controllers/custom-roles.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/custom-roles:
 *   get:
 *     summary: List all custom roles
 *     tags: [Custom Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of custom roles
 */
router.get(
  '/',
  authenticate,
  requirePermission('users', 'read'),
  CustomRoleController.listRoles
);

/**
 * @swagger
 * /api/custom-roles/permissions:
 *   get:
 *     summary: Get all available permissions
 *     tags: [Custom Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all available permissions
 */
router.get(
  '/permissions',
  authenticate,
  requirePermission('users', 'read'),
  CustomRoleController.listPermissions
);

/**
 * @swagger
 * /api/custom-roles/{id}:
 *   get:
 *     summary: Get custom role by ID
 *     tags: [Custom Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Custom role details
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('users', 'read'),
  CustomRoleController.getRole
);

/**
 * @swagger
 * /api/custom-roles:
 *   post:
 *     summary: Create a new custom role
 *     tags: [Custom Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Custom role created successfully
 */
router.post(
  '/',
  authenticate,
  requirePermission('users', 'create'),
  CustomRoleController.createRole
);

/**
 * @swagger
 * /api/custom-roles/{id}:
 *   put:
 *     summary: Update a custom role
 *     tags: [Custom Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Custom role updated successfully
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('users', 'update'),
  CustomRoleController.updateRole
);

/**
 * @swagger
 * /api/custom-roles/{id}:
 *   delete:
 *     summary: Delete a custom role
 *     tags: [Custom Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Custom role deleted successfully
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('users', 'delete'),
  CustomRoleController.deleteRole
);

/**
 * @swagger
 * /api/custom-roles/assign/{userId}:
 *   post:
 *     summary: Assign custom role to user
 *     tags: [Custom Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customRoleId
 *             properties:
 *               customRoleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Custom role assigned successfully
 */
router.post(
  '/assign/:userId',
  authenticate,
  requirePermission('users', 'update'),
  CustomRoleController.assignRoleToUser
);

/**
 * @swagger
 * /api/custom-roles/remove/{userId}:
 *   post:
 *     summary: Remove custom role from user
 *     tags: [Custom Roles]
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
 *         description: Custom role removed successfully
 */
router.post(
  '/remove/:userId',
  authenticate,
  requirePermission('users', 'update'),
  CustomRoleController.removeRoleFromUser
);

export default router;
