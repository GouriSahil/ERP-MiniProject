# ERP System API Documentation

## Overview

The ERP Mini Project API is a RESTful API built with Express.js, TypeScript, and MongoDB. It provides endpoints for managing students, faculty, courses, enrollments, attendance, and more.

**Base URL:** `http://localhost:3000/api`

**API Version:** 1.0.0

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Students](#students)
- [Faculty](#faculty)
- [Departments](#departments)
- [Courses](#courses)
- [Terms](#terms)
- [Course Offerings](#course-offerings)
- [Sessions](#sessions)
- [Enrollments](#enrollments)
- [Attendance](#attendance)
- [Reports](#reports)
- [Audit Logs](#audit-logs)
- [Error Responses](#error-responses)
- [Status Codes](#status-codes)
- [Pagination](#pagination)

---

## Authentication

### Overview

Most endpoints require authentication using JWT (JSON Web Tokens). Include the access token in the `Authorization` header:

```
Authorization: Bearer <your-access-token>
```

### Register

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Authentication:** None (Public)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

**Roles:** `student`, `faculty`, `department_head`, `college_admin`, `super_admin`

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "isActive": true,
      "createdAt": "2026-03-02T09:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 604800
    }
  }
}
```

### Login

Authenticate with email and password.

**Endpoint:** `POST /api/auth/login`

**Authentication:** None (Public)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 604800
    }
  }
}
```

### Refresh Token

Obtain a new access token using a refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Authentication:** None (Public)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 604800
    }
  }
}
```

### Get Current User

Get the authenticated user's profile.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "isActive": true,
      "createdAt": "2026-03-02T09:00:00.000Z"
    }
  }
}
```

### Update Password

Update the authenticated user's password.

**Endpoint:** `POST /api/auth/update-password`

**Authentication:** Required

**Request Body:**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### Logout

Invalidate the refresh token.

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Users

Manage user accounts in the system.

### List Users

Get a paginated list of users.

**Endpoint:** `GET /api/users`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| role | string | No | Filter by role |
| search | string | No | Search in name/email |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "student",
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### Get User by ID

Get details of a specific user.

**Endpoint:** `GET /api/users/:id`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "isActive": true,
      "createdAt": "2026-03-02T09:00:00.000Z"
    }
  }
}
```

### Create User

Create a new user account.

**Endpoint:** `POST /api/users`

**Authentication:** Required (Admin only)

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "faculty"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "faculty",
      "isActive": true
    }
  }
}
```

### Update User

Update user details.

**Endpoint:** `PUT /api/users/:id`

**Authentication:** Required

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Johnson",
  "email": "jane.johnson@example.com"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": { }
  }
}
```

### Delete User

Delete a user account.

**Endpoint:** `DELETE /api/users/:id`

**Authentication:** Required (Admin only)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Deactivate User

Deactivate a user account.

**Endpoint:** `PATCH /api/users/:id/deactivate`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

### Reactivate User

Reactivate a deactivated user account.

**Endpoint:** `PATCH /api/users/:id/reactivate`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "message": "User reactivated successfully"
}
```

### Reset User Password

Reset a user's password (admin action).

**Endpoint:** `POST /api/users/:id/reset-password`

**Authentication:** Required (Admin only)

**Request Body:**

```json
{
  "newPassword": "TempPassword123!"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Students

Manage student records and information.

### List Students

Get a paginated list of students.

**Endpoint:** `GET /api/students`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| departmentId | string | No | Filter by department |
| search | string | No | Search in name/email/studentId |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "507f1f77bcf86cd799439011",
        "studentId": "STU2024001",
        "userId": "507f1f77bcf86cd799439020",
        "departmentId": "507f1f77bcf86cd799439030",
        "enrollmentDate": "2024-09-01",
        "status": "active",
        "user": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com"
        },
        "department": {
          "name": "Computer Science"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### Get Student by ID

Get details of a specific student.

**Endpoint:** `GET /api/students/:id`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "student": {
      "id": "507f1f77bcf86cd799439011",
      "studentId": "STU2024001",
      "enrollmentDate": "2024-09-01",
      "status": "active",
      "user": { },
      "department": { }
    }
  }
}
```

### Get Student Enrollments

Get enrollment history for a student.

**Endpoint:** `GET /api/students/:id/enrollments`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "id": "507f1f77bcf86cd799439040",
        "courseOffering": {
          "course": { "name": "Introduction to Programming", "code": "CS101" },
          "term": { "name": "Fall 2024" }
        },
        "status": "enrolled",
        "enrollmentDate": "2024-09-01"
      }
    ]
  }
}
```

### Get Student Attendance

Get attendance summary for a student.

**Endpoint:** `GET /api/students/:id/attendance`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |
| offeringId | string | No | Filter by course offering |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSessions": 30,
      "present": 25,
      "absent": 3,
      "late": 2,
      "excused": 0,
      "attendancePercentage": 83.33
    },
    "records": [ ]
  }
}
```

### Create Student

Create a new student record.

**Endpoint:** `POST /api/students`

**Authentication:** Required (College Admin, Department Head)

**Request Body:**

```json
{
  "studentId": "STU2024002",
  "userId": "507f1f77bcf86cd799439020",
  "departmentId": "507f1f77bcf86cd799439030",
  "enrollmentDate": "2024-09-01"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "student": { }
  }
}
```

### Update Student

Update student information.

**Endpoint:** `PUT /api/students/:id`

**Authentication:** Required (College Admin, Department Head)

**Request Body:**

```json
{
  "departmentId": "507f1f77bcf86cd799439031",
  "status": "active"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "student": { }
  }
}
```

### Delete Student

Delete a student record.

