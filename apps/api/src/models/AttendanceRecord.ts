import mongoose, { Schema, Document, Model } from 'mongoose';

// Attendance status enum
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused'
}

// Attendance Record interface
interface IAttendanceRecord extends Document {
  sessionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  markedAt: Date;
  markedBy?: mongoose.Types.ObjectId; // Faculty user who marked attendance
  createdAt: Date;
  updatedAt: Date;
}

// Attendance Record schema
const AttendanceRecordSchema: Schema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session reference is required']
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required']
    },
    status: {
      type: String,
      enum: {
        values: Object.values(AttendanceStatus),
        message: '{VALUE} is not a valid attendance status'
      },
      required: [true, 'Status is required']
    },
    markedAt: {
      type: Date,
      required: [true, 'Marked date is required'],
      default: Date.now
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      refPath: 'markedByModel'
    }
  },
  {
    timestamps: true,
    collection: 'attendance_records'
  }
);

// Indexes
// Compound index to prevent duplicate attendance records for same session and student
AttendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
AttendanceRecordSchema.index({ sessionId: 1 });
AttendanceRecordSchema.index({ studentId: 1 });
AttendanceRecordSchema.index({ markedBy: 1 });
AttendanceRecordSchema.index({ status: 1 });

// Virtual for session details
AttendanceRecordSchema.virtual('session', {
  ref: 'Session',
  localField: 'sessionId',
  foreignField: '_id',
  justOne: true
});

// Virtual for student details
AttendanceRecordSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
});

// Virtual for faculty who marked attendance
AttendanceRecordSchema.virtual('markedByUser', {
  ref: 'User',
  localField: 'markedBy',
  foreignField: '_id',
  justOne: true
});

// Export Attendance Record model
export const AttendanceRecord: Model<IAttendanceRecord> = mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);

// Type exports
export type { IAttendanceRecord };
