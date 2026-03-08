import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role: string;
      departmentId?: string;
    }
  }
}

export interface AuthRequest extends Request {}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const checkPermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = checkUserPermission(req.user.role, resource, action);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

function checkUserPermission(role: string, resource: string, action: string): boolean {
  const permissions: Record<string, string[]> = {
    super_admin: ['*'],
    college_admin: ['users:*', 'students:*', 'faculty:*', 'departments:*', 'courses:*', 'terms:*', 'offerings:*', 'sessions:*', 'enrollments:*', 'attendance:*', 'reports:view', 'audit:view'],
    department_head: ['students:*', 'faculty:*', 'courses:view', 'offerings:*', 'sessions:*', 'enrollments:*', 'attendance:*', 'reports:view'],
    faculty: ['students:view', 'offerings:view', 'sessions:view', 'enrollments:view', 'attendance:mark', 'attendance:view', 'reports:view'],
    support_staff: ['students:view', 'faculty:view', 'courses:view', 'offerings:view', 'reports:view'],
    student: ['offerings:view', 'enrollments:view', 'attendance:view', 'reports:view'],
  };

  const rolePermissions = permissions[role] || [];

  if (rolePermissions.includes('*')) {
    return true;
  }

  const requiredPermission = `${resource}:${action}`;
  return rolePermissions.some(perm => {
    if (perm === '*') return true;
    const [permResource, permAction] = perm.split(':');
    if (permAction === '*') return permResource === resource;
    return perm === requiredPermission;
  });
}
