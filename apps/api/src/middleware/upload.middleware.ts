import multer, { MulterError } from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Configure storage for uploaded files
const storage = multer.memoryStorage();

// File filter to only accept CSV files
const csvFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.csv') {
    return callback(new Error('Only CSV files are allowed'));
  }
  // Also validate MIME type
  const validMimeTypes = ['text/csv', 'application/vnd.ms-excel'];
  if (file.mimetype && !validMimeTypes.includes(file.mimetype)) {
    return callback(new Error('Invalid file type'));
  }
  callback(null, true);
};

// Multer configuration for CSV uploads
export const uploadCSV = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1 // Only one file at a time
  }
});

// Error handling middleware for multer errors
export const handleUploadError = (
  err: Error | MulterError,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if it's a MulterError (which has the 'code' property)
  if (err instanceof multer.MulterError) {
    const multerErr = err as MulterError;
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 5MB limit'
      });
    }
    if (multerErr.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Only one file can be uploaded at a time'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${multerErr.message}`
    });
  }

  // Handle custom file filter errors
  const message = err.message;
  if (message === 'Only CSV files are allowed' || message === 'Invalid file type') {
    return res.status(400).json({
      success: false,
      error: message
    });
  }

  next(err);
};
