# ERP API - Quick Reference Guide

A quick reference for all ERP API endpoints.

**Base URL:** `http://localhost:3000/api`

---

## Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login user |
| POST | `/auth/refresh` | Public | Refresh access token |
| GET | `/auth/me` | Required | Get current user |
| POST | `/auth/update-password` | Required | Update password |
| POST | `/auth/logout` | Required | Logout user |

---

## User Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Required | List users |
| GET | `/users/:id` | Required | Get user by ID |
| POST | `/users` | Admin | Create user |
| PUT | `/users/:id` | Required | Update user |
| DELETE | `/users/:id` | Admin | Delete user |
| PATCH | `/users/:id/deactivate` | Required | Deactivate user |
| PATCH | `/users/:id/reactivate` | Required | Reactivate user |
| POST | `/users/:id/reset-password` | Admin | Reset user password |

---

## Student Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/students` | Required | List students |
| GET | `/students/:id` | Required | Get student by ID |
| GET | `/students/:id/enrollments` | Required | Get student enrollments |
| GET | `/students/:id/attendance` | Required | Get student attendance |
| POST | `/students` | Admin, Dept Head | Create student |
| PUT | `/students/:id` | Admin, Dept Head | Update student |
| DELETE | `/students/:id` | Admin | Delete student |
| POST | `/students/bulk-import` | Admin, Dept Head | Bulk import students |

---

## Faculty Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/faculty` | Required | List faculty |
| GET | `/faculty/:id` | Required | Get faculty by ID |
| GET | `/faculty/:id/offerings` | Required | Get faculty offerings |
| GET | `/faculty/:id/teaching-load` | Required | Get faculty teaching load |
| POST | `/faculty` | Admin, Dept Head | Create faculty |
| PUT | `/faculty/:id` | Admin, Dept Head | Update faculty |
| DELETE | `/faculty/:id` | Admin | Delete faculty |

---

## Department Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/departments` | Required | List departments |
| GET | `/departments/:id` | Required | Get department by ID |
| GET | `/departments/:id/faculty` | Required | Get department faculty |
| GET | `/departments/:id/courses` | Required | Get department courses |
| POST | `/departments` | Admin | Create department |
| PUT | `/departments/:id` | Admin | Update department |
| DELETE | `/departments/:id` | Admin | Delete department |

---

## Course Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/courses` | Required | List courses |
| GET | `/courses/:id` | Required | Get course by ID |
| GET | `/courses/:id/offerings` | Required | Get course offerings |
| POST | `/courses` | Admin, Dept Head | Create course |
| PUT | `/courses/:id` | Admin, Dept Head | Update course |
| DELETE | `/courses/:id` | Admin, Dept Head | Delete course |

---

## Term Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/terms` | terms.view | List terms |
| GET | `/terms/:id` | terms.view | Get term by ID |
| GET | `/terms/active/current` | terms.view | Get active term |
| GET | `/terms/:id/statistics` | terms.view | Get term statistics |
| POST | `/terms` | terms.create | Create term |
| PUT | `/terms/:id` | terms.update | Update term |
| PATCH | `/terms/:id/status` | terms.update | Update term status |
| DELETE | `/terms/:id` | terms.delete | Delete term |

---

## Course Offering Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/offerings` | offerings.view | List offerings |
| GET | `/offerings/:id` | offerings.view | Get offering by ID |
| GET | `/offerings/term/:termId` | offerings.view | Get offerings by term |
| GET | `/offerings/course/:courseId` | offerings.view | Get offerings by course |
| POST | `/offerings` | offerings.create | Create offering |
| PUT | `/offerings/:id` | offerings.update | Update offering |
| PATCH | `/offerings/:id/schedule` | offerings.update | Update offering schedule |
| DELETE | `/offerings/:id` | offerings.delete | Delete offering |

---

## Session Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sessions` | sessions.view | List sessions |
| GET | `/sessions/:id` | sessions.view | Get session by ID |
| GET | `/sessions/offering/:offeringId` | sessions.view | Get sessions by offering |
| GET | `/sessions/term/:termId` | sessions.view | Get sessions by term |
| POST | `/sessions` | sessions.create | Create session |
| PUT | `/sessions/:id` | sessions.update | Update session |
| PATCH | `/sessions/:id/status` | sessions.update | Update session status |
| DELETE | `/sessions/:id` | sessions.delete | Delete session |
| POST | `/sessions/bulk` | sessions.create | Bulk create sessions |

---

## Enrollment Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/enrollments` | enrollments.view | List enrollments |
| GET | `/enrollments/:id` | enrollments.view | Get enrollment by ID |
| GET | `/enrollments/student/:studentId` | enrollments.view | Get enrollments by student |
| GET | `/enrollments/offering/:offeringId` | enrollments.view | Get enrollments by offering |
| POST | `/enrollments` | enrollments.create | Create enrollment |
| PUT | `/enrollments/:id` | enrollments.update | Update enrollment |
| PATCH | `/enrollments/:id/drop` | enrollments.update | Drop enrollment |
| DELETE | `/enrollments/:id` | enrollments.delete | Delete enrollment |
| POST | `/enrollments/bulk` | enrollments.create | Bulk enroll students |

