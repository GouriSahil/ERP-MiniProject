import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// Custom error class
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

// Validation error class
export class ValidationError extends AppError {
  constructor(public errors: any[]) {
    super(400, 'Validation failed');
    this.isOperational = true;
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', err);

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    const value = (err as any).keyValue[field];
    error = new AppError(409, `${field} '${value}' already exists`);
  }

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message
    }));
    error = new ValidationError(errors);
  }

  // Mongoose CastError (invalid ID)
  if (err instanceof mongoose.Error.CastError) {
    error = new AppError(400, 'Invalid ID format');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError(401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError(401, 'Token expired');
  }

  // Default error
  const statusCode = (error as any).statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(statusCode === 500 && { stack: process.env.NODE_ENV === 'development' ? err.stack : undefined }),
    ...((error as any).errors && { errors: (error as any).errors })
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};
