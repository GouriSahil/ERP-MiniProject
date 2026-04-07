import multer from 'multer';
import path from 'path';

// Configure storage for uploaded files
const storage = multer.memoryStorage();

// File filter to only accept CSV files
const csvFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.csv') {
    return callback(new Error('Only CSV files are allowed'));
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
export const handleUploadError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 5MB limit'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Only one file can be uploaded at a time'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  }

  if (err?.message === 'Only CSV files are allowed') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  next(err);
};
