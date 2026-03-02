import mongoose, { Schema, Document, Model } from 'mongoose';

// Department interface  
interface IDepartment extends Document {
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

export type { IDepartment };

// Department schema
const DepartmentSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, 'Department code cannot exceed 10 characters']
    }
  },
  {
    timestamps: true,
    collection: 'departments'
  }
);

// Indexes
// Note: code already has unique: true in field definition, no need for separate index
DepartmentSchema.index({ name: 1 });

// Virtual for students in this department
DepartmentSchema.virtual('students', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'departmentId'
});

// Virtual for faculty in this department
DepartmentSchema.virtual('faculty', {
  ref: 'Faculty',
  localField: '_id',
  foreignField: 'departmentId'
});

// Virtual for courses offered by this department
DepartmentSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'departmentId'
});

// Export Department model
export const Department: Model<IDepartment> = mongoose.model<IDepartment>('Department', DepartmentSchema);
