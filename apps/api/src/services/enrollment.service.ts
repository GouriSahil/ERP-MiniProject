import mongoose, { ClientSession } from 'mongoose';
import { Enrollment, EnrollmentStatus, IEnrollment, CourseOffering, Student, Course } from '../models';
import { AppError } from '../utils/errors';

/**
 * Enrollment Service
 * Handles business logic for student enrollment operations
 */

export interface EnrollmentResult {
  success: boolean;
  enrollment?: IEnrollment;
  error?: string;
}

export interface BulkEnrollmentResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    studentId: string;
    offeringId: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Check if course offering has available capacity
 */
export const checkCapacity = async (offeringId: string): Promise<boolean> => {
  const offering = await CourseOffering.findById(offeringId);
  
  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  const enrolledCount = await Enrollment.countDocuments({ 
    offeringId, 
    status: EnrollmentStatus.ENROLLED 
  });

  return enrolledCount < offering.capacity;
};

/**
 * Get current enrollment count for an offering
 */
export const getEnrollmentCount = async (offeringId: string): Promise<number> => {
  return await Enrollment.countDocuments({ 
    offeringId, 
    status: EnrollmentStatus.ENROLLED 
  });
};

/**
 * Check for duplicate enrollment
 */
export const checkDuplicateEnrollment = async (
  studentId: string,
  offeringId: string
): Promise<boolean> => {
  const existing = await Enrollment.findOne({
    studentId,
    offeringId
  });

  return existing !== null;
};

/**
 * Validate prerequisites for a course
 * This is a placeholder - implement based on your prerequisite model
 */
export const validatePrerequisites = async (
  studentId: string,
  courseId: string
): Promise<boolean> => {
  // TODO: Implement prerequisite validation logic
  // For now, we'll return true as there's no prerequisite model
  return true;
};

/**
 * Enroll a student in a course offering
 */
export const enrollStudent = async (
  studentId: string,
  offeringId: string,
  session?: ClientSession
): Promise<IEnrollment> => {
  // Check if student exists
  const student = await Student.findById(studentId);
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // Check if offering exists
  const offering = await CourseOffering.findById(offeringId).populate('courseId');
  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  // Check for duplicate enrollment
  const duplicateExists = await checkDuplicateEnrollment(studentId, offeringId);
  if (duplicateExists) {
    throw new AppError('Student is already enrolled in this course', 400);
  }

  // Check capacity
  const hasCapacity = await checkCapacity(offeringId);
  if (!hasCapacity) {
    throw new AppError('Course offering has reached maximum capacity', 400);
  }

  // Validate prerequisites
  const prerequisitesValid = await validatePrerequisites(studentId, (offering.courseId as any)._id);
  if (!prerequisitesValid) {
    throw new AppError('Student does not meet the prerequisites for this course', 400);
  }

  // Create enrollment
  const enrollment = new Enrollment({
    studentId,
    offeringId,
    status: EnrollmentStatus.ENROLLED,
    enrolledAt: new Date()
  });

  if (session) {
    await enrollment.save({ session });
  } else {
    await enrollment.save();
  }

  return enrollment;
};

/**
 * Drop a student from a course offering
 */
export const dropEnrollment = async (
  studentId: string,
  offeringId: string,
  session?: ClientSession
): Promise<IEnrollment> => {
  const enrollment = await Enrollment.findOne({
    studentId,
    offeringId,
    status: EnrollmentStatus.ENROLLED
  });

  if (!enrollment) {
    throw new AppError('Active enrollment not found', 404);
  }

  enrollment.status = EnrollmentStatus.DROPPED;
  enrollment.droppedAt = new Date();

  if (session) {
    await enrollment.save({ session });
  } else {
    await enrollment.save();
  }

  return enrollment;
};

/**
 * Get enrollments for a student
 */
export const getStudentEnrollments = async (
  studentId: string,
  status?: EnrollmentStatus
): Promise<IEnrollment[]> => {
  const query: any = { studentId };
  
  if (status) {
    query.status = status;
  }

  const enrollments = await Enrollment.find(query)
    .populate('offeringId')
    .sort({ createdAt: -1 });

  return enrollments;
};

