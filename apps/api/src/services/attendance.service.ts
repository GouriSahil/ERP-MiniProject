import mongoose, { ClientSession } from 'mongoose';
import { 
  AttendanceRecord, 
  AttendanceStatus, 
  IAttendanceRecord,
  Session,
  Enrollment,
  EnrollmentStatus 
} from '../models';
import { AppError } from '../utils/errors';

/**
 * Attendance Service
 * Handles business logic for attendance tracking and analytics
 */

export interface AttendanceStats {
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  attendanceRate: number;
}

export interface StudentAttendanceRecord {
  sessionId: string;
  date: Date;
  status: AttendanceStatus;
  markedBy?: string;
}

export interface BulkMarkResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    studentId: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Mark attendance for a single student
 */
export const markAttendance = async (
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
  markedBy?: string,
  session?: ClientSession
): Promise<IAttendanceRecord> => {
  // Check if session exists
  const sessionDoc = await Session.findById(sessionId);
  if (!sessionDoc) {
    throw new AppError('Session not found', 404);
  }

  // Check if student is enrolled in the course
  const offeringId = sessionDoc.offeringId;
  const enrollment = await Enrollment.findOne({
    studentId,
    offeringId,
    status: EnrollmentStatus.ENROLLED
  });

  if (!enrollment) {
    throw new AppError('Student is not enrolled in this course', 400);
  }

  // Check for existing attendance record
  const existing = await AttendanceRecord.findOne({
    sessionId,
    studentId
  });

  if (existing) {
    // Update existing record
    existing.status = status;
    existing.markedBy = markedBy ? new mongoose.Types.ObjectId(markedBy) : undefined;
    existing.markedAt = new Date();

    if (session) {
      await existing.save({ session });
    } else {
      await existing.save();
    }

    return existing;
  }

  // Create new attendance record
  const record = new AttendanceRecord({
    sessionId,
    studentId,
    status,
    markedBy: markedBy ? new mongoose.Types.ObjectId(markedBy) : undefined,
    markedAt: new Date()
  });

  if (session) {
    await record.save({ session });
  } else {
    await record.save();
  }

  return record;
};

/**
 * Bulk mark attendance for multiple students
 */
export const bulkMarkAttendance = async (
  sessionId: string,
  attendanceData: Array<{ studentId: string; status: AttendanceStatus }>,
  markedBy?: string
): Promise<BulkMarkResult> => {
  const result: BulkMarkResult = {
    total: attendanceData.length,
    succeeded: 0,
    failed: 0,
    results: []
  };

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    for (const item of attendanceData) {
      try {
        await markAttendance(
          sessionId,
          item.studentId,
          item.status,
          markedBy,
          dbSession
        );
        
        result.succeeded++;
        result.results.push({
          studentId: item.studentId,
          success: true
        });
      } catch (error: any) {
        result.failed++;
        result.results.push({
          studentId: item.studentId,
          success: false,
          error: error.message
        });
      }
    }

    if (result.succeeded > 0) {
      await dbSession.commitTransaction();
    } else {
      await dbSession.abortTransaction();
    }

    return result;
  } catch (error: any) {
    await dbSession.abortTransaction();
    throw new AppError(`Bulk attendance marking failed: ${error.message}`, 500);
  } finally {
    dbSession.endSession();
  }
};

/**
 * Get attendance records for a student in a course
 */
export const getStudentAttendance = async (
  studentId: string,
  offeringId: string
): Promise<StudentAttendanceRecord[]> => {
  // Get all sessions for the offering
  const sessions = await Session.find({ offeringId }).sort({ date: 1 });
  const sessionIds = sessions.map(s => s._id);

  // Get attendance records
  const records = await AttendanceRecord.find({
    studentId: { $in: sessionIds }
  })
  .populate('sessionId')
  .sort({ createdAt: -1 });

  return records.map(record => ({
    sessionId: (record.sessionId as any)._id.toString(),
    date: (record.sessionId as any).date,
    status: record.status,
    markedBy: record.markedBy?.toString()
  }));
};

/**
 * Calculate attendance statistics for a student in a course
 */