**Endpoint:** `DELETE /api/students/:id`

**Authentication:** Required (College Admin only)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

### Bulk Import Students

Import multiple students at once.

**Endpoint:** `POST /api/students/bulk-import`

**Authentication:** Required (College Admin, Department Head)

**Request Body:**

```json
{
  "students": [
    {
      "studentId": "STU2024003",
      "userId": "507f1f77bcf86cd799439021",
      "departmentId": "507f1f77bcf86cd799439030",
      "enrollmentDate": "2024-09-01"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Bulk import completed",
  "data": {
    "imported": 10,
    "failed": 0,
    "errors": []
  }
}
```

---

## Faculty

Manage faculty records and assignments.

### List Faculty

Get a paginated list of faculty members.

**Endpoint:** `GET /api/faculty`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| departmentId | string | No | Filter by department |
| search | string | No | Search in name/email |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "faculty": [
      {
        "id": "507f1f77bcf86cd799439050",
        "employeeId": "FAC2024001",
        "userId": "507f1f77bcf86cd799439060",
        "departmentId": "507f1f77bcf86cd799439030",
        "designation": "Professor",
        "joinDate": "2020-08-01",
        "status": "active",
        "user": {
          "firstName": "Dr. Sarah",
          "lastName": "Johnson",
          "email": "sarah.johnson@example.com"
        },
        "department": {
          "name": "Computer Science"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### Get Faculty by ID

Get details of a specific faculty member.

**Endpoint:** `GET /api/faculty/:id`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "faculty": {
      "id": "507f1f77bcf86cd799439050",
      "employeeId": "FAC2024001",
      "designation": "Professor",
      "joinDate": "2020-08-01",
      "status": "active",
      "user": { },
      "department": { }
    }
  }
}
```

### Get Faculty Offerings

Get course offerings assigned to a faculty member.

**Endpoint:** `GET /api/faculty/:id/offerings`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |
| status | string | No | Filter by status |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "offerings": [
      {
        "id": "507f1f77bcf86cd799439070",
        "course": {
          "name": "Data Structures",
          "code": "CS201"
        },
        "term": {
          "name": "Fall 2024"
        },
        "schedule": {
          "days": ["Monday", "Wednesday"],
          "startTime": "10:00",
          "endTime": "11:30"
        }
      }
    ]
  }
}
```

### Get Faculty Teaching Load

Get teaching load statistics for a faculty member.

**Endpoint:** `GET /api/faculty/:id/teaching-load`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "teachingLoad": {
      "totalOfferings": 3,
      "totalCredits": 9,
      "totalStudents": 120,
      "totalHoursPerWeek": 9,
      "offerings": [ ]
    }
  }
}
```

### Create Faculty

Create a new faculty record.

**Endpoint:** `POST /api/faculty`

**Authentication:** Required (College Admin, Department Head)

**Request Body:**

```json
{
  "employeeId": "FAC2024002",
  "userId": "507f1f77bcf86cd799439061",
  "departmentId": "507f1f77bcf86cd799439030",
  "designation": "Associate Professor",
  "joinDate": "2024-01-15"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Faculty created successfully",
  "data": {
    "faculty": { }
  }
}
```

### Update Faculty

Update faculty information.

**Endpoint:** `PUT /api/faculty/:id`

**Authentication:** Required (College Admin, Department Head)

**Request Body:**

```json
{
  "designation": "Professor",
  "status": "active"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Faculty updated successfully",
  "data": {
    "faculty": { }
  }
}
```

### Delete Faculty

Delete a faculty record.

**Endpoint:** `DELETE /api/faculty/:id`

**Authentication:** Required (College Admin only)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Faculty deleted successfully"
}
```

---

## Departments

Manage academic departments.

### List Departments

Get a list of all departments.

**Endpoint:** `GET /api/departments`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| search | string | No | Search in name/code |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "507f1f77bcf86cd799439030",
        "name": "Computer Science",
        "code": "CS",
        "description": "Department of Computer Science and Engineering",
        "headId": "507f1f77bcf86cd799439050",
        "establishedDate": "1995-08-15",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

### Get Department by ID

Get details of a specific department.

**Endpoint:** `GET /api/departments/:id`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "department": {
      "id": "507f1f77bcf86cd799439030",
      "name": "Computer Science",
      "code": "CS",
      "description": "Department of Computer Science and Engineering",
      "headId": "507f1f77bcf86cd799439050",
      "establishedDate": "1995-08-15",
      "status": "active",
      "head": {
        "user": {
          "firstName": "Dr. Sarah",
          "lastName": "Johnson"
        }
      }
    }
  }
}
```

### Get Department Faculty

Get all faculty members in a department.

**Endpoint:** `GET /api/departments/:id/faculty`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "faculty": [
      {
        "id": "507f1f77bcf86cd799439050",
        "employeeId": "FAC2024001",
        "designation": "Professor",
        "user": {
          "firstName": "Dr. Sarah",
          "lastName": "Johnson"
        }
      }
    ]
  }
}
```

### Get Department Courses

Get all courses offered by a department.

**Endpoint:** `GET /api/departments/:id/courses`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "507f1f77bcf86cd799439080",
        "name": "Introduction to Programming",
        "code": "CS101",
        "credits": 3
      }
    ]
  }
}
```

### Create Department

Create a new department.

**Endpoint:** `POST /api/departments`

**Authentication:** Required (College Admin only)

**Request Body:**

```json
{
  "name": "Electrical Engineering",
  "code": "EE",
  "description": "Department of Electrical Engineering",
  "headId": "507f1f77bcf86cd799439051",
  "establishedDate": "1990-01-01"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "department": { }
  }
}
```

### Update Department

Update department information.

**Endpoint:** `PUT /api/departments/:id`

**Authentication:** Required (College Admin only)

**Request Body:**

```json
{
  "name": "Computer Science and Engineering",
  "description": "Updated description",
  "headId": "507f1f77bcf86cd799439052"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Department updated successfully",
  "data": {
    "department": { }
  }
}
```

### Delete Department

Delete a department.

**Endpoint:** `DELETE /api/departments/:id`

**Authentication:** Required (College Admin only)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Department deleted successfully"
}
```

