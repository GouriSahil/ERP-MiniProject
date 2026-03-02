import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export interface AuditLogData {
  actorUserId: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: any;
  ipAddress: string;
  userAgent: string;
}

// Store audit log data in request for later saving
declare global {
  namespace Express {
    interface Request {
      auditLog?: {
        action: string;
        targetType: string;
        targetId: string;
        metadata?: any;
      };
    }
  }
}

export const auditLogger = (action: string, targetType: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    req.auditLog = {
      action,
      targetType,
      targetId: req.params.id || req.body.id || 'unknown',
      metadata: {
        method: req.method,
        path: req.path,
        body: redactSensitiveData(req.body)
      }
    };
    next();
  };
};

export const saveAuditLog = async (auditLogData: AuditLogData) => {
  // This will be implemented when we have the AuditLog model
  // For now, we'll just log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AUDIT]', JSON.stringify(auditLogData, null, 2));
  }
};

function redactSensitiveData(data: any): any {
  if (!data) return data;

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'cookie'];

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = redactSensitiveData(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  return data;
}

export const getAuditLogData = (req: AuthRequest, status: 'success' | 'failure', errorMessage?: string): AuditLogData => {
  return {
    actorUserId: req.user?.userId || null,
    actorRole: req.user?.role || 'anonymous',
    action: req.auditLog?.action || 'unknown',
    targetType: req.auditLog?.targetType || 'unknown',
    targetId: req.auditLog?.targetId || 'unknown',
    status,
    errorMessage,
    metadata: req.auditLog?.metadata,
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown'
  };
};
