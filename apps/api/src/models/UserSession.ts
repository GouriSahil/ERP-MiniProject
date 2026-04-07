import mongoose, { Schema, Document, Model } from 'mongoose';

// Session status enum
export enum SessionStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

// User Session interface
interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string; // Hash of the JWT token for revocation
  tokenId: string; // Unique identifier for the token (jti)
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: {
    type?: string; // mobile, desktop, tablet
    os?: string;
    browser?: string;
  };
  location?: {
    country?: string;
    city?: string;
  };
  status: SessionStatus;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokeReason?: string;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

// User Session schema
const UserSessionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    token: {
      type: String,
      required: [true, 'Token hash is required'],
      index: true
    },
    tokenId: {
      type: String,
      required: [true, 'Token ID is required'],
      unique: true,
      index: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    deviceInfo: {
      type: {
        type: String,
        enum: ['mobile', 'desktop', 'tablet', 'unknown']
      },
      os: String,
      browser: String
    },
    location: {
      country: String,
      city: String
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SessionStatus),
        message: '{VALUE} is not a valid session status'
      },
      required: [true, 'Status is required'],
      default: SessionStatus.ACTIVE,
      index: true
    },
    revokedAt: {
      type: Date
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    revokeReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Revoke reason cannot exceed 500 characters']
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration time is required']
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'user_sessions'
  }
);

// Compound indexes
UserSessionSchema.index({ userId: 1, status: 1 }); // For finding active sessions by user
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto-expire documents

// Static method to create a new session
UserSessionSchema.statics.createSession = async function(sessionData: {
  userId: mongoose.Types.ObjectId;
  token: string;
  tokenId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}) {
  return await this.create({
    ...sessionData,
    status: SessionStatus.ACTIVE,
    lastActivityAt: new Date()
  });
};

// Static method to revoke a session
UserSessionSchema.statics.revokeSession = async function(
  tokenId: string,
  revokedBy: mongoose.Types.ObjectId,
  reason?: string
) {
  return await this.findOneAndUpdate(
    { tokenId, status: SessionStatus.ACTIVE },
    {
      status: SessionStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy,
      revokeReason: reason
    }
  );
};

// Static method to revoke all user sessions except current
UserSessionSchema.statics.revokeAllUserSessions = async function(
  userId: mongoose.Types.ObjectId,
  currentTokenId?: string,
  revokedBy?: mongoose.Types.ObjectId,
  reason?: string
) {
  const query: any = {
    userId,
    status: SessionStatus.ACTIVE
  };

  if (currentTokenId) {
    query.tokenId = { $ne: currentTokenId };
  }

  return await this.updateMany(
    query,
    {
      status: SessionStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy,
      revokeReason: reason || 'Admin initiated revocation'
    }
  );
};

// Static method to check if a session is valid
UserSessionSchema.statics.isSessionValid = async function(tokenId: string): Promise<boolean> {
  const session = await this.findOne({ tokenId, status: SessionStatus.ACTIVE });
  if (!session) {
    return false;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    await this.findByIdAndUpdate(session._id, { status: SessionStatus.EXPIRED });
    return false;
  }

  return true;
};

// Static method to get active sessions for a user
UserSessionSchema.statics.getUserActiveSessions = async function(userId: mongoose.Types.ObjectId) {
  return await this.find({
    userId,
    status: SessionStatus.ACTIVE,
    expiresAt: { $gt: new Date() }
  })
    .sort({ lastActivityAt: -1 })
    .lean();
};

// Static method to update last activity
UserSessionSchema.statics.updateLastActivity = async function(tokenId: string) {
  return await this.findOneAndUpdate(
    { tokenId, status: SessionStatus.ACTIVE },
    { lastActivityAt: new Date() }
  );
};

// Export User Session model
export const UserSession: Model<IUserSession> = mongoose.model<IUserSession>('UserSession', UserSessionSchema);

// Type exports
export type { IUserSession };