---

## Courses

Manage course catalog.

### List Courses

Get a paginated list of courses.

**Endpoint:** `GET /api/courses`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| departmentId | string | No | Filter by department |
| search | string | No | Search in name/code/description |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "507f1f77bcf86cd799439080",
        "name": "Introduction to Programming",
        "code": "CS101",
        "description": "Fundamentals of programming",
        "credits": 3,
        "departmentId": "507f1f77bcf86cd799439030",
        "prerequisites": [],
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### Get Course by ID

Get details of a specific course.

**Endpoint:** `GET /api/courses/:id`

**Authentication:** Required

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "course": {
      "id": "507f1f77bcf86cd799439080",
      "name": "Introduction to Programming",
      "code": "CS101",
      "description": "Fundamentals of programming",
      "credits": 3,
      "department": {
        "name": "Computer Science",
        "code": "CS"
      },
      "prerequisites": []
    }
  }
}
```

### Get Course Offerings

Get all offerings for a specific course.

**Endpoint:** `GET /api/courses/:id/offerings`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "offerings": [
      {
        "id": "507f1f77bcf86cd799439070",
        "section": "A",
        "term": {
          "name": "Fall 2024"
        },
        "faculty": [
          {
            "user": {
              "firstName": "Dr. Sarah",
              "lastName": "Johnson"
            }
          }
        ],
        "schedule": {
          "days": ["Monday", "Wednesday"],
          "startTime": "10:00",
          "endTime": "11:30"
        },
        "enrollmentCount": 30,
        "maxCapacity": 40
      }
    ]
  }
}
```

### Create Course

Create a new course.

**Endpoint:** `POST /api/courses`

**Authentication:** Required (College Admin, Department Head)

**Request Body:**

```json
{
  "name": "Data Structures",
  "code": "CS201",
  "description": "Advanced data structures and algorithms",
  "credits": 4,
  "departmentId": "507f1f77bcf86cd799439030",
  "prerequisites": ["507f1f77bcf86cd799439080"]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "course": { }
  }
}
```

### Update Course

Update course information.

**Endpoint:** `PUT /api/courses/:id`

**Authentication:** Required (College Admin, Department Head)

**Request Body:**

```json
{
  "name": "Data Structures and Algorithms",
  "credits": 4,
  "description": "Updated description"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "course": { }
  }
}
```

### Delete Course

Delete a course.

**Endpoint:** `DELETE /api/courses/:id`

**Authentication:** Required (College Admin, Department Head)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

---

## Terms

Manage academic terms/semesters.

### List Terms

Get a paginated list of terms.

**Endpoint:** `GET /api/terms`

**Authentication:** Required (Permission: terms.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| status | string | No | Filter by status |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "terms": [
      {
        "id": "507f1f77bcf86cd799439090",
        "name": "Fall 2024",
        "code": "FALL2024",
        "startDate": "2024-09-01",
        "endDate": "2024-12-31",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### Get Term by ID

Get details of a specific term.

**Endpoint:** `GET /api/terms/:id`

**Authentication:** Required (Permission: terms.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "term": {
      "id": "507f1f77bcf86cd799439090",
      "name": "Fall 2024",
      "code": "FALL2024",
      "startDate": "2024-09-01",
      "endDate": "2024-12-31",
      "status": "active"
    }
  }
}
```

### Get Active Term

Get the currently active term.

**Endpoint:** `GET /api/terms/active/current`

**Authentication:** Required (Permission: terms.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "term": {
      "id": "507f1f77bcf86cd799439090",
      "name": "Fall 2024",
      "code": "FALL2024",
      "startDate": "2024-09-01",
      "endDate": "2024-12-31",
      "status": "active"
    }
  }
}
```

### Get Term Statistics

Get statistics for a specific term.

**Endpoint:** `GET /api/terms/:id/statistics`

**Authentication:** Required (Permission: terms.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalOfferings": 50,
      "totalEnrollments": 1500,
      "totalSessions": 500,
      "activeStudents": 800
    }
  }
}
```

### Create Term

Create a new term.

**Endpoint:** `POST /api/terms`

**Authentication:** Required (Permission: terms.create)

**Request Body:**

```json
{
  "name": "Spring 2025",
  "code": "SPRING2025",
  "startDate": "2025-01-15",
  "endDate": "2025-05-15"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Term created successfully",
  "data": {
    "term": { }
  }
}
```

### Update Term

Update term information.

**Endpoint:** `PUT /api/terms/:id`

**Authentication:** Required (Permission: terms.update)

**Request Body:**

```json
{
  "name": "Spring 2025 (Updated)",
  "startDate": "2025-01-20",
  "endDate": "2025-05-20"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Term updated successfully",
  "data": {
    "term": { }
  }
}
```

### Update Term Status

Update the status of a term.

**Endpoint:** `PATCH /api/terms/:id/status`

**Authentication:** Required (Permission: terms.update)

**Request Body:**

```json
{
  "status": "active"
}
```

**Status values:** `upcoming`, `active`, `completed`, `cancelled`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Term status updated successfully",
  "data": {
    "term": { }
  }
}
```

### Delete Term

