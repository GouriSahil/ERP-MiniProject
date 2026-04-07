import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { AppError } from '../utils/errors';
import { Student, User, Enrollment } from '../models';
import { parseCSVBuffer, validateStudentCSV, transformCSVRowToStudentData, STUDENT_CSV_COLUMNS } from '../utils/csv.util';

export class StudentsController {
  // List all students
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.query);
      const { departmentId, enrollmentStatus } = req.query;

      // Build filter
      const filter: any = {};
      if (departmentId) filter.departmentId = departmentId;

      // Populate with user data
      const students = await Student.find(filter)
        .populate('userId', 'name email')
        .populate('departmentId', 'name code')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Add search filter for user fields
      let searchFilter = {};
      if (search) {
        const users = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        const userIds = users.map(u => u._id);
        searchFilter = { userId: { $in: userIds } };
      }

      const total = await Student.countDocuments({ ...filter, ...searchFilter });

      return res.status(200).json({
        success: true,
        data: students,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get student by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const student = await Student.findById(id)
        .populate('userId', 'name email role')
        .populate('departmentId', 'name code')
        .lean();

      if (!student) {
        return notFoundResponse(res, 'Student');
      }

      return successResponse(res, student);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new student
  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, email, password, rollNumber, departmentId } = req.body;

      // Check for duplicate roll number in department
      const existingStudent = await Student.findOne({ rollNumber, departmentId });
      if (existingStudent) {
        return conflictResponse(res, 'Roll number already exists in this department');
      }

      // Check for duplicate email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return conflictResponse(res, 'Email already exists');
      }

      // Create user account
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: 'student',
        departmentId,
        mustChangePassword: true
      });

      // Create student
      const student = await Student.create({
        userId: user._id,
        rollNumber,
        departmentId
      });

      const populatedStudent = await Student.findById(student._id)
        .populate('userId', 'name email')
        .populate('departmentId', 'name code');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'create',
        targetType: 'student',
        targetId: student._id.toString(),
        status: 'success',
        metadata: { name, rollNumber, departmentId },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, populatedStudent, 'Student created successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update student
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, rollNumber, departmentId } = req.body;

      const student = await Student.findById(id).populate('userId');
      if (!student) {
        return notFoundResponse(res, 'Student');
      }

      // Check roll number uniqueness if changed
      if (rollNumber && rollNumber !== student.rollNumber) {
        const existingStudent = await Student.findOne({
          rollNumber,
          departmentId: departmentId || student.departmentId
        });
        if (existingStudent) {
          return conflictResponse(res, 'Roll number already exists');
        }
      }

      // Check email uniqueness if changed
      if (email && email !== (student.userId as any).email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return conflictResponse(res, 'Email already exists');
        }
      }

      // Update user
      await User.findByIdAndUpdate(student.userId, { name, email });

      // Update student
      const updatedStudent = await Student.findByIdAndUpdate(
        id,
        { rollNumber, departmentId },
        { new: true, runValidators: true }
      ).populate('userId').populate('departmentId', 'name code');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'student',
        targetId: id,
        status: 'success',
        metadata: { changes: req.body },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedStudent, 'Student updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete student
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const student = await Student.findById(id);
      if (!student) {
        return notFoundResponse(res, 'Student');
      }

      // Check for enrollments
      const enrollments = await Enrollment.countDocuments({ studentId: id });
      if (enrollments > 0) {
        return errorResponse(res, 'Cannot delete student with enrollment records', 400);
      }

      // Delete user and student
      await User.findByIdAndDelete(student.userId);
      await Student.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'student',
        targetId: id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Student deleted successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get student enrollment history
  static async getEnrollments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const student = await Student.findById(id);
      if (!student) {
        return notFoundResponse(res, 'Student');
      }

      const enrollments = await Enrollment.find({ studentId: id })
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .sort({ createdAt: -1 })
        .lean();

      return successResponse(res, enrollments);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get student attendance summary
  static async getAttendance(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { termId } = req.query;

      const student = await Student.findById(id);
      if (!student) {
        return notFoundResponse(res, 'Student');
      }

      // Get all enrollments for the student
      const enrollments = await Enrollment.find({ studentId: student._id })
        .lean();

      const enrollmentIds = enrollments.map(e => e._id);

      // Get all offerings for these enrollments
      const CourseOffering = mongoose.model('CourseOffering');
      const offerings = await CourseOffering.find({
        _id: { $in: enrollments.map((e: any) => e.offeringId) }
      }).lean();

      const offeringIds = offerings.map(o => o._id);

      // Get all sessions for these offerings
      const Session = mongoose.model('Session');
      const sessions = await Session.find({
        offeringId: { $in: offeringIds }
      }).lean();

      const sessionIds = sessions.map(s => s._id);

      // Get all attendance records for these sessions
      const AttendanceRecord = mongoose.model('AttendanceRecord');
      const attendanceRecords = await AttendanceRecord.find({
        sessionId: { $in: sessionIds },
        studentId: student._id
      }).lean();

      // Calculate statistics
      const stats = {
        totalSessions: sessionIds.length,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        percentage: 0
      };

      attendanceRecords.forEach((record: any) => {
        switch (record.status) {
          case 'present':
            stats.present++;
            break;
          case 'absent':
            stats.absent++;
            break;
          case 'late':
            stats.late++;
            break;
          case 'excused':
            stats.excused++;
            break;
        }
      });

      // Calculate attendance percentage (present + late) / total
      const attendedCount = stats.present + stats.late;
      stats.percentage = stats.totalSessions > 0
        ? Math.round((attendedCount / stats.totalSessions) * 100)
        : 0;

      return successResponse(res, stats);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Bulk import students
  static async bulkImport(req: AuthRequest, res: Response) {
    try {
      const { students } = req.body; // Array of student objects

      if (!Array.isArray(students) || students.length === 0) {
        return errorResponse(res, 'students array is required', 400);
      }

      const results = {
        success: [] as any[],
        failed: [] as any[]
      };

      for (const studentData of students) {
        try {
          const { name, email, password, rollNumber, departmentId } = studentData;

          // Check duplicates
          const existingStudent = await Student.findOne({ rollNumber, departmentId });
          if (existingStudent) {
            results.failed.push({ row: studentData, error: 'Roll number already exists' });
            continue;
          }

          const existingUser = await User.findOne({ email });
          if (existingUser) {
            results.failed.push({ row: studentData, error: 'Email already exists' });
            continue;
          }

          // Create user and student
          const bcrypt = require('bcrypt');
          const passwordHash = await bcrypt.hash(password, 12);
          const user = await User.create({
            name,
            email,
            passwordHash,
            role: 'student',
            departmentId,
            mustChangePassword: true
          });

          const student = await Student.create({
            userId: user._id,
            rollNumber,
            departmentId
          });

          results.success.push({ row: studentData, id: student._id });
        } catch (error: any) {
          results.failed.push({ row: studentData, error: error.message });
        }
      }

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'bulk_import',
        targetType: 'student',
        targetId: 'bulk',
        status: 'success',
        metadata: {
          total: students.length,
          successCount: results.success.length,
          failureCount: results.failed.length
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, results, `Imported ${results.success.length} of ${students.length} students`);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Import students from CSV file
  static async importCSV(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      // Parse CSV
      const records = parseCSVBuffer(req.file.buffer);

      // Validate CSV structure
      const validation = validateStudentCSV(records);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'CSV validation failed',
          details: validation.errors
        });
      }

      // Get department IDs for department codes
      const Department = mongoose.model('Department');
      const departmentCodes = Array.from(new Set(records.map(r => r.departmentCode)));
      const departments = await Department.find({ code: { $in: departmentCodes } }).lean();
      const departmentMap = new Map(departments.map((d: any) => [d.code, d._id.toString()]));

      // Check for missing departments
      const missingDepartments = departmentCodes.filter(code => !departmentMap.has(code));
      if (missingDepartments.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Departments not found',
          details: missingDepartments.map(code => ({
            field: 'departmentCode',
            message: `Department with code "${code}" does not exist`
          }))
        });
      }

      // Process each row
      const results = {
        success: [] as Array<{ row: number; id: string; name: string; rollNumber: string }>,
        failed: [] as Array<{ row: number; data: any; error: string }>
      };

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // +2 for header and 0-based index

        try {
          const studentData = transformCSVRowToStudentData(
            row,
            departmentMap.get(row.departmentCode)!
          );

          // Check for duplicate roll number in department
          const existingStudent = await Student.findOne({
            rollNumber: studentData.rollNumber,
            departmentId: studentData.departmentId
          });
          if (existingStudent) {
            results.failed.push({
              row: rowNum,
              data: row,
              error: 'Roll number already exists in this department'
            });
            continue;
          }

          // Check for duplicate email
          const existingUser = await User.findOne({ email: studentData.email });
          if (existingUser) {
            results.failed.push({
              row: rowNum,
              data: row,
              error: 'Email already exists'
            });
            continue;
          }

          // Create user account
          const bcrypt = require('bcrypt');
          const passwordHash = await bcrypt.hash(studentData.password, 12);
          const user = await User.create({
            name: studentData.name,
            email: studentData.email,
            passwordHash,
            role: 'student',
            departmentId: studentData.departmentId,
            mustChangePassword: true
          });

          // Create student
          const student = await Student.create({
            userId: user._id,
            rollNumber: studentData.rollNumber,
            departmentId: studentData.departmentId,
            batch: studentData.batch,
            semester: studentData.semester
          });

          results.success.push({
            row: rowNum,
            id: student._id.toString(),
            name: studentData.name,
            rollNumber: studentData.rollNumber
          });
        } catch (error: any) {
          results.failed.push({
            row: rowNum,
            data: row,
            error: error.message || 'Unknown error'
          });
        }
      }

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'csv_import',
        targetType: 'student',
        targetId: 'csv_bulk',
        status: 'success',
        metadata: {
          fileName: req.file.originalname,
          total: records.length,
          successCount: results.success.length,
          failureCount: results.failed.length
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, results, `Imported ${results.success.length} of ${records.length} students`);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }
}
