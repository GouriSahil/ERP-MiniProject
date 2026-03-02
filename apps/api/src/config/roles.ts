/**
 * Role-Based Access Control (RBAC) Configuration
 * 
 * SRS Section 7.1: Permission Model
 * - Format: {resource}:{action}
 * - Hierarchy: Higher roles inherit lower role permissions
 * - Wildcards: '*' matches all resources or actions
 */

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RoleDefinition {
  name: string;
  description: string;
  inherits?: string[]; // Roles this role inherits from
  permissions: string[]; // Permission strings in format "resource:action" or "resource:*"
}

/**
 * Role hierarchy (highest to lowest):
 * 1. super_admin - Full system access
 * 2. college_admin - College-wide management
 * 3. department_head - Department-level management
 * 4. faculty - Teaching and grading
 * 5. support_staff - Administrative support
 * 6. student - Self-service access
 */
export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  super_admin: {
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: ['*'], // Wildcard grants all permissions
  },

  college_admin: {
    name: 'College Administrator',
    description: 'College-wide administrative access',
    permissions: [
      // User management
      'users:create',
      'users:view',
      'users:update',
      'users:delete',
      
      // Student management
      'students:create',
      'students:view',
      'students:update',
      'students:delete',
      
      // Faculty management
      'faculty:create',
      'faculty:view',
      'faculty:update',
      'faculty:delete',
      
      // Department management
      'departments:create',
      'departments:view',
      'departments:update',
      'departments:delete',
      
      // Course management
      'courses:create',
      'courses:view',
      'courses:update',
      'courses:delete',
      
      // Academic terms
      'terms:create',
      'terms:view',
      'terms:update',
      'terms:delete',
      
      // Course offerings
      'offerings:create',
      'offerings:view',
      'offerings:update',
      'offerings:delete',
      
      // Sessions
      'sessions:create',
      'sessions:view',
      'sessions:update',
      'sessions:delete',
      
      // Enrollments
      'enrollments:create',
      'enrollments:view',
      'enrollments:update',
      'enrollments:delete',
      'enrollments:approve',
      
      // Attendance
      'attendance:view',
      'attendance:mark',
      'attendance:update',
      'attendance:delete',
      
      // Assessments (assignments, exams)
      'assessments:create',
      'assessments:view',
      'assessments:update',
      'assessments:delete',
      'assessments:grade',
      
      // Grades
      'grades:view',
      'grades:update',
      'grades:approve',
      
      // Reports
      'reports:view',
      'reports:generate',
      'reports:export',
      
      // Audit logs
      'audit:view',
      'audit:export',
      
      // System configuration
      'system:configure',
      'system:view',
    ],
  },

  department_head: {
    name: 'Department Head',
    description: 'Department-level management and oversight',
    permissions: [
      // Students (view only, department-filtered)
      'students:view',
      
      // Faculty (view and manage in their department)
      'faculty:view',
      'faculty:update',
      
      // Courses (view and create/update for department)
      'courses:view',
      'courses:create',
      'courses:update',
      
      // Offerings (full management in department)
      'offerings:create',
      'offerings:view',
      'offerings:update',
      'offerings:delete',
      
      // Sessions
      'sessions:create',
      'sessions:view',
      'sessions:update',
      'sessions:delete',
      
      // Enrollments
      'enrollments:view',
      'enrollments:approve',
      
      // Attendance (view and manage)
      'attendance:view',
      'attendance:mark',
      'attendance:update',
      
      // Assessments
      'assessments:view',
      'assessments:create',
      'assessments:update',
      
      // Grades
      'grades:view',
      'grades:update',
      'grades:approve',
      
      // Reports
      'reports:view',
      'reports:generate',
    ],
  },

  faculty: {
    name: 'Faculty Member',
    description: 'Teaching, grading, and student interaction',
    permissions: [
      // Students (view only in their classes)
      'students:view',
      
      // Faculty (view own profile)
      'faculty:view',
      
      // Courses and offerings (view assigned)
      'courses:view',
      'offerings:view',
      
      // Sessions (manage their own sessions)
      'sessions:view',
      'sessions:create',
      'sessions:update',
      
      // Attendance
      'attendance:view',
      'attendance:mark',
      'attendance:update',
      
      // Enrollments (view their students)
      'enrollments:view',
      
      // Assessments (create and grade)
      'assessments:create',
      'assessments:view',
      'assessments:update',
      'assessments:delete',
      'assessments:grade',
      
      // Grades (enter and update)
      'grades:view',
      'grades:update',
      
      // Reports
      'reports:view',
    ],
  },

  support_staff: {
    name: 'Support Staff',
    description: 'Administrative support and data entry',
    permissions: [
      // View-only access to most entities
      'students:view',
      'faculty:view',
      'departments:view',
      'courses:view',
      'offerings:view',
      'sessions:view',
      'enrollments:view',
      'assessments:view',
      'grades:view',
      
      // Limited create/update permissions
      'offerings:create',
      'sessions:create',
      'sessions:update',
      'enrollments:create',
      
      // Attendance
      'attendance:view',
      
      // Reports
      'reports:view',
    ],
  },

  student: {
    name: 'Student',
    description: 'Self-service access to own academic records',
    permissions: [
      // View own information
      'students:view', // scoped to own record
      
      // View courses and offerings
      'courses:view',
      'offerings:view',
      'sessions:view',
      
      // Self-enrollment
      'enrollments:create', // for self-enrollment
      'enrollments:view',   // view own enrollments
      'enrollments:update', // drop/add
      
      // View own attendance
      'attendance:view',
      
      // View own assessments and grades
      'assessments:view',
      'grades:view',
      
      // Reports (own academic reports)
      'reports:view',
    ],
  },
};