Delete a term.

**Endpoint:** `DELETE /api/terms/:id`

**Authentication:** Required (Permission: terms.delete)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Term deleted successfully"
}
```

---

## Course Offerings

Manage course offerings (sections of courses taught in specific terms).

### List Offerings

Get a paginated list of course offerings.

**Endpoint:** `GET /api/offerings`

**Authentication:** Required (Permission: offerings.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| termId | string | No | Filter by term |
| courseId | string | No | Filter by course |
| status | string | No | Filter by status |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "offerings": [
      {
        "id": "507f1f77bcf86cd799439070",
        "section": "A",
        "courseId": "507f1f77bcf86cd799439080",
        "termId": "507f1f77bcf86cd799439090",
        "maxCapacity": 40,
        "currentEnrollment": 30,
        "status": "active",
        "schedule": {
          "days": ["Monday", "Wednesday"],
          "startTime": "10:00",
          "endTime": "11:30",
          "room": "Room 101"
        },
        "course": {
          "name": "Introduction to Programming",
          "code": "CS101",
          "credits": 3
        },
        "term": {
          "name": "Fall 2024"
        },
        "faculty": [
          {
            "user": {
              "firstName": "Dr. Sarah",
              "lastName": "Johnson"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### Get Offering by ID

Get details of a specific offering.

**Endpoint:** `GET /api/offerings/:id`

**Authentication:** Required (Permission: offerings.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "offering": {
      "id": "507f1f77bcf86cd799439070",
      "section": "A",
      "maxCapacity": 40,
      "currentEnrollment": 30,
      "status": "active",
      "schedule": { },
      "course": { },
      "term": { },
      "faculty": [ ]
    }
  }
}
```

### Get Offerings by Term

Get all offerings for a specific term.

**Endpoint:** `GET /api/offerings/term/:termId`

**Authentication:** Required (Permission: offerings.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "offerings": [ ]
  }
}
```

### Get Offerings by Course

Get all offerings for a specific course.

**Endpoint:** `GET /api/offerings/course/:courseId`

**Authentication:** Required (Permission: offerings.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "offerings": [ ]
  }
}
```

### Create Offering

Create a new course offering.

**Endpoint:** `POST /api/offerings`

**Authentication:** Required (Permission: offerings.create)

**Request Body:**

```json
{
  "courseId": "507f1f77bcf86cd799439080",
  "termId": "507f1f77bcf86cd799439090",
  "section": "B",
  "maxCapacity": 35,
  "schedule": {
    "days": ["Tuesday", "Thursday"],
    "startTime": "14:00",
    "endTime": "15:30",
    "room": "Room 205"
  },
  "facultyIds": ["507f1f77bcf86cd799439050"]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Course offering created successfully",
  "data": {
    "offering": { }
  }
}
```

### Update Offering

Update offering information.

**Endpoint:** `PUT /api/offerings/:id`

**Authentication:** Required (Permission: offerings.update)

**Request Body:**

```json
{
  "maxCapacity": 45,
  "schedule": {
    "days": ["Monday", "Wednesday", "Friday"],
    "startTime": "09:00",
    "endTime": "10:00",
    "room": "Room 301"
  },
  "facultyIds": ["507f1f77bcf86cd799439050", "507f1f77bcf86cd799439051"]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Course offering updated successfully",
  "data": {
    "offering": { }
  }
}
```

### Update Offering Schedule

Update only the schedule of an offering.

**Endpoint:** `PATCH /api/offerings/:id/schedule`

**Authentication:** Required (Permission: offerings.update)

**Request Body:**

```json
{
  "days": ["Tuesday", "Thursday"],
  "startTime": "13:00",
  "endTime": "14:30",
  "room": "Room 102"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Schedule updated successfully",
  "data": {
    "offering": { }
  }
}
```

### Delete Offering

Delete a course offering.

**Endpoint:** `DELETE /api/offerings/:id`

**Authentication:** Required (Permission: offerings.delete)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Course offering deleted successfully"
}
```

---

## Sessions

Manage class sessions within course offerings.

### List Sessions

Get a paginated list of sessions.

**Endpoint:** `GET /api/sessions`

**Authentication:** Required (Permission: sessions.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| offeringId | string | No | Filter by offering |
| termId | string | No | Filter by term |
| status | string | No | Filter by status |
| date | string | No | Filter by date (YYYY-MM-DD) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "507f1f77bcf86cd799439100",
        "offeringId": "507f1f77bcf86cd799439070",
        "date": "2024-09-02",
        "startTime": "10:00",
        "endTime": "11:30",
        "sessionType": "lecture",
        "status": "scheduled",
        "topics": ["Introduction to Algorithms"],
        "offering": {
          "course": {
            "name": "Data Structures",
            "code": "CS201"
          },
          "section": "A"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### Get Session by ID

Get details of a specific session.

**Endpoint:** `GET /api/sessions/:id`

**Authentication:** Required (Permission: sessions.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "507f1f77bcf86cd799439100",
      "date": "2024-09-02",
      "startTime": "10:00",
      "endTime": "11:30",
      "sessionType": "lecture",
      "status": "completed",
      "topics": ["Introduction to Algorithms"],
      "notes": "Covered Big O notation",
      "offering": { }
    }
  }
}
```

### Get Sessions by Offering

Get all sessions for a specific offering.

**Endpoint:** `GET /api/sessions/offering/:offeringId`

**Authentication:** Required (Permission: sessions.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status |
| startDate | string | No | Filter from date |
| endDate | string | No | Filter to date |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessions": [ ]
  }
}
```

### Get Sessions by Term

Get all sessions for a specific term.

**Endpoint:** `GET /api/sessions/term/:termId`

**Authentication:** Required (Permission: sessions.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessions": [ ]
  }
}
```

