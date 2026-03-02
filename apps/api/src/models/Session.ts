import mongoose, { Schema, Document, Model } from 'mongoose';

// Session status enum
export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Session interface
interface ISession extends Document {
  offeringId: mongoose.Types.ObjectId;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  location?: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Session schema
const SessionSchema: Schema = new Schema(
  {
    offeringId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Offering reference is required']
    },
    date: {
      type: Date,
      required: [true, 'Session date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      message: 'Start time must be in HH:MM format'
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      message: 'End time must be in HH:MM format',
      validate: {
        validator: function(this: ISession, value: string) {
          return value > this.startTime;
        },
        message: 'End time must be after start time'
      }
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SessionStatus),
        message: '{VALUE} is not a valid session status'
      },
      required: [true, 'Status is required'],
      default: SessionStatus.SCHEDULED
    }
  },
  {
    timestamps: true,
    collection: 'sessions'
  }
);

// Indexes
SessionSchema.index({ offeringId: 1, date: 1 });
SessionSchema.index({ date: 1 });
SessionSchema.index({ status: 1 });
// Compound index for location and time conflict detection
SessionSchema.index({ date: 1, location: 1, startTime: 1 });

// Virtual for offering details
SessionSchema.virtual('offering', {
  ref: 'CourseOffering',
  localField: 'offeringId',
  foreignField: '_id',
  justOne: true
});

// Virtual for attendance records
SessionSchema.virtual('attendanceRecords', {
  ref: 'AttendanceRecord',
  localField: '_id',
  foreignField: 'sessionId'
});

// Export Session model
export const Session: Model<ISession> = mongoose.model<ISession>('Session', SessionSchema);

// Type exports
export type { ISession };
