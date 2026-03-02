import mongoose, { Schema, Document, Model } from 'mongoose';

// User role enum based on SRS
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DEPT_HEAD = 'dept_head',
  FACULTY = 'faculty',
  STUDENT = 'student',
  STAFF = 'staff'
}

// User interface
interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  departmentId?: mongoose.Types.ObjectId;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Don't return password by default
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: '{VALUE} is not a valid role'
      },
      required: [true, 'Role is required'],
      default: UserRole.STUDENT
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department'
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

// Indexes
// Note: email already has unique: true in field definition, no need for separate index
UserSchema.index({ role: 1 });
UserSchema.index({ departmentId: 1 });

// Virtual for student profile
UserSchema.virtual('studentProfile', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Virtual for faculty profile
UserSchema.virtual('facultyProfile', {
  ref: 'Faculty',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Export User model
export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

// Type-only exports
export type { IUser };