/**
 * Get enrollments for a course offering
 */
export const getOfferingEnrollments = async (
  offeringId: string,
  status?: EnrollmentStatus
): Promise<IEnrollment[]> => {
  const query: any = { offeringId };
  
  if (status) {
    query.status = status;
  }

  const enrollments = await Enrollment.find(query)
    .populate('studentId')
    .sort({ enrolledAt: -1 });

  return enrollments;
};

/**
 * Bulk enroll multiple students
 */
export const bulkEnrollStudents = async (
  enrollments: Array<{ studentId: string; offeringId: string }>
): Promise<BulkEnrollmentResult> => {
  const result: BulkEnrollmentResult = {
    total: enrollments.length,
    succeeded: 0,
    failed: 0,
    results: []
  };

  // Start a transaction for bulk operation
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of enrollments) {
      try {
        const enrollment = await enrollStudent(
          item.studentId,
          item.offeringId,
          session
        );
        
        result.succeeded++;
        result.results.push({
          studentId: item.studentId,
          offeringId: item.offeringId,
          success: true
        });
      } catch (error: any) {
        result.failed++;
        result.results.push({
          studentId: item.studentId,
          offeringId: item.offeringId,
          success: false,
          error: error.message
        });
      }
    }

    // Commit transaction if at least one enrollment succeeded
    if (result.succeeded > 0) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }

    return result;
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(`Bulk enrollment failed: ${error.message}`, 500);
  } finally {
    session.endSession();
  }
};

/**
 * Update enrollment status
 */
export const updateEnrollmentStatus = async (
  enrollmentId: string,
  status: EnrollmentStatus,
  session?: ClientSession
): Promise<IEnrollment> => {
  const enrollment = await Enrollment.findById(enrollmentId);

  if (!enrollment) {
    throw new AppError('Enrollment not found', 404);
  }

  enrollment.status = status;

  if (status === EnrollmentStatus.DROPPED && !enrollment.droppedAt) {
    enrollment.droppedAt = new Date();
  }

  if (session) {
    await enrollment.save({ session });
  } else {
    await enrollment.save();
  }

  return enrollment;
};

/**
 * Get enrollment statistics for an offering
 */
export const getEnrollmentStats = async (offeringId: string) => {
  const stats = await Enrollment.aggregate([
    {
      $match: { offeringId: new mongoose.Types.ObjectId(offeringId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result: Record<string, number> = {
    enrolled: 0,
    dropped: 0,
    completed: 0,
    failed: 0,
    incomplete: 0
  };

  stats.forEach(stat => {
    result[stat._id as string] = stat.count;
  });

  return result;
};

/**
 * Check if student can enroll in a course (schedule conflict check)
 */
export const checkScheduleConflict = async (
  studentId: string,
  offeringId: string
): Promise<boolean> => {
  // Get the new offering
  const newOffering = await CourseOffering.findById(offeringId);
  if (!newOffering) {
    throw new AppError('Course offering not found', 404);
  }

  // Get student's current enrollments
  const currentEnrollments = await Enrollment.find({
    studentId,
    status: EnrollmentStatus.ENROLLED
  }).populate('offeringId');

  // Check for schedule conflicts
  for (const enrollment of currentEnrollments) {
    const existingOffering = enrollment.offeringId as any;
    
    if (!existingOffering || !existingOffering.schedule) {
      continue;
    }

    // Check if any day overlaps
    const hasDayOverlap = newOffering.schedule.days.some((day: string) => 
      existingOffering.schedule.days.includes(day)
    );

    if (hasDayOverlap) {
      // Check if time overlaps
      const newStart = parseTime(newOffering.schedule.startTime);
      const newEnd = parseTime(newOffering.schedule.endTime);
      const existingStart = parseTime(existingOffering.schedule.startTime);
      const existingEnd = parseTime(existingOffering.schedule.endTime);

      // Check for time overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        return true; // Conflict found
      }
    }
  }

  return false; // No conflict
};

/**
 * Helper function to parse time string (HH:MM) to minutes
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
