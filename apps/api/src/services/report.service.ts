import mongoose from 'mongoose';
import { 
  Enrollment, 
  EnrollmentStatus,
  AttendanceRecord,
  AttendanceStatus,
  Session,
  Student,
  Faculty,
  Department,
  Course,
  CourseOffering,
  Term
} from '../models';
import { AppError } from '../utils/errors';

/**
 * Report Service
 * Handles aggregation pipelines for analytics and reporting
 */

export interface EnrollmentReport {
  totalEnrollments: number;
  byStatus: Record<string, number>;
  byDepartment: Array<{ department: string; count: number }>;
  byCourse: Array<{ course: string; count: number }>;
  byTerm: Array<{ term: string; count: number }>;
}

export interface AttendanceReport {
  overallPercentage: number;
  totalStudents: number;
  totalSessions: number;
  byStatus: Record<string, number>;
  lowAttendanceStudents: Array<{
    studentId: string;
    studentName: string;
    percentage: number;
  }>;
}

export interface FacultyWorkload {
  facultyId: string;
  facultyName: string;
  department: string;
  totalOfferings: number;
  totalStudents: number;
  totalSessions: number;
  averageAttendance: number;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  totalStudents: number;
  totalFaculty: number;
  totalCourses: number;
  totalOfferings: number;
  activeEnrollments: number;
}

export interface TrendData {
  period: string;
  enrollments: number;
  attendance: number;
}

/**
 * Generate comprehensive enrollment report
 */
