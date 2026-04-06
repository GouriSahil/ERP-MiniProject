import mongoose, { Schema, Document, Model } from 'mongoose';

// Password Reset Token interface
interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

// Password Reset Token schema
const PasswordResetTokenSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    token: {
      type: String,
      required: [true, 'Token is required']
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expireAfterSeconds: 0 } // MongoDB TTL index for auto-cleanup
    },
    used: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'password_reset_tokens'
  }
);

// Indexes
PasswordResetTokenSchema.index({ userId: 1 });
PasswordResetTokenSchema.index({ token: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export PasswordResetToken model
export const PasswordResetToken: Model<IPasswordResetToken> = mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);

// Type-only exports
export type { IPasswordResetToken };
