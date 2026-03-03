import mongoose, { ClientSession } from 'mongoose';
import { Session, ISession, SessionStatus, CourseOffering, Enrollment, EnrollmentStatus, AttendanceRecord } from '../models';
import { AppError } from '../utils/errors';

/**
 * Sessions Service
 * Handles business logic for course sessions with conflict and time validations
 */

export interface SessionConflictCheck {
  hasConflict: boolean;
  conflictingSessions: Array<{
    sessionId: string;
    date: Date;
    location: string;
    reason: string;
  }>;
}

export interface BulkSessionResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    date: Date;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Validate session time format and logic
 */
export const validateSessionTime = (startTime: string, endTime: string): void => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(startTime)) {
    throw new AppError('Start time must be in HH:MM format (24-hour)', 400);
  }

  if (!timeRegex.test(endTime)) {
    throw new AppError('End time must be in HH:MM format (24-hour)', 400);
  }

  // Parse times to minutes for comparison
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  if (endTotalMinutes <= startTotalMinutes) {
    throw new AppError('End time must be after start time', 400);
  }

  // Validate reasonable session duration (max 8 hours)
  const durationMinutes = endTotalMinutes - startTotalMinutes;
  if (durationMinutes > 480) {
    throw new AppError('Session duration cannot exceed 8 hours', 400);
  }

  // Validate minimum duration (15 minutes)
  if (durationMinutes < 15) {
    throw new AppError('Session duration must be at least 15 minutes', 400);
  }
};

/**
 * Check for session conflicts at the same date, time, and location
 */
export const checkSessionConflict = async (
  date: Date,
  startTime: string,
  endTime: string,
  location?: string,
  excludeSessionId?: string
): Promise<SessionConflictCheck> => {
  const query: any = {
    date,
    _id: { $ne: excludeSessionId }
  };

  // Find all sessions on the same date
  const sameDateSessions = await Session.find(query).lean();

  const conflictingSessions: SessionConflictCheck['conflictingSessions'] = [];

  for (const session of sameDateSessions as any[]) {
    // Check time overlap
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);
    const existingStart = parseTime(session.startTime);
    const existingEnd = parseTime(session.endTime);

    // Check for time overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      // Time conflict - check if same location
      if (location && session.location === location) {
        conflictingSessions.push({
          sessionId: session._id.toString(),
          date: session.date,
          location: session.location,
          reason: `Time and location conflict: ${session.startTime}-${session.endTime} at ${location}`
        });
      } else if (!location) {
        // If no location specified, warn about time conflict
        conflictingSessions.push({
          sessionId: session._id.toString(),
          date: session.date,
          location: session.location || 'No location',
          reason: `Time conflict: ${session.startTime}-${session.endTime}`
        });
      }
    }
  }

  return {
    hasConflict: conflictingSessions.length > 0,
    conflictingSessions
  };
};

/**
 * Validate session date against offering schedule
 */
export const validateSessionDateAgainstOffering = async (
  offeringId: string,
  sessionDate: Date
): Promise<void> => {
  const offering = await CourseOffering.findById(offeringId);

  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  // Get day of week for session date
  const sessionDay = sessionDate.toLocaleDateString('en-US', { weekday: 'long' });

  // Check if the offering is scheduled on this day
  if (!offering.schedule.days.includes(sessionDay)) {
    throw new AppError(
      `Session scheduled for ${sessionDay}, but offering is only scheduled for: ${offering.schedule.days.join(', ')}`,
      400
    );
  }

  // Optional: Check if session time matches offering time
  // Some institutions allow flexible session times, so this is informational only
};

/**
 * Create a new session with validations
 */
export const createSession = async (
  sessionData: {
    offeringId: string;
    date: Date;
    startTime: string;
    endTime: string;
    location?: string;
  },
  session?: ClientSession
): Promise<ISession> => {
  // Validate offering exists
  const offering = await CourseOffering.findById(sessionData.offeringId);
  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  // Validate date is not in the past
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (sessionData.date < today) {
    throw new AppError('Cannot create sessions in the past', 400);
  }

  // Validate time format and logic
  validateSessionTime(sessionData.startTime, sessionData.endTime);

  // Validate session date matches offering schedule
  await validateSessionDateAgainstOffering(sessionData.offeringId, sessionData.date);

  // Check for location conflicts if location is specified
  if (sessionData.location) {
    const conflictCheck = await checkSessionConflict(
      sessionData.date,
      sessionData.startTime,
      sessionData.endTime,
      sessionData.location
    );

    if (conflictCheck.hasConflict) {
      const conflictDetails = conflictCheck.conflictingSessions
        .map(c => `${c.reason}`)
        .join('; ');
      throw new AppError(`Session conflict detected: ${conflictDetails}`, 400);
    }
  }

  // Create session
  const newSession = new Session({
    offeringId: sessionData.offeringId,
    date: sessionData.date,
    startTime: sessionData.startTime,
    endTime: sessionData.endTime,
    location: sessionData.location,
    status: SessionStatus.SCHEDULED
  });

  if (session) {
    await newSession.save({ session });
  } else {
    await newSession.save();
  }

  return newSession;
};