/**
 * Role hierarchy for inheritance
 * Each role inherits permissions from roles listed in their inherits array
 */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  college_admin: ['support_staff'], // Inherits all support_staff permissions
  department_head: ['faculty', 'support_staff'], // Inherits faculty and support_staff permissions
  faculty: ['support_staff'], // Inherits support_staff permissions
  support_staff: ['student'], // Inherits student permissions
  student: [], // Base role, no inheritance
  super_admin: [], // Top-level, no inheritance needed (has wildcard)
};

/**
 * Helper function to get all permissions for a role including inherited ones
 */
export function getRolePermissions(role: string): string[] {
  const roleDef = ROLE_DEFINITIONS[role];
  if (!roleDef) {
    return [];
  }

  // Start with direct permissions
  let permissions: string[] = [...roleDef.permissions];

  // Add inherited permissions recursively
  const inheritedRoles = ROLE_HIERARCHY[role] || [];
  for (const inheritedRole of inheritedRoles) {
    const inheritedPermissions = getRolePermissions(inheritedRole);
    permissions = [...permissions, ...inheritedPermissions];
  }

  // Remove duplicates
  return Array.from(new Set(permissions));
}

/**
 * Check if a role has a specific permission
 * Supports wildcard matching: "resource:*" or "*"
 */
export function roleHasPermission(role: string, requiredPermission: string): boolean {
  const permissions = getRolePermissions(role);

  // Check for wildcard permission
  if (permissions.includes('*')) {
    return true;
  }

  // Check for exact match or resource-level wildcard
  return permissions.some(permission => {
    if (permission === '*') return true;
    
    const [permResource, permAction] = permission.split(':');
    const [reqResource, reqAction] = requiredPermission.split(':');

    // Exact match
    if (permission === requiredPermission) return true;

    // Resource wildcard: "resource:*" matches "resource:anything"
    if (permAction === '*' && permResource === reqResource) return true;

    // Action wildcard: "*:action" matches "anything:action"
    if (permResource === '*' && permAction === reqAction) return true;

    return false;
  });
}

/**
 * Check if one role can perform actions of another role
 * Based on role hierarchy
 */
export function isRoleHigherOrEqual(higherRole: string, lowerRole: string): boolean {
  if (higherRole === lowerRole) return true;
  if (higherRole === 'super_admin') return true;

  const hierarchy = ROLE_HIERARCHY[lowerRole] || [];
  return hierarchy.some(parent => isRoleHigherOrEqual(higherRole, parent));
}

/**
 * Get all available role names
 */
export function getAllRoles(): string[] {
  return Object.keys(ROLE_DEFINITIONS);
}

/**
 * Validate if a role exists
 */
export function isValidRole(role: string): boolean {
  return role in ROLE_DEFINITIONS;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  return ROLE_DEFINITIONS[role]?.name || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: string): string {
  return ROLE_DEFINITIONS[role]?.description || '';
}
