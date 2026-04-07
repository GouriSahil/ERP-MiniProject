# College ERP Backend - Remaining Features Design

**Date**: 2025-04-07
**Status**: Approved
**Author**: Claude (with user approval)

---

## Overview

This design document outlines the implementation of all remaining features for the College ERP backend system, as identified in `TODO.backend.todo`. The codebase has a solid foundation with consistent patterns for controllers, models, routes, and utilities.

## Current State Analysis

### Existing Patterns
- **Controllers**: Static class methods with try/catch error handling
- **Models**: Mongoose schemas with interfaces and enums
- **Routes**: Clean RESTful patterns with JSDoc comments
- **Utilities**: Pagination, search, response helpers already exist
- **Testing**: Bun test framework with E2E and integration tests
- **Email**: Nodemailer-based service with console/SMTP modes

### Remaining Work Categories

1. Fix Failing E2E Tests (12 tests)
2. Enhanced Search/Filter/Sort for List APIs
3. User Management APIs (3 items)
4. Term Management APIs (2 items)
5. Course Schedule API
6. Faculty Reporting APIs (2 items)
7. Advanced Attendance Features (6 items)
8. Reporting & Analytics Enhancements (2 items)

---

## Category 1: Fix Failing E2E Tests

### Problem
The TODO indicates "15/27 passing" E2E tests. Potential issues:
- Test isolation (data not cleaned between runs)
- API response format mismatches
- Authentication token handling
- Pagination metadata expectations

### Solution
1. Run full test suite to identify specific failures
2. Fix test isolation by improving beforeEach/afterEach hooks
3. Align API responses with test expectations
4. Ensure proper auth token handling in E2E client

---

## Category 2: Enhanced Search/Filter/Sort

### Pattern to Follow

The existing `pagination.util.ts` provides:
```typescript
export const getPaginationParams = (query: any): PaginationOptions
export const buildSearchFilter = (searchFields: string[], searchTerm: string)
```

### Implementation Matrix

| Endpoint | Search Fields | Filters | Sort Options |
|----------|--------------|---------|--------------|
| GET /api/users | name, email | role, department, status | createdAt, name, email |
| GET /api/students | name, email, rollNumber | department, status | createdAt, name, rollNumber |
| GET /api/faculty | name, email | department | createdAt, name |

### New Utility: Filter Builder

Create `filter.util.ts` for reusable filter builders:
```typescript
export const buildRoleFilter = (roles: string[]) => { ... }
export const buildDepartmentFilter = (deptId: string) => { ... }
export const buildStatusFilter = (status: string) => { ... }
```

---

## Category 3: User Management APIs

### 3.1 Deactivate/Reactivate User

**Endpoint**: `PUT /api/users/:id/status`

**Request Body**:
```typescript
{
  status: 'active' | 'inactive' | 'suspended'
}
```

**Authorization**: Admin, Super Admin

**Audit**: Log status change with reason (optional)

### 3.2 Admin Password Reset

**Endpoint**: `POST /api/users/:id/reset-password`

**Request Body**:
```typescript
{
  newPassword: string  // Min 8 characters
}
```

**Authorization**: Admin, Super Admin

**Response**: Returns success without exposing the password

### 3.3 Email Notifications

**Extend** `email.service.ts`:

```typescript
async sendUserApprovalEmail(to: string, name?: string): Promise<void>
async sendUserRejectionEmail(to: string, reason?: string, name?: string): Promise<void>
```

**Format**: Console mode for dev, HTML email for production

**Triggers**: Called from users controller approve/reject methods

---

## Category 4: Term Management APIs

### 4.1 Activate/Deactivate Term

**Endpoint**: `PUT /api/terms/:id/status`

**Request Body**:
```typescript
{
  status: 'active' | 'inactive' | 'completed'
}
```

**Business Rules**:
- Only one term can be active at a time
- Activating a new term deactivates the current active term
- Cannot delete term with active enrollments

### 4.2 Get Current Active Term

**Endpoint**: `GET /api/terms/current`

**Returns**: The term with `status: 'active'` and latest startDate

---

## Category 5: Course Schedule API

### Model Extension

Extend `CourseOffering` model with:
```typescript
schedule?: {
  days: string[];      // ['Mon', 'Wed', 'Fri']
  startTime: string;   // '09:00' (HH:mm format)
  endTime: string;     // '10:30'
  location?: string;
}
```

### Endpoint

**Endpoint**: `PUT /api/offerings/:id/schedule`

**Request Body**:
```typescript
{
  days: string[],
  startTime: string,
  endTime: string,
  location?: string
}
```

**Validation**: Use existing `business-validation.utils.ts` for day/time validation

---

## Category 6: Faculty Reporting APIs

### 6.1 Get Faculty Teaching Load

**Endpoint**: `GET /api/faculty/:id/teaching-load`

**Query Params**: `termId` (optional)

