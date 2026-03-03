import mongoose, { ClientSession } from 'mongoose';
import { Course, ICourse, Enrollment, EnrollmentStatus, Student } from '../models';
import { AppError } from '../utils/errors';

/**
 * Courses Service
 * Handles business logic for course management with prerequisite validations
 */

export interface PrerequisiteCheckResult {
  satisfied: boolean;
  missingPrerequisites: Array<{
    courseId: string;
    courseCode: string;
    courseName: string;
  }>;
}

export interface CourseEligibilityResult {
  eligible: boolean;
  reasons: string[];
  missingPrerequisites?: PrerequisiteCheckResult['missingPrerequisites'];
}

/**
 * Check if student has completed prerequisites for a course
 */
export const checkPrerequisites = async (
  studentId: string,
  courseId: string
): Promise<PrerequisiteCheckResult> => {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // If no prerequisites, return satisfied
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return {
      satisfied: true,
      missingPrerequisites: []
    };
  }

  // Get student's completed courses
  const completedEnrollments = await Enrollment.find({
    studentId,
    status: { $in: [EnrollmentStatus.COMPLETED] }
  }).populate({
    path: 'offeringId',
    populate: {
      path: 'courseId'
    }
  });

  const completedCourseIds = new Set(
    completedEnrollments
      .map((e: any) => e.offeringId?.courseId?._id?.toString())
      .filter(Boolean)
  );

  // Check which prerequisites are missing
  const missingPrerequisites: PrerequisiteCheckResult['missingPrerequisites'] = [];

  for (const prereqId of course.prerequisites) {
    if (!completedCourseIds.has(prereqId.toString())) {
      const prereqCourse = await Course.findById(prereqId);

      if (prereqCourse) {
        missingPrerequisites.push({
          courseId: prereqCourse._id.toString(),
          courseCode: prereqCourse.code,
          courseName: prereqCourse.name
        });
      }
    }
  }

  return {
    satisfied: missingPrerequisites.length === 0,
    missingPrerequisites
  };
};

/**
 * Check if student is eligible to enroll in a course
 */
export const checkCourseEligibility = async (
  studentId: string,
  courseId: string
): Promise<CourseEligibilityResult> => {
  const reasons: string[] = [];

  // Check if student exists
  const student = await Student.findById(studentId);
  if (!student) {
    return {
      eligible: false,
      reasons: ['Student not found']
    };
  }

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return {
      eligible: false,
      reasons: ['Course not found']
    };
  }

  // Check department match (optional - some colleges allow cross-department)
  if (!course.departmentId.equals(student.departmentId)) {
    // For now, we'll allow cross-department but log it
    // Remove this block if cross-department enrollment should be blocked
    // reasons.push('Course is from a different department');
  }

  // Check prerequisites
  const prereqCheck = await checkPrerequisites(studentId, courseId);

  if (!prereqCheck.satisfied) {
    reasons.push(
      `Missing prerequisites: ${prereqCheck.missingPrerequisites
        .map(p => p.courseCode)
        .join(', ')}`
    );

    return {
      eligible: false,
      reasons,
      missingPrerequisites: prereqCheck.missingPrerequisites
    };
  }

  // Check if student is already enrolled or has taken the course
  const existingEnrollments = await Enrollment.aggregate([
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId)
      }
    },
    {
      $lookup: {
        from: 'course_offerings',
        localField: 'offeringId',
        foreignField: '_id',
        as: 'offering'
      }
    },
    {
      $unwind: '$offering'
    },
    {
      $match: {
        'offering.courseId': new mongoose.Types.ObjectId(courseId)
      }
    }
  ]);

  if (existingEnrollments.length > 0) {
    const status = existingEnrollments[0].status;
    if (status === EnrollmentStatus.COMPLETED) {
      reasons.push('Already completed this course');
    } else if (status === EnrollmentStatus.ENROLLED) {
      reasons.push('Already enrolled in this course');
    } else if (status === EnrollmentStatus.FAILED) {
      // Student can retake failed courses
      // reasons.push('Previously failed this course - may retake');
    }

    if (status !== EnrollmentStatus.FAILED && status !== EnrollmentStatus.DROPPED) {
      return {
        eligible: false,
        reasons
      };
    }
  }

  return {
    eligible: true,
    reasons: []
  };
};