export const generateEnrollmentReport = async (
  filters?: {
    departmentId?: string;
    termId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<EnrollmentReport> => {
  const matchStage: any = {};

  if (filters?.departmentId) {
    // Get course IDs for the department
    const courses = await Course.find({ departmentId: filters.departmentId });
    const courseIds = courses.map(c => c._id);
    
    // Get offerings for these courses
    const offerings = await CourseOffering.find({ courseId: { $in: courseIds } });
    const offeringIds = offerings.map(o => o._id);
    
    matchStage.offeringId = { $in: offeringIds };
  }

  if (filters?.termId) {
    const offerings = await CourseOffering.find({ termId: filters.termId });
    const offeringIds = offerings.map(o => o._id);
    
    if (matchStage.offeringId) {
      matchStage.offeringId.$in = matchStage.offeringId.$in.filter(
        (id: any) => offeringIds.some(oid => oid.equals(id))
      );
    } else {
      matchStage.offeringId = { $in: offeringIds };
    }
  }

  if (filters?.startDate || filters?.endDate) {
    matchStage.enrolledAt = {};
    if (filters.startDate) matchStage.enrolledAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.enrolledAt.$lte = filters.endDate;
  }

  // Total enrollments
  const totalEnrollments = await Enrollment.countDocuments(matchStage);

  // By status
  const byStatusResult = await Enrollment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const byStatus: Record<string, number> = {
    enrolled: 0,
    dropped: 0,
    completed: 0,
    failed: 0,
    incomplete: 0
  };

  byStatusResult.forEach(item => {
    byStatus[item._id] = item.count;
  });

  // By department (requires joining through Course and CourseOffering)
  const byDepartmentResult = await Enrollment.aggregate([
    {
      $lookup: {
        from: 'course_offerings',
        localField: 'offeringId',
        foreignField: '_id',
        as: 'offering'
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'offering.courseId',
        foreignField: '_id',
        as: 'course'
      }
    },
    {
      $lookup: {
        from: 'departments',
        localField: 'course.departmentId',
        foreignField: '_id',
        as: 'department'
      }
    },
    { $unwind: '$offering' },
    { $unwind: '$course' },
    { $unwind: '$department' },
    {
      $group: {
        _id: '$department.name',
        count: { $sum: 1 }
      }
    }
  ]);

  const byDepartment = byDepartmentResult.map(item => ({
    department: item._id,
    count: item.count
  }));

  // By course
  const byCourseResult = await Enrollment.aggregate([
    {
      $lookup: {
        from: 'course_offerings',
        localField: 'offeringId',
        foreignField: '_id',
        as: 'offering'
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'offering.courseId',
        foreignField: '_id',
        as: 'course'
      }
    },
    { $unwind: '$offering' },
    { $unwind: '$course' },
    {
      $group: {
        _id: '$course.name',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  const byCourse = byCourseResult.map(item => ({
    course: item._id,
    count: item.count
  }));

  // By term
  const byTermResult = await Enrollment.aggregate([
    {
      $lookup: {
        from: 'course_offerings',
        localField: 'offeringId',
        foreignField: '_id',
        as: 'offering'
      }
    },
    {
      $lookup: {
        from: 'terms',
        localField: 'offering.termId',
        foreignField: '_id',
        as: 'term'
      }
    },
    { $unwind: '$offering' },
    { $unwind: '$term' },
    {
      $group: {
        _id: '$term.name',
        count: { $sum: 1 }
      }
    }
  ]);

  const byTerm = byTermResult.map(item => ({
    term: item._id,
    count: item.count
  }));

  return {
    totalEnrollments,
    byStatus,
    byDepartment,
    byCourse,
    byTerm
  };
};

/**
 * Generate comprehensive attendance report
 */
export const generateAttendanceReport = async (
  offeringId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<AttendanceReport> => {
  const matchStage: any = {};

  if (offeringId) {
    const sessions = await Session.find({ offeringId });
    const sessionIds = sessions.map(s => s._id);
    matchStage.sessionId = { $in: sessionIds };
  }

  if (startDate || endDate) {
    const sessionMatch: any = {};
    if (startDate) sessionMatch.date = { ...sessionMatch.date, $gte: startDate };
    if (endDate) sessionMatch.date = { ...sessionMatch.date, $lte: endDate };
    
    const sessions = await Session.find(sessionMatch);
    const sessionIds = sessions.map(s => s._id);
    
    if (matchStage.sessionId) {
      matchStage.sessionId.$in = matchStage.sessionId.$in.filter(
        (id: any) => sessionIds.some(sid => sid.equals(id))
      );
    } else {
      matchStage.sessionId = { $in: sessionIds };
    }
  }

  // Get unique students
  const uniqueStudents = await AttendanceRecord.distinct('studentId', matchStage);
  const totalStudents = uniqueStudents.length;

  // Get total sessions
  let totalSessions = 0;
  if (offeringId) {
    totalSessions = await Session.countDocuments({ offeringId });
  }

  // By status
  const byStatusResult = await AttendanceRecord.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const byStatus: Record<string, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0
  };

  byStatusResult.forEach(item => {
    byStatus[item._id] = item.count;
  });

  // Calculate overall percentage
  const totalRecords = await AttendanceRecord.countDocuments(matchStage);
  const presentRecords = (byStatus.present || 0) + (byStatus.late || 0) + (byStatus.excused || 0);
  const overallPercentage = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

  // Low attendance students (below 75%)
  const lowAttendanceStudents = await AttendanceRecord.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$studentId',
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [
              { $in: ['$status', [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED]] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        studentId: '$_id',
        total: 1,
        present: 1,
        percentage: { $multiply: [{ $divide: ['$present', '$total'] }, 100] }
      }
    },
    {
      $match: { percentage: { $lt: 75 } }
    },
    {
      $lookup: {
        from: 'students',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student'
      }
    },
    { $unwind: '$student' },
    {
      $lookup: {
        from: 'users',
        localField: 'student.userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        studentId: '$student._id',
        studentName: '$user.name',
        percentage: 1
      }
    },
    { $sort: { percentage: 1 } }
  ]);

  return {
    overallPercentage,
    totalStudents,
    totalSessions,
    byStatus,
    lowAttendanceStudents: lowAttendanceStudents.map(item => ({
      studentId: item.studentId.toString(),
      studentName: item.studentName,
      percentage: parseFloat(item.percentage.toFixed(2))
    }))
  };
};

/**
 * Generate faculty workload report
 */
export const generateFacultyWorkloadReport = async (
  departmentId?: string
): Promise<FacultyWorkload[]> => {
  const matchStage: any = {};

  if (departmentId) {
    matchStage.departmentId = new mongoose.Types.ObjectId(departmentId);
  }

  const facultyList = await Faculty.find(matchStage).populate('userId');

  const workloadReports = [];

  for (const faculty of facultyList) {
    const facultyUser: any = faculty.userId;

    // Get offerings for this faculty
    // Note: You'll need to implement OfferingFaculty model properly
    // For now, this is a placeholder
    const totalOfferings = 0; // Placeholder
    const totalStudents = 0; // Placeholder
    const totalSessions = 0; // Placeholder
    const averageAttendance = 0; // Placeholder

    workloadReports.push({
      facultyId: faculty._id.toString(),
      facultyName: `${facultyUser.firstName} ${facultyUser.lastName}`.trim(),
      department: departmentId || 'N/A',
      totalOfferings,
      totalStudents,
      totalSessions,
      averageAttendance
    });
  }

  return workloadReports;
};

/**
 * Generate department statistics
 */
export const generateDepartmentStats = async (): Promise<DepartmentStats[]> => {
  const departments = await Department.find();

  const stats = [];

  for (const dept of departments) {
    const totalStudents = await Student.countDocuments({ departmentId: dept._id });
    const totalFaculty = await Faculty.countDocuments({ departmentId: dept._id });
    
    const courses = await Course.find({ departmentId: dept._id });
    const totalCourses = courses.length;

    const courseIds = courses.map(c => c._id);
    const offerings = await CourseOffering.find({ courseId: { $in: courseIds } });
    const totalOfferings = offerings.length;

    const offeringIds = offerings.map(o => o._id);
    const activeEnrollments = await Enrollment.countDocuments({
      offeringId: { $in: offeringIds },
      status: EnrollmentStatus.ENROLLED
    });

    stats.push({
      departmentId: dept._id.toString(),
      departmentName: dept.name,
      totalStudents,
      totalFaculty,
      totalCourses,
      totalOfferings,
      activeEnrollments
    });
  }

  return stats;
};

/**
 * Generate enrollment trends over time
 */
export const generateEnrollmentTrends = async (
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<TrendData[]> => {
  const groupByFormat = groupBy === 'day' ? '%Y-%m-%d' : 
                       groupBy === 'week' ? '%Y-W%V' : '%Y-%m';

  const trends = await Enrollment.aggregate([
    {
      $match: {
        enrolledAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: groupByFormat, date: '$enrolledAt' }
        },
        enrollments: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return trends.map(item => ({
    period: item._id,
    enrollments: item.enrollments,
    attendance: 0 // Placeholder for combined trends
  }));
};

/**
 * Generate course performance report
 */
export const generateCoursePerformanceReport = async (
  courseId: string
): Promise<any> => {
  const offerings = await CourseOffering.find({ courseId });
  const offeringIds = offerings.map(o => o._id);

  const enrollments = await Enrollment.find({
    offeringId: { $in: offeringIds }
  });

  const stats = {
    courseId,
    totalOfferings: offerings.length,
    totalEnrollments: enrollments.length,
    completionRate: 0,
    averageGrade: 0 // Placeholder - requires grade model
  };

  // Calculate completion rate
  const completed = enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length;
  stats.completionRate = enrollments.length > 0 ? (completed / enrollments.length) * 100 : 0;

  return stats;
};

/**
 * Get dashboard KPIs
 */
export const getDashboardKPIs = async (): Promise<any> => {
  const [
    totalStudents,
    totalFaculty,
    totalDepartments,
    totalCourses,
    activeEnrollments,
    currentTermOfferings
  ] = await Promise.all([
    Student.countDocuments(),
    Faculty.countDocuments(),
    Department.countDocuments(),
    Course.countDocuments(),
    Enrollment.countDocuments({ status: EnrollmentStatus.ENROLLED }),
    CourseOffering.countDocuments()
  ]);

  // Get current term (most recent)
  const currentTerm = await Term.findOne().sort({ startDate: -1 });

  return {
    totalStudents,
    totalFaculty,
    totalDepartments,
    totalCourses,
    activeEnrollments,
    currentTermOfferings,
    currentTerm: currentTerm?.name || 'N/A'
  };
};