**Returns**:
```typescript
{
  facultyId: string;
  facultyName: string;
  termId?: string;
  totalCourses: number;
  totalSessions: number;
  courses: Array<{
    courseId: string;
    courseName: string;
    offeringId: string;
    sessionCount: number;
  }>;
}
```

### 6.2 Get Faculty Assigned Offerings

**Endpoint**: `GET /api/faculty/:id/offerings`

**Query Params**: `termId`, `status`

**Implementation**: Query `OfferingFaculty` collection, populate offerings

---

## Category 7: Advanced Attendance Features

### 7.1 Calculate Attendance Percentage

**Endpoint**: `GET /api/attendance/student/:studentId/percentage`

**Query Params**: `offeringId`, `termId`, `startDate`, `endDate`

**Returns**:
```typescript
{
  studentId: string;
  totalSessions: number;
  present: number;
  absent: number;
  percentage: number;
}
```

### 7.2 Get Attendance Trends

**Endpoint**: `GET /api/attendance/trends`

**Query Params**: `studentId`, `offeringId`, `startDate`, `endDate`, `groupBy`

**Group By Options**: `day`, `week`, `month`

**Returns**: Time-series data for chart visualization

### 7.3 Export Attendance to CSV

**Endpoint**: `GET /api/attendance/export`

**Query Params**: `offeringId`, `sessionId`, `startDate`, `endDate`

**Response**: CSV file with `Content-Type: text/csv`

**Columns**: date, studentName, rollNumber, status, remarks

### 7.4 Get Low Attendance Students

**Endpoint**: `GET /api/reports/low-attendance`

**Query Params**: `threshold` (default 75), `termId`, `courseId`, `departmentId`

**Returns**:
```typescript
{
  threshold: number;
  students: Array<{
    studentId: string;
    name: string;
    rollNumber: string;
    percentage: number;
  }>;
}
```

### 7.5 Student Attendance Dashboard

**Endpoint**: `GET /api/attendance/student/:studentId/dashboard`

**Query Params**: `termId`

**Returns**: Comprehensive attendance summary including:
- Overall percentage
- Course-wise breakdown
- Recent attendance records
- Low attendance warnings

---

## Category 8: Reporting & Analytics Enhancements

### 8.1 Interactive Charts Data API

**Endpoint**: `GET /api/reports/charts/:chartType`

**Chart Types**:
- `enrollment-trends`: Enrollment over time
- `attendance-stats`: Attendance by course/department
- `course-popularity`: Most enrolled courses
- `faculty-load`: Teaching load distribution

**Response Format**: Optimized for chart libraries (Chart.js, Recharts)

### 8.2 Print-friendly Report Formats

**Approach**: Add `?format=print` query param to existing report endpoints

**Implementation**:
- Returns simplified HTML with print-optimized styles
- Removes navigation, buttons, interactive elements
- Adds print-specific headers/footers

---

## Implementation Sequence

Recommended order to minimize dependencies:

1. **Fix E2E tests** - Ensures foundation is solid
2. **Search/Filter/Sort** - Purely additive, no dependencies
3. **User Management APIs** - Uses existing patterns
4. **Term Management APIs** - Independent
5. **Faculty Reporting** - Uses existing relations
6. **Course Schedule** - Model extension + simple CRUD
7. **Attendance Features** - More complex, depends on sessions
8. **Reporting Enhancements** - Builds on attendance features

---

## Files to Modify/Create

### Modify (Existing Files)
- `apps/api/src/utils/pagination.util.ts` - Add filter builders
- `apps/api/src/services/email.service.ts` - Add approval/rejection emails
- `apps/api/src/controllers/users.controller.ts` - Status update, password reset
- `apps/api/src/controllers/students.controller.ts` - Search/filter
- `apps/api/src/controllers/faculty.controller.ts` - Search/filter, reporting
- `apps/api/src/controllers/terms.controller.ts` - Status, current active
- `apps/api/src/controllers/offerings.controller.ts` - Schedule endpoint
- `apps/api/src/controllers/attendance.controller.ts` - Advanced features
- `apps/api/src/controllers/reports.controller.ts` - Charts, low attendance
- `apps/api/src/routes/*` - Add new routes
- `apps/api/src/models/CourseOffering.ts` - Add schedule field
- `apps/api/tests/e2e/api.e2e.test.ts` - Fix failing tests

### Create (New Files)
- `apps/api/src/utils/filter.util.ts` - Reusable filter builders
- `apps/api/tests/e2e/*.feature.test.ts` - New feature E2E tests

---

## Testing Strategy

1. **Unit Tests**: New utility functions
2. **Integration Tests**: New controller methods
3. **E2E Tests**: New API endpoints
4. **Fix**: Existing failing E2E tests

---

## Dependencies

### External
- None (all existing dependencies sufficient)

### Internal
- Email notifications → User approval workflow
- Attendance features → Session management
- Faculty reporting → OfferingFaculty relations

---

## Success Criteria

- All E2E tests passing (27/27)
- All TODO items marked complete
- New features follow existing code patterns
- Full test coverage for new endpoints
- Documentation updated in Swagger

