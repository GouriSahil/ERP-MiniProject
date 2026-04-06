import { Request, Response, NextFunction } from 'express';
import passport, { JwtPayload } from '../config/passport';
import { verifyAccessToken } from '../utils/auth.utils';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id?: string;
        userId?: string;
        email: string;
        role: string;
        departmentId?: string;
        name?: string;
      };
    }
  }
}

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
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