### Create Session

Create a new session.

**Endpoint:** `POST /api/sessions`

**Authentication:** Required (Permission: sessions.create)

**Request Body:**

```json
{
  "offeringId": "507f1f77bcf86cd799439070",
  "date": "2024-09-03",
  "startTime": "10:00",
  "endTime": "11:30",
  "sessionType": "lecture",
  "topics": ["Sorting Algorithms"],
  "notes": "Cover bubble sort, merge sort"
}
```

**Session types:** `lecture`, `lab`, `tutorial`, `exam`, `seminar`

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": { }
  }
}
```

### Update Session

Update session information.

**Endpoint:** `PUT /api/sessions/:id`

**Authentication:** Required (Permission: sessions.update)

**Request Body:**

```json
{
  "date": "2024-09-04",
  "startTime": "11:00",
  "endTime": "12:30",
  "topics": ["Sorting Algorithms", "Binary Search"],
  "notes": "Updated topics"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session": { }
  }
}
```

### Update Session Status

Update the status of a session.

**Endpoint:** `PATCH /api/sessions/:id/status`

**Authentication:** Required (Permission: sessions.update)

**Request Body:**

```json
{
  "status": "completed"
}
```

**Status values:** `scheduled`, `in_progress`, `completed`, `cancelled`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Session status updated successfully",
  "data": {
    "session": { }
  }
}
```

### Delete Session

Delete a session.

**Endpoint:** `DELETE /api/sessions/:id`

**Authentication:** Required (Permission: sessions.delete)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

### Bulk Create Sessions

Create multiple sessions at once.

**Endpoint:** `POST /api/sessions/bulk`

**Authentication:** Required (Permission: sessions.create)

**Request Body:**

```json
{
  "offeringId": "507f1f77bcf86cd799439070",
  "sessions": [
    {
      "date": "2024-09-05",
      "startTime": "10:00",
      "endTime": "11:30",
      "sessionType": "lecture",
      "topics": ["Linked Lists"]
    },
    {
      "date": "2024-09-06",
      "startTime": "10:00",
      "endTime": "11:30",
      "sessionType": "lab",
      "topics": ["Linked List Implementation"]
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Sessions created successfully",
  "data": {
    "created": 2,
    "sessions": [ ]
  }
}
```

---

## Enrollments

Manage student enrollments in course offerings.

### List Enrollments

Get a paginated list of enrollments.

**Endpoint:** `GET /api/enrollments`

**Authentication:** Required (Permission: enrollments.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| studentId | string | No | Filter by student |
| offeringId | string | No | Filter by offering |
| termId | string | No | Filter by term |
| status | string | No | Filter by status |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "id": "507f1f77bcf86cd799439110",
        "studentId": "507f1f77bcf86cd799439011",
        "offeringId": "507f1f77bcf86cd799439070",
        "status": "enrolled",
        "enrollmentDate": "2024-09-01",
        "student": {
          "studentId": "STU2024001",
          "user": {
            "firstName": "John",
            "lastName": "Doe"
          }
        },
        "offering": {
          "course": {
            "name": "Data Structures",
            "code": "CS201"
          },
          "section": "A",
          "term": {
            "name": "Fall 2024"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 500,
      "totalPages": 50
    }
  }
}
```

### Get Enrollment by ID

Get details of a specific enrollment.

**Endpoint:** `GET /api/enrollments/:id`

**Authentication:** Required (Permission: enrollments.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": "507f1f77bcf86cd799439110",
      "status": "enrolled",
      "enrollmentDate": "2024-09-01",
      "grade": null,
      "student": { },
      "offering": { }
    }
  }
}
```

### Get Enrollments by Student

Get all enrollments for a specific student.

**Endpoint:** `GET /api/enrollments/student/:studentId`

**Authentication:** Required (Permission: enrollments.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |
| status | string | No | Filter by status |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "enrollments": [ ]
  }
}
```

### Get Enrollments by Offering

Get all enrollments for a specific offering.

**Endpoint:** `GET /api/enrollments/offering/:offeringId`

**Authentication:** Required (Permission: enrollments.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "enrollments": [ ]
  }
}
```

### Create Enrollment

Enroll a student in a course offering.

**Endpoint:** `POST /api/enrollments`

**Authentication:** Required (Permission: enrollments.create)

**Request Body:**

```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "offeringId": "507f1f77bcf86cd799439070"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Enrollment created successfully",
  "data": {
    "enrollment": {
      "id": "507f1f77bcf86cd799439110",
      "status": "enrolled",
      "enrollmentDate": "2024-09-02"
    }
  }
}
```

### Update Enrollment

Update enrollment information.

**Endpoint:** `PUT /api/enrollments/:id`

**Authentication:** Required (Permission: enrollments.update)

**Request Body:**

```json
{
  "status": "completed",
  "grade": "A"
}
```

**Status values:** `enrolled`, `dropped`, `completed`, `withdrawn`, `failed`

**Grade values:** `A`, `B`, `C`, `D`, `F`, `I`, `W`, `P`, `NP`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Enrollment updated successfully",
  "data": {
    "enrollment": { }
  }
}
```

### Drop Enrollment

Drop a student from a course offering.

**Endpoint:** `PATCH /api/enrollments/:id/drop`

**Authentication:** Required (Permission: enrollments.update)

**Request Body:**

```json
{
  "reason": "Medical reasons",
  "dropDate": "2024-09-15"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Enrollment dropped successfully",
  "data": {
    "enrollment": {
      "status": "dropped"
    }
  }
}
```

### Delete Enrollment

Delete an enrollment record.

**Endpoint:** `DELETE /api/enrollments/:id`

**Authentication:** Required (Permission: enrollments.delete)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Enrollment deleted successfully"
}
```

