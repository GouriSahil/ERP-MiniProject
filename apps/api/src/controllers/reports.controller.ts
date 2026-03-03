import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse } from '../utils/response.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { Enrollment, EnrollmentStatus } from '../models/Enrollment';
import { AttendanceRecord, AttendanceStatus } from '../models/AttendanceRecord';
import { CourseOffering } from '../models/CourseOffering';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { Course } from '../models/Course';
import { Department } from '../models/Department';
import { Term, TermStatus } from '../models/Term';
import { OfferingFaculty, FacultyRole } from '../models/OfferingFaculty';
import { Session, SessionStatus } from '../models/Session';
import { User } from '../models/User';

export class ReportsController {
  // Get enrollment report by term
  static async enrollmentByTerm(req: AuthRequest, res: Response) {
    try {
      const { termId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(termId)) {
        return errorResponse(res, 'Invalid term ID', 400);
      }

      const term = await Term.findById(termId);
      if (!term) {
        return errorResponse(res, 'Term not found', 404);
      }

      // Get all offerings for this term
      const offerings = await CourseOffering.find({ termId }).lean();

      const offeringIds = offerings.map(o => o._id);

      // Get enrollments for these offerings
      const enrollments = await Enrollment.find({
        offeringId: { $in: offeringIds }
      })
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: [
            { path: 'courseId', model: 'Course' },
            { path: 'termId', model: 'Term' }
          ]
        })
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId', model: 'User', select: 'name email' },
            { path: 'departmentId', model: 'Department' }
          ]
        })
        .lean();

      // Calculate summary statistics
      const totalEnrollments = enrollments.length;
      const uniqueStudents = new Set(enrollments.map(e => e.studentId._id.toString()));
      const totalStudents = uniqueStudents.size;
      const totalCourses = offerings.length;

      // By department
      const byDepartment: Record<string, any> = {};
      for (const enrollment of enrollments) {
        const dept = (enrollment.studentId as any).departmentId;
        if (dept) {
          const deptName = dept.name;
          if (!byDepartment[deptName]) {
            byDepartment[deptName] = {
              departmentId: dept._id,
              enrollments: 0,
              students: new Set()
            };
          }
          byDepartment[deptName].enrollments++;
          byDepartment[deptName].students.add(enrollment.studentId._id.toString());
        }
      }

      // Convert Sets to counts
      for (const key in byDepartment) {
        byDepartment[key].students = byDepartment[key].students.size;
      }

      // By course
      const byCourse: any[] = [];
      for (const offering of offerings as any[]) {
        const courseEnrollments = enrollments.filter(e => 
          e.offeringId._id.toString() === offering._id.toString()
        );
        const course = await Course.findById(offering.courseId).lean();
        byCourse.push({
          offeringId: offering._id,
          courseCode: course?.code,
          courseName: course?.name,
          credits: course?.credits,
          capacity: offering.capacity,
          enrolled: courseEnrollments.length,
          available: offering.capacity - courseEnrollments.length
        });
      }

      const report = {
        termId,
        termName: term.name,
        summary: {
          totalEnrollments,
          totalStudents,
          totalCourses,
          byDepartment,
          byCourse
        },
        enrollments
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Course enrollment report
  static async courseEnrollment(req: AuthRequest, res: Response) {
    try {
      const { termId, departmentId, courseId } = req.query;

      const matchStage: any = {};

      if (termId && mongoose.Types.ObjectId.isValid(termId as string)) {
        matchStage.termId = new mongoose.Types.ObjectId(termId as string);
      }

      if (departmentId && mongoose.Types.ObjectId.isValid(departmentId as string)) {
        matchStage.departmentId = new mongoose.Types.ObjectId(departmentId as string);
      }

      // Build aggregation pipeline
      const pipeline: any[] = [
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'course'
          }
        },
        {
          $unwind: '$course'
        }
      ];

      if (courseId && mongoose.Types.ObjectId.isValid(courseId as string)) {
        matchStage['course._id'] = new mongoose.Types.ObjectId(courseId as string);
      }

      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }

      pipeline.push(
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'offeringId',
            as: 'enrollments'
          }
        },
        {
          $project: {
            _id: 1,
            course: {
              _id: '$course._id',
              name: '$course.name',
              code: '$course.code',
              credits: '$course.credits',
              departmentId: '$course.departmentId'
            },
            termId: 1,
            capacity: 1,
            enrollmentCount: { $size: '$enrollments' },
            enrolledStudents: '$enrollments.studentId'
          }
        }
      );

      const offerings = await CourseOffering.aggregate(pipeline);

      // Calculate summary
      let totalEnrollments = 0;
      const byDepartment: Record<string, any> = {};
      const byCourse: any[] = [];

      for (const offering of offerings) {
        totalEnrollments += offering.enrollmentCount;
        const deptId = offering.course.departmentId.toString();

        if (!byDepartment[deptId]) {
          const dept = await Department.findById(deptId).lean();
          byDepartment[deptId] = {
            departmentId: deptId,
            departmentName: dept?.name || 'Unknown',
            enrollmentCount: 0
          };
        }
        byDepartment[deptId].enrollmentCount += offering.enrollmentCount;

        byCourse.push({
          offeringId: offering._id,
          courseName: offering.course.name,
          courseCode: offering.course.code,
          credits: offering.course.credits,
          capacity: offering.capacity,
          enrolledCount: offering.enrollmentCount,
          availableSeats: offering.capacity - offering.enrollmentCount,
          fillRate: offering.capacity > 0 
            ? Math.round((offering.enrollmentCount / offering.capacity) * 100) 
            : 0
        });
      }

      const report = {
        filters: { termId, departmentId, courseId },
        summary: {
          totalCourses: offerings.length,
          totalEnrollments,
          byDepartment,
          byCourse
        },
        courses: byCourse
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Student attendance report
  static async studentAttendance(req: AuthRequest, res: Response) {
    try {
      const { termId, departmentId, studentId } = req.query;

      const matchStage: any = {};

      if (studentId && mongoose.Types.ObjectId.isValid(studentId as string)) {
        matchStage.studentId = new mongoose.Types.ObjectId(studentId as string);
      }

      // Get sessions for the term
      const sessionMatch: any = { status: SessionStatus.COMPLETED };
      if (termId && mongoose.Types.ObjectId.isValid(termId as string)) {
        const offerings = await CourseOffering.find({ termId }).lean();
        sessionMatch.offeringId = { $in: offerings.map(o => o._id) };
      }

      const sessions = await Session.find(sessionMatch).lean();
      const sessionIds = sessions.map(s => s._id);

      // Get attendance records
      const attendanceMatch: any = { sessionId: { $in: sessionIds } };
      if (matchStage.studentId) {
        attendanceMatch.studentId = matchStage.studentId;
      }

      const attendanceRecords = await AttendanceRecord.find(attendanceMatch)
        .populate('sessionId')
        .populate({
          path: 'sessionId',
          populate: {
            path: 'offeringId',
            populate: [
              { path: 'courseId', model: 'Course' },
              { path: 'termId', model: 'Term' }
            ]
          }
        })
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId', model: 'User', select: 'name email' },
            { path: 'departmentId', model: 'Department' }
          ]
        })
        .lean();

      // Calculate statistics
      const totalStudents = new Set(attendanceRecords.map(r => r.studentId._id.toString())).size;
      let totalPresent = 0;
      const byStudent: Record<string, any> = {};
      const byCourse: Record<string, any> = {};
      let criticalCount = 0;

      for (const record of attendanceRecords) {
        const student = record.studentId as any;
        const session = record.sessionId as any;
        const course = session.offeringId?.courseId;

        if (!byStudent[student._id]) {
          byStudent[student._id] = {
            studentId: student._id,
            studentName: student.userId?.name,
            departmentName: student.departmentId?.name,
            totalSessions: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendanceRate: 0
          };
        }

        byStudent[student._id].totalSessions++;
        if (record.status === AttendanceStatus.PRESENT) {
          byStudent[student._id].present++;
          totalPresent++;
        } else if (record.status === AttendanceStatus.ABSENT) {
          byStudent[student._id].absent++;
        } else if (record.status === AttendanceStatus.LATE) {
          byStudent[student._id].late++;
          totalPresent++; // Late counts as present
        } else if (record.status === AttendanceStatus.EXCUSED) {
          byStudent[student._id].excused++;
        }

        // By course
        if (course) {
          const courseId = course._id.toString();
          if (!byCourse[courseId]) {
            byCourse[courseId] = {
              courseId: course._id,
              courseCode: course.code,
              courseName: course.name,
              totalSessions: 0,
              present: 0,
              absent: 0,
              attendanceRate: 0
            };
          }
          byCourse[courseId].totalSessions++;
          if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE) {
            byCourse[courseId].present++;
          } else if (record.status === AttendanceStatus.ABSENT) {
            byCourse[courseId].absent++;
          }
        }
      }

      // Calculate rates
      const byStudentArray = Object.values(byStudent);
      for (const student of byStudentArray) {
        const attended = student.present + student.late;
        student.attendanceRate = student.totalSessions > 0
          ? Math.round((attended / student.totalSessions) * 100)
          : 0;
        if (student.attendanceRate < 75) {
          criticalCount++;
        }
      }

      const byCourseArray = Object.values(byCourse);
      for (const course of byCourseArray) {
        course.attendanceRate = course.totalSessions > 0
          ? Math.round((course.present / course.totalSessions) * 100)
          : 0;
      }

      const overallAttendanceRate = attendanceRecords.length > 0
        ? Math.round((totalPresent / attendanceRecords.length) * 100)
        : 0;

      const report = {
        filters: { termId, departmentId, studentId },
        summary: {
          totalStudents,
          overallAttendanceRate,
          criticalCount
        },
        byStudent: byStudentArray,
        byCourse: byCourseArray
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Enrollment status report
  static async enrollmentStatusReport(req: AuthRequest, res: Response) {
    try {
      const { termId, departmentId } = req.query;

      const matchStage: any = {};
      if (termId && mongoose.Types.ObjectId.isValid(termId as string)) {
        matchStage.termId = new mongoose.Types.ObjectId(termId as string);
      }
      if (departmentId && mongoose.Types.ObjectId.isValid(departmentId as string)) {
        matchStage.departmentId = new mongoose.Types.ObjectId(departmentId as string);
      }

      // Get offerings
      const offerings = await CourseOffering.find(
        Object.keys(matchStage).length > 0 ? matchStage : {}
      ).lean();

      const offeringIds = offerings.map(o => o._id);

      // Get enrollments
      const enrollments = await Enrollment.find({
        offeringId: { $in: offeringIds }
      })
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: [
            { path: 'courseId', model: 'Course' },
            { path: 'termId', model: 'Term' }
          ]
        })
        .lean();

      // Calculate summary by status
      const byStatus: Record<string, number> = {};
      for (const status of Object.values(EnrollmentStatus)) {
        byStatus[status] = 0;
      }

      for (const enrollment of enrollments) {
        byStatus[enrollment.status]++;
      }

      // By course
      const byCourseMap: Record<string, any> = {};
      for (const enrollment of enrollments) {
        const offering = enrollment.offeringId as any;
        const course = offering?.courseId;
        if (!course) continue;

        const courseId = course._id.toString();
        if (!byCourseMap[courseId]) {
          byCourseMap[courseId] = {
            courseId: course._id,
            courseCode: course.code,
            courseName: course.name,
            credits: course.credits,
            byStatus: {
              enrolled: 0,
              dropped: 0,
              completed: 0,
              failed: 0,
              incomplete: 0
            }
          };
        }
        byCourseMap[courseId].byStatus[enrollment.status]++;
      }

      // By department
      const byDepartmentMap: Record<string, any> = {};
      for (const enrollment of enrollments) {
        const offering = enrollment.offeringId as any;
        const course = offering?.courseId;
        if (!course || !course.departmentId) continue;

        const deptId = course.departmentId.toString();
        if (!byDepartmentMap[deptId]) {
          const dept = await Department.findById(deptId).lean();
          byDepartmentMap[deptId] = {
            departmentId: deptId,
            departmentName: dept?.name || 'Unknown',
            byStatus: {
              enrolled: 0,
              dropped: 0,
              completed: 0,
              failed: 0,
              incomplete: 0
            }
          };
        }
        byDepartmentMap[deptId].byStatus[enrollment.status]++;
      }

      const report = {
        filters: { termId, departmentId },
        summary: {
          totalEnrollments: enrollments.length,
          active: byStatus[EnrollmentStatus.ENROLLED],
          dropped: byStatus[EnrollmentStatus.DROPPED],
          completed: byStatus[EnrollmentStatus.COMPLETED],
          byStatus
        },
        byCourse: Object.values(byCourseMap),
        byDepartment: Object.values(byDepartmentMap)
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Term overview report
  static async termOverview(req: AuthRequest, res: Response) {
    try {
      const { termId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(termId)) {
        return errorResponse(res, 'Invalid term ID', 400);
      }

      const term = await Term.findById(termId);
      if (!term) {
        return errorResponse(res, 'Term not found', 404);
      }

      // Get offerings for this term
      const offerings = await CourseOffering.find({ termId }).lean();
      const offeringIds = offerings.map(o => o._id);

      // Get unique course IDs
      const courseIds = offerings.map(o => o.courseId);
      const uniqueCourses = new Set(courseIds.map(id => id.toString()));

      // Get enrollments
      const enrollments = await Enrollment.find({
        offeringId: { $in: offeringIds }
      }).lean();

      const activeEnrollments = enrollments.filter(
        e => e.status === EnrollmentStatus.ENROLLED
      );

      // Get unique students
      const uniqueStudents = new Set(enrollments.map(e => e.studentId.toString()));

      // Get faculty assigned to offerings
      const offeringFaculty = await OfferingFaculty.find({
        offeringId: { $in: offeringIds }
      }).lean();

      const uniqueFaculty = new Set(offeringFaculty.map(of => of.facultyId.toString()));

      // Get sessions for attendance calculation
      const sessions = await Session.find({
        offeringId: { $in: offeringIds },
        status: SessionStatus.COMPLETED
      }).lean();

      const sessionIds = sessions.map(s => s._id);
      const attendanceRecords = await AttendanceRecord.find({
        sessionId: { $in: sessionIds }
      }).lean();

      const presentCount = attendanceRecords.filter(
        r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
      ).length;

      const averageAttendance = attendanceRecords.length > 0
        ? Math.round((presentCount / attendanceRecords.length) * 100)
        : 0;

      // By department
      const byDepartment: any[] = [];
      const departmentMap: Record<string, any> = {};

      for (const offering of offerings) {
        const course = await Course.findById(offering.courseId).lean();
        if (!course || !course.departmentId) continue;

        const deptId = course.departmentId.toString();
        if (!departmentMap[deptId]) {
          const dept = await Department.findById(deptId).lean();
          departmentMap[deptId] = {
            departmentId: deptId,
            departmentName: dept?.name || 'Unknown',
            offerings: 0,
            enrollments: 0
          };
        }
        departmentMap[deptId].offerings++;
      }

      for (const enrollment of enrollments) {
        const offering = await CourseOffering.findById(enrollment.offeringId).lean();
        if (!offering) continue;
        const course = await Course.findById(offering.courseId).lean();
        if (!course || !course.departmentId) continue;

        const deptId = course.departmentId.toString();
        if (departmentMap[deptId]) {
          departmentMap[deptId].enrollments++;
        }
      }

      byDepartment.push(...Object.values(departmentMap));

      const report = {
        termId,
        termName: term.name,
        termStatus: term.status,
        startDate: term.startDate,
        endDate: term.endDate,
        summary: {
          totalOfferings: offerings.length,
          totalCourses: uniqueCourses.size,
          totalEnrollments: enrollments.length,
          activeEnrollments: activeEnrollments.length,
          totalFaculty: uniqueFaculty.size,
          activeStudents: uniqueStudents.size,
          averageAttendance,
          averageGPA: 0 // GPA calculation would require grade field
        },
        byDepartment
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get attendance report
  static async attendanceReport(req: AuthRequest, res: Response) {
    try {
      const { termId, departmentId, courseId } = req.query;

      const sessionMatch: any = { status: SessionStatus.COMPLETED };

      if (termId && mongoose.Types.ObjectId.isValid(termId as string)) {
        const offerings = await CourseOffering.find({ termId }).lean();
        sessionMatch.offeringId = { $in: offerings.map(o => o._id) };
      }

      const sessions = await Session.find(sessionMatch).lean();
      const sessionIds = sessions.map(s => s._id);

      let attendanceQuery: any = { sessionId: { $in: sessionIds } };

      const attendanceRecords = await AttendanceRecord.find(attendanceQuery)
        .populate('sessionId')
        .populate({
          path: 'sessionId',
          populate: {
            path: 'offeringId',
            populate: [
              { path: 'courseId', model: 'Course' },
              { path: 'termId', model: 'Term' }
            ]
          }
        })
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId', model: 'User', select: 'name email' },
            { path: 'departmentId', model: 'Department' }
          ]
        })
        .lean();

      // Apply department filter if provided
      let filteredRecords = attendanceRecords;
      if (departmentId) {
        filteredRecords = filteredRecords.filter(r => {
          const student = r.studentId as any;
          return student.departmentId?._id.toString() === departmentId;
        });
      }

      // Apply course filter if provided
      if (courseId) {
        filteredRecords = filteredRecords.filter(r => {
          const session = r.sessionId as any;
          return session.offeringId?.courseId?._id.toString() === courseId;
        });
      }

      // Calculate summary
      const totalSessions = sessions.length;
      const totalRecords = filteredRecords.length;

      const byStatus = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      };

      for (const record of filteredRecords) {
        byStatus[record.status]++;
      }

      const overallAttendanceRate = totalRecords > 0
        ? Math.round(((byStatus.present + byStatus.late) / totalRecords) * 100)
        : 0;

      // By course
      const byCourseMap: Record<string, any> = {};
      for (const record of filteredRecords) {
        const session = record.sessionId as any;
        const course = session.offeringId?.courseId;
        if (!course) continue;

        const courseId = course._id.toString();
        if (!byCourseMap[courseId]) {
          byCourseMap[courseId] = {
            courseId: course._id,
            courseCode: course.code,
            courseName: course.name,
            totalSessions: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendanceRate: 0
          };
        }
        byCourseMap[courseId].totalSessions++;
        byCourseMap[courseId][record.status]++;
      }

      for (const key in byCourseMap) {
        const course = byCourseMap[key];
        const attended = course.present + course.late;
        course.attendanceRate = course.totalSessions > 0
          ? Math.round((attended / course.totalSessions) * 100)
          : 0;
      }

      // By department
      const byDepartmentMap: Record<string, any> = {};
      for (const record of filteredRecords) {
        const student = record.studentId as any;
        const dept = student.departmentId;
        if (!dept) continue;

        const deptId = dept._id.toString();
        if (!byDepartmentMap[deptId]) {
          byDepartmentMap[deptId] = {
            departmentId: dept._id,
            departmentName: dept.name,
            totalRecords: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendanceRate: 0
          };
        }
        byDepartmentMap[deptId].totalRecords++;
        byDepartmentMap[deptId][record.status]++;
      }

      for (const key in byDepartmentMap) {
        const dept = byDepartmentMap[key];
        const attended = dept.present + dept.late;
        dept.attendanceRate = dept.totalRecords > 0
          ? Math.round((attended / dept.totalRecords) * 100)
          : 0;
      }

      // Critical students (< 75% attendance)
      const studentAttendanceMap: Record<string, any> = {};
      for (const record of filteredRecords) {
        const studentId = record.studentId._id.toString();
        if (!studentAttendanceMap[studentId]) {
          const student = record.studentId as any;
          studentAttendanceMap[studentId] = {
            studentId: record.studentId._id,
            studentName: student.userId?.name,
            departmentName: student.departmentId?.name,
            totalRecords: 0,
            present: 0,
            late: 0
          };
        }
        studentAttendanceMap[studentId].totalRecords++;
        if (record.status === AttendanceStatus.PRESENT) {
          studentAttendanceMap[studentId].present++;
        } else if (record.status === AttendanceStatus.LATE) {
          studentAttendanceMap[studentId].late++;
        }
      }

      const criticalStudents = Object.values(studentAttendanceMap)
        .filter(s => {
          const attended = s.present + s.late;
          const rate = s.totalRecords > 0 ? (attended / s.totalRecords) * 100 : 0;
          return rate < 75;
        })
        .map(s => ({
          ...s,
          attendanceRate: Math.round(((s.present + s.late) / s.totalRecords) * 100)
        }));

      const report = {
        filters: { termId, departmentId, courseId },
        summary: {
          totalSessions,
          totalRecords,
          overallAttendanceRate,
          byStatus
        },
        byCourse: Object.values(byCourseMap),
        byDepartment: Object.values(byDepartmentMap),
        criticalStudents
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get grade report
  static async gradeReport(req: AuthRequest, res: Response) {
    try {
      const { termId, departmentId, courseId } = req.query;

      // Note: The Enrollment model doesn't have a grade field currently
      // This report would need the grade field to be added to the Enrollment schema
      // For now, returning empty structure with meaningful message

      const matchStage: any = {};

      if (termId && mongoose.Types.ObjectId.isValid(termId as string)) {
        matchStage.termId = new mongoose.Types.ObjectId(termId as string);
      }

      if (departmentId && mongoose.Types.ObjectId.isValid(departmentId as string)) {
        matchStage.departmentId = new mongoose.Types.ObjectId(departmentId as string);
      }

      const offerings = await CourseOffering.find(
        Object.keys(matchStage).length > 0 ? matchStage : {}
      ).lean();

      const offeringIds = offerings.map(o => o._id);

      const enrollments = await Enrollment.find({
        offeringId: { $in: offeringIds }
      })
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: [
            { path: 'courseId', model: 'Course' },
            { path: 'termId', model: 'Term' }
          ]
        })
        .populate({
          path: 'studentId',
          populate: [
            { path: 'userId', model: 'User', select: 'name email' },
            { path: 'departmentId', model: 'Department' }
          ]
        })
        .lean();

      // Filter by courseId if provided
      let filteredEnrollments = enrollments;
      if (courseId) {
        filteredEnrollments = filteredEnrollments.filter(e => {
          const offering = e.offeringId as any;
          return offering?.courseId?._id.toString() === courseId;
        });
      }

      const report = {
        filters: { termId, departmentId, courseId },
        summary: {
          totalGrades: 0,
          averageGradePoints: 0,
          gradeDistribution: {
            'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0
          },
          note: 'Grade field needs to be added to Enrollment schema for this report'
        },
        byCourse: [],
        byDepartment: [],
        byStudent: []
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get course offering report
  static async offeringReport(req: AuthRequest, res: Response) {
    try {
      const { termId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(termId)) {
        return errorResponse(res, 'Invalid term ID', 400);
      }

      const term = await Term.findById(termId);
      if (!term) {
        return errorResponse(res, 'Term not found', 404);
      }

      const offerings = await CourseOffering.find({ termId })
        .populate('courseId', 'name code credits departmentId')
        .populate('termId', 'name startDate endDate')
        .lean();

      const offeringIds = offerings.map(o => o._id);

      // Get enrollments for each offering
      const enrollments = await Enrollment.find({
        offeringId: { $in: offeringIds },
        status: EnrollmentStatus.ENROLLED
      }).lean();

      // Get faculty assignments
      const facultyAssignments = await OfferingFaculty.find({
        offeringId: { $in: offeringIds }
      })
        .populate('facultyId')
        .populate({
          path: 'facultyId',
          populate: [
            { path: 'userId', model: 'User', select: 'name email' },
            { path: 'departmentId', model: 'Department' }
          ]
        })
        .lean();

      // Calculate summary
      let totalCapacity = 0;
      let totalEnrolled = 0;
      const byDepartment: Record<string, any> = {};

      for (const offering of offerings as any[]) {
        totalCapacity += offering.capacity;
        const offeringEnrollments = enrollments.filter(
          e => e.offeringId.toString() === offering._id.toString()
        );
        totalEnrolled += offeringEnrollments.length;

        const deptId = offering.courseId?.departmentId?.toString();
        if (deptId) {
          if (!byDepartment[deptId]) {
            const dept = await Department.findById(deptId).lean();
            byDepartment[deptId] = {
              departmentId: deptId,
              departmentName: dept?.name || 'Unknown',
              totalOfferings: 0,
              totalCapacity: 0,
              totalEnrolled: 0
            };
          }
          byDepartment[deptId].totalOfferings++;
          byDepartment[deptId].totalCapacity += offering.capacity;
          byDepartment[deptId].totalEnrolled += offeringEnrollments.length;
        }
      }

      const utilizationRate = totalCapacity > 0
        ? Math.round((totalEnrolled / totalCapacity) * 100)
        : 0;

      const offeringsWithDetails = await Promise.all(
        offerings.map(async (offering: any) => {
          const offeringEnrollments = enrollments.filter(
            e => e.offeringId.toString() === offering._id.toString()
          );
          const offeringFaculty = facultyAssignments.filter(
            of => of.offeringId.toString() === offering._id.toString()
          );

          return {
            offeringId: offering._id,
            course: {
              id: offering.courseId._id,
              name: offering.courseId.name,
              code: offering.courseId.code,
              credits: offering.courseId.credits
            },
            schedule: offering.schedule,
            capacity: offering.capacity,
            enrolled: offeringEnrollments.length,
            available: offering.capacity - offeringEnrollments.length,
            fillRate: offering.capacity > 0
              ? Math.round((offeringEnrollments.length / offering.capacity) * 100)
              : 0,
            faculty: offeringFaculty.map(of => ({
              facultyId: of.facultyId._id,
              name: (of.facultyId as any).userId?.name,
              role: of.role
            }))
          };
        })
      );

      const report = {
        termId,
        termName: term.name,
        summary: {
          totalOfferings: offerings.length,
          totalCapacity,
          totalEnrolled,
          utilizationRate,
          byDepartment
        },
        offerings: offeringsWithDetails
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get faculty workload report
  static async facultyWorkload(req: AuthRequest, res: Response) {
    try {
      const { termId, departmentId } = req.query;

      const matchStage: any = {};
      if (termId && mongoose.Types.ObjectId.isValid(termId as string)) {
        matchStage.termId = new mongoose.Types.ObjectId(termId as string);
      }

      // Get offerings based on filters
      let offerings = await CourseOffering.find(
        Object.keys(matchStage).length > 0 ? matchStage : {}
      ).lean();

      const offeringIds = offerings.map(o => o._id);

      // Get faculty assignments
      const offeringFaculty = await OfferingFaculty.find({
        offeringId: { $in: offeringIds }
      })
        .populate('facultyId')
        .populate({
          path: 'facultyId',
          populate: [
            { path: 'userId', model: 'User', select: 'name email' },
            { path: 'departmentId', model: 'Department' }
          ]
        })
        .lean();

      // Get sessions for workload calculation
      const sessions = await Session.find({
        offeringId: { $in: offeringIds }
      }).lean();

      // Build faculty workload data
      const facultyWorkloadMap: Record<string, any> = {};

      for (const of of offeringFaculty) {
        const faculty = of.facultyId as any;
        const facultyId = faculty._id.toString();

        // Apply department filter if provided
        if (departmentId && faculty.departmentId?._id.toString() !== departmentId) {
          continue;
        }

        if (!facultyWorkloadMap[facultyId]) {
          facultyWorkloadMap[facultyId] = {
            facultyId: faculty._id,
            name: faculty.userId?.name,
            email: faculty.userId?.email,
            departmentName: faculty.departmentId?.name,
            designation: faculty.designation,
            specialization: faculty.specialization,
            offerings: [],
            totalOfferings: 0,
            primaryOfferings: 0,
            secondaryOfferings: 0,
            totalSessions: 0,
            totalCredits: 0
          };
        }

        const offering = offerings.find(o => o._id.toString() === of.offeringId.toString());
        if (!offering) continue;

        const course = await Course.findById(offering.courseId).lean();
        if (!course) continue;

        facultyWorkloadMap[facultyId].offerings.push({
          offeringId: offering._id,
          courseCode: course.code,
          courseName: course.name,
          credits: course.credits,
          role: of.role
        });

        facultyWorkloadMap[facultyId].totalOfferings++;
        if (of.role === FacultyRole.PRIMARY) {
          facultyWorkloadMap[facultyId].primaryOfferings++;
        } else {
          facultyWorkloadMap[facultyId].secondaryOfferings++;
        }

        facultyWorkloadMap[facultyId].totalCredits += course.credits;
      }

      // Count sessions per faculty
      for (const session of sessions) {
        const sessionOfferingFaculty = offeringFaculty.filter(
          of => of.offeringId.toString() === session.offeringId.toString()
        );

        for (const of of sessionOfferingFaculty) {
          const facultyId = of.facultyId._id.toString();
          if (facultyWorkloadMap[facultyId]) {
            facultyWorkloadMap[facultyId].totalSessions++;
          }
        }
      }

      const facultyArray = Object.values(facultyWorkloadMap);

      const totalFaculty = facultyArray.length;
      const averageOfferings = totalFaculty > 0
        ? Math.round((facultyArray.reduce((sum, f) => sum + f.totalOfferings, 0) / totalFaculty) * 10) / 10
        : 0;
      const averageSessions = totalFaculty > 0
        ? Math.round((facultyArray.reduce((sum, f) => sum + f.totalSessions, 0) / totalFaculty) * 10) / 10
        : 0;

      const report = {
        filters: { termId, departmentId },
        summary: {
          totalFaculty,
          averageOfferings,
          averageSessions
        },
        faculty: facultyArray
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get student performance report
  static async studentPerformance(req: AuthRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { termId } = req.query;

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return errorResponse(res, 'Invalid student ID', 400);
      }

      const student = await Student.findById(studentId)
        .populate('userId', 'name email')
        .populate('departmentId', 'name code')
        .lean();

      if (!student) {
        return errorResponse(res, 'Student not found', 404);
      }

      // Get enrollments
      const enrollmentQuery: any = { studentId };
      const enrollments = await Enrollment.find(enrollmentQuery)
        .populate('offeringId')
        .populate({
          path: 'offeringId',
          populate: [
            { path: 'courseId', model: 'Course' },
            { path: 'termId', model: 'Term' }
          ]
        })
        .lean();

      // Filter by term if provided
      let filteredEnrollments = enrollments;
      if (termId) {
        filteredEnrollments = filteredEnrollments.filter(e => {
          const offering = e.offeringId as any;
          return offering?.termId?._id.toString() === termId;
        });
      }

      const offeringIds = filteredEnrollments.map(e => e.offeringId._id);

      // Get sessions and attendance
      const sessions = await Session.find({
        offeringId: { $in: offeringIds }
      }).lean();

      const sessionIds = sessions.map(s => s._id);

      const attendanceRecords = await AttendanceRecord.find({
        sessionId: { $in: sessionIds },
        studentId
      }).lean();

      // Calculate by term
      const byTermMap: Record<string, any> = {};
      const byCourseMap: Record<string, any> = {};

      let totalCourses = filteredEnrollments.length;
      let totalCredits = 0;
      let totalPresent = 0;
      let totalAttendanceRecords = attendanceRecords.length;

      for (const enrollment of filteredEnrollments) {
        const offering = enrollment.offeringId as any;
        if (!offering) continue;

        const course = offering.courseId;
        const term = offering.termId;

        if (course) {
          totalCredits += course.credits || 0;

          const courseId = course._id.toString();
          if (!byCourseMap[courseId]) {
            // Get attendance for this course
            const courseSessions = sessions.filter(
              s => s.offeringId.toString() === offering._id.toString()
            );
            const courseSessionIds = courseSessions.map(s => s._id);
            const courseAttendance = attendanceRecords.filter(
              ar => courseSessionIds.some(id => id.toString() === ar.sessionId.toString())
            );

            const present = courseAttendance.filter(
              ar => ar.status === AttendanceStatus.PRESENT || ar.status === AttendanceStatus.LATE
            ).length;

            byCourseMap[courseId] = {
              courseId: course._id,
              courseCode: course.code,
              courseName: course.name,
              credits: course.credits,
              status: enrollment.status,
              attendanceRate: courseAttendance.length > 0
                ? Math.round((present / courseAttendance.length) * 100)
                : 0,
              enrolledAt: enrollment.enrolledAt
            };
          }
        }

        if (term) {
          const termId = term._id.toString();
          if (!byTermMap[termId]) {
            byTermMap[termId] = {
              termId: term._id,
              termName: term.name,
              courses: 0,
              credits: 0,
              attendanceRate: 0
            };
          }
          byTermMap[termId].courses++;
          if (course) {
            byTermMap[termId].credits += course.credits || 0;
          }
        }
      }

      // Calculate term attendance rates
      for (const termId in byTermMap) {
        const termEnrollments = filteredEnrollments.filter(e => {
          const offering = e.offeringId as any;
          return offering?.termId?._id.toString() === termId;
        });

        const termOfferingIds = termEnrollments.map(e => e.offeringId._id);
        const termSessions = sessions.filter(
          s => termOfferingIds.some(oid => oid.toString() === s.offeringId.toString())
        );
        const termSessionIds = termSessions.map(s => s._id);
        const termAttendance = attendanceRecords.filter(
          ar => termSessionIds.some(sid => sid.toString() === ar.sessionId.toString())
        );

        const present = termAttendance.filter(
          ar => ar.status === AttendanceStatus.PRESENT || ar.status === AttendanceStatus.LATE
        ).length;

        byTermMap[termId].attendanceRate = termAttendance.length > 0
          ? Math.round((present / termAttendance.length) * 100)
          : 0;
      }

      const overallAttendance = totalAttendanceRecords > 0
        ? Math.round((totalPresent / totalAttendanceRecords) * 100)
        : 0;

      const report = {
        studentId: student._id,
        studentName: (student.userId as any)?.name,
        department: {
          id: student.departmentId?._id,
          name: (student.departmentId as any)?.name
        },
        rollNumber: student.rollNumber,
        semester: student.semester,
        summary: {
          totalCourses,
          totalCredits,
          gpa: 0, // Requires grade field in Enrollment
          overallAttendance
        },
        byTerm: Object.values(byTermMap),
        byCourse: Object.values(byCourseMap)
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get department summary report
  static async departmentSummary(req: AuthRequest, res: Response) {
    try {
      const { departmentId } = req.params;
      const { termId } = req.query;

      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return errorResponse(res, 'Invalid department ID', 400);
      }

      const department = await Department.findById(departmentId).lean();
      if (!department) {
        return errorResponse(res, 'Department not found', 404);
      }

      // Get students
      const students = await Student.find({ departmentId })
        .populate('userId', 'name email')
        .lean();

      const activeStudents = students.length;

      // Get faculty
      const faculty = await Faculty.find({ departmentId })
        .populate('userId', 'name email')
        .lean();

      const activeFaculty = faculty.length;

      // Get courses
      const courses = await Course.find({ departmentId }).lean();
      const totalCourses = courses.length;

      // Get offerings
      let offeringQuery: any = {};
      if (termId && mongoose.Types.ObjectId.isValid(termId as string)) {
        offeringQuery.termId = termId;
      }

      const courseIds = courses.map(c => c._id);
      const offerings = await CourseOffering.find({
        courseId: { $in: courseIds },
        ...offeringQuery
      }).lean();

      const offeringIds = offerings.map(o => o._id);

      // Get enrollments
      const enrollments = await Enrollment.find({
        offeringId: { $in: offeringIds }
      }).lean();

      // Get sessions and attendance
      const sessions = await Session.find({
        offeringId: { $in: offeringIds },
        status: SessionStatus.COMPLETED
      }).lean();

      const sessionIds = sessions.map(s => s._id);
      const attendanceRecords = await AttendanceRecord.find({
        sessionId: { $in: sessionIds }
      }).lean();

      const presentCount = attendanceRecords.filter(
        r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
      ).length;

      const averageAttendance = attendanceRecords.length > 0
        ? Math.round((presentCount / attendanceRecords.length) * 100)
        : 0;

      const report = {
        departmentId: department._id,
        departmentName: department.name,
        departmentCode: department.code,
        termId,
        summary: {
          students: {
            total: students.length,
            active: activeStudents
          },
          faculty: {
            total: faculty.length,
            active: activeFaculty
          },
          courses: {
            total: totalCourses,
            offerings: offerings.length
          },
          enrollments: enrollments.length
        },
        performance: {
          averageGPA: 0, // Requires grade field
          averageAttendance
        }
      };

      return successResponse(res, report);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Export report
  static async exportReport(req: AuthRequest, res: Response) {
    try {
      const { reportType, format, filters } = req.body;

      if (!reportType || !format) {
        return errorResponse(res, 'reportType and format are required', 400);
      }

      let data: any = {};
      let status: 'success' | 'failure' = 'success';

      // Generate report based on type
      switch (reportType) {
        case 'enrollment':
          if (filters?.termId) {
            const result = await this.enrollmentByTerm(
              { params: { termId: filters.termId }, user: req.user, ip: req.ip } as any,
              { json: (d: any) => d } as any
            );
            data = result;
          }
          break;
        case 'attendance':
          const result = await this.attendanceReport(
            { query: filters || {}, user: req.user, ip: req.ip } as any,
            { json: (d: any) => d } as any
          );
          data = result;
          break;
        case 'course_enrollment':
          const courseResult = await this.courseEnrollment(
            { query: filters || {}, user: req.user, ip: req.ip } as any,
            { json: (d: any) => d } as any
          );
          data = courseResult;
          break;
        case 'student_attendance':
          const studentAttResult = await this.studentAttendance(
            { query: filters || {}, user: req.user, ip: req.ip } as any,
            { json: (d: any) => d } as any
          );
          data = studentAttResult;
          break;
        case 'enrollment_status':
          const statusResult = await this.enrollmentStatusReport(
            { query: filters || {}, user: req.user, ip: req.ip } as any,
            { json: (d: any) => d } as any
          );
          data = statusResult;
          break;
        case 'term_overview':
          if (filters?.termId) {
            const termResult = await this.termOverview(
              { params: { termId: filters.termId }, user: req.user, ip: req.ip } as any,
              { json: (d: any) => d } as any
            );
            data = termResult;
          }
          break;
        case 'faculty_workload':
          const workloadResult = await this.facultyWorkload(
            { query: filters || {}, user: req.user, ip: req.ip } as any,
            { json: (d: any) => d } as any
          );
          data = workloadResult;
          break;
        case 'department_summary':
          if (filters?.departmentId) {
            const deptResult = await this.departmentSummary(
              { params: { departmentId: filters.departmentId }, query: { termId: filters.termId }, user: req.user, ip: req.ip } as any,
              { json: (d: any) => d } as any
            );
            data = deptResult;
          }
          break;
        default:
          status = 'failure';
          return errorResponse(res, 'Unknown report type', 400);
      }

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'export_report',
        targetType: 'report',
        targetId: reportType,
        status,
        metadata: { reportType, format, filters },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, {
        reportType,
        format,
        data,
        generatedAt: new Date()
      }, 'Report exported successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get dashboard statistics
  static async dashboardStats(req: AuthRequest, res: Response) {
    try {
      const { termId } = req.query;

      // Get active term if not specified
      let activeTerm = null;
      if (termId && mongoose.Types.ObjectId.isValid(termId as string)) {
        activeTerm = await Term.findById(termId).lean();
      } else {
        activeTerm = await Term.findOne({ status: TermStatus.ACTIVE }).lean();
      }

      const termFilter = activeTerm ? { termId: activeTerm._id } : {};

      // Count students, faculty, courses
      const totalStudents = await Student.countDocuments();
      const totalFaculty = await Faculty.countDocuments();
      const totalCourses = await Course.countDocuments();

      const activeOfferings = activeTerm
        ? await CourseOffering.countDocuments(termFilter)
        : 0;

      // Enrollment stats
      const offeringIds = activeTerm
        ? (await CourseOffering.find(termFilter).lean()).map(o => o._id)
        : [];

      const totalEnrollments = activeTerm && offeringIds.length > 0
        ? await Enrollment.countDocuments({
            offeringId: { $in: offeringIds },
            status: EnrollmentStatus.ENROLLED
          })
        : 0;

      // Get enrollments from start of month for new this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newThisMonth = activeTerm && offeringIds.length > 0
        ? await Enrollment.countDocuments({
            offeringId: { $in: offeringIds },
            enrolledAt: { $gte: startOfMonth }
          })
        : 0;

      // By department enrollment
      const enrollments = activeTerm && offeringIds.length > 0
        ? await Enrollment.find({
            offeringId: { $in: offeringIds }
          })
            .populate('offeringId')
            .lean()
        : [];

      const byDepartment: Record<string, number> = {};
      for (const enrollment of enrollments) {
        const offering = enrollment.offeringId as any;
        if (!offering) continue;
        const course = await Course.findById(offering.courseId).lean();
        if (!course?.departmentId) continue;

        const deptId = course.departmentId.toString();
        const dept = await Department.findById(deptId).lean();
        const deptName = dept?.name || 'Unknown';
        byDepartment[deptName] = (byDepartment[deptName] || 0) + 1;
      }

      // Attendance stats
      const sessions = activeTerm && offeringIds.length > 0
        ? await Session.find({
            offeringId: { $in: offeringIds },
            status: SessionStatus.COMPLETED
          }).lean()
        : [];

      const sessionIds = sessions.map(s => s._id);
      const attendanceRecords = sessionIds.length > 0
        ? await AttendanceRecord.find({ sessionId: { $in: sessionIds } }).lean()
        : [];

      const presentCount = attendanceRecords.filter(
        r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
      ).length;

      const overallRate = attendanceRecords.length > 0
        ? Math.round((presentCount / attendanceRecords.length) * 100)
        : 0;

      // Today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaySessions = sessions.filter(
        s => s.date >= today && s.date < tomorrow
      );
      const todaySessionIds = todaySessions.map(s => s._id);
      const todayRecords = todaySessionIds.length > 0
        ? await AttendanceRecord.find({ sessionId: { $in: todaySessionIds } }).lean()
        : [];

      const todayPresent = todayRecords.filter(
        r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
      ).length;
      const todayAbsent = todayRecords.length - todayPresent;

      // Grade stats (pending until grade field added)
      const pendingGrades = 0;
      const averageGPA = 0;

      const stats = {
        overview: {
          totalStudents,
          totalFaculty,
          totalCourses,
          activeOfferings
        },
        enrollment: {
          totalEnrollments,
          newThisMonth,
          byDepartment
        },
        attendance: {
          overallRate,
          todayPresent,
          todayAbsent
        },
        grades: {
          averageGPA,
          pendingGrades
        }
      };

      return successResponse(res, stats);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
