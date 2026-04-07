import { Router } from 'express';
import { StudentsController } from '../controllers/students.controller';
import { authenticate, authorize } from '../middleware/auth';
import { uploadCSV, handleUploadError } from '../middleware/upload.middleware';
import { validateStudentCreate, validateStudentUpdate, validateUUIDParam } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student listing (accessible to all authenticated users)
router.get(
  '/',
  StudentsController.list
);

// Get specific student
router.get(
  '/:id',
  validateUUIDParam(),
  StudentsController.getById
);

// Student enrollment history
router.get(
  '/:id/enrollments',
  validateUUIDParam(),
  StudentsController.getEnrollments
);

// Student attendance summary
router.get(
  '/:id/attendance',
  validateUUIDParam(),
  StudentsController.getAttendance
);

// Create student (admin, dept_head only)
router.post(
  '/',
  authorize('college_admin', 'department_head'),
  validateStudentCreate,
  StudentsController.create
);

// Update student (admin, dept_head only)
router.put(
  '/:id',
  authorize('college_admin', 'department_head'),
  validateUUIDParam(),
  validateStudentUpdate,
  StudentsController.update
);

// Delete student (admin only)
router.delete(
  '/:id',
  authorize('college_admin'),
  validateUUIDParam(),
  StudentsController.delete
);

// Bulk import students (admin, dept_head only)
router.post(
  '/bulk-import',
  authorize('college_admin', 'department_head'),
  StudentsController.bulkImport
);

/**
 * @swagger
 * /api/students/import:
 *   post:
 *     tags: [Students]
 *     summary: Import students from CSV file
 *     description: Bulk import students from a CSV file. Required columns: name, email, password, rollNumber, departmentCode, batch, semester
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing student data
 *     responses:
 *       200:
 *         description: Import completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Imported 3 of 3 students"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: number
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           rollNumber:
 *                             type: string
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: number
 *                           data:
 *                             type: object
 *                           error:
 *                             type: string
 *       400:
 *         description: Validation error or invalid CSV format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Import students from CSV file (admin, dept_head only)
router.post(
  '/import',
  authorize('college_admin', 'department_head'),
  uploadCSV.single('file'),
  handleUploadError,
  StudentsController.importCSV
);

export default router;
