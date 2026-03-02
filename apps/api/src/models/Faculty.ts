import mongoose, { Schema, Document, Model } from 'mongoose';

interface IFaculty extends Document {
  userId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  specialization: string;
  designation: string;
  joinDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FacultySchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      maxlength: [200, 'Specialization cannot exceed 200 characters']
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      enum: {
        values: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HOD'],
        message: '{VALUE} is not a valid designation'
      }
    },
    joinDate: {
      type: Date,
      required: [true, 'Join date is required'],
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'faculty'
  }
);

// Note: userId already has unique: true in field definition
// No need for separate index declaration

// Index for department-based queries
FacultySchema.index({ departmentId: 1 });

// Index for specialization searches
FacultySchema.index({ specialization: 1 });

// Compound index for department and designation
FacultySchema.index({ departmentId: 1, designation: 1 });

export const Faculty: Model<IFaculty> = mongoose.model<IFaculty>('Faculty', FacultySchema);

export type { IFaculty };
