import { parse } from 'csv-parse/sync';

// Expected CSV columns for student import
export const STUDENT_CSV_COLUMNS = [
  'name',
  'email',
  'password',
  'rollNumber',
  'departmentCode',
  'batch',
  'semester'
] as const;

// Validation result interface
export interface CSVValidationResult {
  isValid: boolean;
  errors: Array<{ row: number; field: string; message: string }>;
  rowCount: number;
}

// Parse CSV buffer to array of objects
export function parseCSVBuffer(buffer: Buffer): Array<Record<string, string>> {
  try {
    const content = buffer.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false
    });
    return records;
  } catch (error: any) {
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}

// Validate CSV structure and required fields
export function validateStudentCSV(
  records: Array<Record<string, string>>
): CSVValidationResult {
  const errors: Array<{ row: number; field: string; message: string }> = [];

  if (records.length === 0) {
    return { isValid: false, errors: [{ row: 0, field: 'file', message: 'CSV file is empty' }], rowCount: 0 };
  }

  // Check headers
  const headers = Object.keys(records[0]);
  const missingColumns = STUDENT_CSV_COLUMNS.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    errors.push({
      row: 1,
      field: 'headers',
      message: `Missing required columns: ${missingColumns.join(', ')}`
    });
  }

  // Validate each row
  records.forEach((row, index) => {
    const rowNum = index + 2; // +2 because index is 0-based and header is row 1

    // Validate name
    if (!row.name || row.name.trim().length === 0) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
    } else if (row.name.length > 100) {
      errors.push({ row: rowNum, field: 'name', message: 'Name cannot exceed 100 characters' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!row.email || row.email.trim().length === 0) {
      errors.push({ row: rowNum, field: 'email', message: 'Email is required' });
    } else if (!emailRegex.test(row.email)) {
      errors.push({ row: rowNum, field: 'email', message: 'Invalid email format' });
    }

    // Validate password
    if (!row.password || row.password.length < 8) {
      errors.push({ row: rowNum, field: 'password', message: 'Password must be at least 8 characters' });
    }

    // Validate roll number
    if (!row.rollNumber || row.rollNumber.trim().length === 0) {
      errors.push({ row: rowNum, field: 'rollNumber', message: 'Roll number is required' });
    } else if (row.rollNumber.length > 20) {
      errors.push({ row: rowNum, field: 'rollNumber', message: 'Roll number cannot exceed 20 characters' });
    }

    // Validate department code
    if (!row.departmentCode || row.departmentCode.trim().length === 0) {
      errors.push({ row: rowNum, field: 'departmentCode', message: 'Department code is required' });
    }

    // Validate batch
    if (!row.batch || row.batch.trim().length === 0) {
      errors.push({ row: rowNum, field: 'batch', message: 'Batch is required' });
    }

    // Validate semester
    const semester = parseInt(row.semester, 10);
    if (isNaN(semester) || semester < 1 || semester > 10) {
      errors.push({ row: rowNum, field: 'semester', message: 'Semester must be between 1 and 10' });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    rowCount: records.length
  };
}

// Transform validated CSV row to student creation object
export function transformCSVRowToStudentData(
  row: Record<string, string>,
  departmentId: string
): {
  name: string;
  email: string;
  password: string;
  rollNumber: string;
  departmentId: string;
  batch: string;
  semester: number;
} {
  return {
    name: row.name.trim(),
    email: row.email.trim().toLowerCase(),
    password: row.password,
    rollNumber: row.rollNumber.trim().toUpperCase(),
    departmentId,
    batch: row.batch.trim(),
    semester: parseInt(row.semester, 10)
  };
}
