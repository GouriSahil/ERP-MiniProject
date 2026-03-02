import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { AppError } from '../utils/errors';
import { Faculty, User, OfferingFaculty } from '../models';

export class FacultyController {
  // List all faculty
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.query);
      const { departmentId } = req.query;

      const filter: any = {};
      if (departmentId) filter.departmentId = departmentId;

      const faculty = await Faculty.find(filter)
        .populate('userId', 'name email')
        .populate('departmentId', 'name code')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Faculty.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: faculty,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get faculty by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const faculty = await Faculty.findById(id)
        .populate('userId', 'name email')
        .populate('departmentId', 'name code')
        .lean();

      if (!faculty) {
        return notFoundResponse(res, 'Faculty');
      }

      return successResponse(res, faculty);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new faculty
  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, email, password, departmentId, specialization } = req.body;

      // Check for duplicate email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return conflictResponse(res, 'Email already exists');
      }

      // Create user account
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: 'faculty',
        departmentId,
        mustChangePassword: true
      });

      // Create faculty
      const faculty = await Faculty.create({
        userId: user._id,
        departmentId,
        specialization
      });

      const populatedFaculty = await Faculty.findById(faculty._id)
        .populate('userId', 'name email')
        .populate('departmentId', 'name code');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create',
        targetType: 'faculty',
        targetId: faculty._id.toString(),
        status: 'success',
        metadata: { name, departmentId, specialization },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, populatedFaculty, 'Faculty created successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update faculty
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, departmentId, specialization } = req.body;

      const faculty = await Faculty.findById(id).populate('userId');
      if (!faculty) {
        return notFoundResponse(res, 'Faculty');
      }

      // Check email uniqueness if changed
      if (email && email !== (faculty.userId as any).email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return conflictResponse(res, 'Email already exists');
        }
      }

      // Update user
      await User.findByIdAndUpdate(faculty.userId, { name, email });

      // Update faculty
      const updatedFaculty = await Faculty.findByIdAndUpdate(
        id,
        { departmentId, specialization },
        { new: true, runValidators: true }
      ).populate('userId', 'name email').populate('departmentId', 'name code');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'faculty',
        targetId: id,
        status: 'success',
        metadata: { changes: req.body },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedFaculty, 'Faculty updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete faculty
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return notFoundResponse(res, 'Faculty');
      }

      // Check for assigned offerings
      const assignedOfferings = await OfferingFaculty.countDocuments({ facultyId: id });
      if (assignedOfferings > 0) {
        return errorResponse(res, 'Cannot delete faculty assigned to course offerings', 400);
      }

      await User.findByIdAndDelete(faculty.userId);
      await Faculty.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'faculty',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Faculty deleted successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get faculty assigned offerings
  static async getOfferings(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return notFoundResponse(res, 'Faculty');
      }

      const offeringFaculty = await OfferingFaculty.find({ facultyId: id })
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .lean();

      return successResponse(res, offeringFaculty.map(of => of.offeringId));
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get faculty teaching load
  static async getTeachingLoad(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { termId } = req.query;

      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return notFoundResponse(res, 'Faculty');
      }

      const filter: any = { facultyId: id };
      if (termId) {
        // Find offerings in this term
        const offerings = await OfferingFaculty.find(filter).lean();
        const offeringIds = offerings.map(o => o.offeringId);

        const { CourseOffering } = await import('../models');
        const termOfferings = await CourseOffering.find({
          _id: { $in: offeringIds },
          termId
        }).distinct('_id');

        filter.offeringId = { $in: termOfferings };
      }

      const offeringFaculty = await OfferingFaculty.find(filter).lean();
      const offeringIds = offeringFaculty.map(of => of.offeringId);

      // Get enrollment stats for each offering
      const { Enrollment } = await import('../models');
      const enrollmentStats = await Enrollment.aggregate([
        { $match: { offeringId: { $in: offeringIds } } },
        {
          $group: {
            _id: '$offeringId',
            count: { $sum: 1 }
          }
        }
      ]);

      const stats = {
        totalOfferings: offeringIds.length,
        totalEnrollments: enrollmentStats.reduce((sum, stat) => sum + stat.count, 0),
        averageStudentsPerOffering: offeringIds.length > 0
          ? Math.round(enrollmentStats.reduce((sum, stat) => sum + stat.count, 0) / offeringIds.length)
          : 0
      };

      return successResponse(res, stats);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }
}
