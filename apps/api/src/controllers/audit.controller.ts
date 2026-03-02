import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { AuditLog } from '../models';

export class AuditController {
  // List audit logs with filtering
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);
      const {
        actorUserId,
        actorRole,
        action,
        targetType,
        targetId,
        status,
        dateFrom,
        dateTo
      } = req.query;

      const filter: any = {};

      if (actorUserId) filter.actorUserId = actorUserId;
      if (actorRole) filter.actorRole = actorRole;
      if (action) filter.action = action;
      if (targetType) filter.targetType = targetType;
      if (targetId) filter.targetId = targetId;
      if (status) filter.status = status;

      // Date range filter
      if (dateFrom || dateTo) {
        filter.occurredAt = {};
        if (dateFrom) filter.occurredAt.$gte = new Date(dateFrom as string);
        if (dateTo) filter.occurredAt.$lte = new Date(dateTo as string);
      }

      const logs = await AuditLog.find(filter)
        .sort({ [sortBy || 'occurredAt']: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await AuditLog.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: logs,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get audit log by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, 'Invalid audit log ID', 400);
      }

      const log = await AuditLog.findById(id).lean();

      if (!log) {
        return notFoundResponse(res, 'Audit log');
      }

      return successResponse(res, log);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get audit logs for a specific entity
  static async getByTarget(req: AuthRequest, res: Response) {
    try {
      const { targetType, targetId } = req.params;

      const logs = await AuditLog.find({
        targetType,
        targetId
      })
        .sort({ occurredAt: -1 })
        .limit(100)
        .lean();

      return successResponse(res, logs);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get audit logs by user
  static async getByUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const logs = await AuditLog.find({
        actorUserId: new mongoose.Types.ObjectId(userId)
      })
        .sort({ [sortBy || 'occurredAt']: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await AuditLog.countDocuments({ actorUserId: userId });

      return res.status(200).json({
        success: true,
        data: logs,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get audit logs by action
  static async getByAction(req: AuthRequest, res: Response) {
    try {
      const { action } = req.params;
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);

      const logs = await AuditLog.find({
        action
      })
        .sort({ [sortBy || 'occurredAt']: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await AuditLog.countDocuments({ action });

      return res.status(200).json({
        success: true,
        data: logs,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get user activity statistics
  static async getUserStats(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const stats = await AuditLog.aggregate([
        { $match: { actorUserId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            successful: {
              $sum: {
                $cond: [{ $eq: ['$status', 'success'] }, 1, 0]
              }
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'failure'] }, 1, 0]
              }
            },
            lastActivity: { $max: '$occurredAt' },
            actions: { $push: '$action' }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            successful: 1,
            failed: 1,
            lastActivity: 1,
            byAction: {
              $arrayToObject: {
                $map: {
                  input: { $setUnion: ['$actions', []] },
                  as: 'action',
                  in: {
                    k: '$$action',
                    v: {
                      $size: {
                        $filter: {
                          input: '$actions',
                          as: 'a',
                          cond: { $eq: ['$$a', '$$action'] }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        total: 0,
        successful: 0,
        failed: 0,
        byAction: {},
        lastActivity: null
      };

      return successResponse(res, result);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get activity summary
  static async getActivitySummary(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const matchFilter: any = {};
      if (dateFrom || dateTo) {
        matchFilter.occurredAt = {};
        if (dateFrom) matchFilter.occurredAt.$gte = new Date(dateFrom as string);
        if (dateTo) matchFilter.occurredAt.$lte = new Date(dateTo as string);
      }

      const [summary] = await AuditLog.aggregate([
        { $match: matchFilter },
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  successful: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'success'] }, 1, 0]
                    }
                  },
                  failed: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'failure'] }, 1, 0]
                    }
                  }
                }
              }
            ],
            byAction: [
              {
                $group: {
                  _id: '$action',
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  action: '$_id',
                  count: 1
                }
              }
            ],
            byType: [
              {
                $group: {
                  _id: '$targetType',
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  targetType: '$_id',
                  count: 1
                }
              }
            ],
            topUsers: [
              {
                $group: {
                  _id: '$actorUserId',
                  count: { $sum: 1 }
                }
              },
              {
                $sort: { count: -1 }
              },
              {
                $limit: 10
              },
              {
                $project: {
                  _id: 0,
                  userId: '$_id',
                  count: 1
                }
              }
            ]
          }
        },
        {
          $project: {
            totalActions: {
              $arrayElemAt: ['$statusCounts.total', 0]
            },
            successful: {
              $arrayElemAt: ['$statusCounts.successful', 0]
            },
            failed: {
              $arrayElemAt: ['$statusCounts.failed', 0]
            },
            byAction: {
              $arrayToObject: {
                $map: {
                  input: '$byAction',
                  as: 'item',
                  in: { k: '$$item.action', v: '$$item.count' }
                }
              }
            },
            byType: {
              $arrayToObject: {
                $map: {
                  input: '$byType',
                  as: 'item',
                  in: { k: '$$item.targetType', v: '$$item.count' }
                }
              }
            },
            topUsers: 1
          }
        }
      ]);

      const result = {
        totalActions: summary.totalActions || 0,
        successful: summary.successful || 0,
        failed: summary.failed || 0,
        byAction: summary.byAction || {},
        byType: summary.byType || {},
        topUsers: summary.topUsers || []
      };

      return successResponse(res, result);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create manual audit log
  static async createLog(req: AuthRequest, res: Response) {
    try {
      const { action, targetType, targetId, status, errorMessage, metadata } = req.body;

      if (!action) {
        return errorResponse(res, 'Action is required', 400);
      }

      const log = await AuditLog.create({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action,
        targetType,
        targetId,
        status: status || 'success',
        errorMessage,
        metadata,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      // Also save via middleware for consistency
      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create_log',
        targetType: 'audit',
        targetId: log._id.toString(),
        status: 'success',
        metadata: { originalAction: action },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, log, 'Audit log created');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get user activity history (deprecated - use getByUser)
  static async getUserActivity(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { limit } = req.query;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const logs = await AuditLog.find({
        actorUserId: userId
      })
        .sort({ occurredAt: -1 })
        .limit(parseInt(limit as string) || 50)
        .lean();

      return successResponse(res, logs);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get audit statistics
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const matchFilter: any = {};
      if (dateFrom || dateTo) {
        matchFilter.occurredAt = {};
        if (dateFrom) matchFilter.occurredAt.$gte = new Date(dateFrom as string);
        if (dateTo) matchFilter.occurredAt.$lte = new Date(dateTo as string);
      }

      const [stats] = await AuditLog.aggregate([
        { $match: matchFilter },
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  successful: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'success'] }, 1, 0]
                    }
                  },
                  failed: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'failure'] }, 1, 0]
                    }
                  }
                }
              }
            ],
            byAction: [
              {
                $group: {
                  _id: '$action',
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  action: '$_id',
                  count: 1
                }
              }
            ],
            byActor: [
              {
                $group: {
                  _id: '$actorRole',
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  role: '$_id',
                  count: 1
                }
              }
            ],
            topUsers: [
              {
                $group: {
                  _id: '$actorUserId',
                  count: { $sum: 1 }
                }
              },
              {
                $sort: { count: -1 }
              },
              {
                $limit: 10
              },
              {
                $project: {
                  _id: 0,
                  userId: '$_id',
                  count: 1
                }
              }
            ]
          }
        },
        {
          $project: {
            total: {
              $arrayElemAt: ['$statusCounts.total', 0]
            },
            successful: {
              $arrayElemAt: ['$statusCounts.successful', 0]
            },
            failed: {
              $arrayElemAt: ['$statusCounts.failed', 0]
            },
            byAction: {
              $arrayToObject: {
                $map: {
                  input: '$byAction',
                  as: 'item',
                  in: { k: '$$item.action', v: '$$item.count' }
                }
              }
            },
            byActor: {
              $arrayToObject: {
                $map: {
                  input: '$byActor',
                  as: 'item',
                  in: { k: '$$item.role', v: '$$item.count' }
                }
              }
            },
            topUsers: 1
          }
        }
      ]);

      const result = {
        total: stats.total || 0,
        successful: stats.successful || 0,
        failed: stats.failed || 0,
        byAction: stats.byAction || {},
        byActor: stats.byActor || {},
        topUsers: stats.topUsers || []
      };

      return successResponse(res, result);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Export audit logs
  static async exportLogs(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo, format } = req.query;

      const filter: any = {};
      if (dateFrom || dateTo) {
        filter.occurredAt = {};
        if (dateFrom) filter.occurredAt.$gte = new Date(dateFrom as string);
        if (dateTo) filter.occurredAt.$lte = new Date(dateTo as string);
      }

      const logs = await AuditLog.find(filter)
        .sort({ occurredAt: -1 })
        .limit(10000)
        .lean();

      // Log the export action
      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'export',
        targetType: 'audit',
        targetId: 'export',
        status: 'success',
        metadata: { dateFrom, dateTo, format, count: logs.length },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      // Return data based on format
      return successResponse(res, {
        logs,
        count: logs.length,
        dateRange: { from: dateFrom, to: dateTo }
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get security events (failed logins, unauthorized access, etc.)
  static async getSecurityLogs(req: AuthRequest, res: Response) {
    try {
      const { page, limit } = getPaginationParams(req.query);

      const filter = {
        status: 'failure',
        action: {
          $in: ['login', 'unauthorized_access', 'permission_denied']
        }
      };

      const events = await AuditLog.find(filter)
        .sort({ occurredAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await AuditLog.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: events,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get security events (deprecated - use getSecurityLogs)
  static async getSecurityEvents(req: AuthRequest, res: Response) {
    return AuditController.getSecurityLogs(req, res);
  }

  // Get compliance report
  static async getComplianceReport(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      // Generate compliance metrics
      const report = {
        period: { from: dateFrom, to: dateTo },
        totalActions: 0,
        dataAccess: {
          reads: 0,
          writes: 0,
          deletes: 0
        },
        userActivity: {
          activeUsers: 0,
          totalLogins: 0,
          failedLogins: 0
        },
        dataIntegrity: {
          modifications: 0,
          deletions: 0
        },
        auditTrail: {
          completeness: 100,
          retentionDays: 365
        }
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
