# AGENTS.md

## Project Overview

College ERP System built as a monorepo with Bun runtime, featuring:
- **Backend**: Node.js/Express with TypeScript, MongoDB with Mongoose ODM
- **Frontend**: AngularJS (v1.8.3) with Bootstrap 4
- **Runtime**: Bun (>=1.0.0) for enhanced performance
- **Shared**: TypeScript types and utilities across apps

**Status**: Backend 100% complete, Frontend 40% complete

## Tech Stack

### Backend (`apps/api`)
- **Runtime**: Bun / Node.js
- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.3 (strict mode)
- **Database**: MongoDB 8.0 with Mongoose 8.1
- **Authentication**: Passport.js with JWT (access + refresh tokens)
- **Validation**: express-validator 7.3, Joi 17.11
- **Security**: Helmet.js, bcryptjs, cors
- **API Docs**: Swagger UI (swagger-jsdoc, swagger-ui-express)
- **Testing**: Bun test framework with mongodb-memory-server

### Frontend (`apps/frontend`)
- **Framework**: AngularJS v1.8.3
- **Build**: http-server (dev), Vite 5 (production)
- **UI**: Bootstrap 4, Font Awesome 5, SweetAlert2
- **Testing**: Playwright 1.59

### Shared (`packages/shared`)
- TypeScript types and utilities shared between apps

## Setup Commands

```bash
# Install dependencies
bun install

# Start both API and frontend
bun run dev

# Start API only
bun run dev:api

# Start frontend only
bun run dev:frontend

# Build all packages
bun run build

# Run MongoDB via Docker
bun run docker:up
bun run docker:logs
bun run docker:down

# Lint all code
bun run lint

# Format code
bun run format

# Clean node_modules
bun run clean
```

## Project Structure

```
ERP-MiniProject/
├── apps/
│   ├── api/              # Express.js backend
│   │   ├── src/
│   │   │   ├── config/      # Database, auth, roles, swagger config
│   │   │   ├── controllers/ # 13 controllers (static classes)
│   │   │   ├── middleware/  # Auth, validation, error handling
│   │   │   ├── models/      # 14 Mongoose schemas
│   │   │   ├── routes/      # 13 Express router modules
│   │   │   ├── services/    # Business logic layer
│   │   │   ├── utils/       # Utility functions
│   │   │   └── server.ts    # App entry point
│   │   ├── tests/           # Unit, integration, E2E tests
│   │   └── package.json
│   └── frontend/        # AngularJS frontend
│       ├── src/app/
│       │   ├── controllers/  # Angular controllers
│       │   ├── services/     # Angular services
│       │   └── views/        # HTML templates
│       ├── tests/            # Playwright E2E tests
│       ├── public/
│       └── package.json
├── packages/
│   └── shared/           # Shared TypeScript types
└── docs/                 # SRS, specs, plans
```

## Code Style - Backend

### TypeScript Configuration
- **Strict mode enabled**
- **Target**: ES2022
- **Module**: CommonJS
- **Declaration maps** enabled for debugging
- **Source maps** enabled

### File Naming Conventions
- **Controllers**: `*.controller.ts` (e.g., `students.controller.ts`)
- **Routes**: `*.routes.ts` (e.g., `students.routes.ts`)
- **Models**: `*.ts` (PascalCase class names, e.g., `Student.ts`)
- **Middleware**: `*.middleware.ts` (e.g., `auth.middleware.ts`)
- **Utils**: `*.util.ts` (e.g., `response.util.ts`)
- **Tests**: `*.test.ts` or `*.integration.test.ts`

### Controller Pattern (Static Class Pattern)

All controllers use static methods with the following structure:

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse } from '../utils/response.util';
import { AppError } from '../utils/errors';

