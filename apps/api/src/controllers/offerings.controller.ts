import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import * as OfferingsService from '../services/offerings.service';
import { AppError } from '../utils/errors';
import { CourseOffering, Term } from '../models';

export class OfferingsController {
  // List all offerings
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.query);
      const { courseId, termId, facultyId, departmentId, status } = req.query;

      const filter: any = {};
      if (courseId) filter.courseId = courseId;
      if (termId) filter.termId = termId;
      if (departmentId) filter.departmentId = departmentId;
      if (status) filter.status = status;

      const offerings = await CourseOffering.find(filter)
        .populate('courseId', 'name code credits')
        .populate('termId', 'name year status')
        .populate('departmentId', 'name code')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await CourseOffering.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: offerings,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get offering by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const offering = await CourseOffering.findById(id)
        .populate('courseId', 'name code credits')
        .populate('termId', 'name year')
        .populate('departmentId', 'name code')
        .lean();

      if (!offering) {
        return notFoundResponse(res, 'Offering');
      }

      // Get enrollment statistics
      const stats = await OfferingsService.getOfferingStats(id);

      return successResponse(res, { ...offering, stats });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new offering
  static async create(req: AuthRequest, res: Response) {
    try {
      const { courseId, termId, departmentId, schedule, room, maxCapacity, status } = req.body;

      // Validate term exists and can accept offerings
      try {
        await OfferingsService.validateTermForOffering(termId);
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      // Check for schedule conflicts
      try {
        const conflictCheck = await OfferingsService.checkScheduleConflict(
          termId,
          schedule.days,
          schedule.startTime,
          schedule.endTime,
          room
        );

        if (conflictCheck.hasConflict) {
          const conflictMessages = conflictCheck.conflicts.map(c =>
            `${c.courseName}: ${c.reason}`
          ).join('; ');
          return conflictResponse(res, `Schedule conflicts detected: ${conflictMessages}`);
        }
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      const offering = await CourseOffering.create({
        courseId,
        termId,
        departmentId,
        schedule,
        room,
        capacity: maxCapacity || 60,
        status: status || 'active'
      });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create',
        targetType: 'offering',
        targetId: offering._id.toString(),
        status: 'success',
        metadata: { courseId, termId, room, days: schedule.days },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, offering, 'Course offering created successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update offering
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { courseId, termId, schedule, room, maxCapacity, status } = req.body;

      const offering = await CourseOffering.findById(id);
      if (!offering) {
        return notFoundResponse(res, 'Offering');
      }

      // If updating schedule or room, check for conflicts
      const newSchedule = schedule || offering.schedule;
      const newRoom = room !== undefined ? room : offering.schedule.room;
      const newTermId = termId || offering.termId;

      if (schedule || room !== undefined) {
        try {
          const conflictCheck = await OfferingsService.checkScheduleConflict(
            newTermId,
            newSchedule.days,
            newSchedule.startTime,
            newSchedule.endTime,
            newRoom,
            id // Exclude current offering from conflict check
          );

          if (conflictCheck.hasConflict) {
            const conflictMessages = conflictCheck.conflicts.map(c =>
              `${c.courseName}: ${c.reason}`
            ).join('; ');
            return conflictResponse(res, `Schedule conflicts detected: ${conflictMessages}`);
          }
        } catch (error: any) {
          if (error instanceof AppError) {
            return errorResponse(res, error.message, error.statusCode);
          }
          throw error;
        }
      }

      const updatedOffering = await CourseOffering.findByIdAndUpdate(
        id,
        { courseId, termId, schedule, room, capacity: maxCapacity, status },
        { new: true, runValidators: true }
      ).populate('courseId').populate('termId');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'offering',
        targetId: id,
        status: 'success',
        metadata: { changes: req.body },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedOffering, 'Offering updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete offering
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const offering = await CourseOffering.findById(id);
      if (!offering) {
        return notFoundResponse(res, 'Offering');
      }

      // Check for enrollments using service
      try {
        const { Enrollment } = await import('../models');
        const enrollmentCount = await Enrollment.countDocuments({ offeringId: id });
        if (enrollmentCount > 0) {
          return errorResponse(res, `Cannot delete offering with ${enrollmentCount} enrolled student(s)`, 400);
        }
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      await CourseOffering.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'offering',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Offering deleted successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get offering enrollments
  static async getEnrollments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const { Enrollment } = await import('../models');
      const enrollments = await Enrollment.find({ offeringId: id })
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: ['userId', 'departmentId']
        })
        .lean();

      return successResponse(res, enrollments);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get offering sessions
  static async getSessions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const { Session } = await import('../models');
      const sessions = await Session.find({ offeringId: id })
        .sort({ date: -1, startTime: -1 })
        .lean();

      return successResponse(res, sessions);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Assign faculty to offering
  static async assignFaculty(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { facultyIds, role = 'instructor' } = req.body;

      if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
        return errorResponse(res, 'facultyIds array is required', 400);
      }

      // Validate faculty assignments
      try {
        for (const facultyId of facultyIds) {
          // Check for schedule conflicts
          const hasConflict = await OfferingsService.checkFacultyScheduleConflict(
            facultyId,
            id
          );

          if (hasConflict.hasConflict) {
            return conflictResponse(res, `Faculty has schedule conflict with existing assignment`);
          }
        }
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      const { OfferingFaculty } = await import('../models');

      // Delete existing assignments
      await OfferingFaculty.deleteMany({ offeringId: id });

      // Create new assignments
      const assignments = facultyIds.map((facultyId: string) => ({
        offeringId: id,
        facultyId,
        role
      }));
      await OfferingFaculty.insertMany(assignments);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'assign_faculty',
        targetType: 'offering',
        targetId: id,
        status: 'success',
        metadata: { facultyIds, role },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, { assignments }, 'Faculty assigned successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Check offering capacity
  static async checkCapacity(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const stats = await OfferingsService.getOfferingStats(id);

      return successResponse(res, {
        offeringId: id,
        hasCapacity: stats.availableSeats > 0,
        ...stats
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Check for schedule conflicts
  static async checkConflicts(req: AuthRequest, res: Response) {
    try {
      const { termId, days, startTime, endTime, room } = req.query;

      if (!termId || !days || !startTime || !endTime) {
        return errorResponse(res, 'termId, days, startTime, and endTime are required', 400);
      }

      const daysArray = Array.isArray(days) ? days : [days];

      const conflictCheck = await OfferingsService.checkScheduleConflict(
        termId as string,
        daysArray as string[],
        startTime as string,
        endTime as string,
        room as string
      );

      return successResponse(res, conflictCheck);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get offerings by term
  static async getByTerm(req: AuthRequest, res: Response) {
    try {
      const { termId } = req.params;

      const offerings = await CourseOffering.find({ termId })
        .populate('courseId', 'name code credits')
        .populate('departmentId', 'name code')
        .lean();

      return successResponse(res, offerings);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get offerings by course
  static async getByCourse(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;

      const offerings = await CourseOffering.find({ courseId })
        .populate('termId', 'name year status')
        .populate('departmentId', 'name code')
        .lean();

      return successResponse(res, offerings);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Update offering schedule
  static async updateSchedule(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { days, startTime, endTime, room } = req.body;

      const offering = await CourseOffering.findByIdAndUpdate(
        id,
        { days, startTime, endTime, room },
        { new: true, runValidators: true }
      ).populate('courseId', 'name code');

      if (!offering) {
        return notFoundResponse(res, 'Course offering not found');
      }

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'offering_schedule',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, offering, 'Schedule updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
