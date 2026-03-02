# ERP Mini Project - API Documentation

This folder contains comprehensive API documentation for the ERP Mini Project.

## Documentation Files

### 📘 API.md
**Comprehensive API Documentation**

Complete API reference with detailed documentation for all endpoints including:
- Request/response examples
- Query parameters
- Authentication requirements
- Error responses
- Status codes
- Pagination details

**Best for:** Developers integrating with the API, understanding endpoint behavior

---

### 🚀 API_QUICK_REFERENCE.md
**Quick Reference Guide**

A condensed reference sheet containing:
- All endpoints at a glance
- HTTP methods and paths
- Required permissions/roles
- Common query parameters
- Status code reference
- Enum values for various fields

**Best for:** Quick lookups, cheat sheet during development

---

### 📐 openapi.yaml
**OpenAPI 3.0 Specification**

Standard OpenAPI/Swagger specification that can be used with:
- Swagger UI - Generate interactive API documentation
- Postman - Import to create API collections
- Code generation tools - Generate client SDKs
- API gateways - Import for gateway configuration

**How to use:**
```bash
# With Swagger UI (Docker)
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/openapi.yaml \
  -v $(pwd):/usr/share/nginx/html \
  swaggerapi/swagger-ui
```

**Best for:** Interactive documentation, code generation, API testing tools

---

### 📬 postman-collection.json
**Postman Collection**

Ready-to-import Postman collection containing:
- All API endpoints organized by module
- Pre-configured environment variables
- Sample request bodies
- Auto-save access token on login
- Proper authentication headers

**How to use:**
1. Open Postman
2. Click "Import" 
3. Select `postman-collection.json`
4. Set up environment variables:
   - `baseUrl`: http://localhost:3000/api
   - `accessToken`: Auto-filled after login
5. Start with "Login" request (auto-saves token)

**Best for:** Manual API testing, exploring endpoints, debugging

---

## Quick Start

### 1. For Reading
Start with **API_QUICK_REFERENCE.md** for an overview, then dive into **API.md** for details.

### 2. For Interactive Testing
Import **postman-collection.json** into Postman for immediate testing.

### 3. For Code Generation
Use **openapi.yaml** with tools like:
- `openapi-generator-cli` - Generate client SDKs
- `swagger-codegen` - Generate server stubs
- `redoc-cli` - Generate static HTML docs
- `swagger-ui` - Interactive documentation

### 4. For API Integration
Refer to **API.md** for integration examples and detailed specifications.

---

## API Base URL

**Development:** `http://localhost:3000/api`

**Production:** `https://api.example.com/api`

---

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

### Getting a Token

**Register a new user:**
```bash
POST /api/auth/register
```

**Login:**
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Refresh token:**
```bash
POST /api/auth/refresh
{
  "refreshToken": "<your-refresh-token>"
}
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
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
      "message": "Specific error detail"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [ /* array of items */ ],
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

## User Roles

| Role | Description |
|------|-------------|
| `student` | Student user |
| `faculty` | Faculty member |
| `department_head` | Department head |
| `college_admin` | College administrator |
| `super_admin` | Super administrator |

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 500 | Server Error - Internal error |

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Headers:**
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1725273600
  ```

---

## API Modules

- **Authentication** - User registration, login, token management
- **Users** - User account management
- **Students** - Student records and information
- **Faculty** - Faculty management and assignments
- **Departments** - Academic department management
- **Courses** - Course catalog management
- **Terms** - Academic term/semester management
- **Offerings** - Course offering (section) management
- **Sessions** - Class session management
- **Enrollments** - Student enrollment management
- **Attendance** - Attendance tracking and reporting
- **Reports** - Analytics and reporting
- **Audit** - System audit logs

---

## Support

For API issues or questions:
- 📧 Email: support@example.com
- 📖 Documentation: See individual files above
- 🐛 Issues: https://github.com/example/erp-miniproject/issues

---

## Related Documentation

- **SRS.md** - Software Requirements Specification
- **../apps/api/README.md** - Backend API technical documentation
- **../README.md** - Project overview

---

## License

MIT
