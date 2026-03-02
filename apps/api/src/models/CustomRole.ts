import mongoose, { Schema, Document, Model } from 'mongoose';

// Permission enum (based on CRUD operations + special permissions)
export enum Permission {
  // User management
  USERS_CREATE = 'users.create',
  USERS_READ = 'users.read',
  USERS_UPDATE = 'users.update',
  USERS_DELETE = 'users.delete',
  
  // Student management
  STUDENTS_CREATE = 'students.create',
  STUDENTS_READ = 'students.read',
  STUDENTS_UPDATE = 'students.update',
  STUDENTS_DELETE = 'students.delete',
  
  // Faculty management
  FACULTY_CREATE = 'faculty.create',
  FACULTY_READ = 'faculty.read',
  FACULTY_UPDATE = 'faculty.update',
  FACULTY_DELETE = 'faculty.delete',
  
  // Department management
  DEPARTMENTS_CREATE = 'departments.create',
  DEPARTMENTS_READ = 'departments.read',
  DEPARTMENTS_UPDATE = 'departments.update',
  DEPARTMENTS_DELETE = 'departments.delete',
  
  // Course management
  COURSES_CREATE = 'courses.create',
  COURSES_READ = 'courses.read',
  COURSES_UPDATE = 'courses.update',
  COURSES_DELETE = 'courses.delete',
  
  // Term management
  TERMS_CREATE = 'terms.create',
  TERMS_READ = 'terms.read',
  TERMS_UPDATE = 'terms.update',
  TERMS_DELETE = 'terms.delete',
  
  // Course offering management
  OFFERINGS_CREATE = 'offerings.create',
  OFFERINGS_READ = 'offerings.read',
  OFFERINGS_UPDATE = 'offerings.update',
  OFFERINGS_DELETE = 'offerings.delete',
  
  // Enrollment management
  ENROLLMENTS_CREATE = 'enrollments.create',
  ENROLLMENTS_READ = 'enrollments.read',
  ENROLLMENTS_UPDATE = 'enrollments.update',
  ENROLLMENTS_DELETE = 'enrollments.delete',
  
  // Attendance management
  ATTENDANCE_CREATE = 'attendance.create',
  ATTENDANCE_READ = 'attendance.read',
  ATTENDANCE_UPDATE = 'attendance.update',
  ATTENDANCE_DELETE = 'attendance.delete',
  
  // Audit log access
  AUDIT_LOGS_READ = 'audit_logs.read',
  
  // System administration
  SYSTEM_CONFIG = 'system.config',
  REPORTS_GENERATE = 'reports.generate'
}

// Custom Role interface
interface ICustomRole extends Document {
  name: string;
  permissions: Permission[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Custom Role schema
const CustomRoleSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Role name cannot exceed 50 characters']
    },
    permissions: {
      type: [String],
      required: [true, 'Permissions are required'],
      enum: {
        values: Object.values(Permission),
        message: '{VALUE} is not a valid permission'
      },
      default: []
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    }
  },
  {
    timestamps: true,
    collection: 'custom_roles'
  }
);

// Indexes
// Note: name already has unique: true in field definition, no need for separate index

// Static method to check if role has specific permission
CustomRoleSchema.statics.hasPermission = async function(roleId: mongoose.Types.ObjectId | string, permission: Permission) {
  const role = await this.findById(roleId);
  if (!role) return false;
  return role.permissions.includes(permission);
};

// Export Custom Role model
export const CustomRole: Model<ICustomRole> = mongoose.model<ICustomRole>('CustomRole', CustomRoleSchema);

// Type exports
export type { ICustomRole };
