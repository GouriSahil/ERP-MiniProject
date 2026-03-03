import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import * as SessionsService from '../services/sessions.service';
import { AppError } from '../utils/errors';
import { Session, SessionStatus, CourseOffering } from '../models';

export class SessionsController {
  // List all sessions
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);
      const { offeringId, termId, dateFrom, dateTo, status } = req.query;

      const filter: any = {};
      if (offeringId) filter.offeringId = offeringId;
      if (status) filter.status = status;
      if (dateFrom && dateTo) {
        filter.date = {
          $gte: new Date(dateFrom as string),
          $lte: new Date(dateTo as string)
        };
      }

      const sessions = await Session.find(filter)
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .sort({ date: -1, startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Session.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: sessions,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get session by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const session = await Session.findById(id)
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .lean();

      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      return successResponse(res, session);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new session
  static async create(req: AuthRequest, res: Response) {
    try {
      const { offeringId, date, startTime, endTime, topic, sessionType, notes, location } = req.body;

      // Validate offering exists
      const offering = await CourseOffering.findById(offeringId);
      if (!offering) {
        return notFoundResponse(res, 'Offering');
      }

      // Validate session time using service
      try {
        SessionsService.validateSessionTime(startTime, endTime);
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      // Validate schedule day matches offering schedule
      try {
        await SessionsService.validateSessionDateAgainstOffering(offeringId, new Date(date));
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      // Check for time conflicts using service
      try {
        const conflictCheck = await SessionsService.checkSessionConflict(
          new Date(date),
          startTime,
          endTime,
          location || offering.schedule?.room
        );

        if (conflictCheck.hasConflict) {
          const conflictMessages = conflictCheck.conflictingSessions.map(c =>
            `${new Date(c.date).toLocaleDateString()} at ${c.location}: ${c.reason}`
          ).join('; ');
          return conflictResponse(res, `Session conflicts detected: ${conflictMessages}`);
        }
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      const session = await Session.create({
        offeringId,
        date: new Date(date),
        startTime,
        endTime,
        topic,
        sessionType: sessionType || 'lecture',
        notes,
        location: location || offering.schedule?.room,
        status: 'scheduled'
      });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create',
        targetType: 'session',
        targetId: session._id.toString(),
        status: 'success',
        metadata: { offeringId, date, topic, location },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, session, 'Session created successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update session
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { date, startTime, endTime, topic, sessionType, notes, status, location } = req.body;

      const session = await Session.findById(id);
      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      // If updating time or location, check for conflicts
      const newDate = date ? new Date(date) : session.date;
      const newStartTime = startTime || session.startTime;
      const newEndTime = endTime || session.endTime;
      const newLocation = location !== undefined ? location : session.location;

      if (date || startTime || endTime || location !== undefined) {
        try {
          SessionsService.validateSessionTime(newStartTime, newEndTime);
        } catch (error: any) {
          if (error instanceof AppError) {
            return errorResponse(res, error.message, error.statusCode);
          }
          throw error;
        }

        try {
          const conflictCheck = await SessionsService.checkSessionConflict(
            newDate,
            newStartTime,
            newEndTime,
            newLocation,
            id // Exclude current session
          );

          if (conflictCheck.hasConflict) {
            const conflictMessages = conflictCheck.conflictingSessions.map(c =>
              `${new Date(c.date).toLocaleDateString()} at ${c.location}: ${c.reason}`
            ).join('; ');
            return conflictResponse(res, `Session conflicts detected: ${conflictMessages}`);
          }
        } catch (error: any) {
          if (error instanceof AppError) {
            return errorResponse(res, error.message, error.statusCode);
          }
          throw error;
        }
      }

      const updatedSession = await Session.findByIdAndUpdate(
        id,
        { date: newDate, startTime: newStartTime, endTime: newEndTime, topic, sessionType, notes, status, location: newLocation },
        { new: true, runValidators: true }
      ).populate('offeringId');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'session',
        targetId: id,
        status: 'success',
        metadata: { changes: req.body },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedSession, 'Session updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete session
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const session = await Session.findById(id);
      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      // Check for attendance records using service
      try {
        const { AttendanceRecord } = await import('../models');
        const attendanceCount = await AttendanceRecord.countDocuments({ sessionId: id });
        if (attendanceCount > 0) {
          return errorResponse(res, `Cannot delete session with ${attendanceCount} attendance record(s)`, 400);
        }
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      await Session.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'session',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Session deleted successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get session attendance
  static async getAttendance(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const { AttendanceRecord } = await import('../models');
      const attendance = await AttendanceRecord.find({ sessionId: id })
        .populate('enrollmentId')
        .populate({
          path: 'enrollmentId',
          populate: {
            path: 'studentId',
            populate: ['userId', 'departmentId']
          }
        })
        .lean();

      return successResponse(res, attendance);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Mark session as completed
  static async markComplete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const session = await Session.findByIdAndUpdate(
        id,
        { status: 'completed' },
        { new: true }
      );

      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'mark_complete',
        targetType: 'session',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, session, 'Session marked as completed');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Cancel session
  static async cancel(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const session = await Session.findByIdAndUpdate(
        id,
        { status: 'cancelled', notes: reason },
        { new: true }
      );

      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'cancel',
        targetType: 'session',
        targetId: id,
        status: 'success',
        metadata: { reason },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, session, 'Session cancelled');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Bulk create sessions
  static async bulkCreate(req: AuthRequest, res: Response) {
    try {
      const { offeringId, dates, startTime, endTime, topic, sessionType, location } = req.body;

      if (!Array.isArray(dates) || dates.length === 0) {
        return errorResponse(res, 'dates array is required', 400);
      }

      // Validate offering exists
      const offering = await CourseOffering.findById(offeringId);
      if (!offering) {
        return notFoundResponse(res, 'Offering');
      }

      // Validate session time
      try {
        SessionsService.validateSessionTime(startTime, endTime);
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      // Use service to bulk create with validation
      const result = await SessionsService.bulkCreateSessions(
        offeringId,
        dates.map((d: string) => new Date(d)),
        startTime,
        endTime
      );

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'bulk_create',
        targetType: 'session',
        targetId: offeringId,
        status: 'success',
        metadata: {
          total: result.total,
          succeeded: result.succeeded,
          failed: result.failed
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, result, `Created ${result.succeeded} of ${result.total} sessions`);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Check session conflicts
  static async checkConflicts(req: AuthRequest, res: Response) {
    try {
      const { date, startTime, endTime, location } = req.query;

      if (!date || !startTime || !endTime) {
        return errorResponse(res, 'date, startTime, and endTime are required', 400);
      }

      const conflictCheck = await SessionsService.checkSessionConflict(
        new Date(date as string),
        startTime as string,
        endTime as string,
        location as string
      );

      return successResponse(res, conflictCheck);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get sessions by offering
  static async getByOffering(req: AuthRequest, res: Response) {
    try {
      const { offeringId } = req.params;

      const sessions = await Session.find({ offeringId })
        .populate('offeringId', 'code')
        .sort({ date: 1, startTime: 1 })
        .lean();

      return successResponse(res, sessions);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get sessions by term
  static async getByTerm(req: AuthRequest, res: Response) {
    try {
      const { termId } = req.params;

      const sessions = await Session.find({ termId })
        .populate('offeringId', 'code')
        .sort({ date: 1, startTime: 1 })
        .lean();

      return successResponse(res, sessions);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Update session status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(SessionStatus).includes(status)) {
        return errorResponse(res, 'Invalid status value', 400);
      }

      const session = await Session.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      ).populate('offeringId', 'code');

      if (!session) {
        return notFoundResponse(res, 'Session not found');
      }

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update_status',
        targetType: 'session',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, session, 'Status updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
