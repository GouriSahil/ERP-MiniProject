# ERP Backend API

Node.js/Express backend API for the ERP Mini Project with MongoDB, Passport.js JWT authentication, and TypeScript.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with JWT strategy
- **Password Hashing**: bcryptjs (12 rounds)
- **Validation**: Joi
- **Language**: TypeScript

## Prerequisites

- Node.js >= 18.x or Bun >= 1.0.0
- MongoDB running locally or accessible via connection string

## Installation

```bash
# Install dependencies
bun install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
```

## Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/erp-miniproject
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:4200
```

## Running the Server

```bash
# Development mode with hot reload
bun run dev

# Build TypeScript
bun run build

# Production mode
bun run start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "employee" // optional: admin, manager, employee (default: employee)
}
```

**Response (201):**
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
      "role": "employee",
      "isActive": true,
      "createdAt": "2026-03-01T14:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 604800
    }
  }
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 604800
    }
  }
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
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

#### POST `/api/auth/logout`
Logout user (requires authentication). Invalidates refresh token.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET `/api/auth/me`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "employee",
      "isActive": true,
      "createdAt": "2026-03-01T14:30:00.000Z",
      "updatedAt": "2026-03-01T14:30:00.000Z"
    }
  }
}
```

#### POST `/api/auth/update-password`
Update user password (requires authentication).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### Other Routes

#### GET `/api/health`
Health check endpoint.

**Response (200):**
```json
{
  "success": true,
  "message": "ERP API is running",
  "timestamp": "2026-03-01T14:30:00.000Z"
}
```

#### GET `/`
API information endpoint.

## Authentication

All protected endpoints require a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

## Error Handling

The API returns errors in the following format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [ // Optional, for validation errors
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Project Structure

```
apps/api/
├── src/
│   ├── config/
│   │   ├── database.ts       # MongoDB connection
│   │   └── passport.ts       # Passport JWT strategy
│   ├── controllers/
│   │   └── auth.controller.ts # Auth logic handlers
│   ├── middleware/
│   │   ├── auth.ts            # Authentication middleware
│   │   └── error.ts           # Error handling
│   ├── models/
│   │   └── User.model.ts      # Mongoose User schema
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints
│   │   └── index.ts           # Route aggregator
│   ├── utils/
│   │   ├── auth.utils.ts      # JWT & password utilities
│   │   └── validation.utils.ts # Joi schemas
│   └── server.ts              # Express app setup
├── package.json
├── tsconfig.json
└── .env.example
```

## Security Features

- **Password Hashing**: bcryptjs with 12 salt rounds
- **JWT Authentication**: Access token (7 days) + Refresh token (30 days)
- **Helmet**: Security headers
- **CORS**: Configurable origin whitelist
- **Input Validation**: Joi schema validation
- **MongoDB Injection Protection**: Mongoose built-in sanitization

## License

MIT
