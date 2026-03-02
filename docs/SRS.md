# Software Requirements Specification (SRS)

## College ERP System

**Version:** 2.1
**Date:** March 1, 2026
**Status:** Technology Stack - MEAN Stack (AngularJS, Node.js, MongoDB)
**Changes from v1.0:**

- Updated to use AngularJS/Node.js/MongoDB stack
- Removed testing requirements from SRS

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Document Scope
   - 1.3 Definitions, Acronyms, and Abbreviations
   - 1.4 References

2. [Overall Description](#2-overall-description)
   - 2.1 System Overview
   - 2.2 System Architecture
   - 2.3 User Characteristics
   - 2.4 Assumptions and Dependencies

3. [Functional Requirements](#3-functional-requirements)
   - 3.1 Authentication and Authorization
   - 3.2 User Management
   - 3.3 Academic Structure Management
   - 3.4 Course Administration
   - 3.5 Student Management
   - 3.6 Faculty Management
   - 3.7 Enrollment Management
   - 3.8 Attendance Management
   - 3.9 Reporting and Analytics
   - 3.10 Bulk Operations
   - 3.11 System Administration

4. [Non-Functional Requirements](#4-non-functional-requirements)
   - 4.1 Performance Requirements
   - 4.2 Security Requirements
   - 4.3 Reliability and Availability
   - 4.4 Usability Requirements
   - 4.5 Scalability Requirements
   - 4.6 Maintainability Requirements

5. [Data Requirements](#5-data-requirements)
   - 5.1 Data Entities and Relationships
   - 5.2 Data Validation
   - 5.3 Data Security and Privacy
   - 5.4 Backup and Recovery

6. [Interface Requirements](#6-interface-requirements)
   - 6.1 User Interfaces
   - 6.2 API Interfaces
   - 6.3 Database Interfaces

7. [System Features](#7-system-features)
   - 7.1 Role-Based Access Control
   - 7.2 Audit Logging
   - 7.3 Bulk Operations
   - 7.4 Analytics Dashboard

8. [Implementation Considerations](#8-implementation-considerations)
   - 8.1 Technology Stack
   - 8.2 Deployment Architecture
   - 8.3 Development Workflow

---

## 1. Introduction

### 1.1 Purpose

This document describes the functional and non-functional requirements for a comprehensive College Enterprise Resource Planning (ERP) system. The system is designed to streamline and automate academic and administrative operations for educational institutions, including student management, faculty management, course administration, attendance tracking, and comprehensive reporting.

### 1.2 Document Scope

This SRS covers:

- Full-system architecture and technology stack
- All functional modules and their requirements
- Data model and validation rules
- Security and authentication requirements
- Performance and scalability considerations
- User interface specifications

**Scope Limitations:**

- Does not include detailed financial/accounting modules (future phases)
- Does not cover library management (future phases)
- Does not include alumni management (future phases)

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|-------|------------|
| ERP | Enterprise Resource Planning |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| CRUD | Create, Read, Update, Delete |
| KPI | Key Performance Indicator |
| CSV | Comma-Separated Values |
| BSON | Binary JSON (MongoDB document format) |
| MVC | Model-View-Controller |
| MEAN | MongoDB, Express, AngularJS, Node.js |

### 1.4 References

- AngularJS Documentation
- Node.js Documentation
- MongoDB Documentation
- Express.js Documentation

---

## 2. Overall Description

### 2.1 System Overview

The College ERP System is a web-based, full-stack application designed to manage all core academic and administrative functions of an educational institution. The system provides role-based access to administrators, faculty, staff, and students through a modern, responsive web interface.

**Key Capabilities:**

- Multi-role user management with granular permissions
- Academic term and course management
- Student and faculty lifecycle management
- Comprehensive attendance tracking and reporting
- Bulk data import/export operations
- Advanced analytics and reporting dashboards
- Complete audit logging for compliance

### 2.2 System Architecture

**Architecture Type:** Monolithic Full-Stack Application (MEAN Stack)

**Technology Stack:**

- **Frontend:** AngularJS (v1.8.x) with MVC Pattern
- **Backend:** Node.js with Express.js
- **Database:** MongoDB (NoSQL Document Database)
- **Authentication:** Passport.js with JWT (JSON Web Tokens)
- **State Management:** AngularJS Services, Scope, $rootScope
- **API Layer:** RESTful API with Express.js
- **UI Library:** Bootstrap 4 + AngularUI Bootstrap
- **Charts/Visualization:** Chart.js or Highcharts
- **Build Tools:** Gulp/Grunt, Browserify/Webpack

**Architecture Layers:**

1. **Presentation Layer:** AngularJS components, controllers, views, and directives
2. **API Layer:** Express.js RESTful endpoints
3. **Business Logic Layer:** Node.js services and middleware
4. **Data Access Layer:** Mongoose ODM with MongoDB
5. **Security Layer:** Passport.js authentication with JWT-based authorization

### 2.3 User Characteristics

| User Role | Description | Typical Tasks | Technical Proficiency |
|------------|-------------|----------------|----------------------|
| **Super Admin** | System administrator with full access | User management, role configuration, system administration | High |
| **College Admin** | College-wide administrator | Department management, course administration, oversight | High |
| **Department Head** | Department-level administrator | Faculty management, course scheduling, enrollment management | Medium-High |
| **Faculty** | Teaching staff | Attendance marking, viewing enrolled students, course materials | Medium |
| **Support Staff** | Administrative support | Data entry, reporting, basic management tasks | Medium |
| **Student** | Enrolled student | View attendance, view course information, personal data | Low-Medium |

### 2.4 Assumptions and Dependencies

**Assumptions:**

- All users have internet access and modern web browsers
- The institution has existing student and faculty data to import
- Academic calendar follows term-based structure (semesters/trimesters)

**Dependencies:**

- MongoDB database service (managed or self-hosted)
- Node.js runtime environment (v14 LTS or higher)
- npm/yarn package manager
- SMTP server for email notifications (future requirement)
- File storage for document uploads (future requirement)
- Backup and disaster recovery infrastructure

---

## 3. Functional Requirements

### 3.1 Authentication and Authorization

#### AUTH-001: User Registration

- **Priority:** High
- **Description:** Allow new users to register with email and password
- **Acceptance Criteria:**
  - Registration form captures name, email, password, role
  - Email validation ensures proper email format
  - Password must meet minimum length requirement (8 characters)
  - User account created in pending state requiring admin approval
  - Duplicate email addresses are rejected
  - Default role assigned (configurable, default: student)

#### AUTH-002: User Login

- **Priority:** Critical
- **Description:** Authenticate users with email and password credentials
- **Acceptance Criteria:**
  - Login form accepts email and password
  - JWT token generated upon successful authentication
  - Token stored in localStorage or httpOnly cookie
  - Token expiration after configurable time (default: 1 hour)
  - Refresh token mechanism for extended sessions
  - Password reset flow available for forgotten passwords

#### AUTH-003: Password Management

- **Priority:** High
- **Description:** Allow users to change passwords
- **Acceptance Criteria:**
  - Users can change password with current password verification
  - Admin can force password reset for any user
  - Users flagged with `mustChangePassword` required to change password on next login
  - Password change logged in audit trail
  - New password must meet strength requirements

#### AUTH-004: Role-Based Access Control

- **Priority:** Critical
- **Description:** Implement granular role-based permissions
- **Acceptance Criteria:**
  - Six built-in roles: super_admin, college_admin, department_head, faculty, support_staff, student
  - Custom roles can be created by super_admin
  - Permissions follow resource:action format (e.g., "students:create")
  - Higher roles inherit lower role permissions
  - UI elements hidden based on user permissions
  - Server functions validate permissions before executing
  - Unauthorized access attempts logged

#### AUTH-005: Session Management

- **Priority:** High
- **Description:** Manage user sessions securely using JWT
- **Acceptance Criteria:**
  - JWT access tokens stored in httpOnly cookies or localStorage
  - Refresh tokens stored securely for token renewal
  - Tokens invalidate on password change
  - Admin can revoke all user sessions (token blacklist)
  - Multiple concurrent sessions allowed (configurable)
  - Token metadata tracked (IP address, user agent, issued at)

### 3.2 User Management

#### USER-001: User Listing and Search

- **Priority:** High
- **Description:** Display directory of all users with filtering capabilities
- **Acceptance Criteria:**
  - Paginated list of all users
  - Search by name, email
  - Filter by role
  - Filter by department
  - Sort by name, email, role, creation date
  - Show user status (active/inactive)

#### USER-002: User Creation

- **Priority:** High
- **Description:** Create new user accounts
- **Acceptance Criteria:**
  - Capture name, email, temporary password
  - Assign role from available roles
  - Assign department (where applicable)
  - Temporary password must be changed on first login
  - User creation logged in audit trail
  - Email notification sent to new user (future requirement)

#### USER-003: User Profile Management

- **Priority:** Medium
- **Description:** View and edit user details
- **Acceptance Criteria:**
  - View complete user profile
  - Edit name, email, role, department
  - Deactivate user account
  - Reactivate user account
  - All changes logged in audit trail
  - Only authorized roles can edit specific users

#### USER-004: Password Reset

- **Priority:** High
- **Description:** Admin-initiated password reset
- **Acceptance Criteria:**
  - Admin can reset password for any user
  - Generate secure temporary password
  - Mark user with `mustChangePassword` flag
  - Send email with new credentials (future requirement)
  - Log password reset action

### 3.3 Academic Structure Management

#### ACAD-001: Department Management

- **Priority:** High
- **Description:** Create and manage academic departments
- **Acceptance Criteria:**
  - Create departments with name and unique code
  - Department code max 20 characters
  - View list of all departments
  - Edit department name
  - Delete departments (with validation - no dependent records)
  - Track faculty assigned to department

#### ACAD-002: Course Management

- **Priority:** High
- **Description:** Create and manage course catalog
- **Acceptance Criteria:**
  - Create courses with name, code, description, credits, department
  - View course catalog with filtering
  - Edit course details
  - Delete courses (with validation)
  - Course code unique within department

#### ACAD-003: Term Management

- **Priority:** High
- **Description:** Manage academic terms (semesters/trimesters)
- **Acceptance Criteria:**
  - Create terms with name, start date, end date, status
  - Terms cannot overlap (validation)
  - View list of all terms
  - Edit term dates
  - Activate/deactivate terms
  - Delete terms (with validation)
  - Current active term identified

### 3.4 Course Administration

#### COUR-001: Course Offering Management

- **Priority:** High
- **Description:** Create course sections/offerings for specific terms
- **Acceptance Criteria:**
  - Create offerings for course in specific term
  - Assign faculty to offering (multiple)
  - Set capacity limits
  - Set schedule information (days, times, location)
  - View offerings by term and course
  - Edit offering details
  - Delete offerings (with validation)

#### COUR-002: Session Management

- **Priority:** High
- **Description:** Manage individual class sessions within offerings
- **Acceptance Criteria:**
  - Create sessions with date, start time, end time, location
  - Sessions linked to course offering
  - View sessions by offering
  - Edit session details
  - Delete sessions (with validation)
  - Track session status (scheduled, completed, cancelled)

### 3.5 Student Management

#### STU-001: Student Registration

- **Priority:** High
- **Description:** Register new students into the system
- **Acceptance Criteria:**
  - Capture student name, email, roll number
  - Assign department
  - Create user account with student role
  - Student roll number unique within department
  - Send welcome email with credentials (future requirement)

#### STU-002: Student Listing and Search

- **Priority:** High
- **Description:** View directory of all students
- **Acceptance Criteria:**
  - Paginated list of all students
  - Search by name, email, roll number
  - Filter by department
  - Filter by enrollment status
  - Sort by name, roll number, department

#### STU-003: Student Profile

- **Priority:** Medium
- **Description:** View and edit student information
- **Acceptance Criteria:**
  - View complete student profile
  - Edit name, email, roll number, department
  - View enrollment history
  - View attendance summary
  - Edit profile (authorized roles only)

#### STU-004: Bulk Student Import

- **Priority:** Medium
- **Description:** Import multiple students from CSV
- **Acceptance Criteria:**
  - Upload CSV file with student data
  - Validate all records before import
  - Report validation errors with line numbers
  - Import valid records (partial success support)
  - Log import operation in audit trail

### 3.6 Faculty Management

#### FAC-001: Faculty Registration

- **Priority:** High
- **Description:** Register new faculty members
- **Acceptance Criteria:**
  - Capture faculty name, email
  - Assign department
  - Assign specialization/subject area
  - Create user account with faculty role
  - Faculty email unique

#### FAC-002: Faculty Listing and Search

- **Priority:** High
- **Description:** View directory of all faculty
- **Acceptance Criteria:**
  - Paginated list of all faculty
  - Search by name, email
  - Filter by department
  - View assigned courses

#### FAC-003: Faculty Profile

- **Priority:** Medium
- **Description:** View and edit faculty information
- **Acceptance Criteria:**
  - View complete faculty profile
  - Edit name, email, department, specialization
  - View assigned offerings
  - View teaching load

### 3.7 Enrollment Management

#### ENR-001: Course Enrollment

- **Priority:** High
- **Description:** Enroll students in course offerings
- **Acceptance Criteria:**
  - Select student and course offering
  - Validate enrollment (student meets prerequisites - future)
  - Check offering capacity
  - Create enrollment record
  - Prevent duplicate enrollments
  - Log enrollment action

#### ENR-002: Bulk Enrollment

- **Priority:** Medium
- **Description:** Enroll multiple students at once
- **Acceptance Criteria:**
  - Select offering and multiple students
  - Validate all enrollments before processing
  - Report errors for individual students
  - Process valid enrollments (partial success)
  - Log bulk operation

#### ENR-003: Enrollment Management

- **Priority:** Medium
- **Description:** View and manage enrollments
- **Acceptance Criteria:**
  - View all enrollments for offering
  - View student enrollment history
  - Drop enrollment (with validation)
  - Transfer enrollment between offerings
  - Track enrollment status

### 3.8 Attendance Management

#### ATT-001: Attendance Marking

- **Priority:** Critical
- **Description:** Mark student attendance for sessions
- **Acceptance Criteria:**
  - Select session to mark attendance
  - View list of enrolled students
  - Mark each student as present/absent/late (checkboxes)
  - Save attendance records
  - Prevent duplicate marking for same session
  - Log attendance marking action

#### ATT-002: Bulk Attendance Marking

- **Priority:** High
- **Description:** Mark attendance for multiple sessions
- **Acceptance Criteria:**
  - Select multiple sessions
  - Mark attendance for all sessions
  - Support partial completion
  - Validation for session availability
  - Log bulk operation

#### ATT-003: Attendance Viewing

- **Priority:** High
- **Description:** View attendance records
- **Acceptance Criteria:**
  - View attendance by student (all courses)
  - View attendance by session (all students)
  - View attendance by offering
  - Calculate attendance percentage
  - Show attendance trends
  - Export attendance records to CSV

#### ATT-004: Student Attendance Dashboard

- **Priority:** High
- **Description:** Personal attendance view for students
- **Acceptance Criteria:**
  - Students view their attendance for enrolled courses
  - Show attendance percentage per course
  - Show session history with status
  - Highlight low attendance warnings

#### ATT-005: Attendance Analytics

- **Priority:** Medium
- **Description:** Analyze attendance patterns
- **Acceptance Criteria:**
  - Attendance rate by course
  - Attendance rate by student
  - Attendance trends over time
  - Identify students with low attendance (<75%)
  - Identify courses with low average attendance

### 3.9 Reporting and Analytics

#### REP-001: Attendance Reports

- **Priority:** High
- **Description:** Generate attendance reports
- **Acceptance Criteria:**
  - Filter by term, course, student
  - Filter by date range
  - Generate summary statistics
  - Export to CSV
  - Print-friendly format

#### REP-002: Student Performance Reports

- **Priority:** Medium
- **Description:** Generate student reports
- **Acceptance Criteria:**
  - View student academic performance
  - Attendance summary
  - Enrollment history
  - Course completion status
  - Export to CSV

#### REP-003: Faculty Performance Reports

- **Priority:** Medium
- **Description:** Generate faculty reports
- **Acceptance Criteria:**
  - Teaching load summary
  - Average attendance by course
  - Student enrollment counts
  - Export to CSV

#### REP-004: Course Analytics Reports

- **Priority:** Medium
- **Description:** Generate course reports
- **Acceptance Criteria:**
  - Enrollment statistics
  - Attendance statistics
  - Course completion rates
  - Faculty assignments
  - Export to CSV

#### REP-005: System Analytics Dashboard

- **Priority:** High
- **Description:** Comprehensive system analytics
- **Acceptance Criteria:**
  - Key metrics cards (students, faculty, courses, departments)
  - Attendance rate trends
  - Enrollment trends
  - Active courses count
  - Upcoming sessions
  - Interactive charts (Bar, Line, Pie)

### 3.10 Bulk Operations

#### BULK-001: Bulk Session Creation

- **Priority:** Medium
- **Description:** Create multiple sessions for an offering
- **Acceptance Criteria:**
  - Select offering
  - Define schedule pattern (days, times)
  - Set date range
  - Generate multiple sessions automatically
  - Validate no conflicts
  - Log operation

#### BULK-002: Bulk Student Withdrawal

- **Priority:** Medium
- **Description:** Withdraw multiple students
- **Acceptance Criteria:**
  - Select multiple students
  - Specify withdrawal term/offerings
  - Process withdrawals
  - Update enrollment status
  - Log operation

#### BULK-003: Bulk Attendance Operations

- **Priority:** Medium
- **Description:** Perform bulk attendance actions
- **Acceptance Criteria:**
  - Mark all students present for sessions
  - Mark all students absent for sessions
  - Validate before bulk operation
  - Confirmation dialog for destructive actions
  - Log operation

### 3.11 System Administration

#### SYS-001: Role Management

- **Priority:** High
- **Description:** Manage custom roles and permissions
- **Acceptance Criteria:**
  - View all roles (built-in and custom)
  - Create custom roles
  - Assign permissions to custom roles
  - Edit custom roles
  - Delete custom roles (with validation)
  - Permissions follow resource:action pattern
  - Only super_admin can manage roles

#### SYS-002: Audit Log Management

- **Priority:** High
- **Description:** View and manage system audit logs
- **Acceptance Criteria:**
  - View all system actions in chronological order
  - Filter by action type
  - Filter by target type
  - Filter by user
  - Filter by date range
  - View detailed log entry with metadata
  - Export logs to CSV
  - Prune old logs (retention policy: 90 days)
  - Only admin roles can view logs

#### SYS-003: Dashboard Statistics

- **Priority:** Medium
- **Description:** Real-time system statistics
- **Acceptance Criteria:**
  - Total users count
  - Total students count
  - Total faculty count
  - Total departments count
  - Active courses count
  - Recent activity feed

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

**PERF-001: Response Time**

- Standard page loads: < 2 seconds
- Form submissions: < 1 second
- Data table loads (paginated): < 1 second
- Bulk operations: < 30 seconds for 1000 records

**PERF-002: Scalability**

- Support 10,000+ concurrent users
- Support 100,000+ student records
- Support 10,000+ course offerings per term

**PERF-003: Database Performance**

- All queries use proper indexes
- Pagination for all large datasets
- Query optimization for common operations
- N+1 query prevention

**PERF-004: Caching**

- Redis caching for frequently accessed data (optional)
- AngularJS template caching
- Static asset caching via CDN
- MongoDB query optimization with indexes

### 4.2 Security Requirements

**SEC-001: Authentication**

- Password hashing using bcrypt (12 rounds)
- JWT token-based authentication
- Automatic token expiration
- Token revocation on password change
- Refresh token rotation

**SEC-002: Authorization**

- RBAC enforced on all Express.js routes
- Permission validation before data access
- Audit logging for all privileged operations
- Role-based middleware for route protection

**SEC-003: Input Validation**

- All inputs validated using express-validator or Joi
- NoSQL injection prevention (parameterized queries via Mongoose)
- XSS prevention (AngularJS automatic escaping + sanitization)
- CSRF protection (csurf middleware or sameSite cookies)
- Helmet.js for security headers

**SEC-004: Data Protection**

- Sensitive data redaction in audit logs
- No plaintext password storage
- Email address protection from unauthorized access
- IP address logging for security analysis
- MongoDB field-level encryption for sensitive data

**SEC-005: Password Requirements**

- Minimum 8 characters
- Recommend uppercase, lowercase, numbers, special characters
- Force password change for new accounts
- Prevent password reuse (future requirement)

### 4.3 Reliability and Availability

**REL-001: System Availability**

- Target uptime: 99.5% (3.65 days downtime/year)
- Planned maintenance windows: < 4 hours/month
- Backup frequency: Daily automated backups

**REL-002: Error Handling**

- Graceful error messages for users
- All errors logged with stack traces
- Recovery mechanisms for common failures
- No data loss from system errors

**REL-003: Data Integrity**

- Foreign key constraints enforced
- Unique constraints on critical fields
- Transaction support for multi-record operations
- Audit trail for all data changes

### 4.4 Usability Requirements

**USAB-001: User Interface**

- Responsive design (mobile, tablet, desktop)
- Consistent design system (Bootstrap 4)
- Clear navigation and information hierarchy
- Accessible (WCAG 2.1 Level AA compliance)
- Color contrast ratio: 4.5:1 minimum

**USAB-002: User Guidance**

- Contextual help text
- Form validation with clear error messages
- Loading states for all async operations
- Confirmation dialogs for destructive actions
- Toast notifications for success/error feedback

**USAB-003: Performance Perception**

- Skeleton loaders during data fetch
- Optimistic UI updates where appropriate
- Progressive image loading (future requirement)
- Minimal perceived latency

### 4.5 Scalability Requirements

**SCAL-001: Horizontal Scaling**

- Stateless application server design
- Database connection pooling
- CDN for static assets
- Support for multiple server instances

**SCAL-002: Database Scaling**

- MongoDB indexing strategy
- Database sharding (future requirement)
- Read replica support (future requirement)

### 4.6 Maintainability Requirements

**MAINT-001: Code Quality**

- ESLint configuration and enforcement
- JSHint or JSCS for JavaScript code quality
- Consistent code formatting (Prettier)
- Component reusability patterns
- AngularJS best practices (John Papa style guide)

**MAINT-002: Documentation**

- Code comments for complex logic
- API documentation (Swagger/OpenAPI or custom docs)
- Deployment documentation
- Troubleshooting guides

---

## 5. Data Requirements

### 5.1 Data Entities and Relationships

**Users Collection**

- Fields: _id, name, email, passwordHash, role, departmentId, mustChangePassword, createdAt, updatedAt
- Relationships: One-to-many with students, faculty, audit_logs
- Indexes: email (unique), role

**Students Collection**

- Fields: _id, userId, rollNumber, departmentId, createdAt, updatedAt
- Relationships: References users, departments collections
- Indexes: rollNumber (unique within department), departmentId, userId

**Faculty Collection**

- Fields: _id, userId, departmentId, specialization, createdAt, updatedAt
- Relationships: References users, departments collections

**Departments Collection**

- Fields: _id, name, code, createdAt, updatedAt
- Indexes: code (unique)

**Courses Collection**

- Fields: _id, name, code, description, credits, departmentId, createdAt, updatedAt
- Indexes: code (unique within department), departmentId

**Terms Collection**

- Fields: _id, name, startDate, endDate, status, createdAt, updatedAt
- Indexes: status
- Validation: No overlapping terms

**Course Offerings Collection**

- Fields: _id, courseId, termId, capacity, schedule, createdAt, updatedAt
- Relationships: References courses, terms collections

**Offering Faculty Collection**

- Fields: _id, offeringId, facultyId, createdAt
- Relationships: References offerings, faculty collections

**Course Sessions Collection**

- Fields: _id, offeringId, date, startTime, endTime, location, status, createdAt, updatedAt
- Relationships: References offerings collection

**Enrollments Collection**

- Fields: _id, studentId, offeringId, status, enrolledAt, droppedAt, createdAt, updatedAt
- Relationships: References students, offerings collections
- Indexes: studentId, offeringId, {studentId, offeringId} (unique compound index)

**Attendance Records Collection**

- Fields: _id, sessionId, studentId, status, markedAt, markedBy, createdAt, updatedAt
- Relationships: References sessions, students collections
- Indexes: sessionId, studentId, {sessionId, studentId} (unique compound index)

**Audit Logs Collection**

- Fields: _id, actorUserId, actorRole, action, targetType, targetId, status, errorMessage, metadata, ipAddress, userAgent, occurredAt, createdAt
- Indexes: occurredAt, actorUserId, {targetType, targetId}
- Retention: 90 days default (TTL index)

**Custom Roles Collection**

- Fields: _id, name, permissions, createdAt, updatedAt
- Indexes: name (unique)

### 5.2 Data Validation

**Validation Layers:**

1. Schema-level: MongoDB schema validation (Mongoose)
2. ODM-level: Mongoose schema validation with custom validators
3. Application-level: express-validator or Joi for all inputs
4. Form-level: Client-side validation with AngularJS form directives and ng-messages

**Common Validation Rules:**

- Email: Valid email format
- Password: Minimum 8 characters
- UUID: Valid UUID format
- Dates: Required fields, logical ordering (end date >= start date)
- Numeric fields: Positive values for counts, credits, etc.
- Status fields: Enum validation (active/inactive, etc.)

**Business Logic Validation:**

- Term overlap prevention
- Offering capacity enforcement
- Duplicate enrollment prevention
- Unique roll numbers per department
- Department association for users where applicable

### 5.3 Data Security and Privacy

**Sensitive Data Handling:**

- Passwords: Hashed with bcrypt, never logged in plain text
- Email addresses: Redacted in audit logs (partial masking)
- PII: Protected by access control, audit trail for access
- IP addresses: Logged for security analysis, not public

**Data Access Patterns:**

- Role-based access control on all data access
- Students access only their own data
- Faculty access assigned offerings only
- Admins access department-level data
- Super admin full system access

**Audit Trail:**

- All create/update/delete operations logged
- Sensitive actions (password reset, role change) logged
- Failed access attempts logged
- Log retention: 90 days

### 5.4 Backup and Recovery

**Backup Strategy:**

- Daily automated database backups
- Point-in-time recovery capability
- Backup retention: 30 days
- Off-site backup storage

**Recovery Procedures:**

- Documented recovery procedures
- Regular backup restoration testing
- RTO (Recovery Time Objective): < 4 hours
- RPO (Recovery Point Objective): < 24 hours

---

## 6. Interface Requirements

### 6.1 User Interfaces

**UI Framework:** AngularJS (v1.8.x)
**UI Library:** Bootstrap 4 + AngularUI Bootstrap
**Styling:** Custom CSS + Bootstrap 4
**Design System:**

- Style: Bootstrap-based responsive design
- Base Theme: Professional blue/gray color scheme
- Icon Library: Font Awesome or Glyphicons
- Custom directives for reusable components

**Responsive Breakpoints:**

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Page Layout:**

- Header with navigation (navbar directive)
- Sidebar (collapsible, mobile-responsive)
- Main content area (ng-view or ui-view)
- Footer (if applicable)

**Common UI Components:**

- Forms: AngularJS form directives, ng-model, ng-messages
- Tables: Paginated, sortable, filterable tables with custom directives
- Cards: Bootstrap card components
- Modals: AngularUI Bootstrap modal directives
- Charts: Chart.js or Highcharts integration
- Notifications: toastr or ng-notify for user feedback
- Directives: Custom AngularJS directives for reusable UI elements

### 6.2 API Interfaces

**API Framework:** Express.js RESTful API
**Authentication:** Passport.js with JWT strategy
**Serialization:** JSON (native MongoDB BSON to JSON conversion)

**API Patterns:**

- RESTful endpoints following resource naming conventions
- GET: Data retrieval
- POST: Resource creation
- PUT/PATCH: Resource updates
- DELETE: Resource deletion
- Input validation: express-validator or Joi middleware
- Error handling: Centralized error handling middleware

**Authentication API:**

- Login: POST /api/auth/login
- Register: POST /api/auth/register
- Token Refresh: POST /api/auth/refresh
- Logout: POST /api/auth/logout
- Current User: GET /api/auth/me

**RESTful API Structure:**

- /api/users/* - User management
- /api/students/* - Student operations
- /api/faculty/* - Faculty operations
- /api/departments/* - Department management
- /api/courses/* - Course catalog
- /api/offerings/* - Course offerings
- /api/sessions/* - Class sessions
- /api/enrollments/* - Enrollment management
- /api/attendance/* - Attendance tracking
- /api/reports/* - Reporting endpoints
- /api/audit/* - Audit log management
- Permission checks on all protected routes

### 6.3 Database Interfaces

**ODM:** Mongoose (MongoDB Object Document Mapper)
**Database:** MongoDB (NoSQL Document Database)
**Connection:** Managed connection pooling with connection string
**Migrations:** Migrate-mongo or custom migration scripts

**Query Patterns:**

- Schema-based query building with Mongoose models
- Population: References and eager loading (similar to joins)
- Aggregation pipeline: COUNT, AVG, SUM, GROUP operations
- Transaction support for multi-record operations (MongoDB 4.0+)
- Indexing strategy for query optimization

**Migration Process:**

- Schema changes → Migrate-mongo migration file generation
- Migration files stored in /migrations directory
- Apply migrations: `migrate-mongo up`
- Rollback capability: `migrate-mongo down`
- Schema versioning via Mongoose plugins

---

## 7. System Features

### 7.1 Role-Based Access Control

**Permission Model:**

- Format: `{resource}:{action}`
- Examples: `students:create`, `courses:view`, `attendance:mark`
- Hierarchical: Higher roles inherit lower role permissions

**Built-in Roles:**

1. **super_admin:** All permissions, can manage roles
2. **college_admin:** Most permissions, cannot manage roles
3. **department_head:** Department-level permissions
4. **faculty:** Teaching permissions (attendance, view own courses)
5. **support_staff:** Limited administrative permissions
6. **student:** Personal data view permissions only

**Custom Roles:**

- Created by super_admin
- Granular permission selection
- Stored as JSON array in database
- Cannot exceed super_admin permissions

**Permission Enforcement:**

- Server-side: Check before executing any operation
- Client-side: Hide UI elements based on permissions
- Audit: Log all permission checks (optional)

### 7.2 Audit Logging

**Logged Actions:**

- User management: create, update, deactivate, reactivate
- Academic operations: term/course/department CRUD
- Enrollment: create, update, delete
- Attendance: marking, bulk operations
- System: role changes, audit log pruning
- Exports: CSV, PDF generation

**Audit Log Structure:**

```typescript
{
  id: UUID
  actorUserId: UUID | null
  actorRole: string
  action: string
  targetType: string
  targetId: string
  status: "success" | "failure"
  errorMessage: string | null
  metadata: JSON
  ipAddress: string
  userAgent: string
  occurredAt: Timestamp
}
```

**Sensitive Data Redaction:**

- Automatic redaction of: passwords, tokens, keys, secrets
- Recursively redacts nested JSON objects
- Patterns: password, token, key, secret, cookie, session

**Audit Log Features:**

- Real-time viewing with pagination
- Advanced filtering (action, target, user, date range)
- CSV export
- Retention policy (90 days default)
- Pruning operation (admin only)

### 7.3 Bulk Operations

**Supported Bulk Operations:**

- Bulk student registration
- Bulk enrollment
- Bulk session creation
- Bulk attendance marking
- Bulk student withdrawal

**Bulk Operation Architecture:**

- Server functions with array input validation
- Partial success support (some records succeed, others fail)
- Detailed error reporting with index-based tracking
- Transaction support where applicable
- Audit logging with summary metadata

**Error Handling:**

- Validate all records before processing
- Report errors with line numbers/indices
- Continue processing valid records after errors
- Rollback on critical failures (where transaction used)

**UI Components:**

- Bulk operation selection interface
- Progress indicators during processing
- Results summary (success/failure counts)
- Detailed error list display

### 7.4 Analytics Dashboard

**Key Performance Indicators (KPIs):**

- Total students
- Total faculty
- Total departments
- Active courses
- Overall attendance rate
- Upcoming sessions

**Analytics Modules:**

1. **Attendance Analytics**
   - Attendance rate by course
   - Attendance rate by student
   - Low attendance identification (<75%)
   - Trends over time

2. **Enrollment Analytics**
   - Enrollment counts by course
   - Enrollment trends by term
   - Capacity utilization

3. **Faculty Analytics**
   - Teaching load distribution
   - Average attendance per faculty
   - Course assignment statistics

**Visualization:**

- Bar charts: Comparative analysis
- Line charts: Trend analysis
- Pie charts: Distribution analysis
- Stats cards: KPI display with trend indicators

**Filtering Options:**

- Date range selector
- Department filter
- Course filter
- Student filter
- Term filter

---

## 8. Implementation Considerations

### 8.1 Technology Stack

**Frontend:**

- AngularJS (v1.8.x)
- AngularUI Bootstrap (UI components)
- Bootstrap 4 (CSS framework)
- Chart.js or Highcharts (data visualization)
- AngularJS ngRoute or ui-router (routing)
- AngularJS Resource or $http (API communication)
- toastr or ng-notify (notifications)
- Font Awesome (icons)

**Backend:**

- Node.js (v14 LTS or higher)
- Express.js (web framework)
- Passport.js (authentication)
- JWT (jsonwebtoken) (token-based auth)
- express-validator or Joi (input validation)
- Helmet.js (security headers)
- cors (Cross-Origin Resource Sharing)
- Morgan (HTTP request logging)

**Database:**

- MongoDB (NoSQL document database)
- Mongoose (ODM for schema and validation)

**Development Tools:**

- npm or yarn (package management)
- Gulp or Grunt (task automation)
- Browserify or Webpack (module bundling)
- Nodemon (development server)

**Authentication:**

- Passport.js (authentication middleware)
- bcrypt (password hashing)
- jsonwebtoken (JWT generation/validation)

**Deployment:**

- Heroku, DigitalOcean, or VPS hosting
- MongoDB Atlas (managed MongoDB) or self-hosted
- Nginx (reverse proxy)
- PM2 (process manager for Node.js)

### 8.2 Deployment Architecture

**Deployment Flow:**

1. Code pushed to main branch
2. Automated build on deployment platform (Heroku/VPS)
3. Deployment to production environment
4. Database migrations applied (controlled via migrate-mongo)
5. PM2 process manager restarts Node.js application

**Environment Configuration:**

- Development: Local development with local MongoDB
- Staging: Staging environment with staging database
- Production: Production deployment with MongoDB Atlas or self-hosted
- Environment variables: MONGODB_URI, JWT_SECRET, NODE_ENV, etc.

**Monitoring:**

- Application logs (Morgan + Winston or Bunyan)
- Error tracking (Sentry or custom error middleware)
- Performance monitoring (Express status monitoring or New Relic)
- Database performance (MongoDB Atlas metrics or custom monitoring)

**Scaling Strategy:**

- Stateless application server (horizontal scaling with load balancer)
- MongoDB connection pooling
- CDN for static assets (nginx or cloud CDN)
- Redis caching for frequently accessed data (optional)
- PM2 cluster mode for multi-core utilization

### 8.3 Development Workflow

**Git Workflow:**

- Main branch: Production-ready code
- Feature branches: New features and bug fixes
- Pull request review before merging
- Atomic commits with descriptive messages (Conventional Commits)

**Code Quality:**

- ESLint configuration enforced
- JSHint or JSCS for JavaScript code quality
- Prettier formatting enforced
- Code reviews required for all changes
- AngularJS best practices (John Papa style guide)

**Project Structure:**

```
project-root/
├── client/                 # AngularJS frontend
│   ├── app/
│   │   ├── controllers/    # AngularJS controllers
│   │   ├── services/       # AngularJS services
│   │   ├── directives/     # Custom directives
│   │   ├── filters/        # Custom filters
│   │   ├── views/          # HTML templates
│   │   └── app.js          # Main app module
│   ├── assets/             # Static assets
│   └── index.html          # Entry point
├── server/                 # Node.js/Express backend
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── models/             # Mongoose models
│   ├── routes/             # Express route definitions
│   ├── middleware/         # Custom middleware
│   ├── services/           # Business logic
│   └── server.js           # Entry point
├── migrations/             # MongoDB migrations
└── package.json            # Dependencies
```

**Development Phases:**

- Phase 1: Foundation (Complete) - Users, Authentication, Roles
- Phase 2: Academic Structure (Complete) - Departments, Courses, Terms, Offerings, Sessions
- Phase 2: Attendance (Complete) - Attendance marking, viewing, analytics
- Future Phases: Grading, Timetable, Library, Financials