### Bulk Enroll Students

Enroll multiple students in a course offering.

**Endpoint:** `POST /api/enrollments/bulk`

**Authentication:** Required (Permission: enrollments.create)

**Request Body:**

```json
{
  "offeringId": "507f1f77bcf86cd799439070",
  "studentIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Bulk enrollment completed",
  "data": {
    "enrolled": 3,
    "failed": 0,
    "errors": []
  }
}
```

---

## Attendance

Manage student attendance records.

### List Attendance Records

Get a paginated list of attendance records.

**Endpoint:** `GET /api/attendance`

**Authentication:** Required (Permission: attendance.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| studentId | string | No | Filter by student |
| sessionId | string | No | Filter by session |
| offeringId | string | No | Filter by offering |
| status | string | No | Filter by status |
| date | string | No | Filter by date (YYYY-MM-DD) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "507f1f77bcf86cd799439120",
        "studentId": "507f1f77bcf86cd799439011",
        "sessionId": "507f1f77bcf86cd799439100",
        "status": "present",
        "markedAt": "2024-09-02T12:00:00.000Z",
        "markedBy": "507f1f77bcf86cd799439060",
        "student": {
          "studentId": "STU2024001",
          "user": {
            "firstName": "John",
            "lastName": "Doe"
          }
        },
        "session": {
          "date": "2024-09-02",
          "offering": {
            "course": {
              "name": "Data Structures",
              "code": "CS201"
            }
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1000,
      "totalPages": 100
    }
  }
}
```

### Get Attendance Record by ID

Get details of a specific attendance record.

**Endpoint:** `GET /api/attendance/:id`

**Authentication:** Required (Permission: attendance.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "record": {
      "id": "507f1f77bcf86cd799439120",
      "status": "present",
      "markedAt": "2024-09-02T12:00:00.000Z",
      "remarks": "On time",
      "student": { },
      "session": { }
    }
  }
}
```

### Get Attendance by Session

Get all attendance records for a specific session.

**Endpoint:** `GET /api/attendance/session/:sessionId`

**Authentication:** Required (Permission: attendance.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "507f1f77bcf86cd799439120",
        "status": "present",
        "student": {
          "studentId": "STU2024001",
          "user": {
            "firstName": "John",
            "lastName": "Doe"
          }
        }
      }
    ]
  }
}
```

### Get Attendance by Student

Get all attendance records for a specific student.

**Endpoint:** `GET /api/attendance/student/:studentId`

**Authentication:** Required (Permission: attendance.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| offeringId | string | No | Filter by offering |
| termId | string | No | Filter by term |
| startDate | string | No | Filter from date |
| endDate | string | No | Filter to date |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "records": [ ]
  }
}
```

### Get Student Attendance Summary

Get attendance summary for a specific student.

**Endpoint:** `GET /api/attendance/student/:studentId/summary`

**Authentication:** Required (Permission: attendance.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| offeringId | string | No | Filter by offering |
| termId | string | No | Filter by term |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "studentId": "507f1f77bcf86cd799439011",
      "totalSessions": 30,
      "present": 25,
      "absent": 3,
      "late": 2,
      "excused": 0,
      "attendancePercentage": 83.33,
      "byOffering": [
        {
          "offeringId": "507f1f77bcf86cd799439070",
          "courseName": "Data Structures",
          "attendancePercentage": 85.5
        }
      ]
    }
  }
}
```

### Get Session Attendance Summary

Get attendance summary for a specific session.

**Endpoint:** `GET /api/attendance/session/:sessionId/summary`

**Authentication:** Required (Permission: attendance.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "sessionId": "507f1f77bcf86cd799439100",
      "totalEnrolled": 30,
      "present": 27,
      "absent": 2,
      "late": 1,
      "excused": 0,
      "notMarked": 0,
      "attendanceRate": 90
    }
  }
}
```

### Create Attendance Record

Mark attendance for a student in a session.

**Endpoint:** `POST /api/attendance`

**Authentication:** Required (Permission: attendance.mark)

**Request Body:**

```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "sessionId": "507f1f77bcf86cd799439100",
  "status": "present",
  "remarks": "On time"
}
```

