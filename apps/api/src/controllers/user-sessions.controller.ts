import { Request, Response } from 'express';
import { UserSession, SessionStatus as UserSessionStatus } from '../models/UserSession';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response.util';
import { saveAuditLog } from '../middleware/audit.middleware';

export class UserSessionsController {
  // List all sessions for a user (admin) or current user
  static async listSessions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const currentUser = (req as any).user;

      // Check if user has permission to view sessions
      const canViewAll = currentUser.role === 'super_admin' || currentUser.role === 'admin';
      const isOwnSession = userId === currentUser.userId || userId === currentUser._id;

      if (!canViewAll && !isOwnSession) {
        return errorResponse(res, 'You do not have permission to view these sessions', 403);
      }

      const targetUserId = userId || currentUser.userId || currentUser._id;

      const sessions = await UserSession.find({
        userId: targetUserId,
        // Show both active and recently revoked sessions
        createdAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      })
        .sort({ lastActivityAt: -1 })
        .lean();

      return successResponse(res, {
        sessions,
        activeCount: sessions.filter((s: any) => s.status === 'active').length,
        revokedCount: sessions.filter((s: any) => s.status === 'revoked').length
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get current session info
  static async getCurrentSession(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const tokenId = currentUser.tokenId || currentUser.jti;

      if (!tokenId) {
        return errorResponse(res, 'Session info not available', 400);
      }

      const session = await UserSession.findOne({ tokenId })
        .populate('userId', 'name email role')
        .lean();

      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      return successResponse(res, session);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Revoke a specific session
  static async revokeSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const currentUser = (req as any).user;
      const { reason } = req.body;

      const session = await UserSession.findById(sessionId);

      if (!session) {
        return notFoundResponse(res, 'Session');
      }

      // Check if user has permission to revoke this session
      const canRevokeAll = currentUser.role === 'super_admin' || currentUser.role === 'admin';
      const isOwnSession = session.userId.toString() === (currentUser.userId || currentUser._id);

      if (!canRevokeAll && !isOwnSession) {
        return errorResponse(res, 'You do not have permission to revoke this session', 403);
      }

      if (session.status !== UserSessionStatus.ACTIVE) {
        return errorResponse(res, 'Session is already revoked or expired', 400);
      }

      session.status = UserSessionStatus.REVOKED;
      session.revokedAt = new Date();
      session.revokedBy = currentUser.userId || currentUser._id;
      session.revokeReason = reason || 'Session revoked by user';
      await session.save();

      await saveAuditLog({
        actorUserId: currentUser.userId || currentUser._id,
        actorRole: currentUser.role,
        action: 'delete',
        targetType: 'session',
        targetId: sessionId,
        status: 'success',
        metadata: {
          reason,
          sessionUserId: session.userId
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Session revoked successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Revoke all sessions for a user (except current if specified)
  static async revokeAllUserSessions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const currentUser = (req as any).user;
      const { reason, excludeCurrent } = req.body;

      // Only admins can revoke all sessions for another user
      const canRevokeAll = currentUser.role === 'super_admin' || currentUser.role === 'admin';
      const isOwnSession = userId === currentUser.userId || userId === currentUser._id;

      if (!canRevokeAll && !isOwnSession) {
        return errorResponse(res, 'You do not have permission to revoke these sessions', 403);
      }

      const targetUserId = userId || currentUser.userId || currentUser._id;
      const currentTokenId = excludeCurrent ? (currentUser.tokenId || currentUser.jti) : undefined;

      const query: any = {
        userId: targetUserId,
        status: UserSessionStatus.ACTIVE
      };

      if (currentTokenId) {
        query.tokenId = { $ne: currentTokenId };
      }

      const result = await UserSession.updateMany(
        query,
        {
          status: UserSessionStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy: currentUser.userId || currentUser._id,
          revokeReason: reason || 'Admin initiated revocation'
        }
      );

      await saveAuditLog({
        actorUserId: currentUser.userId || currentUser._id,
        actorRole: currentUser.role,
        action: 'delete',
        targetType: 'session',
        targetId: targetUserId.toString(),
        status: 'success',
        metadata: {
          reason,
          revokedCount: result.modifiedCount,
          excludeCurrent
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, {
        revokedCount: result.modifiedCount,
        message: `${result.modifiedCount} session(s) revoked successfully`
      }, `${result.modifiedCount} session(s) revoked successfully`);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get active sessions for all users (admin only)
  static async getAllActiveSessions(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        UserSession.find({ status: UserSessionStatus.ACTIVE })
          .populate('userId', 'name email role')
          .sort({ lastActivityAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        UserSession.countDocuments({ status: UserSessionStatus.ACTIVE })
      ]);

      return successResponse(res, {
        data: sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Clean up expired sessions (utility endpoint)
  static async cleanupExpiredSessions(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;

      if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
        return errorResponse(res, 'Only admins can perform this action', 403);
      }

      const result = await UserSession.updateMany(
        {
          status: UserSessionStatus.ACTIVE,
          expiresAt: { $lt: new Date() }
        },
        { status: UserSessionStatus.EXPIRED }
      );

      await saveAuditLog({
        actorUserId: currentUser.userId || currentUser._id,
        actorRole: currentUser.role,
        action: 'update',
        targetType: 'session',
        targetId: 'system',
        status: 'success',
        metadata: {
          expiredCount: result.modifiedCount
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, {
        expiredCount: result.modifiedCount,
        message: 'Expired sessions cleaned up successfully'
      }, 'Expired sessions cleaned up successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
