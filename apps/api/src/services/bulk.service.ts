import mongoose, { ClientSession } from 'mongoose';
import { Student, Faculty, User, Department, Course, AuditLog, AuditAction, AuditStatus } from '../models';
import { AppError } from '../utils/errors';
import { bulkEnrollStudents } from './enrollment.service';
import { bulkMarkAttendance } from './attendance.service';
import { createAuditLog } from './audit.service';
import { hashPassword } from '../utils/auth.utils';

/**
 * Bulk Service
 * Handles bulk import/export operations with partial success support
 */

export interface BulkOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    rowIndex: number;
    identifier: string;
    success: boolean;
    error?: string;
  }>;
}

export interface ImportError {
  row: number;
  identifier: string;
  field: string;
  message: string;
}

export interface BulkImportResult<T> {
  total: number;
  succeeded: number;
  failed: number;
  data: Array<{
    item: T;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Bulk import students from CSV data
 */
export const bulkImportStudents = async (
  studentsData: Array<{
    rollNumber: string;
    name: string;
    email: string;
    departmentId: string;
    batch: string;
    semester: number;
  }>,
  performedBy?: string
): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: studentsData.length,
    succeeded: 0,
    failed: 0,
    results: []
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (let i = 0; i < studentsData.length; i++) {
      const studentData = studentsData[i];
      
      try {
        // Check if department exists
        const department = await Department.findById(studentData.departmentId).session(session);
        if (!department) {
          throw new Error(`Department with ID ${studentData.departmentId} not found`);
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: studentData.email }).session(session);
        if (existingUser) {
          throw new Error(`User with email ${studentData.email} already exists`);
        }

        // Check if roll number already exists
        const existingStudent = await Student.findOne({ 
          rollNumber: studentData.rollNumber.toUpperCase() 
        }).session(session);
        
        if (existingStudent) {
          throw new Error(`Student with roll number ${studentData.rollNumber} already exists`);
        }

        // Create user account
        const user = new User({
          name: studentData.name,
          email: studentData.email,
          role: 'student',
          mustChangePassword: true
        });
        
        // Set default password (roll number)
        user.passwordHash = await hashPassword(studentData.rollNumber);
        
        await user.save({ session });

        // Create student profile
        const student = new Student({
          userId: user._id,
          rollNumber: studentData.rollNumber.toUpperCase(),
          departmentId: studentData.departmentId,
          batch: studentData.batch,
          semester: studentData.semester
        });

        await student.save({ session });

        result.succeeded++;
        result.results.push({
          rowIndex: i + 1,
          identifier: studentData.rollNumber,
          success: true
        });

      } catch (error: any) {
        result.failed++;
        result.results.push({
          rowIndex: i + 1,
          identifier: studentData.rollNumber,
          success: false,
          error: error.message
        });
      }
    }

    // Commit if at least one success
    if (result.succeeded > 0) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }

    // Log audit event
    await createAuditLog({
      actorUserId: performedBy,
      actorRole: undefined,
      action: AuditAction.IMPORT,
      targetType: 'Student',
      targetId: 'bulk',
      status: result.failed === 0 ? AuditStatus.SUCCESS : AuditStatus.PARTIAL,
      metadata: {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed
      }
    });

    return result;

  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(`Bulk import failed: ${error.message}`, 500);
  } finally {
    session.endSession();
  }
};

/**
 * Bulk import faculty from CSV data
 */
export const bulkImportFaculty = async (
  facultyData: Array<{
    name: string;
    email: string;
    departmentId: string;
    specialization: string;
    designation: string;
  }>,
  performedBy?: string
): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: facultyData.length,
    succeeded: 0,
    failed: 0,
    results: []
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (let i = 0; i < facultyData.length; i++) {
      const data = facultyData[i];
      
      try {
        // Check if department exists
        const department = await Department.findById(data.departmentId).session(session);
        if (!department) {
          throw new Error(`Department with ID ${data.departmentId} not found`);
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: data.email }).session(session);
        if (existingUser) {
          throw new Error(`User with email ${data.email} already exists`);
        }

        // Create user account
        const user = new User({
          name: data.name,
          email: data.email,
          role: 'faculty',
          mustChangePassword: true
        });
        
        // Set default password (email)
        user.passwordHash = await hashPassword(data.email);
        
        await user.save({ session });

        // Create faculty profile
        const faculty = new Faculty({
          userId: user._id,
          departmentId: data.departmentId,
          specialization: data.specialization,
          designation: data.designation,
          joinDate: new Date()
        });

        await faculty.save({ session });

        result.succeeded++;
        result.results.push({
          rowIndex: i + 1,
          identifier: data.email,
          success: true
        });

      } catch (error: any) {
        result.failed++;
        result.results.push({
          rowIndex: i + 1,
          identifier: data.email,
          success: false,
          error: error.message
        });
      }
    }

    if (result.succeeded > 0) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }

    // Log audit event
    await createAuditLog({
      actorUserId: performedBy,
      actorRole: undefined,
      action: AuditAction.IMPORT,
      targetType: 'Faculty',
      targetId: 'bulk',
      status: result.failed === 0 ? AuditStatus.SUCCESS : AuditStatus.PARTIAL,
      metadata: {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed
      }
    });

    return result;

  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(`Bulk import failed: ${error.message}`, 500);
  } finally {
    session.endSession();
  }
};

