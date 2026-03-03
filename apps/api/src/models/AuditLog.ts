import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from './User';

// Audit action enum
export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  MARK_ATTENDANCE = 'mark_attendance',
  ENROLL = 'enroll',
  DROP = 'drop'
}

// Audit status enum
export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial'
}

// Audit Log interface
interface IAuditLog extends Document {
  actorUserId?: mongoose.Types.ObjectId;
  actorRole?: UserRole;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  status: AuditStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  occurredAt: Date;
  createdAt: Date;
}

// Audit Log schema
const AuditLogSchema: Schema = new Schema(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    actorRole: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: '{VALUE} is not a valid role'
      }
    },
    action: {
      type: String,
      enum: {
        values: Object.values(AuditAction),
        message: '{VALUE} is not a valid action'
      },
      required: [true, 'Action is required']
    },
    targetType: {
      type: String,
      trim: true,
      maxlength: [50, 'Target type cannot exceed 50 characters']
    },
    targetId: {
      type: String,
      trim: true,
      maxlength: [50, 'Target ID cannot exceed 50 characters']
    },
    status: {
      type: String,
      enum: {
        values: Object.values(AuditStatus),
        message: '{VALUE} is not a valid status'
      },
      required: [true, 'Status is required'],
      default: AuditStatus.SUCCESS
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Error message cannot exceed 1000 characters']
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      trim: true,
      match: [
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        'Please provide a valid IP address'
      ]
    },
    userAgent: {
      type: String,
      trim: true
    },
    occurredAt: {
      type: Date,
      required: [true, 'Occurred date is required'],
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'audit_logs'
  }
);

// Indexes
AuditLogSchema.index({ occurredAt: -1 });
AuditLogSchema.index({ actorUserId: 1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ status: 1 });

// TTL index: Automatically delete audit logs after 90 days
AuditLogSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days in seconds
  name: 'audit_log_ttl'
});

// Virtual for actor user details
AuditLogSchema.virtual('actorUser', {
  ref: 'User',
  localField: 'actorUserId',
  foreignField: '_id',
  justOne: true
});

// Static method to log an audit event
AuditLogSchema.statics.logEvent = async function(eventData: Partial<IAuditLog>) {
  return await this.create({
    ...eventData,
    occurredAt: eventData.occurredAt || new Date()
  });
};

// Export Audit Log model
export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// Type exports
export type { IAuditLog };
