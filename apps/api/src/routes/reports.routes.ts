import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { authenticate, checkPermission } from '../middleware/auth.middleware';
import { validateUUIDParam, validatePagination } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All reports require view permission
router.use(checkPermission('reports', 'view'));

// Course enrollment report
router.get(
  '/course-enrollment',
  ReportsController.courseEnrollment
);

// Student attendance report
router.get(
  '/student-attendance',
  ReportsController.studentAttendance
);

// Faculty workload report
router.get(
  '/faculty-workload',
  ReportsController.facultyWorkload
);

// Enrollment status report
router.get(
  '/enrollment-status',
  ReportsController.enrollmentStatusReport
);

// Department summary report
router.get(
  '/department/summary',
  ReportsController.departmentSummary
);

// Term overview report
router.get(
  '/term/:termId/overview',
  validateUUIDParam(),
  ReportsController.termOverview
);

export default router;