export const calculateAttendanceStats = async (
  studentId: string,
  offeringId: string
): Promise<AttendanceStats> => {
  // Get all sessions for the offering
  const totalSessions = await Session.countDocuments({ offeringId });
  
  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      percentage: 0,
      attendanceRate: 0
    };
  }

  // Get session IDs
  const sessions = await Session.find({ offeringId });
  const sessionIds = sessions.map(s => s._id);

  // Aggregate attendance records
  const stats = await AttendanceRecord.aggregate([
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        sessionId: { $in: sessionIds }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result: AttendanceStats = {
    totalSessions,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: 0,
    attendanceRate: 0
  };

  stats.forEach(stat => {
    result[stat._id as keyof AttendanceStats] = stat.count as number;
  });

  // Calculate percentage (present + late + excused) / total
  const attendedClasses = result.present + result.late + result.excused;
  result.percentage = (attendedClasses / totalSessions) * 100;
  result.attendanceRate = result.percentage;

  return result;
};

/**
 * Get attendance records for a session
 */
export const getSessionAttendance = async (sessionId: string): Promise<IAttendanceRecord[]> => {
  return await AttendanceRecord.find({ sessionId })
    .populate('studentId')
    .sort({ createdAt: -1 });
};

/**
 * Get attendance summary for all students in a course
 */
export const getCourseAttendanceSummary = async (
  offeringId: string
): Promise<Array<{ studentId: string; studentName: string; stats: AttendanceStats }>> => {
  // Get all enrolled students
  const enrollments = await Enrollment.find({
    offeringId,
    status: EnrollmentStatus.ENROLLED
  }).populate('studentId');

  const summary = [];

  for (const enrollment of enrollments) {
    const student: any = enrollment.studentId;
    
    // Get user details for student name
    const User = mongoose.model('User');
    const user = await User.findById(student.userId);
    const studentName = user ? user.name : student.rollNumber;
    
    const stats = await calculateAttendanceStats(
      student._id.toString(),
      offeringId
    );

    summary.push({
      studentId: student._id.toString(),
      studentName,
      stats
    });
  }

  return summary;
};

/**
 * Get students with low attendance (below threshold)
 */
export const getLowAttendanceStudents = async (
  offeringId: string,
  threshold: number = 75
): Promise<Array<{ studentId: string; studentName: string; percentage: number }>> => {
  const summary = await getCourseAttendanceSummary(offeringId);

  return summary
    .filter(item => item.stats.percentage < threshold)
    .map(item => ({
      studentId: item.studentId,
      studentName: item.studentName,
      percentage: item.stats.percentage
    }))
    .sort((a, b) => a.percentage - b.percentage);
};

/**
 * Get attendance analytics for a date range
 */
export const getAttendanceAnalytics = async (
  offeringId: string,
  startDate: Date,
  endDate: Date
): Promise<any> => {
  const sessions = await Session.find({
    offeringId,
    date: { $gte: startDate, $lte: endDate }
  });

  const sessionIds = sessions.map(s => s._id);

  const analytics = await AttendanceRecord.aggregate([
    {
      $match: {
        sessionId: { $in: sessionIds }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result: Record<string, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0
  };

  analytics.forEach(item => {
    result[item._id] = item.count;
  });

  return result;
};

/**
 * Get daily attendance trends for a course
 */
export const getDailyAttendanceTrends = async (
  offeringId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; total: number; present: number; absent: number }>> => {
  const sessions = await Session.find({
    offeringId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const trends = [];

  for (const session of sessions) {
    const total = await AttendanceRecord.countDocuments({ sessionId: session._id });
    const present = await AttendanceRecord.countDocuments({
      sessionId: session._id,
      status: { $in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED] }
    });
    const absent = total - present;

    trends.push({
      date: session.date,
      total,
      present,
      absent
    });
  }

  return trends;
};

/**
 * Mark all students as present for a session (quick marking)
 */
export const markAllPresent = async (
  sessionId: string,
  markedBy?: string
): Promise<BulkMarkResult> => {
  // Get the session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Get all enrolled students
  const enrollments = await Enrollment.find({
    offeringId: session.offeringId,
    status: EnrollmentStatus.ENROLLED
  });

  const attendanceData = enrollments.map(e => ({
    studentId: e.studentId.toString(),
    status: AttendanceStatus.PRESENT
  }));

  return await bulkMarkAttendance(sessionId, attendanceData, markedBy);
};

/**
 * Get attendance report for export
 */
export const getAttendanceReport = async (
  offeringId: string
): Promise<any> => {
  const summary = await getCourseAttendanceSummary(offeringId);
  
  // Get course details
  const sessions = await Session.find({ offeringId }).sort({ date: 1 });
  
  return {
    offeringId,
    totalSessions: sessions.length,
    sessionDates: sessions.map(s => s.date),
    studentAttendance: summary.map(item => ({
      studentId: item.studentId,
      studentName: item.studentName,
      present: item.stats.present,
      absent: item.stats.absent,
      late: item.stats.late,
      excused: item.stats.excused,
      percentage: item.stats.percentage.toFixed(2)
    }))
  };
};
