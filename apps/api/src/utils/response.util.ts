import { Response } from 'express';
import { PaginatedResult } from './pagination.util';

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

export const noContentResponse = (res: Response) => {
  return res.status(204).send();
};

export const paginatedResponse = <T>(res: Response, result: PaginatedResult<T>) => {
  return res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination
  });
};

export const errorResponse = (res: Response, message: string, statusCode: number = 400, details?: any) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    details
  });
};

export const notFoundResponse = (res: Response, resource: string = 'Resource') => {
  return res.status(404).json({
    success: false,
    error: `${resource} not found`
  });
};

export const unauthorizedResponse = (res: Response, message: string = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    error: message
  });
};

export const forbiddenResponse = (res: Response, message: string = 'Forbidden') => {
  return res.status(403).json({
    success: false,
    error: message
  });
};

export const conflictResponse = (res: Response, message: string) => {
  return res.status(409).json({
    success: false,
    error: message
  });
};

export const validationErrorResponse = (res: Response, details: any) => {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details
  });
};