/**
 * Bulk import courses from CSV data
 */
export const bulkImportCourses = async (
  coursesData: Array<{
    name: string;
    code: string;
    credits: number;
    departmentId: string;
    description?: string;
  }>,
  performedBy?: string
): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: coursesData.length,
    succeeded: 0,
    failed: 0,
    results: []
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (let i = 0; i < coursesData.length; i++) {
      const data = coursesData[i];
      
      try {
        // Check if department exists
        const department = await Department.findById(data.departmentId).session(session);
        if (!department) {
          throw new Error(`Department with ID ${data.departmentId} not found`);
        }

        // Check if course code already exists for this department
        const existingCourse = await Course.findOne({ 
          code: data.code.toUpperCase(),
          departmentId: data.departmentId
        }).session(session);
        
        if (existingCourse) {
          throw new Error(`Course with code ${data.code} already exists in this department`);
        }

        // Create course
        const course = new Course({
          name: data.name,
          code: data.code.toUpperCase(),
          credits: data.credits,
          departmentId: data.departmentId,
          description: data.description || ''
        });

        await course.save({ session });

        result.succeeded++;
        result.results.push({
          rowIndex: i + 1,
          identifier: data.code,
          success: true
        });

      } catch (error: any) {
        result.failed++;
        result.results.push({
          rowIndex: i + 1,
          identifier: data.code,
          success: false,
          error: error.message
        });
      }
    }

    if (result.succeeded > 0) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }

    // Log audit event
    await createAuditLog({
      actorUserId: performedBy,
      actorRole: undefined,
      action: AuditAction.IMPORT,
      targetType: 'Course',
      targetId: 'bulk',
      status: result.failed === 0 ? AuditStatus.SUCCESS : AuditStatus.PARTIAL,
      metadata: {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed
      }
    });

    return result;

  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(`Bulk import failed: ${error.message}`, 500);
  } finally {
    session.endSession();
  }
};

/**
 * Bulk enroll students (wrapper for enrollment service)
 */
export const bulkEnroll = async (
  enrollments: Array<{ studentId: string; offeringId: string }>,
  performedBy?: string
): Promise<any> => {
  const result = await bulkEnrollStudents(enrollments);

  // Log audit event
  await createAuditLog({
    actorUserId: performedBy,
    actorRole: undefined,
    action: AuditAction.ENROLL,
    targetType: 'Enrollment',
    targetId: 'bulk',
    status: result.failed === 0 ? AuditStatus.SUCCESS : AuditStatus.PARTIAL,
    metadata: {
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed
    }
  });

  return result;
};

/**
 * Bulk mark attendance (wrapper for attendance service)
 */
export const bulkMarkAttendanceService = async (
  sessionId: string,
  attendanceData: Array<{ studentId: string; status: string }>,
  markedBy?: string
): Promise<any> => {
  const result = await bulkMarkAttendance(
    sessionId,
    attendanceData as any,
    markedBy
  );

  // Log audit event
  await createAuditLog({
    actorUserId: markedBy,
    actorRole: undefined,
    action: AuditAction.MARK_ATTENDANCE,
    targetType: 'Attendance',
    targetId: sessionId,
    status: result.failed === 0 ? AuditStatus.SUCCESS : AuditStatus.PARTIAL,
    metadata: {
      sessionId,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed
    }
  });

  return result;
};

/**
 * Parse CSV data (helper function)
 */
export const parseCSV = (csvContent: string, delimiter: string = ','): Array<Record<string, string>> => {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new AppError('CSV file must have at least a header row and one data row', 400);
  }

  // Parse header
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
  
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
    
    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    data.push(row);
  }

  return data;
};

/**
 * Validate CSV structure
 */
export const validateCSVStructure = (
  data: Array<Record<string, string>>,
  requiredFields: string[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (data.length === 0) {
    errors.push('No data rows found');
    return { valid: false, errors };
  }

  for (const field of requiredFields) {
    if (!data[0].hasOwnProperty(field)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate each row
  data.forEach((row, index) => {
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        errors.push(`Row ${index + 1}: ${field} is required`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Export data to CSV format
 */
export const exportToCSV = (
  data: Array<Record<string, any>>,
  filename: string
): string => {
  if (data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value !== null && value !== undefined ? value.toString() : '';
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Get bulk operation status
 */
export const getBulkOperationStatus = async (operationId: string) => {
  // This is a placeholder for a bulk operation tracking system
  // In a real implementation, you might store operation status in a separate collection
  return {
    operationId,
    status: 'completed',
    progress: 100,
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0
  };
};