export class StudentsController {
  // List all items
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.query);
      
      // Your logic here
      
      return successResponse(res, data);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const item = await Model.findById(id).populate('refs');
      
      if (!item) {
        return notFoundResponse(res, 'Resource');
      }
      
      return successResponse(res, item);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new item
  static async create(req: AuthRequest, res: Response) {
    try {
      const data = req.body;
      const item = await Model.create(data);
      return createdResponse(res, item);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Update item
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const item = await Model.findByIdAndUpdate(id, req.body, { new: true });
      
      if (!item) {
        return notFoundResponse(res, 'Resource');
      }
      
      return successResponse(res, item);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete item
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const item = await Model.findByIdAndDelete(id);
      
      if (!item) {
        return notFoundResponse(res, 'Resource');
      }
      
      return successResponse(res, { message: 'Deleted successfully' });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
```

### Mongoose Model Pattern

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  rollNumber: string;
  departmentId: mongoose.Types.ObjectId;
  batch: string;
  semester: number;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Roll number cannot exceed 20 characters']
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    batch: {
      type: String,
      required: [true, 'Batch is required'],
      trim: true
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [10, 'Semester cannot exceed 10']
    }
  },
  {
    timestamps: true,
    collection: 'students'
  }
);

// Indexes for query performance
StudentSchema.index({ departmentId: 1 });
StudentSchema.index({ departmentId: 1, batch: 1 });
StudentSchema.index({ departmentId: 1, semester: 1 });

export const Student: Model<IStudent> = mongoose.model<IStudent>('Student', StudentSchema);
export type { IStudent };
```

### Route Pattern

```typescript
import { Router } from 'express';
import { StudentsController } from '../controllers/students.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateStudentCreate, validateStudentUpdate, validateUUIDParam } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public listing (all authenticated users)
router.get('/', StudentsController.list);

// Get specific item
router.get('/:id', validateUUIDParam(), StudentsController.getById);

// Create (admin, dept_head only)
router.post(
  '/',
  authorize('college_admin', 'department_head'),
  validateStudentCreate,
  StudentsController.create
);

// Update (admin, dept_head only)
router.put(
  '/:id',
  authorize('college_admin', 'department_head'),
  validateUUIDParam(),
  validateStudentUpdate,
  StudentsController.update
);

// Delete (admin only)
router.delete(
  '/:id',
  authorize('college_admin'),
  validateUUIDParam(),
  StudentsController.delete
);

export default router;
```

### Middleware Pattern

**Authentication Middleware**:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

**Validation Middleware** (using express-validator):
```typescript
import { body, param, validationResult } from 'express-validator';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

export const validateStudentCreate = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('departmentId').isUUID().withMessage('Valid department ID is required'),
  handleValidationErrors
];

export const validateUUIDParam = (paramName: string = 'id') => {
  return [
    param(paramName).isUUID().withMessage(`Valid ${paramName} is required`),
    handleValidationErrors
  ];
};
```

### Error Handling Pattern

```typescript
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    const value = (err as any).keyValue[field];
    error = new AppError(409, `${field} '${value}' already exists`);
  }

  // Mongoose CastError (invalid ID)
  if (err instanceof mongoose.Error.CastError) {
    error = new AppError(400, 'Invalid ID format');
  }

  const statusCode = (error as any).statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(statusCode === 500 && { stack: process.env.NODE_ENV === 'development' ? err.stack : undefined })
  });
};
```

### Response Utility Pattern

```typescript
export const successResponse = (res: Response, data: any, message?: string) => {
  return res.status(200).json({
    success: true,
    data,
    message
  });
};

export const createdResponse = (res: Response, data: any, message?: string) => {
  return res.status(201).json({
    success: true,
    data,
    message: message || 'Resource created successfully'
  });
};

export const notFoundResponse = (res: Response, resource: string = 'Resource') => {
  return res.status(404).json({
    success: false,
    error: `${resource} not found`
  });
};

export const errorResponse = (res: Response, message: string, statusCode: number = 400, details?: any) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    details
  });
};

export const conflictResponse = (res: Response, message: string) => {
  return res.status(409).json({
    success: false,
    error: message
  });
};
```

## Code Style - Frontend

### AngularJS Controller Pattern (IIFE)

```javascript
(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('AuthController', AuthController);

    AuthController.$inject = ['$scope', '$location', 'AuthService', 'APP_CONFIG'];

    function AuthController($scope, $location, AuthService, APP_CONFIG) {
        var vm = this;

        // View model properties
        vm.loginData = {
            email: '',
            password: ''
        };

        vm.loginError = null;
        vm.isLoading = false;

        // Public methods
        vm.login = login;
        vm.register = register;

        function login() {
            vm.isLoading = true;
            vm.loginError = null;

            AuthService.login(vm.loginData)
                .then(function(response) {
                    vm.isLoading = false;
                    $location.path('/dashboard');
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.loginError = error.data?.message || 'Login failed';
                });
        }

        function register() {
            // Registration logic
        }
    }
})();
```

### AngularJS Service Pattern (IIFE)

```javascript
(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('UserService', UserService);

    UserService.$inject = ['$http', '$q', 'APP_CONFIG'];
    
    function UserService($http, $q, APP_CONFIG) {
        var service = {
            getUsers: getUsers,
            getUserById: getUserById,
            createUser: createUser,
            updateUser: updateUser,
            deleteUser: deleteUser
        };

        return service;

        function getUsers(params) {
            return $http.get(APP_CONFIG.API_BASE_URL + '/users', { params: params })
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function createUser(userData) {
            return $http.post(APP_CONFIG.API_BASE_URL + '/users', userData)
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function handleError(error) {
            var errorMessage = 'An error occurred';
            
            if (error.data) {
                if (error.data.message) {
                    errorMessage = error.data.message;
                } else if (error.data.error) {
                    errorMessage = error.data.error;
                }
            }
            
            return $q.reject({
                data: { message: errorMessage },
                status: error.status
            });
        }
    }
})();
```

### AngularJS Route Configuration Pattern

```javascript
config.$inject = ['$routeProvider', '$locationProvider', '$httpProvider'];

function config($routeProvider, $locationProvider, $httpProvider) {
    $locationProvider.hashPrefix('!');
    
    // HTTP interceptor for auth
    $httpProvider.interceptors.push(function($q, $location, $cookies) {
        return {
            'request': function(config) {
                var token = $cookies.get('erp_token');
                if (token) {
                    config.headers['Authorization'] = 'Bearer ' + token;
                }
                return config;
            },
            'responseError': function(response) {
                if (response.status === 401) {
                    $cookies.remove('erp_token');
                    $location.path('/login');
                }
                return $q.reject(response);
            }
        };
    });

    // Routes
    $routeProvider
        .when('/login', {
            templateUrl: 'src/app/views/auth/login.html',
            controller: 'AuthController',
            controllerAs: 'auth'
        })
        .when('/dashboard', {
            templateUrl: 'src/app/views/dashboard/dashboard.html',
            controller: 'DashboardController',
            controllerAs: 'dashboard',
            authenticate: true
        })
        .otherwise({
            redirectTo: '/'
        });
}
```

## Testing

### Backend Testing (Bun Test)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { setupTestDatabase, clearTestDatabase } from './setup';

describe('Students Controller', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it('should list all students', async () => {
    const req = createMockRequest();
    req.query = { page: '1', limit: '10' };
    const res = createMockResponse();

    await StudentsController.list(req, res);

    expect(res._status).toBe(200);
    expect(res._json?.success).toBe(true);
  });
});
```

### Frontend Testing (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#!/login');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
```

## Testing Commands

```bash
# Backend tests
cd apps/api
bun test                              # Run all tests
bun test tests/unit                   # Unit tests only
bun test tests/integration            # Integration tests only
bun test tests/e2e                    # E2E tests only
bun test --watch                      # Watch mode

# Frontend tests
cd apps/frontend
bun run test                          # Run all Playwright tests
bun run test:ui                       # Playwright UI mode
bun run test:headed                   # Run headed mode
bun run test:report                   # Show test report
```

## Environment Variables

**API (.env)**:
```bash
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/erp-miniproject
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:4200
```

**Frontend**:
- `APP_CONFIG.API_BASE_URL` set to `/api` (relative path)

## Security Best Practices

1. **Never commit** `.env` files or any secrets
2. **Always use** environment variables for sensitive data
3. **Password hashing**: Use bcryptjs with 12 rounds
4. **JWT**: Use separate access (short-lived) and refresh (long-lived) tokens
5. **Input validation**: Use express-validator on all endpoints
6. **Role-based access**: Always use `authenticate` and `authorize` middleware
7. **Audit logging**: Log all sensitive operations (created/updated/deleted)
8. **CORS**: Restrict to allowed origins only

## Git Workflow

- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- **Atomic commits**: One concern per commit
- **Never force push** to main branch

## Common Gotchas

1. **Mongoose populate**: Use `lean()` for read-only queries to improve performance
2. **TypeScript strict mode**: Always handle `null` and `undefined` explicitly
3. **AngularJS**: Use `controllerAs` syntax (vm pattern) to avoid `$scope` confusion
4. **Bun runtime**: Some Node.js APIs may differ; test compatibility before deployment
5. **Docker MongoDB**: Ensure MongoDB container is running before starting API

## API Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **Health check**: http://localhost:3000/api/health

## Performance Considerations

1. **Database indexes**: Always add indexes for frequently queried fields
2. **Pagination**: Use skip/limit for large result sets
3. **Connection pooling**: Mongoose configured with maxPoolSize: 10, minPoolSize: 5
4. **Lazy loading**: Use `populate()` selectively to avoid N+1 queries

## Build Commands

```bash
# Build backend
cd apps/api
bun run build                        # Compile TypeScript to dist/

# No build step for frontend (http-server serves static files directly)
```

## Documentation

- **SRS**: `docs/SRS.md` - Complete software requirements
- **Backend README**: `apps/api/README.md`
- **Frontend README**: `apps/frontend/README.md`