**Status values:** `present`, `absent`, `late`, `excused`

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "record": {
      "id": "507f1f77bcf86cd799439120",
      "status": "present"
    }
  }
}
```

### Mark Session Attendance (Bulk)

Mark attendance for all students in a session.

**Endpoint:** `POST /api/attendance/mark`

**Authentication:** Required (Permission: attendance.mark)

**Request Body:**

```json
{
  "sessionId": "507f1f77bcf86cd799439100",
  "attendance": [
    {
      "studentId": "507f1f77bcf86cd799439011",
      "status": "present"
    },
    {
      "studentId": "507f1f77bcf86cd799439012",
      "status": "absent",
      "remarks": "No show"
    },
    {
      "studentId": "507f1f77bcf86cd799439013",
      "status": "late",
      "remarks": "Arrived 15 minutes late"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "marked": 3,
    "failed": 0,
    "records": [ ]
  }
}
```

### Update Attendance Record

Update an existing attendance record.

**Endpoint:** `PUT /api/attendance/:id`

**Authentication:** Required (Permission: attendance.mark)

**Request Body:**

```json
{
  "status": "present",
  "remarks": "Updated status"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Attendance updated successfully",
  "data": {
    "record": { }
  }
}
```

### Delete Attendance Record

Delete an attendance record.

**Endpoint:** `DELETE /api/attendance/:id`

**Authentication:** Required (Permission: attendance.mark)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Attendance record deleted successfully"
}
```

---

## Reports

Generate various reports and analytics.

### Course Enrollment Report

Get enrollment statistics by course.

**Endpoint:** `GET /api/reports/course-enrollment`

**Authentication:** Required (Permission: reports.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |
| departmentId | string | No | Filter by department |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "report": [
      {
        "courseId": "507f1f77bcf86cd799439080",
        "courseName": "Data Structures",
        "courseCode": "CS201",
        "totalOfferings": 2,
        "totalEnrollments": 60,
        "averageEnrollmentPerOffering": 30,
        "departments": [
          { "name": "Computer Science", "enrollments": 45 },
          { "name": "Information Technology", "enrollments": 15 }
        ]
      }
    ]
  }
}
```

### Student Attendance Report

Get attendance statistics by student.

**Endpoint:** `GET /api/reports/student-attendance`

**Authentication:** Required (Permission: reports.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |
| offeringId | string | No | Filter by offering |
| departmentId | string | No | Filter by department |
| minAttendance | number | No | Filter by minimum attendance % |
| maxAttendance | number | No | Filter by maximum attendance % |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "report": [
      {
        "studentId": "507f1f77bcf86cd799439011",
        "studentName": "John Doe",
        "studentIdNumber": "STU2024001",
        "totalSessions": 30,
        "present": 27,
        "absent": 2,
        "late": 1,
        "attendancePercentage": 90
      }
    ]
  }
}
```

### Faculty Workload Report

Get teaching load statistics by faculty.

**Endpoint:** `GET /api/reports/faculty-workload`

**Authentication:** Required (Permission: reports.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |
| departmentId | string | No | Filter by department |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "report": [
      {
        "facultyId": "507f1f77bcf86cd799439050",
        "facultyName": "Dr. Sarah Johnson",
        "employeeId": "FAC2024001",
        "totalOfferings": 3,
        "totalCredits": 9,
        "totalStudents": 90,
        "totalHoursPerWeek": 9,
        "offerings": [
          {
            "courseName": "Data Structures",
            "section": "A",
            "credits": 3,
            "students": 30
          }
        ]
      }
    ]
  }
}
```

### Enrollment Status Report

Get enrollment status statistics.

**Endpoint:** `GET /api/reports/enrollment-status`

**Authentication:** Required (Permission: reports.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |
| departmentId | string | No | Filter by department |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalEnrollments": 1500,
      "byStatus": {
        "enrolled": 1200,
        "dropped": 100,
        "completed": 150,
        "withdrawn": 30,
        "failed": 20
      },
      "byDepartment": [
        {
          "name": "Computer Science",
          "total": 500,
          "byStatus": { }
        }
      ]
    }
  }
}
```

### Department Summary Report

Get overall department statistics.

**Endpoint:** `GET /api/reports/department/summary`

**Authentication:** Required (Permission: reports.view)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| termId | string | No | Filter by term |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "departmentId": "507f1f77bcf86cd799439030",
        "name": "Computer Science",
        "code": "CS",
        "totalFaculty": 15,
        "totalStudents": 300,
        "totalCourses": 25,
        "totalOfferings": 40,
        "totalEnrollments": 500
      }
    ]
  }
}
```

### Term Overview Report

Get comprehensive overview of a term.

**Endpoint:** `GET /api/reports/term/:termId/overview`

**Authentication:** Required (Permission: reports.view)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "term": {
      "id": "507f1f77bcf86cd799439090",
      "name": "Fall 2024",
      "summary": {
        "totalOfferings": 50,
        "totalEnrollments": 1500,
        "totalSessions": 500,
        "totalFaculty": 30,
        "totalStudents": 800,
        "averageAttendance": 87.5
      },
      "byDepartment": [ ],
      "byCourse": [ ]
    }
  }
}
```

---

## Audit Logs

View and manage system audit logs.

### List Audit Logs

Get a paginated list of audit logs.

**Endpoint:** `GET /api/audit`

**Authentication:** Required (Roles: super_admin, college_admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| action | string | No | Filter by action |
| targetType | string | No | Filter by target type |
| userId | string | No | Filter by user |
| startDate | string | No | Filter from date |
| endDate | string | No | Filter to date |
| status | string | No | Filter by status |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "507f1f77bcf86cd799439130",
        "action": "create",
        "targetType": "enrollment",
        "targetId": "507f1f77bcf86cd799439110",
        "userId": "507f1f77bcf86cd799439060",
        "status": "success",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "changes": {
          "before": null,
          "after": {
            "studentId": "507f1f77bcf86cd799439011",
            "offeringId": "507f1f77bcf86cd799439070"
          }
        },
        "createdAt": "2024-09-02T10:00:00.000Z",
        "user": {
          "firstName": "Admin",
          "lastName": "User",
          "email": "admin@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5000,
      "totalPages": 500
    }
  }
}
```

### Get Audit Log by ID

Get details of a specific audit log.

**Endpoint:** `GET /api/audit/:id`

**Authentication:** Required (Roles: super_admin, college_admin)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "log": {
      "id": "507f1f77bcf86cd799439130",
      "action": "update",
      "targetType": "student",
      "targetId": "507f1f77bcf86cd799439011",
      "status": "success",
      "changes": { },
      "createdAt": "2024-09-02T10:00:00.000Z",
      "user": { }
    }
  }
}
```

### Get Audit Logs by User

Get all audit logs for a specific user.

**Endpoint:** `GET /api/audit/user/:userId`

