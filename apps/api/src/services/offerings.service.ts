import mongoose, { ClientSession } from 'mongoose';
import { CourseOffering, ICourseOffering, OfferingFaculty, FacultyRole, Course, Term, TermStatus, Enrollment, EnrollmentStatus } from '../models';
import { AppError } from '../utils/errors';

/**
 * Course Offerings Service
 * Handles business logic for course offerings with capacity, scheduling, and faculty assignment validations
 */

export interface OfferingConflictCheck {
  hasConflict: boolean;
  conflicts: Array<{
    offeringId: string;
    courseName: string;
    reason: string;
  }>;
}

export interface OfferingStats {
  totalEnrolled: number;
  availableSeats: number;
  waitlistCount: number;
  capacity: number;
  fillRate: number;
}

/**
 * Check for schedule conflicts with existing offerings
 */
export const checkScheduleConflict = async (
  termId: string,
  days: string[],
  startTime: string,
  endTime: string,
  room?: string,
  excludeOfferingId?: string
): Promise<OfferingConflictCheck> => {
  const query: any = {
    termId,
    'schedule.days': { $in: days },
    _id: { $ne: excludeOfferingId }
  };

  // Find offerings that overlap in days
  const potentialConflicts = await CourseOffering.find(query)
    .populate('courseId')
    .lean();

  const conflicts: OfferingConflictCheck['conflicts'] = [];

  for (const offering of potentialConflicts as any[]) {
    // Check time overlap
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);
    const existingStart = parseTime(offering.schedule.startTime);
    const existingEnd = parseTime(offering.schedule.endTime);

    // Check if time ranges overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      // Time conflict
      conflicts.push({
        offeringId: offering._id.toString(),
        courseName: offering.courseId?.name || 'Unknown Course',
        reason: `Time conflict: ${offering.schedule.startTime}-${offering.schedule.endTime}`
      });
    }

    // Check room conflict if room is specified
    if (room && offering.schedule.room === room) {
      conflicts.push({
        offeringId: offering._id.toString(),
        courseName: offering.courseId?.name || 'Unknown Course',
        reason: `Room conflict: ${room} is already booked`
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
};

/**
 * Check if term is active or can accept new offerings
 */
export const validateTermForOffering = async (termId: string): Promise<void> => {
  const term = await Term.findById(termId);

  if (!term) {
    throw new AppError('Term not found', 404);
  }

  // Only allow offerings in upcoming or active terms
  if (term.status === TermStatus.COMPLETED || term.status === TermStatus.CANCELLED) {
    throw new AppError(`Cannot create offerings for ${term.status} terms`, 400);
  }
};

/**
 * Create a new course offering with validations
 */
export const createCourseOffering = async (
  offeringData: {
    courseId: string;
    termId: string;
    capacity: number;
    schedule: {
      days: string[];
      startTime: string;
      endTime: string;
      room?: string;
    };
  },
  session?: ClientSession
): Promise<ICourseOffering> => {
  // Validate course exists
  const course = await Course.findById(offeringData.courseId);
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Validate term
  await validateTermForOffering(offeringData.termId);

  // Check for schedule conflicts
  const conflictCheck = await checkScheduleConflict(
    offeringData.termId,
    offeringData.schedule.days,
    offeringData.schedule.startTime,
    offeringData.schedule.endTime,
    offeringData.schedule.room
  );

  if (conflictCheck.hasConflict) {
    const errorMessages = conflictCheck.conflicts
      .map(c => `${c.courseName}: ${c.reason}`)
      .join('; ');
    throw new AppError(`Schedule conflict detected: ${errorMessages}`, 400);
  }

  // Create offering
  const offering = new CourseOffering({
    courseId: offeringData.courseId,
    termId: offeringData.termId,
    capacity: offeringData.capacity,
    schedule: offeringData.schedule
  });

  if (session) {
    await offering.save({ session });
  } else {
    await offering.save();
  }

  return offering;
};

/**
 * Update course offering with conflict validation
 */
export const updateCourseOffering = async (
  offeringId: string,
  updateData: Partial<{
    capacity: number;
    schedule: {
      days: string[];
      startTime: string;
      endTime: string;
      room?: string;
    };
  }>,
  session?: ClientSession
): Promise<ICourseOffering> => {
  const offering = await CourseOffering.findById(offeringId);

  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  // If updating schedule, check for conflicts
  if (updateData.schedule) {
    const conflictCheck = await checkScheduleConflict(
      offering.termId.toString(),
      updateData.schedule.days,
      updateData.schedule.startTime,
      updateData.schedule.endTime,
      updateData.schedule.room,
      offeringId
    );

    if (conflictCheck.hasConflict) {
      const errorMessages = conflictCheck.conflicts
        .map(c => `${c.courseName}: ${c.reason}`)
        .join('; ');
      throw new AppError(`Schedule conflict detected: ${errorMessages}`, 400);
    }

    offering.schedule = updateData.schedule;
  }

  // If updating capacity, validate it's not less than current enrollment
  if (updateData.capacity !== undefined) {
    const enrolledCount = await Enrollment.countDocuments({
      offeringId,
      status: EnrollmentStatus.ENROLLED
    });

    if (updateData.capacity < enrolledCount) {
      throw new AppError(
        `Cannot reduce capacity below current enrollment (${enrolledCount} students)`,
        400
      );
    }

    offering.capacity = updateData.capacity;
  }

  if (session) {
    await offering.save({ session });
  } else {
    await offering.save();
  }

  return offering;
};

/**
 * Delete course offering (only if no enrollments)
 */
export const deleteCourseOffering = async (
  offeringId: string,
  session?: ClientSession
): Promise<void> => {
  const offering = await CourseOffering.findById(offeringId);

  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  // Check for active enrollments
  const enrollmentCount = await Enrollment.countDocuments({
    offeringId,
    status: EnrollmentStatus.ENROLLED
  });

  if (enrollmentCount > 0) {
    throw new AppError(
      `Cannot delete offering with ${enrollmentCount} active enrollments. Drop students first.`,
      400
    );
  }

  if (session) {
    await CourseOffering.deleteOne({ _id: offeringId }).session(session);
  } else {
    await CourseOffering.deleteOne({ _id: offeringId });
  }
};

/**
 * Assign faculty to offering with conflict checks
 */
export const assignFacultyToOffering = async (
  offeringId: string,
  facultyId: string,
  role: FacultyRole = FacultyRole.SECONDARY,
  session?: ClientSession
): Promise<void> => {
  // Check if offering exists
  const offering = await CourseOffering.findById(offeringId);
  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  // Check if faculty exists
  const Faculty = mongoose.model('Faculty');
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new AppError('Faculty not found', 404);
  }

  // Check for faculty schedule conflicts
  const facultyScheduleConflict = await checkFacultyScheduleConflict(
    facultyId,
    offeringId
  );

  if (facultyScheduleConflict.hasConflict) {
    throw new AppError(
      'Faculty has a schedule conflict with another course at this time',
      400
    );
  }

  // Check for existing assignment
  const existingAssignment = await OfferingFaculty.findOne({
    facultyId,
    offeringId
  });

  if (existingAssignment) {
    throw new AppError('Faculty is already assigned to this offering', 400);
  }

  // If role is PRIMARY, remove existing primary faculty
  if (role === FacultyRole.PRIMARY) {
    await OfferingFaculty.deleteMany({
      offeringId,
      role: FacultyRole.PRIMARY
    });
  }

  const assignment = new OfferingFaculty({
    facultyId,
    offeringId,
    role
  });

  if (session) {
    await assignment.save({ session });
  } else {
    await assignment.save();
  }
};

/**
 * Check if faculty has schedule conflicts
 */
export const checkFacultyScheduleConflict = async (
  facultyId: string,
  newOfferingId: string
): Promise<{ hasConflict: boolean }> => {
  const newOffering = await CourseOffering.findById(newOfferingId);
  if (!newOffering) {
    return { hasConflict: false };
  }

  // Get all offerings where this faculty is assigned
  const facultyAssignments = await OfferingFaculty.find({
    facultyId,
    offeringId: { $ne: newOfferingId }
  });

  const offeringIds = facultyAssignments.map(a => a.offeringId);

  if (offeringIds.length === 0) {
    return { hasConflict: false };
  }

  // Get those offerings
  const existingOfferings = await CourseOffering.find({
    _id: { $in: offeringIds }
  });

  // Check for conflicts
  for (const existing of existingOfferings) {
    // Check if any day overlaps
    const hasDayOverlap = newOffering.schedule.days.some((day: string) =>
      existing.schedule.days.includes(day)
    );

    if (hasDayOverlap) {
      // Check time overlap
      const newStart = parseTime(newOffering.schedule.startTime);
      const newEnd = parseTime(newOffering.schedule.endTime);
      const existingStart = parseTime(existing.schedule.startTime);
      const existingEnd = parseTime(existing.schedule.endTime);

      if (newStart < existingEnd && newEnd > existingStart) {
        return { hasConflict: true };
      }
    }
  }

  return { hasConflict: false };
};

/**
 * Remove faculty from offering
 */
export const removeFacultyFromOffering = async (
  offeringId: string,
  facultyId: string,
  session?: ClientSession
): Promise<void> => {
  const assignment = await OfferingFaculty.findOne({
    offeringId,
    facultyId
  });

  if (!assignment) {
    throw new AppError('Faculty assignment not found', 404);
  }

  if (session) {
    await OfferingFaculty.deleteOne({
      offeringId,
      facultyId
    }).session(session);
  } else {
    await OfferingFaculty.deleteOne({
      offeringId,
      facultyId
    });
  }
};

/**
 * Get offering statistics
 */
export const getOfferingStats = async (offeringId: string): Promise<OfferingStats> => {
  const offering = await CourseOffering.findById(offeringId);

  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  const totalEnrolled = await Enrollment.countDocuments({
    offeringId,
    status: EnrollmentStatus.ENROLLED
  });

  const availableSeats = Math.max(0, offering.capacity - totalEnrolled);
  const fillRate = (totalEnrolled / offering.capacity) * 100;

  return {
    totalEnrolled,
    availableSeats,
    waitlistCount: 0, // TODO: Implement waitlist if needed
    capacity: offering.capacity,
    fillRate: Math.round(fillRate * 100) / 100
  };
};

/**
 * Get faculty teaching load for a term
 */
export const getFacultyTeachingLoad = async (
  facultyId: string,
  termId: string
): Promise<{
  totalOfferings: number;
  totalStudents: number;
  primaryOfferings: number;
  secondaryOfferings: number;
  courses: Array<{
    offeringId: string;
    courseName: string;
    role: string;
    enrolledCount: number;
  }>;
}> => {
  const assignments = await OfferingFaculty.find({ facultyId })
    .populate({
      path: 'offeringId',
      match: { termId },
      populate: {
        path: 'courseId'
      }
    });

  const validAssignments = assignments
    .filter(a => (a.offeringId as any) !== null)
    .map(a => ({
      offeringId: a.offeringId,
      role: a.role
    }));

  const primaryOfferings = validAssignments.filter(a => a.role === FacultyRole.PRIMARY).length;
  const secondaryOfferings = validAssignments.filter(a => a.role === FacultyRole.SECONDARY).length;

  const courses = [];
  let totalStudents = 0;

  for (const assignment of validAssignments) {
    const offering = assignment.offeringId as any;
    const enrolledCount = await Enrollment.countDocuments({
      offeringId: offering._id,
      status: EnrollmentStatus.ENROLLED
    });

    totalStudents += enrolledCount;

    courses.push({
      offeringId: offering._id.toString(),
      courseName: offering.courseId?.name || 'Unknown',
      role: assignment.role,
      enrolledCount
    });
  }

  return {
    totalOfferings: validAssignments.length,
    totalStudents,
    primaryOfferings,
    secondaryOfferings,
    courses
  };
};

/**
 * Get offerings by term with statistics
 */
export const getOfferingsByTerm = async (
  termId: string
): Promise<Array<ICourseOffering & { stats?: OfferingStats }>> => {
  const offerings = await CourseOffering.find({ termId })
    .populate('courseId')
    .lean();

  const result = [];

  for (const offering of offerings as any[]) {
    const stats = await getOfferingStats(offering._id.toString());
    result.push({
      ...offering,
      stats
    });
  }

  return result;
};

/**
 * Helper function to parse time string (HH:MM) to minutes
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Validate schedule data
 */
export const validateScheduleData = (schedule: {
  days: string[];
  startTime: string;
  endTime: string;
}): void => {
  // Validate days
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const invalidDays = schedule.days.filter(day => !validDays.includes(day));

  if (invalidDays.length > 0) {
    throw new AppError(`Invalid day(s): ${invalidDays.join(', ')}`, 400);
  }

  if (schedule.days.length === 0) {
    throw new AppError('At least one day must be specified', 400);
  }

  // Validate time format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(schedule.startTime)) {
    throw new AppError('Start time must be in HH:MM format', 400);
  }

  if (!timeRegex.test(schedule.endTime)) {
    throw new AppError('End time must be in HH:MM format', 400);
  }

  // Validate time logic
  const start = parseTime(schedule.startTime);
  const end = parseTime(schedule.endTime);

  if (end <= start) {
    throw new AppError('End time must be after start time', 400);
  }
};

/**
 * Check if offering can accept more enrollments
 */
export const checkOfferingCapacity = async (offeringId: string): Promise<boolean> => {
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
