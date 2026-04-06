/**
 * Integration Test Setup with Real Database
 * This module provides database connection and cleanup utilities for integration tests
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User, UserRole } from '../../src/models/User';
import { Department } from '../../src/models/Department';
import { Course } from '../../src/models/Course';
import { Term } from '../../src/models/Term';
import { Student } from '../../src/models/Student';
import { Faculty } from '../../src/models/Faculty';
import { CourseOffering } from '../../src/models/CourseOffering';
import * as bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer | null = null;

/**
 * Connect to in-memory MongoDB for testing
 */
export async function setupTestDatabase(): Promise<void> {
  // Only connect if not already connected
  if (mongoose.connection.readyState === 1) { // connected
    console.log('[Test] Already connected to MongoDB, clearing database...');
    await clearTestDatabase();
    return;
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
  console.log(`[Test] Connected to in-memory MongoDB at ${uri}`);
}

/**
 * Clear all collections in the database
 */
export async function clearTestDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Close database connection and stop MongoDB server
 */
export async function teardownTestDatabase(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('[Test] Closed in-memory MongoDB connection');
}

/**
 * Test data fixtures for seeding the database
 */
export const testFixtures = {
  /**
   * Create a test user in the database
   */
  async createUser(overrides: Partial<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
    departmentId: mongoose.Types.ObjectId;
    mustChangePassword: boolean;
  }> = {}) {
    const defaultPassword = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(
      overrides.password || defaultPassword,
      10
    );

    const userData = {
      name: overrides.name || 'Test User',
      email: overrides.email || `test-${Date.now()}@example.com`,
      passwordHash,
      role: overrides.role || UserRole.STUDENT,
      departmentId: overrides.departmentId,
      mustChangePassword: overrides.mustChangePassword || false,
    };

    const user = await User.create(userData);
    // Return plain object with password for authentication tests
    return {
      id: user._id.toString(),
      ...userData,
      plainPassword: overrides.password || defaultPassword,
    };
  },

  /**
   * Create multiple test users with different roles
   */
  async createTestUsers() {
    const dept = await this.createDepartment();

    const superAdmin = await this.createUser({
      name: 'Super Admin',
      email: 'superadmin@test.com',
      password: 'AdminPass123!',
      role: UserRole.SUPER_ADMIN,
    });

    const admin = await this.createUser({
      name: 'College Admin',
      email: 'admin@test.com',
      password: 'AdminPass123!',
      role: UserRole.ADMIN,
    });

    const deptHead = await this.createUser({
      name: 'Department Head',
      email: 'depthead@test.com',
      password: 'DeptHead123!',
      role: UserRole.DEPT_HEAD,
      departmentId: dept.id,
    });

    const faculty = await this.createUser({
      name: 'Faculty Member',
      email: 'faculty@test.com',
      password: 'Faculty123!',
      role: UserRole.FACULTY,
      departmentId: dept.id,
    });

    const student = await this.createUser({
      name: 'Student User',
      email: 'student@test.com',
      password: 'Student123!',
      role: UserRole.STUDENT,
      departmentId: dept.id,
    });

    return { superAdmin, admin, deptHead, faculty, student, department: dept };
  },

  /**
   * Create a test department
   */
  async createDepartment(overrides: Partial<{ name: string; code: string }> = {}) {
    const deptData = {
      name: overrides.name || `Department ${Date.now()}`,
      code: overrides.code || `DEPT${Date.now().toString().slice(-4)}`,
    };

    const dept = await Department.create(deptData);
    return {
      id: dept._id.toString(),
      ...deptData,
    };
  },

  /**
   * Create a test course
   */
  async createCourse(overrides: Partial<{
    name: string;
    code: string;
    credits: number;
    description: string;
    departmentId: mongoose.Types.ObjectId;
  }> = {}) {
    const dept = overrides.departmentId || (await this.createDepartment()).id;

    const courseData = {
      name: overrides.name || `Course ${Date.now()}`,
      code: overrides.code || `CS${Date.now().toString().slice(-4)}`,
      credits: overrides.credits || 3,
      description: overrides.description || 'Test course description',
      departmentId: dept,
    };

    const course = await Course.create(courseData);
    return {
      id: course._id.toString(),
      ...courseData,
    };
  },

  /**
   * Create a test term
   */
  async createTerm(overrides: Partial<{
    name: string;
    startDate: Date;
    endDate: Date;
    status: 'upcoming' | 'active' | 'completed';
  }> = {}) {
    const now = new Date();
    const termData = {
      name: overrides.name || `Term ${Date.now()}`,
      startDate: overrides.startDate || now,
      endDate: overrides.endDate || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      status: overrides.status || 'active',
    };

    const term = await Term.create(termData);
    return {
      id: term._id.toString(),
      ...termData,
    };
  },

  /**
   * Create a test student profile
   */
  async createStudent(userId: mongoose.Types.ObjectId, overrides: Partial<{
    studentId: string;
    enrollmentDate: Date;
    status: 'active' | 'inactive' | 'graduated' | 'suspended';
    departmentId: mongoose.Types.ObjectId;
  }> = {}) {
    const studentData = {
      userId,
      studentId: overrides.studentId || `S${Date.now()}`,
      enrollmentDate: overrides.enrollmentDate || new Date(),
      status: overrides.status || 'active',
      departmentId: overrides.departmentId,
    };

    const student = await Student.create(studentData);
    return {
      id: student._id.toString(),
      ...studentData,
    };
  },

  /**
   * Create a test faculty profile
   */
  async createFacultyProfile(userId: mongoose.Types.ObjectId, overrides: Partial<{
    employeeId: string;
    hireDate: Date;
    status: 'active' | 'inactive' | 'on_leave';
    departmentId: mongoose.Types.ObjectId;
    specialization: string[];
  }> = {}) {
    const facultyData = {
      userId,
      employeeId: overrides.employeeId || `F${Date.now()}`,
      hireDate: overrides.hireDate || new Date(),
      status: overrides.status || 'active',
      departmentId: overrides.departmentId,
      specialization: overrides.specialization || ['Computer Science'],
    };

    const faculty = await Faculty.create(facultyData);
    return {
      id: faculty._id.toString(),
      ...facultyData,
    };
  },

  /**
   * Create a complete test scenario with departments, courses, terms, and users
   */
  async createCompleteScenario() {
    // Create departments
    const csDept = await this.createDepartment({ name: 'Computer Science', code: 'CS' });
    const mathDept = await this.createDepartment({ name: 'Mathematics', code: 'MATH' });

    // Create courses
    const introCourse = await this.createCourse({
      name: 'Introduction to Programming',
      code: 'CS101',
      credits: 3,
      departmentId: csDept.id as unknown as mongoose.Types.ObjectId,
    });

    const advancedCourse = await this.createCourse({
      name: 'Data Structures',
      code: 'CS201',
      credits: 4,
      departmentId: csDept.id as unknown as mongoose.Types.ObjectId,
    });

    // Create terms
    const fallTerm = await this.createTerm({
      name: 'Fall 2024',
      status: 'active',
    });

    const springTerm = await this.createTerm({
      name: 'Spring 2025',
      status: 'upcoming',
    });

    // Create users with profiles
    const superAdmin = await this.createUser({
      name: 'Super Admin',
      email: 'superadmin@test.com',
      password: 'Admin123!',
      role: UserRole.SUPER_ADMIN,
    });

    const admin = await this.createUser({
      name: 'College Admin',
      email: 'admin@test.com',
      password: 'Admin123!',
      role: UserRole.ADMIN,
    });

    const deptHead = await this.createUser({
      name: 'CS Department Head',
      email: 'cs-depthead@test.com',
      password: 'DeptHead123!',
      role: UserRole.DEPT_HEAD,
      departmentId: csDept.id as unknown as mongoose.Types.ObjectId,
    });

    const facultyUser = await this.createUser({
      name: 'Faculty Member',
      email: 'faculty@test.com',
      password: 'Faculty123!',
      role: UserRole.FACULTY,
      departmentId: csDept.id as unknown as mongoose.Types.ObjectId,
    });

    const facultyProfile = await this.createFacultyProfile(
      facultyUser.id as unknown as mongoose.Types.ObjectId,
      {
        departmentId: csDept.id as unknown as mongoose.Types.ObjectId,
      }
    );

    const studentUser = await this.createUser({
      name: 'Student User',
      email: 'student@test.com',
      password: 'Student123!',
      role: UserRole.STUDENT,
      departmentId: csDept.id as unknown as mongoose.Types.ObjectId,
    });

    const studentProfile = await this.createStudent(
      studentUser.id as unknown as mongoose.Types.ObjectId,
      {
        departmentId: csDept.id as unknown as mongoose.Types.ObjectId,
      }
    );

    // Create course offering
    const courseOffering = await CourseOffering.create({
      courseId: introCourse.id as unknown as mongoose.Types.ObjectId,
      termId: fallTerm.id as unknown as mongoose.Types.ObjectId,
      departmentId: csDept.id as unknown as mongoose.Types.ObjectId,
      section: 'A',
      schedule: {
        days: ['Monday', 'Wednesday'],
        startTime: '10:00',
        endTime: '11:30',
        room: 'Room 101',
      },
      status: 'active',
    });

    return {
      departments: { csDept, mathDept },
      courses: { introCourse, advancedCourse },
      terms: { fallTerm, springTerm },
      users: { superAdmin, admin, deptHead, facultyUser, studentUser },
      profiles: { facultyProfile, studentProfile },
      offering: {
        id: courseOffering._id.toString(),
        courseId: introCourse.id,
        termId: fallTerm.id,
        section: 'A',
      },
    };
  },
};

/**
 * Integration test helper - wraps a test function with database setup/teardown
 */
export function withTestDatabase(
  testFn: () => Promise<void> | void
): () => Promise<void> {
  return async () => {
    await setupTestDatabase();
    try {
      await testFn();
    } finally {
      await teardownTestDatabase();
    }
  };
}

/**
 * Integration test helper - wraps a test function with database setup/teardown and cleanup between tests
 */
export function withCleanTestDatabase(
  testFn: () => Promise<void> | void
): () => Promise<void> {
  return async () => {
    if (mongoose.connection.readyState === 0) {
      await setupTestDatabase();
    }
    await clearTestDatabase();
    await testFn();
  };
}
