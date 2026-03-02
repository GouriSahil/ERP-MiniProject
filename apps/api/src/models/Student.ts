import mongoose, { Schema, Document, Model } from 'mongoose';

interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  rollNumber: string;
  departmentId: mongoose.Types.ObjectId;
  batch: string;
  semester: number;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Roll number cannot exceed 20 characters']
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    batch: {
      type: String,
      required: [true, 'Batch is required'],
      trim: true
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [10, 'Semester cannot exceed 10']
    }
  },
  {
    timestamps: true,
    collection: 'students'
  }
);

// Note: rollNumber and userId already have unique: true in field definitions
// No need for separate index declarations

// Index for department-based queries
StudentSchema.index({ departmentId: 1 });

// Compound index for department and batch
StudentSchema.index({ departmentId: 1, batch: 1 });

// Compound index for department and semester
StudentSchema.index({ departmentId: 1, semester: 1 });

export const Student: Model<IStudent> = mongoose.model<IStudent>('Student', StudentSchema);

export type { IStudent };
