import mongoose, { Schema, Document, Model } from 'mongoose';
import { getRolePermissions } from '../config/roles';

// User role enum based on SRS
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DEPT_HEAD = 'dept_head',
  FACULTY = 'faculty',
  STUDENT = 'student',
  STAFF = 'staff'
}

// User status enum for approval workflow
export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
}

// User interface
interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  customRoleId?: mongoose.Types.ObjectId; // Reference to CustomRole for additional permissions
  status: UserStatus;
  departmentId?: mongoose.Types.ObjectId;
  mustChangePassword: boolean;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  // Method to get all permissions (role + custom role)
  getPermissions(): Promise<string[]>;
  // Method to check if user has a specific permission
  hasPermission(permission: string): Promise<boolean>;
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
    customRoleId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomRole'
    },
    status: {
      type: String,
      enum: {
        values: Object.values(UserStatus),
        message: '{VALUE} is not a valid status'
      },
      required: [true, 'Status is required'],
      default: UserStatus.PENDING
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department'
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    },
    approvedAt: {
      type: Date
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500
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
UserSchema.index({ status: 1 });
UserSchema.index({ departmentId: 1 });
UserSchema.index({ status: 1, role: 1 }); // Compound index for filtering pending users by role
UserSchema.index({ customRoleId: 1 }); // Index for custom role lookups

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

// Helper methods for user status
UserSchema.methods.isApproved = function(): boolean {
  return this.status === UserStatus.APPROVED || this.status === UserStatus.ACTIVE;
};

UserSchema.methods.isPending = function(): boolean {
  return this.status === UserStatus.PENDING;
};

UserSchema.methods.isSuspended = function(): boolean {
  return this.status === UserStatus.SUSPENDED;
};

UserSchema.methods.isRejected = function(): boolean {
  return this.status === UserStatus.REJECTED;
};

// Method to get all permissions (role + custom role with inheritance)
UserSchema.methods.getPermissions = async function(): Promise<string[]> {
  // Get base role permissions with inheritance
  const rolePermissions = getRolePermissions(this.role);

  // If user has a custom role, fetch and merge those permissions
  if (this.customRoleId) {
    const { CustomRole } = require('./index');
    const customRole = await CustomRole.findById(this.customRoleId);
    if (customRole && customRole.permissions) {
      // Merge custom role permissions with base role permissions
      return [...new Set([...rolePermissions, ...customRole.permissions])];
    }
  }

  return rolePermissions;
};

// Method to check if user has a specific permission
UserSchema.methods.hasPermission = async function(permission: string): Promise<boolean> {
  const permissions = await this.getPermissions();

  // Check for wildcard permission
  if (permissions.includes('*')) {
    return true;
  }

  // Check for exact match or resource-level wildcard
  return permissions.some((perm: string) => {
    if (perm === '*') return true;

    const [permResource, permAction] = perm.split(':');
    const [reqResource, reqAction] = permission.split(':');

    // Exact match
    if (perm === permission) return true;

    // Resource wildcard: "resource:*" matches "resource:anything"
    if (permAction === '*' && permResource === reqResource) return true;

    // Action wildcard: "*:action" matches "anything:action"
    if (permResource === '*' && permAction === reqAction) return true;

    return false;
  });
};