---

## Attendance Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/attendance` | attendance.view | List attendance records |
| GET | `/attendance/:id` | attendance.view | Get attendance by ID |
| GET | `/attendance/session/:sessionId` | attendance.view | Get attendance by session |
| GET | `/attendance/student/:studentId` | attendance.view | Get attendance by student |
| GET | `/attendance/student/:studentId/summary` | attendance.view | Get student attendance summary |
| GET | `/attendance/session/:sessionId/summary` | attendance.view | Get session attendance summary |
| POST | `/attendance` | attendance.mark | Mark attendance |
| POST | `/attendance/mark` | attendance.mark | Bulk mark attendance |
| PUT | `/attendance/:id` | attendance.mark | Update attendance |
| DELETE | `/attendance/:id` | attendance.mark | Delete attendance |

---

## Report Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reports/course-enrollment` | reports.view | Course enrollment report |
| GET | `/reports/student-attendance` | reports.view | Student attendance report |
| GET | `/reports/faculty-workload` | reports.view | Faculty workload report |
| GET | `/reports/enrollment-status` | reports.view | Enrollment status report |
| GET | `/reports/department/summary` | reports.view | Department summary report |
| GET | `/reports/term/:termId/overview` | reports.view | Term overview report |

---

## Audit Log Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/audit` | Admin | List audit logs |
| GET | `/audit/:id` | Admin | Get audit log by ID |
| GET | `/audit/user/:userId` | Admin | Get logs by user |
| GET | `/audit/target/:targetType/:targetId` | Admin | Get logs by target |
| GET | `/audit/action/:action` | Admin | Get logs by action |
| GET | `/audit/summary/activity` | Admin | Get activity summary |
| GET | `/audit/user/:userId/stats` | Admin | Get user statistics |
| GET | `/audit/export` | Admin | Export audit logs |
| GET | `/audit/security/logs` | Admin | Get security logs |
| POST | `/audit` | Admin | Create audit log entry |

---

## Common Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

### Filtering
- `search` - Search in name/email/code fields
- `status` - Filter by status
- `termId` - Filter by term ID
- `departmentId` - Filter by department ID
- `courseId` - Filter by course ID

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

## User Roles

| Role | Code |
|------|------|
| Student | `student` |
| Faculty | `faculty` |
| Department Head | `department_head` |
| College Admin | `college_admin` |
| Super Admin | `super_admin` |

---

## Attendance Status Values

| Value | Description |
|-------|-------------|
| `present` | Student was present |
| `absent` | Student was absent |
| `late` | Student was late |
| `excused` | Absence was excused |

---

## Enrollment Status Values

| Value | Description |
|-------|-------------|
| `enrolled` | Currently enrolled |
| `dropped` | Dropped the course |
| `completed` | Completed the course |
| `withdrawn` | Withdrew from course |
| `failed` | Failed the course |

---

## Grade Values

| Value | Description |
|-------|-------------|
| `A` | Excellent |
| `B` | Good |
| `C` | Satisfactory |
| `D` | Passing |
| `F` | Fail |
| `I` | Incomplete |
| `W` | Withdrawn |
| `P` | Pass |
| `NP` | No Pass |

---

## Session Types

| Value | Description |
|-------|-------------|
| `lecture` | Lecture session |
| `lab` | Laboratory session |
| `tutorial` | Tutorial session |
| `exam` | Examination session |
| `seminar` | Seminar session |

---

## Session Status Values

| Value | Description |
|-------|-------------|
| `scheduled` | Scheduled but not started |
| `in_progress` | Currently in progress |
| `completed` | Completed |
| `cancelled` | Cancelled |

---

## Term Status Values

| Value | Description |
|-------|-------------|
| `upcoming` | Not yet started |
| `active` | Currently active |
| `completed` | Ended |
| `cancelled` | Cancelled |

---

## Offering Status Values

| Value | Description |
|-------|-------------|
| `draft` | Draft - not published |
| `active` | Active and accepting enrollments |
| `closed` | Closed to new enrollments |
| `cancelled` | Cancelled |

---

## Request Headers

```
Authorization: Bearer <access-token>
Content-Type: application/json
Accept: application/json
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Error detail"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [ ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

## Quick Examples

### Login Request
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Get Students (with token)
```bash
curl -X GET http://localhost:3000/api/students \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Mark Attendance
```bash
curl -X POST http://localhost:3000/api/attendance \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student_uuid",
    "sessionId": "session_uuid",
    "status": "present"
  }'
```

---

## Health Check

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "success": true,
  "message": "ERP API is running",
  "timestamp": "2024-09-02T10:00:00.000Z"
}
```

---

For detailed API documentation with request/response examples, see [API.md](./API.md)
