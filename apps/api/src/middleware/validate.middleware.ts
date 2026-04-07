import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Custom validator for MongoDB ObjectId
const isObjectId = (value: any) => {
  if (!value) return false;
  return mongoose.Types.ObjectId.isValid(value);
};

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
  body('departmentId').optional().custom(isObjectId),
  handleValidationErrors
];

export const validateUserUpdate = [
  param('id').custom(isObjectId),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['super_admin', 'college_admin', 'department_head', 'faculty', 'support_staff', 'student']),
  body('departmentId').optional().custom(isObjectId),
  handleValidationErrors
];

// Student validation
export const validateStudentCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('departmentId').custom(isObjectId).withMessage('Valid department ID is required'),
  body('batch').trim().notEmpty().withMessage('Batch is required'),
  body('semester').isInt({ min: 1, max: 10 }).withMessage('Semester must be between 1 and 10'),
  handleValidationErrors
];

export const validateStudentUpdate = [
  param('id').custom(isObjectId).withMessage('Valid student ID is required'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('rollNumber').optional().trim().notEmpty(),
  body('departmentId').optional().custom(isObjectId),
  body('batch').optional().trim().notEmpty(),
  body('semester').optional().isInt({ min: 1, max: 10 }),
  handleValidationErrors
];

// Faculty validation
export const validateFacultyCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('departmentId').custom(isObjectId).withMessage('Valid department ID is required'),
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
  body('designation').isIn(['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HOD']).withMessage('Valid designation is required'),
  handleValidationErrors
];

export const validateFacultyUpdate = [
  param('id').custom(isObjectId).withMessage('Valid faculty ID is required'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('departmentId').optional().custom(isObjectId),
  body('specialization').optional().trim(),
  body('designation').optional().isIn(['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HOD']),
  handleValidationErrors
];

// Department validation
export const validateDepartmentCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('code').trim().notEmpty().isLength({ max: 20 }).withMessage('Code is required (max 20 characters)'),
  handleValidationErrors
];

export const validateDepartmentUpdate = [
  param('id').custom(isObjectId),
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
  body('departmentId').custom(isObjectId).withMessage('Valid department ID is required'),
  handleValidationErrors
];

export const validateCourseUpdate = [
  param('id').custom(isObjectId).withMessage('Valid course ID is required'),
  body('name').optional().trim().notEmpty(),
  body('code').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('credits').optional().isInt({ min: 1, max: 10 }),
  body('departmentId').optional().custom(isObjectId),
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
  param('id').custom(isObjectId),
  body('name').optional().trim().notEmpty(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('status').optional().isIn(['upcoming', 'active', 'completed']),
  handleValidationErrors
];

// Offering validation
export const validateOfferingCreate = [
  body('courseId').custom(isObjectId).withMessage('Valid course ID is required'),
  body('termId').custom(isObjectId).withMessage('Valid term ID is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('schedule').optional(),
  handleValidationErrors
];

export const validateOfferingUpdate = [
  param('id').custom(isObjectId),
  body('courseId').optional().custom(isObjectId),
  body('termId').optional().custom(isObjectId),
  body('capacity').optional().isInt({ min: 1 }),
  body('schedule').optional(),
  body('facultyIds').optional().isArray(),
  handleValidationErrors
];

// Session validation
export const validateSessionCreate = [
  body('offeringId').custom(isObjectId).withMessage('Valid offering ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM)'),
  body('location').optional().trim(),
  handleValidationErrors
];

export const validateSessionUpdate = [
  param('id').custom(isObjectId),
  body('date').optional().isISO8601(),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('location').optional().trim(),
  body('status').optional().isIn(['scheduled', 'completed', 'cancelled']),
  handleValidationErrors
];

// Enrollment validation
export const validateEnrollmentCreate = [
  body('studentId').custom(isObjectId).withMessage('Valid student ID is required'),
  body('offeringId').custom(isObjectId).withMessage('Valid offering ID is required'),
  handleValidationErrors
];

export const validateEnrollmentUpdate = [
  param('id').custom(isObjectId),
  body('status').optional().isIn(['active', 'dropped', 'completed']),
  handleValidationErrors
];

// Attendance validation
export const validateAttendanceMark = [
  body('sessionId').custom(isObjectId).withMessage('Valid session ID is required'),
  body('attendance').isArray().withMessage('Attendance must be an array'),
  body('attendance.*.studentId').custom(isObjectId).withMessage('Valid student ID is required'),
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
    param(paramName).custom(isObjectId).withMessage(`Valid ${paramName} is required`),
    handleValidationErrors
  ];
};
