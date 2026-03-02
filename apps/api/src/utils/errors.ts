/**
 * Custom Error Classes
 * Provides structured error handling for the application
 */

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly for TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error response formatter
 */
export const formatErrorResponse = (error: any) => {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details
      }
    };
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    const details: Record<string, string> = {};
    for (const field in error.errors) {
      details[field] = error.errors[field].message;
    }
    return {
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details
      }
    };
  }

  // Handle Mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      success: false,
      error: {
        message: `${field} already exists`,
        statusCode: 409
      }
    };
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (error.name === 'CastError') {
    return {
      success: false,
      error: {
        message: 'Invalid ID format',
        statusCode: 400
      }
    };
  }

  // Default error response
  return {
    success: false,
    error: {
      message: error.message || 'Internal server error',
      statusCode: error.statusCode || 500
    }
  };
};
