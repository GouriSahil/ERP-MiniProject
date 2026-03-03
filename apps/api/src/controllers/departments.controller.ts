import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { AppError } from '../utils/errors';
import { Department, Faculty, Student, Course } from '../models';

export class DepartmentsController {
  // List all departments
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.query);

      const filter: any = {};
      if (search) {
        Object.assign(filter, buildSearchFilter(['name', 'code'], search as string));
      }

      const departments = await Department.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Department.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: departments,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get department by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const department = await Department.findById(id).lean();
      if (!department) {
        return notFoundResponse(res, 'Department');
      }

      // Get faculty count
      const facultyCount = await Faculty.countDocuments({ departmentId: id });

      // Get student count
      const studentCount = await Student.countDocuments({ departmentId: id });

      // Get course count
      const courseCount = await Course.countDocuments({ departmentId: id });

      return successResponse(res, {
        ...department,
        stats: {
          facultyCount,
          studentCount,
          courseCount
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Create department
  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, code } = req.body;

      // Check for duplicate code
      const existingDept = await Department.findOne({ code });
      if (existingDept) {
        return conflictResponse(res, 'Department code already exists');
      }

      const department = await Department.create({ name, code });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create',
        targetType: 'department',
        targetId: department._id.toString(),
        status: 'success',
        metadata: { name, code },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, department, 'Department created successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update department
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, code } = req.body;

      const department = await Department.findById(id);
      if (!department) {
        return notFoundResponse(res, 'Department');
      }

      // Check code uniqueness if changed
      if (code && code !== department.code) {
        const existingDept = await Department.findOne({ code });
        if (existingDept) {
          return conflictResponse(res, 'Department code already exists');
        }
      }

      const updatedDepartment = await Department.findByIdAndUpdate(
        id,
        { name, code },
        { new: true, runValidators: true }
      ).lean();

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'department',
        targetId: id,
        status: 'success',
        metadata: { changes: req.body },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedDepartment, 'Department updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete department
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const department = await Department.findById(id);
      if (!department) {
        return notFoundResponse(res, 'Department');
      }

      // Check for dependent records
      const facultyCount = await Faculty.countDocuments({ departmentId: id });
      const studentCount = await Student.countDocuments({ departmentId: id });
      const courseCount = await Course.countDocuments({ departmentId: id });

      if (facultyCount > 0 || studentCount > 0 || courseCount > 0) {
        const dependencies = [];
        if (facultyCount > 0) dependencies.push(`${facultyCount} faculty member(s)`);
        if (studentCount > 0) dependencies.push(`${studentCount} student(s)`);
        if (courseCount > 0) dependencies.push(`${courseCount} course(s)`);

        return errorResponse(
          res,
          `Cannot delete department with associated records: ${dependencies.join(', ')}`,
          400
        );
      }

      await Department.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'department',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Department deleted successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get department faculty
  static async getFaculty(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const department = await Department.findById(id);
      if (!department) {
        return notFoundResponse(res, 'Department');
      }

      const faculty = await Faculty.find({ departmentId: id })
        .populate('userId', 'name email')
        .lean();

      return successResponse(res, faculty);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get department courses
  static async getCourses(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const department = await Department.findById(id);
      if (!department) {
        return notFoundResponse(res, 'Department');
      }

      const courses = await Course.find({ departmentId: id })
        .populate('prerequisites', 'name code')
        .lean();

      return successResponse(res, courses);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }
}
