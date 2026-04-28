import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import * as EnrollmentService from '../services/enrollment.service';
import * as CoursesService from '../services/courses.service';
import { AppError } from '../utils/errors';
import { Enrollment, CourseOffering, Student, Course, Term } from '../models';

export class EnrollmentsController {
  // List all enrollments
  static async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder } = getPaginationParams(req.query);
      const { studentId, offeringId, termId, status } = req.query;

      const filter: any = {};
      if (studentId) filter.studentId = studentId;
      if (offeringId) filter.offeringId = offeringId;
      if (status) filter.status = status;

      // If termId is provided, we need to filter through offerings
      let enrollments;
      let total;

      if (termId) {
        const offeringIds = await CourseOffering.find({ termId }).distinct('_id');
        filter.offeringId = { $in: offeringIds };
      }

      enrollments = await Enrollment.find(filter)
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: ['userId', 'departmentId']
        })
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      total = await Enrollment.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: enrollments,
        pagination: buildPaginationMeta(page, limit, total)
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get enrollment by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const enrollment = await Enrollment.findById(id)
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: ['userId', 'departmentId']
        })
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .lean();

      if (!enrollment) {
        return notFoundResponse(res, 'Enrollment');
      }

      return successResponse(res, enrollment);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new enrollment
  static async create(req: AuthRequest, res: Response) {
    try {
      const { studentId, offeringId } = req.body;

      // Validate student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return notFoundResponse(res, 'Student');
      }

      // Validate offering exists
      const offering = await CourseOffering.findById(offeringId).populate('courseId');
      if (!offering) {
        return notFoundResponse(res, 'Offering');
      }

      // Use enrollment service for comprehensive validation
      try {
        const enrollment = await EnrollmentService.enrollStudent(studentId, offeringId);

        await saveAuditLog({
          actorUserId: req.user!.userId,
          actorRole: req.user!.role,
          action: 'create',
          targetType: 'enrollment',
          targetId: enrollment._id.toString(),
          status: 'success',
          metadata: { studentId, offeringId, courseId: (offering as any).courseId?._id },
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        });

        return createdResponse(res, enrollment, 'Student enrolled successfully');
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update enrollment (grade, status)
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, grade, gradePoints } = req.body;

      const enrollment = await Enrollment.findById(id);
      if (!enrollment) {
        return notFoundResponse(res, 'Enrollment');
      }

      // Validate status transition if provided
      if (status) {
        // Valid status transitions
        const validTransitions: Record<string, string[]> = {
          'pending': ['enrolled', 'cancelled'],
          'enrolled': ['completed', 'dropped', 'withdrawn'],
          'dropped': [],
          'completed': [],
          'withdrawn': []
        };

        const allowedTransitions = validTransitions[enrollment.status] || [];
        if (!allowedTransitions.includes(status)) {
          return errorResponse(
            res,
            `Cannot transition from ${enrollment.status} to ${status}`,
            400
          );
        }
      }

      const updatedEnrollment = await Enrollment.findByIdAndUpdate(
        id,
        { status, grade, gradePoints },
        { new: true, runValidators: true }
      ).populate('studentId').populate('offeringId');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update',
        targetType: 'enrollment',
        targetId: id,
        status: 'success',
        metadata: { changes: req.body },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedEnrollment, 'Enrollment updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete enrollment (drop course)
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const enrollment = await Enrollment.findById(id);
      if (!enrollment) {
        return notFoundResponse(res, 'Enrollment');
      }

      // Validate that enrollment can be dropped
      try {
        const { CourseOffering } = await import('../models');
        const offering = await CourseOffering.findById(enrollment.offeringId);
        if (!offering) {
          return notFoundResponse(res, 'Offering');
        }

        // Check if term has started
        const { Term } = await import('../models');
        const term = await Term.findById((offering as any).termId);
        if (term && new Date() > new Date(term.startDate)) {
          return errorResponse(res, 'Cannot drop enrollment after term has started', 400);
        }
      } catch (error: any) {
        if (error instanceof AppError) {
          return errorResponse(res, error.message, error.statusCode);
        }
        throw error;
      }

      await Enrollment.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'delete',
        targetType: 'enrollment',
        targetId: id,
        status: 'success',
        metadata: { studentId: enrollment.studentId, offeringId: enrollment.offeringId },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Enrollment deleted successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get enrollment attendance
  static async getAttendance(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const { AttendanceRecord } = await import('../models');
      const attendance = await AttendanceRecord.find({ enrollmentId: id })
        .populate('sessionId')
        .sort({ createdAt: -1 })
        .lean();

      // Calculate stats
      const stats = {
        total: attendance.length,
        present: attendance.filter((a: any) => a.status === 'present').length,
        absent: attendance.filter((a: any) => a.status === 'absent').length,
        late: attendance.filter((a: any) => a.status === 'late').length,
        excused: attendance.filter((a: any) => a.status === 'excused').length,
        percentage: 0
      };
      stats.percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

      return successResponse(res, { records: attendance, stats });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Bulk enroll students
  static async bulkEnroll(req: AuthRequest, res: Response) {
    try {
      const { offeringId, studentIds } = req.body;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return errorResponse(res, 'studentIds array is required', 400);
      }

      // Validate offering exists
      const offering = await CourseOffering.findById(offeringId);
      if (!offering) {
        return notFoundResponse(res, 'Offering');
      }

      // Use service for bulk enrollment with validation
      const enrollmentData = studentIds.map((studentId: string) => ({
        studentId,
        offeringId
      }));
      const result = await EnrollmentService.bulkEnrollStudents(enrollmentData);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'bulk_enroll',
        targetType: 'enrollment',
        targetId: offeringId,
        status: 'success',
        metadata: {
          offeringId,
          total: result.total,
          successCount: result.succeeded,
          failureCount: result.failed
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, result, `Enrolled ${result.succeeded} of ${result.total} students`);
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update grade
  static async updateGrade(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { grade, gradePoints } = req.body;

      const enrollment = await Enrollment.findById(id);
      if (!enrollment) {
        return notFoundResponse(res, 'Enrollment');
      }

      // Validate grade format
      if (grade && typeof grade !== 'string') {
        return errorResponse(res, 'Grade must be a string value', 400);
      }
      if (gradePoints !== undefined && (typeof gradePoints !== 'number' || gradePoints < 0 || gradePoints > 10)) {
        return errorResponse(res, 'Grade points must be a number between 0 and 10', 400);
      }

      const updatedEnrollment = await Enrollment.findByIdAndUpdate(
        id,
        { grade, gradePoints },
        { new: true }
      );

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'update_grade',
        targetType: 'enrollment',
        targetId: id,
        status: 'success',
        metadata: { grade, gradePoints },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedEnrollment, 'Grade updated successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Check enrollment eligibility
  static async checkEligibility(req: AuthRequest, res: Response) {
    try {
      const { studentId, courseId } = req.query;

      if (!studentId || !courseId) {
        return errorResponse(res, 'studentId and courseId query parameters are required', 400);
      }

      // Check prerequisites using courses service
      const prerequisiteCheck = await CoursesService.checkPrerequisites(
        studentId as string,
        courseId as string
      );

      return successResponse(res, {
        studentId,
        courseId,
        prerequisites: prerequisiteCheck
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get enrollments by student ID
  static async getByStudent(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { termId, status } = req.query;

      const filter: any = { studentId };
      if (status) filter.status = status;

      let enrollments;
      if (termId) {
        const offeringIds = await CourseOffering.find({ termId }).distinct('_id');
        filter.offeringId = { $in: offeringIds };
      }

      enrollments = await Enrollment.find(filter)
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .lean();

      return successResponse(res, enrollments);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get enrollments by offering ID
  static async getByOffering(req: AuthRequest, res: Response) {
    try {
      const { offeringId } = req.params;
      const { status } = req.query;

      const filter: any = { offeringId };
      if (status) filter.status = status;

      const enrollments = await Enrollment.find(filter)
        .populate('studentId')
        .populate({
          path: 'studentId',
          populate: ['userId', 'departmentId']
        })
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .lean();

      return successResponse(res, enrollments);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Drop enrollment (change status to dropped)
  static async drop(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const enrollment = await Enrollment.findById(id);
      if (!enrollment) {
        return notFoundResponse(res, 'Enrollment');
      }

      // Validate that enrollment can be dropped
      const validDropStatuses = ['pending', 'enrolled'];
      if (!validDropStatuses.includes(enrollment.status)) {
        return errorResponse(
          res,
          `Cannot drop enrollment with status ${enrollment.status}`,
          400
        );
      }

      // Check if term has started
      const offering = await CourseOffering.findById(enrollment.offeringId);
      if (!offering) {
        return notFoundResponse(res, 'Offering');
      }

      const { Term } = await import('../models');
      const term = await Term.findById((offering as any).termId);
      if (term && new Date() > new Date(term.startDate)) {
        return errorResponse(res, 'Cannot drop enrollment after term has started', 400);
      }

      const updatedEnrollment = await Enrollment.findByIdAndUpdate(
        id,
        { status: 'dropped' },
        { new: true, runValidators: true }
      ).populate('studentId').populate('offeringId');

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'drop',
        targetType: 'enrollment',
        targetId: id,
        status: 'success',
        metadata: { 
          studentId: enrollment.studentId, 
          offeringId: enrollment.offeringId,
          previousStatus: enrollment.status 
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, updatedEnrollment, 'Enrollment dropped successfully');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get student enrollments
  static async getStudentEnrollments(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { termId, status } = req.query;

      const filter: any = { studentId };
      if (status) filter.status = status;

      let enrollments;
      if (termId) {
        const offeringIds = await CourseOffering.find({ termId }).distinct('_id');
        filter.offeringId = { $in: offeringIds };
      }

      enrollments = await Enrollment.find(filter)
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: ['courseId', 'termId']
        })
        .lean();

      return successResponse(res, enrollments);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Self-enrollment for students
  static async selfEnroll(req: AuthRequest, res: Response) {
    try {
      // Get authenticated student profile
      const student = await Student.findOne({ userId: req.user!.userId });
      if (!student) {
        return notFoundResponse(res, 'Student profile');
      }

      const { offeringId } = req.body;
      if (!offeringId) {
        return errorResponse(res, 'offeringId is required', 400);
      }

      // Validate offering exists and get term info
      const offering = await CourseOffering.findById(offeringId).populate('courseId').populate('termId');
      if (!offering) {
        return notFoundResponse(res, 'Course offering');
      }

      // Check if term allows enrollment (upcoming or active only)
      const termStatus = (offering as any).termId?.status;
      if (termStatus && termStatus !== 'upcoming' && termStatus !== 'active') {
        return errorResponse(res, `Cannot enroll in courses for ${termStatus} terms`, 400);
      }

      // Use existing enrollment service with all validations
      const enrollment = await EnrollmentService.enrollStudent(student._id.toString(), offeringId);

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'self_enroll',
        targetType: 'enrollment',
        targetId: enrollment._id.toString(),
        status: 'success',
        metadata: { studentId: student._id, offeringId, courseId: (offering as any).courseId?._id },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, enrollment, 'Successfully enrolled in course');
    } catch (error: any) {
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Get available course offerings for student self-enrollment
  static async getAvailableOfferings(req: AuthRequest, res: Response) {
    try {
      const { termId, departmentId } = req.query;

      // Get authenticated student
      const student = await Student.findOne({ userId: req.user!.userId });
      if (!student) {
        return notFoundResponse(res, 'Student profile');
      }

      // Build filter for offerings
      const filter: any = {};

      // Only active/upcoming terms
      const termFilter = termId ? { _id: termId } : {};
      const validTerms = await Term.find({
        ...termFilter,
        status: { $in: ['upcoming', 'active'] }
      }).distinct('_id');
      filter.termId = { $in: validTerms };

      // Filter by department if provided
      if (departmentId) {
        const coursesInDept = await Course.find({ departmentId }).distinct('_id');
        filter.courseId = { $in: coursesInDept };
      }

      // Get offerings
      let offerings = await CourseOffering.find(filter)
        .populate('courseId')
        .populate('termId')
        .lean();

      // Get student's existing enrollments to filter out already enrolled
      const existingEnrollments = await Enrollment.find({
        studentId: student._id,
        status: { $in: ['enrolled', 'completed'] }
      }).distinct('offeringId');

      // Get enrollments count for each offering
      const offeringsWithAvailability = await Promise.all(
        offerings.map(async (offering: any) => {
          const enrolledCount = await Enrollment.countDocuments({
            offeringId: offering._id,
            status: 'enrolled'
          });

          const isEnrolled = existingEnrollments.some(id => id.toString() === offering._id.toString());

          return {
            ...offering,
            enrolledCount,
            availableSeats: offering.capacity - enrolledCount,
            isFull: enrolledCount >= offering.capacity,
            isEnrolled
          };
        })
      );

      // Filter out enrolled offerings and full offerings
      const available = offeringsWithAvailability.filter((o: any) => !o.isEnrolled && !o.isFull);

      return successResponse(res, available);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get my enrollments - for authenticated student
  static async getMyEnrollments(req: AuthRequest, res: Response) {
    try {
      // Get authenticated student profile
      const student = await Student.findOne({ userId: req.user!.userId });
      if (!student) {
        return notFoundResponse(res, 'Student profile');
      }

      // Get enrollments with populated data
      const enrollments = await Enrollment.find({ studentId: student._id })
        .populate({
          path: 'offeringId',
          populate: [
            { path: 'courseId' },
            { path: 'termId' }
          ]
        })
        .sort({ enrolledAt: -1 });

      return successResponse(res, enrollments);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
