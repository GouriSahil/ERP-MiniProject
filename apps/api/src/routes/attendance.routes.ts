import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticate, checkPermission } from '../middleware/auth.middleware';
import { validateAttendanceMark, validateUUIDParam, validatePagination } from '../middleware/validate.middleware';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List attendance records - view permission
router.get(
  '/',
  checkPermission('attendance', 'view'),
  validatePagination,
  AttendanceController.list
);

// Get attendance record by ID - view permission
router.get(
  '/:id',
  checkPermission('attendance', 'view'),
  validateUUIDParam(),
  AttendanceController.getById
);

// Create attendance record - mark permission
router.post(
  '/',
  checkPermission('attendance', 'mark'),
  [
    body('studentId').isUUID().withMessage('Valid student ID is required'),
    body('sessionId').isUUID().withMessage('Valid session ID is required'),
    body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status')
  ],
  AttendanceController.create
);

// Update attendance record - mark permission
router.put(
  '/:id',
  checkPermission('attendance', 'mark'),
  validateUUIDParam(),
  [
    body('status').optional().isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status')
  ],
  AttendanceController.update
);

// Delete attendance record - mark permission
router.delete(
  '/:id',
  checkPermission('attendance', 'mark'),
  validateUUIDParam(),
  AttendanceController.delete
);

// Get attendance by session - view permission
router.get(
  '/session/:sessionId',
  checkPermission('attendance', 'view'),
  validateUUIDParam('sessionId'),
  AttendanceController.getBySession
);

// Get attendance by student - view permission
router.get(
  '/student/:studentId',
  checkPermission('attendance', 'view'),
  validateUUIDParam('studentId'),
  AttendanceController.getByStudent
);

// Mark attendance for a session (bulk) - mark permission
router.post(
  '/mark',
  checkPermission('attendance', 'mark'),
  validateAttendanceMark,
  AttendanceController.markSessionAttendance
);

// Get student attendance summary - view permission
router.get(
  '/student/:studentId/summary',
  checkPermission('attendance', 'view'),
  validateUUIDParam('studentId'),
  AttendanceController.getStudentSummary
);

// Get session attendance summary - view permission
router.get(
  '/session/:sessionId/summary',
  checkPermission('attendance', 'view'),
  validateUUIDParam('sessionId'),
  AttendanceController.getSessionSummary
);

export default router;
