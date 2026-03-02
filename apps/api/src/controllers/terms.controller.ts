import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { Term } from '../models';
import * as TermsService from '../services/terms.service';
import { AppError } from '../utils/errors';

export class TermsController {
  // List all terms
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.query);
      const { status, academicYear } = req.query;

      // Build filter
      const filter: any = {};
      if (status) filter.status = status;
      if (academicYear) filter.academicYear = academicYear;

      // Add search filter
      let searchFilter = {};
      if (search) {
        searchFilter = {
          $or: [
            { name: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const combinedFilter = { ...filter, ...searchFilter };

      const terms = await Term.find(combinedFilter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Term.countDocuments(combinedFilter);

      return res.status(200).json({
        success: true,
        data: terms,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get term by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const term = await Term.findById(id).lean();

      if (!term) {
        return notFoundResponse(res, 'Term');
      }

      return successResponse(res, term);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new term
  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, startDate, endDate, code, academicYear } = req.body;

      // Use service layer with overlap validation
      const term = await TermsService.createTerm({
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create',
        targetType: 'term',
        targetId: term._id.toString(),
        status: 'success',
        metadata: { name },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, term, 'Term created successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update term
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, startDate, endDate, status } = req.body;

      // Use service layer with overlap and status transition validation
      const updatedTerm = await TermsService.updateTerm(id, {
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status
      });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'term',
        targetId: id,
        status: 'success',
        metadata: { changes: req.body },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedTerm, 'Term updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete term
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Use service layer with dependency validation
      await TermsService.deleteTerm(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'term',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Term deleted successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get active term
  static async getActive(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const term = await Term.findOne({
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).lean();

      if (!term) {
        return notFoundResponse(res, 'Active term');
      }

      return successResponse(res, term);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Update term status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const { TermStatus } = await import('../models');
      const validStatuses = Object.values(TermStatus);
      if (!validStatuses.includes(status)) {
        return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      }

      const term = await TermsService.updateTerm(id, { status });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'term',
        targetId: id,
        status: 'success',
        metadata: { action: 'update_status', newStatus: status },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, term, `Term status updated to ${status}`);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get term statistics
  static async getStatistics(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Use service layer for comprehensive statistics
      const stats = await TermsService.getTermStats(id);

      return successResponse(res, stats);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Activate term
  static async activate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const term = await TermsService.activateTerm(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'activate',
        targetType: 'term',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, term, 'Term activated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get current term based on date
  static async getCurrent(req: AuthRequest, res: Response) {
    try {
      const term = await TermsService.getCurrentTerm();

      if (!term) {
        return notFoundResponse(res, 'Current term');
      }

      return successResponse(res, term);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }
}
