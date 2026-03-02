import mongoose from 'mongoose';
import { CourseOffering, Session, Enrollment, EnrollmentStatus, Course, Term, TermStatus } from '../models';
import { AppError } from '../utils/errors';

/**
 * Business Validation Utilities
 * Common validation functions used across services
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

/**
 * Validate offering capacity before enrollment
 */
export const validateOfferingCapacity = async (
  offeringId: string,
  additionalStudents: number = 1
): Promise<ValidationResult> => {
  const offering = await CourseOffering.findById(offeringId);

  if (!offering) {
    return {
      valid: false,
      error: 'Course offering not found'
    };
  }

  const enrolledCount = await Enrollment.countDocuments({
    offeringId,
    status: EnrollmentStatus.ENROLLED
  });

  if (enrolledCount + additionalStudents > offering.capacity) {
    return {
      valid: false,
      error: `Insufficient capacity. Current: ${enrolledCount}, Maximum: ${offering.capacity}`,
      details: {
        currentEnrolled: enrolledCount,
        capacity: offering.capacity,
        available: offering.capacity - enrolledCount,
        requested: additionalStudents
      }
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate term status for operations
 */
export const validateTermStatus = async (
  termId: string,
  allowedStatuses: TermStatus[] = [TermStatus.UPCOMING, TermStatus.ACTIVE]
): Promise<ValidationResult> => {
  const term = await Term.findById(termId);

  if (!term) {
    return {
      valid: false,
      error: 'Term not found'
    };
  }

  if (!allowedStatuses.includes(term.status)) {
    return {
      valid: false,
      error: `Term is ${term.status}. Required: ${allowedStatuses.join(' or ')}`,
      details: {
        currentStatus: term.status,
        allowedStatuses
      }
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate time range
 */
export const validateTimeRange = (
  startTime: string,
  endTime: string,
  allowEqual: boolean = false
): ValidationResult => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(startTime)) {
    return {
      valid: false,
      error: 'Start time must be in HH:MM format (24-hour)'
    };
  }

  if (!timeRegex.test(endTime)) {
    return {
      valid: false,
      error: 'End time must be in HH:MM format (24-hour)'
    };
  }

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  if (allowEqual) {
    if (endTotalMinutes < startTotalMinutes) {
      return {
        valid: false,
        error: 'End time must be after or equal to start time'
      };
    }
  } else {
    if (endTotalMinutes <= startTotalMinutes) {
      return {
        valid: false,
        error: 'End time must be after start time'
      };
    }
  }

  // Validate duration (15 min to 8 hours)
  const duration = endTotalMinutes - startTotalMinutes;
  if (duration < 15) {
    return {
      valid: false,
      error: 'Duration must be at least 15 minutes'
    };
  }

  if (duration > 480) {
    return {
      valid: false,
      error: 'Duration cannot exceed 8 hours'
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate date range
 */
export const validateDateRange = (
  startDate: Date,
  endDate: Date
): ValidationResult => {
  if (endDate <= startDate) {
    return {
      valid: false,
      error: 'End date must be after start date'
    };
  }

  // Check if dates are reasonable (not more than 5 years apart)
  const maxDiff = 5 * 365 * 24 * 60 * 60 * 1000;
  const diff = endDate.getTime() - startDate.getTime();

  if (diff > maxDiff) {
    return {
      valid: false,
      error: 'Date range cannot exceed 5 years'
    };
  }

  return {
    valid: true
  };
};

/**
 * Check for overlapping time ranges
 */
export const checkTimeOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);

  // Check for overlap
  return s1 < e2 && e1 > s2;
};

/**
 * Validate day array
 */
export const validateDays = (
  days: string[]
): ValidationResult => {
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (days.length === 0) {
    return {
      valid: false,
      error: 'At least one day must be specified'
    };
  }

  const invalidDays = days.filter(day => !validDays.includes(day));

  if (invalidDays.length > 0) {
    return {
      valid: false,
      error: `Invalid day(s): ${invalidDays.join(', ')}`
    };
  }

  // Check for duplicates
  const uniqueDays = new Set(days);
  if (uniqueDays.size !== days.length) {
    return {
      valid: false,
      error: 'Duplicate days detected'
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate ObjectId
 */
export const validateObjectId = (id: string, fieldName: string = 'ID'): ValidationResult => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      valid: false,
      error: `Invalid ${fieldName} format`
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate positive number
 */
export const validatePositiveNumber = (
  value: number,
  fieldName: string = 'Value',
  min?: number,
  max?: number
): ValidationResult => {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid number`
    };
  }

  if (value < 0) {
    return {
      valid: false,
      error: `${fieldName} must be positive`
    };
  }

  if (min !== undefined && value < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min}`
    };
  }

  if (max !== undefined && value > max) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${max}`
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate enum value
 */
export const validateEnum = <T extends string>(
  value: string,
  enumValues: readonly T[],
  fieldName: string = 'Value'
): ValidationResult => {
  if (!enumValues.includes(value as T)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${enumValues.join(', ')}`
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate required field
 */
export const validateRequired = (
  value: any,
  fieldName: string = 'Field'
): ValidationResult => {
  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      error: `${fieldName} is required`
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate string length
 */
export const validateStringLength = (
  value: string,
  fieldName: string = 'Field',
  min?: number,
  max?: number
): ValidationResult => {
  if (min !== undefined && value.length < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min} characters`
    };
  }

  if (max !== undefined && value.length > max) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${max} characters`
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'Invalid email format'
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate future date
 */
export const validateFutureDate = (
  date: Date,
  fieldName: string = 'Date',
  allowToday: boolean = true
): ValidationResult => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (allowToday) {
    if (compareDate < now) {
      return {
        valid: false,
        error: `${fieldName} cannot be in the past`
      };
    }
  } else {
    if (compareDate <= now) {
      return {
        valid: false,
        error: `${fieldName} must be in the future`
      };
    }
  }

  return {
    valid: true
  };
};

/**
 * Bulk validation - runs multiple validations and returns first failure
 */
export const validateBulk = (
  validations: ValidationResult[]
): ValidationResult => {
  for (const validation of validations) {
    if (!validation.valid) {
      return validation;
    }
  }

  return {
    valid: true
  };
};

/**
 * Check if entity exists by model and id
 */
export const validateEntityExists = async (
  modelName: string,
  id: string,
  fieldName: string = 'Reference'
): Promise<ValidationResult> => {
  const Model = mongoose.model(modelName);
  const entity = await Model.findById(id);

  if (!entity) {
    return {
      valid: false,
      error: `${fieldName} not found`
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate student enrollment eligibility
 */
export const validateStudentEnrollmentEligibility = async (
  studentId: string,
  offeringId: string
): Promise<ValidationResult> => {
  // Check if student is already enrolled
  const existingEnrollment = await Enrollment.findOne({
    studentId,
    offeringId,
    status: { $in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.COMPLETED] }
  });

  if (existingEnrollment) {
    if (existingEnrollment.status === EnrollmentStatus.ENROLLED) {
      return {
        valid: false,
        error: 'Student is already enrolled in this course'
      };
    } else {
      return {
        valid: false,
        error: 'Student has already completed this course'
      };
    }
  }

  // Check capacity
  const capacityCheck = await validateOfferingCapacity(offeringId);

  if (!capacityCheck.valid) {
    return capacityCheck;
  }

  return {
    valid: true
  };
};

/**
 * Validate course code format
 */
export const validateCourseCode = (code: string): ValidationResult => {
  // Course codes are typically like "CS101", "MATH200", etc.
  const codeRegex = /^[A-Z]{2,4}\d{3,4}[A-Z]?$/i;

  if (!codeRegex.test(code)) {
    return {
      valid: false,
      error: 'Course code must be in format like CS101, MATH200A'
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate roll number format
 */
export const validateRollNumber = (rollNumber: string): ValidationResult => {
  // Roll numbers can vary, but typically contain year and department info
  // This is a basic validation - adjust based on your institution's format
  if (rollNumber.length < 5 || rollNumber.length > 20) {
    return {
      valid: false,
      error: 'Roll number must be between 5 and 20 characters'
    };
  }

  return {
    valid: true
  };
};

/**
 * Validate phone number
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check if it's numeric and reasonable length
  const phoneRegex = /^\+?\d{10,15}$/;

  if (!phoneRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid phone number format'
    };
  }

  return {
    valid: true
  };
};
