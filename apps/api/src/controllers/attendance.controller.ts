import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { Enrollment } from '../models/Enrollment';
import { Session } from '../models/Session';
import { Student } from '../models/Student';
import { CourseOffering } from '../models/CourseOffering';
import { Course } from '../models/Course';

export class AttendanceController {
  // List all attendance records
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, sortBy = 'markedAt', sortOrder = 'desc' } = getPaginationParams(req.query);
      const { sessionId, studentId, status, dateFrom, dateTo } = req.query;

      const filter: any = {};
      if (sessionId) filter.sessionId = sessionId;
      if (studentId) filter.studentId = studentId;
      if (status) filter.status = status;

      // If date range provided, filter by session dates
      if (dateFrom && dateTo) {
        const sessions = await Session.find({
          date: { $gte: new Date(dateFrom as string), $lte: new Date(dateTo as string) }
        }).select('_id');
        filter.sessionId = { $in: sessions.map(s => s._id) };
      }

      const attendance = await AttendanceRecord.find(filter)
        .populate('sessionId')
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: ['userId', 'departmentId']
        })
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await AttendanceRecord.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: attendance,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get attendance record by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const record = await AttendanceRecord.findById(id)
        .populate('sessionId')
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: ['userId', 'departmentId']
        })
        .lean();

      if (!record) {
        return notFoundResponse(res, 'Attendance record');
      }

      return successResponse(res, record);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create single attendance record
  static async create(req: AuthRequest, res: Response) {
    try {
      const { studentId, sessionId, status, remarks } = req.body;

      // Check for existing record
      const existing = await AttendanceRecord.findOne({ sessionId, studentId });
      if (existing) {
        return conflictResponse(res, 'Attendance record already exists');
      }

      // Find session and verify student is enrolled in the offering
      const session = await Session.findById(sessionId);
      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      const enrollment = await Enrollment.findOne({
        studentId,
        offeringId: session.offeringId
      });

      if (!enrollment) {
        return errorResponse(res, 'Student not enrolled in this course', 400);
      }

      const record = await AttendanceRecord.create({
        sessionId,
        studentId,
        status,
        remarks,
        markedBy: req.user!.userId,
        markedAt: new Date()
      });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create',
        targetType: 'attendance',
        targetId: (record._id as any).toString(),
        status: 'success',
        metadata: { studentId, sessionId, status },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, record, 'Attendance marked successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Mark attendance for a session (bulk)
  static async markSessionAttendance(req: AuthRequest, res: Response) {
    try {
      const { sessionId, attendance } = req.body; // attendance: [{ studentId, status, remarks }]

      if (!Array.isArray(attendance) || attendance.length === 0) {
        return errorResponse(res, 'attendance array is required', 400);
      }

      // Verify session exists
      const session = await Session.findById(sessionId);
      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      const results = {
        updated: 0,
        created: 0,
        failed: 0,
        errors: [] as Array<{ studentId: string; error: string }>
      };

      for (const record of attendance) {
        try {
          const { studentId, status, remarks } = record;

          // Verify student is enrolled
          const enrollment = await Enrollment.findOne({
            studentId,
            offeringId: session.offeringId
          });

          if (!enrollment) {
            results.failed++;
            results.errors.push({ studentId, error: 'Student not enrolled in this course' });
            continue;
          }

          // Check if record exists
          const existing = await AttendanceRecord.findOne({ sessionId, studentId });

          if (existing) {
            await AttendanceRecord.findByIdAndUpdate(
              existing._id,
              { status, remarks, markedBy: req.user!.userId, markedAt: new Date() }
            );
            results.updated++;
          } else {
            await AttendanceRecord.create({
              sessionId,
              studentId,
              status,
              remarks,
              markedBy: req.user!.userId,
              markedAt: new Date()
            });
            results.created++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({ studentId: record.studentId, error: error.message });
        }
      }

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'mark_session_attendance',
        targetType: 'attendance',
        targetId: sessionId,
        status: 'success',
        metadata: {
          sessionId,
          total: attendance.length,
          updated: results.updated,
          created: results.created,
          failed: results.failed
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, results, `Attendance marked: ${results.updated} updated, ${results.created} created${results.failed > 0 ? `, ${results.failed} failed` : ''}`);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete attendance record
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const record = await AttendanceRecord.findById(id);
      if (!record) {
        return notFoundResponse(res, 'Attendance record');
      }

      await AttendanceRecord.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'attendance',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Attendance record deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get attendance by session
  static async getBySession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const records = await AttendanceRecord.find({ sessionId })
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: ['userId', 'departmentId']
        })
        .lean();

      return successResponse(res, records);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get attendance by student
  static async getByStudent(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;

      const records = await AttendanceRecord.find({ studentId })
        .populate('sessionId')
        .lean();

      return successResponse(res, records);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Update attendance record
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;

      const record = await AttendanceRecord.findById(id);
      if (!record) {
        return notFoundResponse(res, 'Attendance record');
      }

      const updatedRecord = await AttendanceRecord.findByIdAndUpdate(
        id,
        { status, remarks, markedBy: req.user!.userId, markedAt: new Date() },
        { new: true }
      ).populate('sessionId').populate('studentId');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'attendance',
        targetId: id,
        status: 'success',
        metadata: { changes: { status, remarks } },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedRecord, 'Attendance updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get attendance summary for a student
  static async getStudentSummary(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { termId } = req.query;

      // Verify student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return notFoundResponse(res, 'Student');
      }

      // Build filter for enrollments
      const enrollmentFilter: any = { studentId };
      let enrollments = await Enrollment.find(enrollmentFilter)
        .populate('offeringId')
        .lean();

      // Filter by term if provided
      if (termId) {
        enrollments = enrollments.filter((e: any) => 
          e.offeringId && e.offeringId.termId && e.offeringId.termId.toString() === termId.toString()
        );
      }

      const offeringIds = enrollments.map((e: any) => e.offeringId._id);

      // Get all sessions for these offerings
      const sessions = await Session.find({ offeringId: { $in: offeringIds } }).lean();
      const sessionIds = sessions.map(s => s._id);

      // Get all attendance records for this student across these sessions
      const attendanceRecords = await AttendanceRecord.find({
        studentId,
        sessionId: { $in: sessionIds }
      }).lean();

      // Calculate overall summary
      const totalSessions = sessions.length;
      const present = attendanceRecords.filter(r => r.status === 'present').length;
      const absent = attendanceRecords.filter(r => r.status === 'absent').length;
      const late = attendanceRecords.filter(r => r.status === 'late').length;
      const excused = attendanceRecords.filter(r => r.status === 'excused').length;
      const marked = attendanceRecords.length;
      const percentage = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;

      // Calculate summary by course
      const byCourse = [];
      for (const enrollment of enrollments) {
        const offering: any = enrollment.offeringId;
        const offeringSessions = sessions.filter(s => s.offeringId.toString() === offering._id.toString());
        const offeringSessionIds = offeringSessions.map(s => s._id);
        
        const offeringAttendance = attendanceRecords.filter(r => 
          offeringSessionIds.some(id => id.toString() === r.sessionId.toString())
        );

        const coursePresent = offeringAttendance.filter(r => r.status === 'present').length;
        const courseAbsent = offeringAttendance.filter(r => r.status === 'absent').length;
        const courseLate = offeringAttendance.filter(r => r.status === 'late').length;
        const courseExcused = offeringAttendance.filter(r => r.status === 'excused').length;
        const coursePercentage = offeringSessions.length > 0 
          ? Math.round((coursePresent / offeringSessions.length) * 100) 
          : 0;

        // Get course details
        const course = await Course.findById(offering.courseId).lean();

        byCourse.push({
          courseId: offering.courseId,
          courseName: (course as any)?.name || 'Unknown Course',
          courseCode: (course as any)?.code || 'N/A',
          offeringId: offering._id,
          totalSessions: offeringSessions.length,
          present: coursePresent,
          absent: courseAbsent,
          late: courseLate,
          excused: courseExcused,
          percentage: coursePercentage
        });
      }

      const summary = {
        studentId,
        termId: termId || null,
        totalSessions,
        present,
        absent,
        late,
        excused,
        marked,
        unmarked: totalSessions - marked,
        percentage,
        byCourse
      };

      return successResponse(res, summary);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get attendance summary for a session
  static async getSessionSummary(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      // Verify session exists and get offering info
      const session = await Session.findById(sessionId).lean();
      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      // Get all enrollments for this offering
      const enrollments = await Enrollment.find({ offeringId: session.offeringId })
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId' },
            { path: 'departmentId' }
          ]
        })
        .lean();

      const studentIds = enrollments.map((e: any) => e.studentId._id);

      // Get all attendance records for this session
      const attendanceRecords = await AttendanceRecord.find({ sessionId })
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId' },
            { path: 'departmentId' }
          ]
        })
        .lean();

      // Create a map of studentId -> attendance record for quick lookup
      const attendanceMap = new Map();
      attendanceRecords.forEach(record => {
        attendanceMap.set(record.studentId._id.toString(), record);
      });

      // Build records array combining all enrolled students with their attendance
      const records = enrollments.map((enrollment: any) => {
        const student: any = enrollment.studentId;
        const attendance: any = attendanceMap.get(student._id.toString());

        return {
          studentId: student._id,
          rollNumber: student.rollNumber,
          name: student.userId?.name || 'Unknown',
          email: student.userId?.email || '',
          department: student.departmentId?.name || 'N/A',
          status: attendance ? attendance.status : null,
          markedAt: attendance ? attendance.markedAt : null,
          markedBy: attendance ? attendance.markedBy : null,
          remarks: attendance ? attendance.remarks : null
        };
      });

      // Calculate summary
      const total = enrollments.length;
      const present = attendanceRecords.filter(r => r.status === 'present').length;
      const absent = attendanceRecords.filter(r => r.status === 'absent').length;
      const late = attendanceRecords.filter(r => r.status === 'late').length;
      const excused = attendanceRecords.filter(r => r.status === 'excused').length;
      const unmarked = total - attendanceRecords.length;

      const summary = {
        sessionId,
        total,
        present,
        absent,
        late,
        excused,
        unmarked,
        markedPercentage: total > 0 ? Math.round((attendanceRecords.length / total) * 100) : 0
      };

      return successResponse(res, { records, summary });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Mark self-attendance (for students)
  static async markSelf(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.body;

      // Find the student record for this user
      const student = await Student.findOne({ userId: req.user!.userId });
      if (!student) {
        return notFoundResponse(res, 'Student profile');
      }

      // Find session and verify student is enrolled in the offering
      const session = await Session.findById(sessionId);
      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      const enrollment = await Enrollment.findOne({
        studentId: student._id,
        offeringId: session.offeringId
      });

      if (!enrollment) {
        return errorResponse(res, 'Not enrolled in this course', 400);
      }

      // Check time window (e.g., within 30 mins of session start)
      const now = new Date();
      const sessionDate = new Date(session.date);
      const timeWindow = 30 * 60 * 1000; // 30 minutes in milliseconds

      if (Math.abs(now.getTime() - sessionDate.getTime()) > timeWindow) {
        return errorResponse(res, 'Outside self-attendance time window (must be within 30 minutes of session)', 400);
      }

      // Check if attendance already exists
      const existing = await AttendanceRecord.findOne({ sessionId, studentId: student._id });
      if (existing) {
        return conflictResponse(res, 'Attendance already marked for this session');
      }

      // Create attendance record
      const record = await AttendanceRecord.create({
        sessionId,
        studentId: student._id,
        status: 'present',
        markedBy: req.user!.userId,
        markedAt: new Date()
      });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'self_attendance',
        targetType: 'attendance',
        targetId: (record._id as any).toString(),
        status: 'success',
        metadata: { sessionId },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, record, 'Self-attendance marked successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get attendance report for a course offering
  static async getOfferingReport(req: AuthRequest, res: Response) {
    try {
      const { offeringId } = req.params;

      // Verify offering exists and get course details
      const offering = await CourseOffering.findById(offeringId).populate('courseId').lean();
      if (!offering) {
        return notFoundResponse(res, 'Course offering');
      }

      // Get all sessions for this offering
      const sessions = await Session.find({ offeringId }).lean();
      const sessionIds = sessions.map(s => s._id);

      // Get all enrollments for the offering
      const enrollments = await Enrollment.find({ offeringId })
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: ['userId', 'departmentId']
        })
        .lean();

      // For each enrollment, get attendance records
      const students = [];
      let totalAttendancePercentage = 0;
      const attendanceThreshold = 75; // 75% attendance threshold

      for (const enrollment of enrollments) {
        const student: any = enrollment.studentId;

        // Get attendance records for this student across all sessions in this offering
        const attendanceRecords = await AttendanceRecord.find({
          studentId: student._id,
          sessionId: { $in: sessionIds }
        }).lean();

        const present = attendanceRecords.filter(r => r.status === 'present').length;
        const absent = attendanceRecords.filter(r => r.status === 'absent').length;
        const late = attendanceRecords.filter(r => r.status === 'late').length;
        const excused = attendanceRecords.filter(r => r.status === 'excused').length;
        const marked = attendanceRecords.length;
        const percentage = sessions.length > 0 ? Math.round((present / sessions.length) * 100) : 0;

        totalAttendancePercentage += percentage;

        students.push({
          studentId: student._id,
          rollNumber: student.rollNumber,
          name: student.userId?.name || 'Unknown',
          email: student.userId?.email || '',
          department: student.departmentId?.name || 'N/A',
          totalSessions: sessions.length,
          present,
          absent,
          late,
          excused,
          marked,
          unmarked: sessions.length - marked,
          percentage,
          belowThreshold: percentage < attendanceThreshold
        });
      }

      const summary = {
        totalStudents: enrollments.length,
        averageAttendance: enrollments.length > 0 ? Math.round(totalAttendancePercentage / enrollments.length) : 0,
        belowThreshold: students.filter((s: any) => s.belowThreshold).length
      };

      const course: any = (offering as any).courseId;

      const report = {
        offeringId,
        courseCode: course?.code || 'N/A',
        courseName: course?.name || 'Unknown Course',
        totalSessions: sessions.length,
        students,
        summary
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
