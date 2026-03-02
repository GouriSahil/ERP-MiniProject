// Export all Mongoose models
export { User } from './User';
export { Student } from './Student';
export { Faculty } from './Faculty';
export { Department } from './Department';
export { Course } from './Course';
export { Term } from './Term';
export { CourseOffering } from './CourseOffering';
export { OfferingFaculty } from './OfferingFaculty';
export { Session } from './Session';
export { Enrollment } from './Enrollment';
export { AttendanceRecord } from './AttendanceRecord';
export { AuditLog } from './AuditLog';
export { CustomRole } from './CustomRole';

// Export all interfaces as types
export type { IUser, UserRole } from './User';
export type { IStudent } from './Student';
export type { IFaculty } from './Faculty';
export type { IDepartment } from './Department';
export type { ICourse } from './Course';
export type { ITerm } from './Term';
export type { ICourseOffering } from './CourseOffering';
export type { IOfferingFaculty } from './OfferingFaculty';
export type { ISession } from './Session';
export type { IEnrollment } from './Enrollment';
export type { IAttendanceRecord } from './AttendanceRecord';
export type { IAuditLog } from './AuditLog';
export type { ICustomRole } from './CustomRole';

// Export enums as runtime values (used in Object.values() and service comparisons)
export { TermStatus } from './Term';
export { FacultyRole } from './OfferingFaculty';
export { SessionStatus } from './Session';
export { EnrollmentStatus } from './Enrollment';
export { AttendanceStatus } from './AttendanceRecord';
export { AuditAction, AuditStatus } from './AuditLog';
export { Permission } from './CustomRole';