/**
 * Create a new course with prerequisite validation
 */
export const createCourse = async (
  courseData: {
    name: string;
    code: string;
    description?: string;
    credits: number;
    departmentId: string;
    prerequisites?: string[];
    elective?: boolean;
    level?: 'beginner' | 'intermediate' | 'advanced';
  },
  session?: ClientSession
): Promise<ICourse> => {
  // Check if course code already exists in department
  const existingCourse = await Course.findOne({
    code: courseData.code,
    departmentId: courseData.departmentId
  });

  if (existingCourse) {
    throw new AppError(
      `Course with code ${courseData.code} already exists in this department`,
      400
    );
  }

  // Validate prerequisites exist
  if (courseData.prerequisites && courseData.prerequisites.length > 0) {
    const prereqCourses = await Course.find({
      _id: { $in: courseData.prerequisites }
    });

    if (prereqCourses.length !== courseData.prerequisites.length) {
      throw new AppError('One or more prerequisite courses do not exist', 400);
    }

    // Check for self-reference
    if (courseData.prerequisites.some(prereqId => {
      // On create, we don't have an ID yet, so check by code
      return false; // Will be caught by pre-save middleware
    })) {
      throw new AppError('Course cannot be a prerequisite of itself', 400);
    }
  }

  // Create course
  const course = new Course({
    name: courseData.name,
    code: courseData.code,
    description: courseData.description,
    credits: courseData.credits,
    departmentId: courseData.departmentId,
    prerequisites: courseData.prerequisites || [],
    elective: courseData.elective || false,
    level: courseData.level || 'beginner'
  });

  try {
    if (session) {
      await course.save({ session });
    } else {
      await course.save();
    }
  } catch (error: any) {
    if (error.message.includes('Circular prerequisite')) {
      throw new AppError('Circular prerequisite chain detected', 400);
    }
    throw error;
  }

  return course;
};

/**
 * Update course with prerequisite validation
 */
export const updateCourse = async (
  courseId: string,
  updateData: Partial<{
    name: string;
    code: string;
    description: string;
    credits: number;
    departmentId: string;
    prerequisites: string[];
    elective: boolean;
    level: 'beginner' | 'intermediate' | 'advanced';
  }>,
  session?: ClientSession
): Promise<ICourse> => {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // If updating code, check for duplicates
  if (updateData.code && updateData.code !== course.code) {
    const existingCode = await Course.findOne({
      code: updateData.code,
      departmentId: updateData.departmentId || course.departmentId,
      _id: { $ne: courseId }
    });

    if (existingCode) {
      throw new AppError(
        `Course with code ${updateData.code} already exists in this department`,
        400
      );
    }

    course.code = updateData.code;
  }

  // If updating prerequisites, validate them
  if (updateData.prerequisites) {
    // Check all prerequisites exist
    const prereqCourses = await Course.find({
      _id: { $in: updateData.prerequisites }
    });

    if (prereqCourses.length !== updateData.prerequisites.length) {
      throw new AppError('One or more prerequisite courses do not exist', 400);
    }

    // Check for self-reference
    if (updateData.prerequisites.includes(courseId)) {
      throw new AppError('Course cannot be a prerequisite of itself', 400);
    }

    course.prerequisites = updateData.prerequisites as any;
  }

  // Update other fields
  if (updateData.name) course.name = updateData.name;
  if (updateData.description !== undefined) course.description = updateData.description;
  if (updateData.credits) course.credits = updateData.credits;
  if (updateData.departmentId) course.departmentId = updateData.departmentId as any;
  if (updateData.elective !== undefined) course.elective = updateData.elective;
  if (updateData.level) course.level = updateData.level;

  try {
    if (session) {
      await course.save({ session });
    } else {
      await course.save();
    }
  } catch (error: any) {
    if (error.message.includes('Circular prerequisite')) {
      throw new AppError('Circular prerequisite chain detected', 400);
    }
    throw error;
  }

  return course;
};

/**
 * Delete course (only if not used in offerings)
 */