**Authentication:** Required (Roles: super_admin, college_admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| action | string | No | Filter by action |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "logs": [ ],
    "pagination": { }
  }
}
```

### Get Audit Logs by Target

Get all audit logs for a specific target entity.

**Endpoint:** `GET /api/audit/target/:targetType/:targetId`

**Authentication:** Required (Roles: super_admin, college_admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "logs": [ ],
    "pagination": { }
  }
}
```

### Get Audit Logs by Action

Get all audit logs for a specific action.

**Endpoint:** `GET /api/audit/action/:action`

**Authentication:** Required (Roles: super_admin, college_admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| targetType | string | No | Filter by target type |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "logs": [ ],
    "pagination": { }
  }
}
```

### Get Activity Summary

Get summary of system activity.

**Endpoint:** `GET /api/audit/summary/activity`

**Authentication:** Required (Roles: super_admin, college_admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date (default: 30 days ago) |
| endDate | string | No | End date (default: today) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalActions": 5000,
      "byAction": {
        "create": 1500,
        "update": 2000,
        "delete": 100,
        "view": 1400
      },
      "byTargetType": {
        "enrollment": 2000,
        "attendance": 1500,
        "student": 500,
        "faculty": 200
      },
      "byStatus": {
        "success": 4900,
        "failure": 100
      },
      "topUsers": [
        {
          "userId": "507f1f77bcf86cd799439060",
          "userName": "Admin User",
          "actionCount": 500
        }
      ]
    }
  }
}
```

### Get User Statistics

Get activity statistics for a specific user.

**Endpoint:** `GET /api/audit/user/:userId/stats`

**Authentication:** Required (Roles: super_admin, college_admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date |
| endDate | string | No | End date |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "userId": "507f1f77bcf86cd799439060",
      "userName": "Admin User",
      "totalActions": 500,
      "byAction": {
        "create": 150,
        "update": 250,
        "delete": 50,
        "view": 50
      },
      "byTargetType": {
        "enrollment": 200,
        "attendance": 150
      },
      "lastActivity": "2024-09-02T15:30:00.000Z"
    }
  }
}
```

### Export Audit Logs

Export audit logs to a file.

**Endpoint:** `GET /api/audit/export`

**Authentication:** Required (Roles: super_admin, college_admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | Export format (json, csv) - default: json |
| startDate | string | No | Filter from date |
| endDate | string | No | Filter to date |
| action | string | No | Filter by action |
| targetType | string | No | Filter by target type |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "downloadUrl": "/downloads/audit-logs-2024-09-02.json",
    "recordCount": 5000
  }
}
```

### Get Security Logs

Get security-related audit logs.

**Endpoint:** `GET /api/audit/security/logs`

**Authentication:** Required (Roles: super_admin, college_admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| startDate | string | No | Filter from date |
| endDate | string | No | Filter to date |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "507f1f77bcf86cd799439130",
        "action": "login",
        "targetType": "auth",
        "status": "success",
        "ipAddress": "192.168.1.100",
        "createdAt": "2024-09-02T10:00:00.000Z",
        "user": { }
      }
    ],
    "pagination": { }
  }
}
```

### Create Audit Log Entry

Manually create an audit log entry.

**Endpoint:** `POST /api/audit`

**Authentication:** Required (Roles: super_admin, college_admin)

**Request Body:**

```json
{
  "action": "custom_action",
  "targetType": "system",
  "targetId": "system_001",
  "status": "success",
  "details": {
    "message": "Manual system operation performed"
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Audit log created successfully",
  "data": {
    "log": { }
  }
}
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific validation error message"
    }
  ]
}
```

### Common Error Types

#### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters long"
    }
  ]
}
```

#### Unauthorized (401)

```json
{
  "success": false,
  "message": "Authentication required. Please provide a valid access token."
}
```

#### Forbidden (403)

```json
{
  "success": false,
  "message": "You do not have permission to perform this action."
}
```

#### Not Found (404)

```json
{
  "success": false,
  "message": "Resource not found."
}
```

#### Conflict (409)

```json
{
  "success": false,
  "message": "A resource with this information already exists."
}
```

#### Internal Server Error (500)

```json
{
  "success": false,
  "message": "An unexpected error occurred. Please try again later."
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server error |

---

## Pagination

List endpoints support pagination using the following query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number to retrieve |
| limit | number | 10 | Number of items per page (max: 100) |

**Response format:**

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
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

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default limit**: 100 requests per 15 minutes per IP
- **Rate limit headers** are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1725273600
```

When rate limit is exceeded:

```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Authentication & Authorization

### User Roles

| Role | Description |
|------|-------------|
| `student` | Student user |
| `faculty` | Faculty member |
| `department_head` | Department head |
| `college_admin` | College administrator |
| `super_admin` | Super administrator |

### Permission System

Some endpoints use a permission-based access control system. Permissions are granted to roles and checked per endpoint.

**Permission format:** `resource.action`

**Examples:**
- `offerings.view` - View course offerings
- `offerings.create` - Create course offerings
- `offerings.update` - Update course offerings
- `offerings.delete` - Delete course offerings
- `attendance.mark` - Mark attendance
- `enrollments.create` - Create enrollments

---

## Health Check

Check API health status.

**Endpoint:** `GET /api/health`

**Authentication:** None

**Response (200 OK):**

```json
{
  "success": true,
  "message": "ERP API is running",
  "timestamp": "2024-09-02T10:00:00.000Z"
}
```

---

## Postman Collection

A Postman collection with all API endpoints is available in the project:

```
/docs/postman/erp-api-collection.json
```

---

## Support

For issues or questions about the API, please contact:

- Email: support@example.com
- Documentation: https://docs.example.com
- GitHub Issues: https://github.com/example/erp-miniproject/issues
