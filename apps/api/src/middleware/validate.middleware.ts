import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation
export const validateUserCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['super_admin', 'college_admin', 'department_head', 'faculty', 'support_staff', 'student']),
  body('departmentId').optional().isUUID(),
  handleValidationErrors
];

export const validateUserUpdate = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['super_admin', 'college_admin', 'department_head', 'faculty', 'support_staff', 'student']),
  body('departmentId').optional().isUUID(),
  handleValidationErrors
];

// Student validation
export const validateStudentCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('departmentId').isUUID().withMessage('Valid department ID is required'),
  handleValidationErrors
];

export const validateStudentUpdate = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('rollNumber').optional().trim().notEmpty(),
  body('departmentId').optional().isUUID(),
  handleValidationErrors
];

// Faculty validation
export const validateFacultyCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('departmentId').isUUID().withMessage('Valid department ID is required'),
  body('specialization').optional().trim(),
  handleValidationErrors
];

export const validateFacultyUpdate = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('departmentId').optional().isUUID(),
  body('specialization').optional().trim(),
  handleValidationErrors
];

// Department validation
export const validateDepartmentCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('code').trim().notEmpty().isLength({ max: 20 }).withMessage('Code is required (max 20 characters)'),
  handleValidationErrors
];

export const validateDepartmentUpdate = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('code').optional().trim().isLength({ max: 20 }),
  handleValidationErrors
];

// Course validation
export const validateCourseCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('code').trim().notEmpty().withMessage('Code is required'),
  body('description').optional().trim(),
  body('credits').isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10'),
  body('departmentId').isUUID().withMessage('Valid department ID is required'),
  handleValidationErrors
];

export const validateCourseUpdate = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('code').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('credits').optional().isInt({ min: 1, max: 10 }),
  body('departmentId').optional().isUUID(),
  handleValidationErrors
];

// Term validation
export const validateTermCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('status').optional().isIn(['upcoming', 'active', 'completed']),
  handleValidationErrors
];

export const validateTermUpdate = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('status').optional().isIn(['upcoming', 'active', 'completed']),
  handleValidationErrors
];

// Offering validation
export const validateOfferingCreate = [
  body('courseId').isUUID().withMessage('Valid course ID is required'),
  body('termId').isUUID().withMessage('Valid term ID is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('schedule').optional(),
  handleValidationErrors
];

export const validateOfferingUpdate = [
  param('id').isUUID(),
  body('courseId').optional().isUUID(),
  body('termId').optional().isUUID(),
  body('capacity').optional().isInt({ min: 1 }),
  body('schedule').optional(),
  body('facultyIds').optional().isArray(),
  handleValidationErrors
];

// Session validation
export const validateSessionCreate = [
  body('offeringId').isUUID().withMessage('Valid offering ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM)'),
  body('location').optional().trim(),
  handleValidationErrors
];

export const validateSessionUpdate = [
  param('id').isUUID(),
  body('date').optional().isISO8601(),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('location').optional().trim(),
  body('status').optional().isIn(['scheduled', 'completed', 'cancelled']),
  handleValidationErrors
];

// Enrollment validation
export const validateEnrollmentCreate = [
  body('studentId').isUUID().withMessage('Valid student ID is required'),
  body('offeringId').isUUID().withMessage('Valid offering ID is required'),
  handleValidationErrors
];

export const validateEnrollmentUpdate = [
  param('id').isUUID(),
  body('status').optional().isIn(['active', 'dropped', 'completed']),
  handleValidationErrors
];

// Attendance validation
export const validateAttendanceMark = [
  body('sessionId').isUUID().withMessage('Valid session ID is required'),
  body('attendance').isArray().withMessage('Attendance must be an array'),
  body('attendance.*.studentId').isUUID().withMessage('Valid student ID is required'),
  body('attendance.*.status').isIn(['present', 'absent', 'late']).withMessage('Status must be present, absent, or late'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('sortBy').optional().trim(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const validateUUIDParam = (paramName: string = 'id') => {
  return [
    param(paramName).isUUID().withMessage(`Valid ${paramName} is required`),
    handleValidationErrors
  ];
};
