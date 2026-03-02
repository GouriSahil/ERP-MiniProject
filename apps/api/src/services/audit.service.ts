import mongoose from 'mongoose';
import { IAuditLog, AuditAction, AuditStatus, UserRole } from '../models';
import { AppError } from '../utils/errors';

// Lazy load AuditLog model to avoid circular dependency
const getAuditLogModel = () => mongoose.model('AuditLog');

/**
 * Audit Service
 * Handles audit logging with sensitive data redaction and querying
 */

export interface AuditQueryOptions {
  action?: AuditAction;
  targetType?: string;
  targetId?: string;
  actorUserId?: string;
  actorRole?: UserRole;
  status?: AuditStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditExportData {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  status: string;
  details: string;
}

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'cookie',
  'authorization',
  'credentials',
  'ssn',
  'creditCard',
  'pin'
];

/**
 * Redact sensitive data from an object
 */
export const redactSensitiveData = (data: any): any => {
  if (!data) return data;

  if (typeof data === 'string') {
    // Check if string might contain sensitive data
    const lowerStr = data.toLowerCase();
    for (const field of SENSITIVE_FIELDS) {
      if (lowerStr.includes(field)) {
        return '[REDACTED]';
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const redacted: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if this is a sensitive field
      const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
      
      if (isSensitive) {
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
};

/**
 * Create an audit log entry
 */
export const createAuditLog = async (auditData: {
  actorUserId?: string;
  actorRole?: UserRole;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  status: AuditStatus;
  errorMessage?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}): Promise<IAuditLog> => {
  // Redact sensitive data from metadata
  const redactedMetadata = auditData.metadata ? redactSensitiveData(auditData.metadata) : undefined;

  const AuditLog = getAuditLogModel();
  
  const auditLog = new AuditLog({
    actorUserId: auditData.actorUserId ? new mongoose.Types.ObjectId(auditData.actorUserId) : undefined,
    actorRole: auditData.actorRole,
    action: auditData.action,
    targetType: auditData.targetType,
    targetId: auditData.targetId,
    status: auditData.status,
    errorMessage: auditData.errorMessage,
    metadata: redactedMetadata,
    ipAddress: auditData.ipAddress,
    userAgent: auditData.userAgent,
    occurredAt: new Date()
  });

  await auditLog.save();
  return auditLog as IAuditLog;
};

/**
 * Query audit logs with filters
 */
export const queryAuditLogs = async (options: AuditQueryOptions = {}): Promise<{
  logs: IAuditLog[];
  total: number;
}> => {
  const AuditLog = getAuditLogModel();
  const {
    action,
    targetType,
    targetId,
    actorUserId,
    actorRole,
    status,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = options;

  const query: any = {};

  if (action) query.action = action;
  if (targetType) query.targetType = targetType;
  if (targetId) query.targetId = targetId;
  if (actorUserId) query.actorUserId = new mongoose.Types.ObjectId(actorUserId);
  if (actorRole) query.actorRole = actorRole;
  if (status) query.status = status;

  // Date range filter on occurredAt
  if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) query.occurredAt.$gte = startDate;
    if (endDate) query.occurredAt.$lte = endDate;
  }

  // Get total count
  const total = await AuditLog.countDocuments(query);

  // Get logs with pagination
  const logs = await AuditLog.find(query)
    .populate('actorUserId', 'firstName lastName email')
    .sort({ occurredAt: -1 })
    .limit(limit)
    .skip(offset)
    .lean() as any[];

  return { logs, total };
};

/**
 * Get audit logs by target
 */
export const getLogsByTarget = async (
  targetType: string,
  targetId: string,
  limit: number = 50
): Promise<IAuditLog[]> => {
  const AuditLog = getAuditLogModel();
  
  return await AuditLog.find({
    targetType,
    targetId
  })
    .populate('actorUserId', 'firstName lastName email')
    .sort({ occurredAt: -1 })
    .limit(limit)
    .lean() as any[];
};

/**
 * Get audit logs by actor
 */
export const getLogsByActor = async (
  actorUserId: string,
  limit: number = 50
): Promise<IAuditLog[]> => {
  const AuditLog = getAuditLogModel();
  
  return await AuditLog.find({
    actorUserId: new mongoose.Types.ObjectId(actorUserId)
  })
    .sort({ occurredAt: -1 })
    .limit(limit)
    .lean() as any[];
};

/**
 * Get failed login attempts for a user
 */
export const getFailedLoginAttempts = async (
  email: string,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
): Promise<number> => {
  // First find the user by email
  const User = mongoose.model('User');
  const user = await User.findOne({ email });

  if (!user) return 0;

  const AuditLog = getAuditLogModel();
  
  const count = await AuditLog.countDocuments({
    actorUserId: user._id,
    action: AuditAction.LOGIN,
    status: AuditStatus.FAILURE,
    occurredAt: { $gte: since }
  });

  return count;
};

/**
 * Get audit statistics
 */
export const getAuditStatistics = async (
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalLogs: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  byTargetType: Record<string, number>;
  failureRate: number;
}> => {
  const matchStage: any = {};

  if (startDate || endDate) {
    matchStage.occurredAt = {};
    if (startDate) matchStage.occurredAt.$gte = startDate;
    if (endDate) matchStage.occurredAt.$lte = endDate;
  }

  const AuditLog = getAuditLogModel();
  
  const [totalLogs, byAction, byStatus, byTargetType] = await Promise.all([
    AuditLog.countDocuments(matchStage),
    AuditLog.aggregate([
      { $match: matchStage },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]),
    AuditLog.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    AuditLog.aggregate([
      { $match: matchStage },
      { $group: { _id: '$targetType', count: { $sum: 1 } } }
    ])
  ]);

  const byActionObj: Record<string, number> = {};
  byAction.forEach(item => {
    byActionObj[item._id] = item.count;
  });

  const byStatusObj: Record<string, number> = {};
  byStatus.forEach(item => {
    byStatusObj[item._id] = item.count;
  });

  const byTargetTypeObj: Record<string, number> = {};
  byTargetType.forEach(item => {
    byTargetTypeObj[item._id] = item.count;
  });

  const failureCount = byStatusObj[AuditStatus.FAILURE] || 0;
  const failureRate = totalLogs > 0 ? (failureCount / totalLogs) * 100 : 0;

  return {
    totalLogs,
    byAction: byActionObj,
    byStatus: byStatusObj,
    byTargetType: byTargetTypeObj,
    failureRate
  };
};

/**
 * Export audit logs to CSV format
 */
export const exportAuditLogsToCSV = async (
  options: AuditQueryOptions = {}
): Promise<string> => {
  const { logs } = await queryAuditLogs({
    ...options,
    limit: 10000 // Higher limit for exports
  });

  const exportData: AuditExportData[] = logs.map(log => {
    const actor = log.actorUserId as any;
    const actorName = actor 
      ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email 
      : 'System';

    let details = '';
    if (log.metadata) {
      details = JSON.stringify(redactSensitiveData(log.metadata));
    }

    return {
      timestamp: log.occurredAt.toISOString(),
      actor: actorName,
      action: log.action,
      target: log.targetType ? `${log.targetType}:${log.targetId}` : 'N/A',
      status: log.status,
      details: log.errorMessage || details
    };
  });

  // Convert to CSV
  if (exportData.length === 0) {
    return 'timestamp,actor,action,target,status,details\n';
  }

  const headers = ['timestamp', 'actor', 'action', 'target', 'status', 'details'];
  const csvRows = [headers.join(',')];

  for (const row of exportData) {
    const values = headers.map(header => {
      const value = row[header as keyof AuditExportData];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Cleanup old audit logs (manual trigger - TTL index handles automatic cleanup)
 */
export const cleanupOldAuditLogs = async (daysToKeep: number = 90): Promise<number> => {
  const AuditLog = getAuditLogModel();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await AuditLog.deleteMany({
    createdAt: { $lt: cutoffDate }
  });

  return result.deletedCount || 0;
};

/**
 * Log a successful action
 */
export const logSuccess = async (
  action: AuditAction,
  targetType: string,
  targetId: string,
  actorUserId?: string,
  actorRole?: UserRole,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<IAuditLog> => {
  return await createAuditLog({
    actorUserId,
    actorRole,
    action,
    targetType,
    targetId,
    status: AuditStatus.SUCCESS,
    metadata,
    ipAddress,
    userAgent
  });
};

/**
 * Log a failed action
 */
export const logFailure = async (
  action: AuditAction,
  targetType: string,
  targetId: string,
  errorMessage: string,
  actorUserId?: string,
  actorRole?: UserRole,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<IAuditLog> => {
  return await createAuditLog({
    actorUserId,
    actorRole,
    action,
    targetType,
    targetId,
    status: AuditStatus.FAILURE,
    errorMessage,
    metadata,
    ipAddress,
    userAgent
  });
};

/**
 * Get security-relevant events (failed logins, permission changes, etc.)
 */
export const getSecurityEvents = async (
  startDate?: Date,
  endDate?: Date
): Promise<IAuditLog[]> => {
  const AuditLog = getAuditLogModel();
  const securityActions = [
    AuditAction.LOGIN,
    AuditAction.DELETE,
    AuditAction.UPDATE,
    AuditAction.EXPORT
  ];

  const query: any = {
    action: { $in: securityActions }
  };

  if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) query.occurredAt.$gte = startDate;
    if (endDate) query.occurredAt.$lte = endDate;
  }

  return await AuditLog.find(query)
    .populate('actorUserId', 'firstName lastName email')
    .sort({ occurredAt: -1 })
    .limit(500)
    .lean() as IAuditLog[];
};

/**
 * Get user activity summary
 */
export const getUserActivitySummary = async (
  userId: string,
  days: number = 30
): Promise<{
  totalActions: number;
  byAction: Record<string, number>;
  lastActivity: Date | null;
}> => {
  const AuditLog = getAuditLogModel();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalActions, byActionResult, lastActivityLog] = await Promise.all([
    AuditLog.countDocuments({
      actorUserId: new mongoose.Types.ObjectId(userId),
      occurredAt: { $gte: since }
    }),
    AuditLog.aggregate([
      {
        $match: {
          actorUserId: new mongoose.Types.ObjectId(userId),
          occurredAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]),
    AuditLog.findOne({
      actorUserId: new mongoose.Types.ObjectId(userId)
    }).sort({ occurredAt: -1 })
  ]);

  const byAction: Record<string, number> = {};
  byActionResult.forEach(item => {
    byAction[item._id] = item.count;
  });

  return {
    totalActions,
    byAction,
    lastActivity: lastActivityLog?.occurredAt || null
  };
};