export const deleteCourse = async (
  courseId: string,
  session?: ClientSession
): Promise<void> => {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Check if course is used in any offerings
  const CourseOffering = mongoose.model('CourseOffering');
  const offeringCount = await CourseOffering.countDocuments({
    courseId
  });

  if (offeringCount > 0) {
    throw new AppError(
      `Cannot delete course that is used in ${offeringCount} offering(s)`,
      400
    );
  }

  // Check if course is a prerequisite for other courses
  const dependentCourses = await Course.countDocuments({
    prerequisites: courseId
  });

  if (dependentCourses > 0) {
    throw new AppError(
      `Cannot delete course that is a prerequisite for ${dependentCourses} other course(s)`,
      400
    );
  }

  if (session) {
    await Course.deleteOne({ _id: courseId }).session(session);
  } else {
    await Course.deleteOne({ _id: courseId });
  }
};

/**
 * Get courses by department with prerequisite info
 */
export const getCoursesByDepartment = async (
  departmentId: string
): Promise<Array<ICourse & { prerequisiteDetails?: Array<{ code: string; name: string }> }>> => {
  const courses = await Course.find({ departmentId })
    .populate('prerequisites')
    .lean();

  return courses.map((course: any) => ({
    ...course,
    prerequisiteDetails: course.prerequisites?.map((p: any) => ({
      code: p.code,
      name: p.name
    })) || []
  }));
};

/**
 * Get student's eligible courses for enrollment
 */
export const getStudentEligibleCourses = async (
  studentId: string,
  departmentId?: string
): Promise<Array<{
  course: ICourse;
  eligibility: CourseEligibilityResult;
}>> => {
  const student = await Student.findById(studentId);

  if (!student) {
    throw new AppError('Student not found', 404);
  }

  // Get courses from student's department or specified department
  const query: any = {};
  if (departmentId) {
    query.departmentId = departmentId;
  } else {
    query.departmentId = student.departmentId;
  }

  const courses = await Course.find(query).lean();

  const results = [];

  for (const course of courses as any[]) {
    const eligibility = await checkCourseEligibility(
      studentId,
      course._id.toString()
    );

    results.push({
      course,
      eligibility
    });
  }

  // Filter to only show eligible courses
  return results.filter(r => r.eligibility.eligible);
};

/**
 * Get prerequisite chain for a course
 */
export const getPrerequisiteChain = async (
  courseId: string,
  maxDepth: number = 5
): Promise<Array<{
  level: number;
  courseId: string;
  courseCode: string;
  courseName: string;
}>> => {
  const chain: Array<{
    level: number;
    courseId: string;
    courseCode: string;
    courseName: string;
  }> = [];

  const traverse = async (currentCourseId: string, level: number): Promise<void> => {
    if (level > maxDepth) return;

    const course = await Course.findById(currentCourseId).populate('prerequisites');

    if (!course) return;

    for (const prereq of course.prerequisites as any[]) {
      chain.push({
        level,
        courseId: prereq._id.toString(),
        courseCode: prereq.code,
        courseName: prereq.name
      });

      await traverse(prereq._id.toString(), level + 1);
    }
  };

  await traverse(courseId, 1);

  return chain.sort((a, b) => a.level - b.level);
};

/**
 * Check course level consistency
 */
export const validateCourseLevel = async (
  courseId: string
): Promise<{
  valid: boolean;
  issues: string[];
}> => {
  const course = await Course.findById(courseId).populate('prerequisites');

  if (!course) {
    return {
      valid: false,
      issues: ['Course not found']
    };
  }

  const issues: string[] = [];

  // Level hierarchy: beginner < intermediate < advanced
  const levelWeight: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3
  };

  const currentWeight = levelWeight[course.level || 'beginner'];

  // Check if prerequisites are at appropriate levels
  for (const prereq of course.prerequisites as any[]) {
    const prereqWeight = levelWeight[prereq.level || 'beginner'];

    // Prerequisites should generally be at the same or lower level
    if (prereqWeight > currentWeight) {
      issues.push(
        `Prerequisite ${prereq.code} is ${prereq.level} but current course is ${course.level}`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
};

/**
 * Get courses that have this course as a prerequisite
 */
export const getDependentCourses = async (
  courseId: string
): Promise<Array<{ courseId: string; courseCode: string; courseName: string }>> => {
  const dependents = await Course.find({
    prerequisites: courseId
  }).lean();

  return dependents.map((course: any) => ({
    courseId: course._id.toString(),
    courseCode: course.code,
    courseName: course.name
  }));
};
