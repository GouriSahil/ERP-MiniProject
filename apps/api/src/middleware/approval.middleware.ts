import { Request, Response, NextFunction } from 'express';
import { User, UserStatus } from '../models/User';

/**
 * Middleware to check if user's account is approved/active
 * Rejects access for pending, rejected, or suspended users
 */
export const requireApprovedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User should already be authenticated at this point
    const userId = (req as any).user?.userId || (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Fetch user with status from database
    const user = await User.findById(userId).select('status role').lean();

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check user status and respond accordingly
    switch (user.status) {
      case UserStatus.PENDING:
        res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval. Please wait for an administrator to approve your registration.',
          code: 'ACCOUNT_PENDING'
        });
        return;

      case UserStatus.REJECTED:
        res.status(403).json({
          success: false,
          message: 'Your account has been rejected. Please contact the administrator for more information.',
          code: 'ACCOUNT_REJECTED'
        });
        return;

      case UserStatus.SUSPENDED:
        res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact the administrator.',
          code: 'ACCOUNT_SUSPENDED'
        });
        return;

      case UserStatus.APPROVED:
      case UserStatus.ACTIVE:
        // User is approved, allow access
        // Attach user status to request for use in other middleware
        (req as any).userStatus = user.status;
        next();
        return;

      default:
        res.status(403).json({
          success: false,
          message: 'Invalid account status. Please contact the administrator.',
          code: 'INVALID_STATUS'
        });
        return;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying account status'
    });
  }
};

/**
 * Middleware to check if user is an admin who can approve other users
 */
export const requireApprovalPermission = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // Only super_admin, admin, and dept_head can approve users
  const canApprove = ['super_admin', 'admin', 'dept_head'].includes(user.role);

  if (!canApprove) {
    res.status(403).json({
      success: false,
      message: 'You do not have permission to approve users'
    });
    return;
  }

  next();
};