/**
 * Update an existing session
 */
export const updateSession = async (
  sessionId: string,
  updateData: Partial<{
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    status: SessionStatus;
  }>,
  dbSession?: ClientSession
): Promise<ISession> => {
  const existingSession = await Session.findById(sessionId);

  if (!existingSession) {
    throw new AppError('Session not found', 404);
  }

  // Cannot update completed or cancelled sessions
  if (existingSession.status === SessionStatus.COMPLETED ||
      existingSession.status === SessionStatus.CANCELLED) {
    throw new AppError(
      `Cannot update session with status: ${existingSession.status}`,
      400
    );
  }

  // Validate date changes
  if (updateData.date !== undefined) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (updateData.date < today) {
      throw new AppError('Cannot set session date to the past', 400);
    }

    // Validate against offering schedule
    await validateSessionDateAgainstOffering(
      existingSession.offeringId.toString(),
      updateData.date
    );

    existingSession.date = updateData.date;
  }

  // Validate time changes
  const startTime = updateData.startTime || existingSession.startTime;
  const endTime = updateData.endTime || existingSession.endTime;

  if (updateData.startTime !== undefined || updateData.endTime !== undefined) {
    validateSessionTime(startTime, endTime);
    existingSession.startTime = startTime;
    existingSession.endTime = endTime;
  }

  // Check for conflicts if date, time, or location changed
  if (updateData.date !== undefined ||
      updateData.startTime !== undefined ||
      updateData.endTime !== undefined ||
      updateData.location !== undefined) {
    const location = updateData.location !== undefined ? updateData.location : existingSession.location;

    if (location) {
      const conflictCheck = await checkSessionConflict(
        existingSession.date,
        existingSession.startTime,
        existingSession.endTime,
        location,
        sessionId
      );

      if (conflictCheck.hasConflict) {
        const conflictDetails = conflictCheck.conflictingSessions
          .map(c => c.reason)
          .join('; ');
        throw new AppError(`Session conflict detected: ${conflictDetails}`, 400);
      }
    }

    if (updateData.location !== undefined) {
      existingSession.location = updateData.location;
    }
  }

  // Update status
  if (updateData.status !== undefined) {
    existingSession.status = updateData.status;
  }

  if (dbSession) {
    await existingSession.save({ session: dbSession });
  } else {
    await existingSession.save();
  }

  return existingSession;
};

/**
 * Delete a session (only if no attendance records exist)
 */
export const deleteSession = async (
  sessionId: string,
  session?: ClientSession
): Promise<void> => {
  const existingSession = await Session.findById(sessionId);

  if (!existingSession) {
    throw new AppError('Session not found', 404);
  }

  // Check for existing attendance records
  const attendanceCount = await AttendanceRecord.countDocuments({
    sessionId
  });

  if (attendanceCount > 0) {
    throw new AppError(
      `Cannot delete session with ${attendanceCount} attendance records. Cancel the session instead.`,
      400
    );
  }

  // Cannot delete in-progress or completed sessions
  if (existingSession.status === SessionStatus.IN_PROGRESS ||
      existingSession.status === SessionStatus.COMPLETED) {
    throw new AppError(
      `Cannot delete session with status: ${existingSession.status}`,
      400
    );
  }

  if (session) {
    await Session.deleteOne({ _id: sessionId }).session(session);
  } else {
    await Session.deleteOne({ _id: sessionId });
  }
};

/**
 * Cancel a session
 */
export const cancelSession = async (
  sessionId: string,
  session?: ClientSession
): Promise<ISession> => {
  const existingSession = await Session.findById(sessionId);

  if (!existingSession) {
    throw new AppError('Session not found', 404);
  }

  if (existingSession.status === SessionStatus.CANCELLED) {
    throw new AppError('Session is already cancelled', 400);
  }

  if (existingSession.status === SessionStatus.COMPLETED) {
    throw new AppError('Cannot cancel a completed session', 400);
  }

  existingSession.status = SessionStatus.CANCELLED;

  if (session) {
    await existingSession.save({ session });
  } else {
    await existingSession.save();
  }

  return existingSession;
};

/**
 * Bulk create sessions for a schedule (e.g., entire semester)
 */
