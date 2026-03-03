import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import * as CoursesService from '../services/courses.service';
import { AppError } from '../utils/errors';
import { Course } from '../models';

export class CoursesController {
  // List all courses
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.query);
      const { departmentId, credits } = req.query;

      const filter: any = {};
      if (departmentId) filter.departmentId = departmentId;
      if (credits) filter.credits = credits;

      if (search) {
        Object.assign(filter, buildSearchFilter(['name', 'code', 'description'], search as string));
      }

      const courses = await Course.find(filter)
        .populate('departmentId', 'name code')
        .populate('prerequisites')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Course.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: courses,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get course by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const course = await Course.findById(id)
        .populate('departmentId', 'name code')
        .populate('prerequisites', 'name code')
        .lean();

      if (!course) {
        return notFoundResponse(res, 'Course');
      }

      return successResponse(res, course);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new course
  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, code, description, credits, departmentId, prerequisites, level } = req.body;

      // Check for duplicate code
      const existingCourse = await Course.findOne({ code });
      if (existingCourse) {
        return conflictResponse(res, 'Course code already exists');
      }

      // Validate prerequisites if provided
      if (prerequisites && prerequisites.length > 0) {
        try {
          // Validate that prerequisite courses exist
          const prereqCourses = await Course.find({ _id: { $in: prerequisites } });
          if (prereqCourses.length !== prerequisites.length) {
            return errorResponse(res, 'One or more prerequisite courses not found', 404);
          }
        } catch (error: any) {
          if (error instanceof AppError) {
            return errorResponse(res, error.message, error.statusCode);
          }
          throw error;
        }
      }

      const course = await Course.create({
        name,
        code,
        description,
        credits,
        departmentId,
        prerequisites: prerequisites || [],
        level: level || 'undergraduate'
      });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create',
        targetType: 'course',
        targetId: course._id.toString(),
        status: 'success',
        metadata: { name, code, credits, prerequisiteCount: prerequisites?.length || 0 },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, course, 'Course created successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update course
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, description, credits, departmentId, prerequisites, level } = req.body;

      const course = await Course.findById(id);
      if (!course) {
        return notFoundResponse(res, 'Course');
      }

      // Check code uniqueness if changed
      if (code && code !== course.code) {
        const existingCourse = await Course.findOne({ code });
        if (existingCourse) {
          return conflictResponse(res, 'Course code already exists');
        }
      }

      // Validate prerequisites if being updated
      if (prerequisites) {
        try {
          // Validate that prerequisite courses exist
          const prereqCourses = await Course.find({ _id: { $in: prerequisites } });
          if (prereqCourses.length !== prerequisites.length) {
            return errorResponse(res, 'One or more prerequisite courses not found', 404);
          }

          // Check for circular dependencies using prerequisite chain
          for (const prereqId of prerequisites) {
            const chain = await CoursesService.getPrerequisiteChain(prereqId.toString());
            if (chain.some(c => c.courseId === id)) {
              return conflictResponse(res, 'Circular prerequisite dependency detected');
            }
          }
        } catch (error: any) {
          if (error instanceof AppError) {
            return errorResponse(res, error.message, error.statusCode);
          }
          throw error;
        }
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        id,
        { name, code, description, credits, departmentId, prerequisites, level },
        { new: true, runValidators: true }
      ).populate('departmentId', 'name code').populate('prerequisites', 'name code');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'course',
        targetId: id,
        status: 'success',
        metadata: { changes: req.body },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedCourse, 'Course updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete course
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const course = await Course.findById(id);
      if (!course) {
        return notFoundResponse(res, 'Course');
      }

      // Check for dependencies using service
      try {
        const dependentCourses = await CoursesService.getDependentCourses(id);
        if (dependentCourses.length > 0) {
          const courseNames = dependentCourses.map(c => c.courseName).join(', ');
          return errorResponse(
            res,
            `Cannot delete course. It is a prerequisite for: ${courseNames}`,
            400
          );
        }

        // Check for offerings
        const { CourseOffering } = await import('../models');
        const offeringCount = await CourseOffering.countDocuments({ courseId: id });
        if (offeringCount > 0) {
          return errorResponse(res, `Cannot delete course with ${offeringCount} existing offering(s)`, 400);
        }
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      await Course.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'course',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Course deleted successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get course offerings
  static async getOfferings(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const course = await Course.findById(id);
      if (!course) {
        return notFoundResponse(res, 'Course');
      }

      const { CourseOffering } = await import('../models');
      const offerings = await CourseOffering.find({ courseId: id })
        .populate('termId', 'name year status')
        .sort({ createdAt: -1 })
        .lean();

      return successResponse(res, offerings);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Check student eligibility for course
  static async checkEligibility(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { studentId } = req.query;

      if (!studentId || typeof studentId !== 'string') {
        return errorResponse(res, 'studentId query parameter is required', 400);
      }

      const eligibility = await CoursesService.checkCourseEligibility(studentId, id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'check_eligibility',
        targetType: 'course',
        targetId: id,
        status: 'success',
        metadata: { studentId, eligible: eligibility.eligible },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, eligibility);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get course prerequisites
  static async getPrerequisites(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const course = await Course.findById(id).populate('prerequisites', 'name code credits level');

      if (!course) {
        return notFoundResponse(res, 'Course');
      }

      return successResponse(res, {
        courseId: id,
        courseName: course.name,
        courseCode: course.code,
        prerequisites: course.prerequisites
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
