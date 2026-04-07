/**
 * Courses Controller Tests
 * Tests for course CRUD operations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CoursesController } from '../../src/controllers/courses.controller';
import { createMockRequest, createMockResponse, testUsers, testCourses, generateObjectId } from '../utils/test-helpers';

// Mock courses service
const mockCoursesService = {
  getDependentCourses: mock(() => Promise.resolve([])),
  getPrerequisiteChain: mock(() => Promise.resolve([])),
  checkCourseEligibility: mock(() => Promise.resolve({ eligible: true }))
};

// Mock CourseOffering model
const mockCourseOfferingModel = {
  countDocuments: mock(() => Promise.resolve(0))
};

// Mock the models
const mockCourses: any[] = [];
const mockDepartments: any[] = [];
const mockPrerequisites: any[] = [];

// Simple mock implementation that doesn't use complex chaining
const mockFindQuery = {
  sort: mock(() => mockFindQuery),
  skip: mock(() => mockFindQuery),
  limit: mock(() => mockFindQuery),
  lean: mock(() => Promise.resolve(mockCourses)),
  populate: mock(() => mockFindQuery)
};

const mockCourseModel = {
  find: mock(() => mockFindQuery),
  countDocuments: mock(() => Promise.resolve(mockCourses.length)),
  findById: mock((id: string) => {
    const course = mockCourses.find((c: any) => c._id === id);
    if (!course) {
      // Return a query that returns null
      return {
        lean: mock(() => Promise.resolve(null))
      };
    }
    // Return a query that returns the course
    return {
      lean: mock(() => Promise.resolve(course))
    };
  }),
  findOne: mock((query: any) => {
    // Check if we're looking for a course that already exists
    if (query.code) {
      const existingCourse = mockCourses.find((c: any) => c.code === query.code);
      return Promise.resolve(existingCourse || null);
    }
    return Promise.resolve(null);
  }),
  create: mock((data: any) => Promise.resolve({ _id: generateObjectId(), ...data, createdAt: new Date(), updatedAt: new Date() })),
  findByIdAndUpdate: mock((id: string, data: any) => {
    // Find the course and update it
    const courseIndex = mockCourses.findIndex((c: any) => c._id === id);
    if (courseIndex !== -1) {
      mockCourses[courseIndex] = { ...mockCourses[courseIndex], ...data };
      return {
        lean: mock(() => Promise.resolve({ ...mockCourses[courseIndex], createdAt: new Date(), updatedAt: new Date() }))
      };
    }
    return {
      lean: mock(() => Promise.resolve(null))
    };
  }),
  findByIdAndDelete: mock((id: string) => {
    const courseIndex = mockCourses.findIndex((c: any) => c._id === id);
    if (courseIndex !== -1) {
      const deleted = mockCourses.splice(courseIndex, 1)[0];
      return Promise.resolve({ _id: deleted._id });
    }
    return Promise.resolve(null);
  }),
  deleteOne: mock(() => Promise.resolve({ deletedCount: 1 }))
};

const mockDepartmentModel = {
  findById: mock((id: string) => Promise.resolve(mockDepartments.find((d: any) => d._id === id) || null))
};

// Mock the audit middleware
const mockSaveAuditLog = mock(() => Promise.resolve());

mock.module('../../src/models', () => ({
  Course: mockCourseModel,
  Department: mockDepartmentModel,
  CourseOffering: mockCourseOfferingModel,
  // Mock a prerequisite course
  ...mockCourseModel
}));

mock.module('../../src/middleware/audit.middleware', () => ({
  saveAuditLog: mockSaveAuditLog,
  getAuditLogData: () => ({})
}));

mock.module('../../src/services/courses.service', () => mockCoursesService);

mock.module('../../src/utils/pagination.util', () => ({
  getPaginationParams: () => ({ page: 1, limit: 10, search: '', sortBy: 'name', sortOrder: 1 }),
  buildPaginationMeta: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  }),
  buildSearchFilter: (fields: string[], search: string) => ({})
}));

describe('CoursesController - List', () => {
  beforeEach(() => {
    mockCourses.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('GET /api/courses', () => {
    it('should return paginated list of courses', async () => {
      const deptId = generateObjectId();
      mockCourses.push(
        { _id: generateObjectId(), name: 'Introduction to Programming', code: 'CS101', departmentId: deptId, credits: 3 },
        { _id: generateObjectId(), name: 'Data Structures', code: 'CS201', departmentId: deptId, credits: 4 }
      );

      const req = createMockRequest(testUsers.admin);
      req.query = {};
      const res = createMockResponse();

      await CoursesController.list(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
      expect(res._json?.pagination).toHaveProperty('page');
      expect(res._json?.pagination).toHaveProperty('total');
    });

    it('should filter courses by department', async () => {
      const req = createMockRequest(testUsers.admin);
      req.query = { departmentId: generateObjectId() };
      const res = createMockResponse();

      await CoursesController.list(req as any, res as any);

      expect(res._status).toBe(200);
      expect(mockCourseModel.find).toHaveBeenCalled();
    });
  });
});

describe('CoursesController - Get By ID', () => {
  beforeEach(() => {
    mockCourses.length = 0;
  });

  describe('GET /api/courses/:id', () => {
    it('should return 404 if course not found', async () => {
      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      try {
        await CoursesController.getById(req as any, res as any);
      } catch (error) {
        console.error('Error in getById test:', error);
        throw error;
      }

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });

    it('should return course with prerequisites', async () => {
      const courseId = generateObjectId();
      const deptId = generateObjectId();
      const mockDept = { _id: deptId, name: 'Computer Science', code: 'CS' };
      mockDepartments.push(mockDept);

      mockCourses.push({
        _id: courseId,
        name: 'Data Structures',
        code: 'CS201',
        prerequisites: [],
        departmentId: deptId
      });

      const req = createMockRequest(testUsers.admin);
      req.params = { id: courseId };
      const res = createMockResponse();

      await CoursesController.getById(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('name');
      expect(res._json?.data).toHaveProperty('code');
      expect(res._json?.data).toHaveProperty('departmentId', deptId);
    });
  });
});

describe('CoursesController - Create', () => {
  beforeEach(() => {
    mockCourses.length = 0;
    mockDepartments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/courses', () => {
    it('should create a new course', async () => {
      const deptId = generateObjectId();
      mockDepartments.push({ _id: deptId, name: 'Computer Science', code: 'CS' });

      const req = createMockRequest(testUsers.admin);
      req.body = {
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: deptId,
        credits: 3,
        description: 'Basic programming concepts'
      };
      const res = createMockResponse();

      await CoursesController.create(req as any, res as any);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('name', 'Introduction to Programming');
      expect(res._json?.data).toHaveProperty('code', 'CS101');
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 409 if course code already exists in department', async () => {
      const deptId = generateObjectId();
      const existingCourse = { _id: generateObjectId(), name: 'Old Course', code: 'CS101', departmentId: deptId };
      mockCourseModel.findOne.mockImplementation(() => Promise.resolve(existingCourse));

      const req = createMockRequest(testUsers.admin);
      req.body = {
        name: 'New Course',
        code: 'CS101',
        departmentId: deptId,
        credits: 3
      };
      const res = createMockResponse();

      await CoursesController.create(req as any, res as any);

      expect(res._status).toBe(409);
      expect(res._json?.error).toContain('already exists');
    });
  });
});

describe('CoursesController - Update', () => {
  beforeEach(() => {
    mockCourses.length = 0;
    mockSaveAuditLog.mockClear();
    // Reset findOne to original implementation
    mockCourseModel.findOne.mockImplementation((query: any) => {
      // Check if we're looking for a course that already exists
      if (query.code) {
        const existingCourse = mockCourses.find((c: any) => c.code === query.code);
        return Promise.resolve(existingCourse || null);
      }
      return Promise.resolve(null);
    });
  });

  describe('PUT /api/courses/:id', () => {
    it('should update course successfully', async () => {
      const courseId = generateObjectId();
      const existingCourse = { _id: courseId, name: 'Old Name', code: 'CS101', credits: 3 };
      mockCourseModel.findOne.mockImplementation(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: courseId };
      req.body = { name: 'Updated Course Name', code: 'CS101', credits: 4 };
      const res = createMockResponse();

      await CoursesController.update(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });
  });
});

describe('CoursesController - Delete', () => {
  beforeEach(() => {
    mockCourses.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('DELETE /api/courses/:id', () => {
    it('should delete course successfully', async () => {
      const courseId = generateObjectId();
      // Add the course to the mock data
      mockCourses.push({ _id: courseId, name: 'Course to Delete', code: 'CS101' });

      const req = createMockRequest(testUsers.admin);
      req.params = { id: courseId };
      const res = createMockResponse();

      await CoursesController.delete(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 404 if course not found', async () => {
      mockCourseModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await CoursesController.delete(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });
  });
});
