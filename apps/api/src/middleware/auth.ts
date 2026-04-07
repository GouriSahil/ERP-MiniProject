import { Request, Response, NextFunction } from 'express';
import passport, { JwtPayload } from '../config/passport';
import { verifyAccessToken } from '../utils/auth.utils';
import { roleHasPermission, getRolePermissions } from '../config/roles';
import { User } from '../models/User';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      _id?: string;
      userId?: string;
      email: string;
      role: string;
      customRoleId?: string;
      departmentId?: string;
      name?: string;
      status?: string;
      permissions?: string[]; // Cached permissions
      tokenId?: string; // JWT ID for session tracking
      jti?: string; // Alternative name for tokenId
    }
  }
}

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, async (err: any, user: any) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: 'Internal server error during authentication'
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid or missing token'
      });
      return;
    }

    // Fetch full user data with custom role to get permissions
    try {
      const fullUser = await User.findById(user._id || user.userId)
        .select('-passwordHash')
        .populate('customRoleId')
        .lean();

      if (fullUser) {
        // Cache permissions on the user object for later use
        const permissions = getRolePermissions(fullUser.role);

        // Add custom role permissions if applicable
        if (fullUser.customRoleId) {
          const customRolePerms = (fullUser.customRoleId as any).permissions || [];
          user.permissions = [...new Set([...permissions, ...customRolePerms])];
          user.customRoleId = (fullUser.customRoleId as any)._id?.toString();
        } else {
          user.permissions = permissions;
        }

        user.name = fullUser.name;
      }
    } catch (error) {
      // If fetching user fails, continue with basic user data
    }

    req.user = user;
    next();
  })(req as any, res, next);
};

// Authorization middleware - check user role
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Authentication required'
      });
      return;
    }

    // super_admin has access to all routes
    if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Forbidden - Insufficient permissions'
    });
  };
};

// Permission-based authorization middleware with role inheritance support
// Usage: requirePermission('users', 'create') checks for 'users:create' permission
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - Authentication required'
      });
      return;
    }

    const permission = `${resource}:${action}`;

    // Check cached permissions first (from authenticate middleware)
    if (req.user.permissions) {
      const hasPermission = checkPermissionArray(req.user.permissions, permission);
      if (hasPermission) {
        next();
        return;
      }
    }

    // Fallback to role-based check if no cached permissions
    if (roleHasPermission(req.user.role, permission)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Forbidden - Missing required permission: ${permission}`
    });
  };
};

// Helper function to check if a permission array contains a specific permission
function checkPermissionArray(permissions: string[], requiredPermission: string): boolean {
  // Check for wildcard permission
  if (permissions.includes('*')) {
    return true;
  }

  // Check for exact match or resource-level wildcard
  return permissions.some((perm: string) => {
    if (perm === '*') return true;

    const [permResource, permAction] = perm.split(':');
    const [reqResource, reqAction] = requiredPermission.split(':');

    // Exact match
    if (perm === requiredPermission) return true;

    // Resource wildcard: "resource:*" matches "resource:anything"
    if (permAction === '*' && permResource === reqResource) return true;

    // Action wildcard: "*:action" matches "anything:action"
    if (permResource === '*' && permAction === reqAction) return true;

    return false;
  });
}

// Check if current user has a specific permission (returns boolean)
// Useful for conditional logic in controllers
export const hasPermission = (user: Express.User, permission: string): boolean => {
  if (!user) return false;

  // Check cached permissions first
  if (user.permissions) {
    return checkPermissionArray(user.permissions, permission);
  }

  // Fallback to role-based check
  return roleHasPermission(user.role, permission);
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
    if (err) {
      next(err);
      return;
    }
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Verify token manually (for internal use)
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return verifyAccessToken(token);
  } catch (error) {
    return null;
  }
};