export const bulkCreateSessions = async (
  offeringId: string,
  dates: Date[],
  defaultStartTime: string,
  defaultEndTime: string,
  location?: string
): Promise<BulkSessionResult> => {
  // Validate offering exists
  const offering = await CourseOffering.findById(offeringId);
  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  // Validate default times
  validateSessionTime(defaultStartTime, defaultEndTime);

  const result: BulkSessionResult = {
    total: dates.length,
    succeeded: 0,
    failed: 0,
    results: []
  };

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    for (const date of dates) {
      try {
        // Validate date matches offering schedule
        await validateSessionDateAgainstOffering(offeringId, date);

        const session = new Session({
          offeringId,
          date,
          startTime: defaultStartTime,
          endTime: defaultEndTime,
          location,
          status: SessionStatus.SCHEDULED
        });

        await session.save({ session: dbSession });

        result.succeeded++;
        result.results.push({
          date,
          success: true
        });
      } catch (error: any) {
        result.failed++;
        result.results.push({
          date,
          success: false,
          error: error.message
        });
      }
    }

    // Commit if at least one succeeded
    if (result.succeeded > 0) {
      await dbSession.commitTransaction();
    } else {
      await dbSession.abortTransaction();
    }

    return result;
  } catch (error: any) {
    await dbSession.abortTransaction();
    throw new AppError(`Bulk session creation failed: ${error.message}`, 500);
  } finally {
    dbSession.endSession();
  }
};

/**
 * Generate session dates for a term based on offering schedule
 */
export const generateSessionDates = async (
  offeringId: string,
  termId: string,
  excludeDates: Date[] = []
): Promise<Date[]> => {
  const [offering, term] = await Promise.all([
    CourseOffering.findById(offeringId),
    mongoose.model('Term').findById(termId)
  ]);

  if (!offering) {
    throw new AppError('Course offering not found', 404);
  }

  if (!term) {
    throw new AppError('Term not found', 404);
  }

  const dates: Date[] = [];
  const currentDate = new Date(term.startDate);
  const endDate = new Date(term.endDate);

  // Generate dates for each day in the offering schedule
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

    if (offering.schedule.days.includes(dayOfWeek)) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Check if this date is in the exclusion list
      const isExcluded = excludeDates.some(excludeDate => {
        const excludeStr = new Date(excludeDate).toISOString().split('T')[0];
        return excludeStr === dateStr;
      });

      if (!isExcluded) {
        // Clone the date to avoid reference issues
        dates.push(new Date(currentDate));
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Get sessions for an offering
 */
export const getOfferingSessions = async (
  offeringId: string,
  status?: SessionStatus
): Promise<any[]> => {
  const query: any = { offeringId };

  if (status) {
    query.status = status;
  }

  return await Session.find(query)
    .sort({ date: 1, startTime: 1 })
    .lean();
};

/**
 * Get upcoming sessions for a student
 */
export const getStudentUpcomingSessions = async (
  studentId: string,
  limit: number = 10
): Promise<Array<ISession & { courseName: string; location?: string }>> => {
  // Get student's active enrollments
  const enrollments = await Enrollment.find({
    studentId,
    status: EnrollmentStatus.ENROLLED
  });

  const offeringIds = enrollments.map(e => e.offeringId);

  if (offeringIds.length === 0) {
    return [];
  }

  // Get upcoming sessions for these offerings
  const now = new Date();
  const sessions = await Session.find({
    offeringId: { $in: offeringIds },
    date: { $gte: now },
    status: { $in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] }
  })
    .populate('offeringId')
    .sort({ date: 1, startTime: 1 })
    .limit(limit)
    .lean();

  return sessions.map((session: any) => ({
    ...session,
    courseName: session.offeringId?.courseId?.name || 'Unknown Course'
  }));
};

/**
 * Get session attendance summary
 */
export const getSessionAttendanceSummary = async (
  sessionId: string
): Promise<{
  totalEnrolled: number;
  markedPresent: number;
  markedAbsent: number;
  pending: number;
}> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Get total enrolled students
  const totalEnrolled = await Enrollment.countDocuments({
    offeringId: session.offeringId,
    status: EnrollmentStatus.ENROLLED
  });

  // Get marked attendance
  const [markedPresent, markedAbsent] = await Promise.all([
    AttendanceRecord.countDocuments({
      sessionId,
      status: { $in: ['present', 'late', 'excused'] }
    }),
    AttendanceRecord.countDocuments({
      sessionId,
      status: 'absent'
    })
  ]);

  const pending = totalEnrolled - markedPresent - markedAbsent;

  return {
    totalEnrolled,
    markedPresent,
    markedAbsent,
    pending
  };
};

/**
 * Check if session can be started
 */
export const canStartSession = async (sessionId: string): Promise<boolean> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Can only start scheduled sessions
  if (session.status !== SessionStatus.SCHEDULED) {
    return false;
  }

  // Check if it's time (within 15 minutes of start time)
  const now = new Date();
  const sessionDate = new Date(session.date);
  const [hours, minutes] = session.startTime.split(':').map(Number);

  sessionDate.setHours(hours, minutes, 0, 0);
  const diffMinutes = (now.getTime() - sessionDate.getTime()) / (1000 * 60);

  // Allow starting 15 minutes early or any time after start
  return diffMinutes >= -15;
};

/**
 * Check if session can be ended
 */
export const canEndSession = async (sessionId: string): Promise<boolean> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Can only end in-progress sessions
  return session.status === SessionStatus.IN_PROGRESS;
};

/**
 * Helper function to parse time string (HH:MM) to minutes
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
