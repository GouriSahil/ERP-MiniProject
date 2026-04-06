/**
 * Courses Controller Tests
 * Tests for course CRUD operations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CoursesController } from '../../src/controllers/courses.controller';
import { createMockRequest, createMockResponse, testUsers, testCourses, generateObjectId } from '../utils/test-helpers';

// Mock the models
const mockCourses: any[] = [];
const mockDepartments: any[] = [];

const mockCourseModel = {
  find: mock(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ populate: () => ({ lean: () => Promise.resolve(mockCourses) }) }) }) }) })),
  countDocuments: mock(() => Promise.resolve(mockCourses.length)),
  findById: mock((id: string) => ({ populate: () => ({ lean: () => Promise.resolve(mockCourses.find((c: any) => c._id === id) || null) }) })),
  findOne: mock(() => Promise.resolve(null)),
  create: mock((data: any) => Promise.resolve({ _id: generateObjectId(), ...data, createdAt: new Date(), updatedAt: new Date() })),
  findByIdAndUpdate: mock((id: string, data: any) => ({ lean: () => Promise.resolve({ _id: id, ...data }) })),
  findByIdAndDelete: mock((id: string) => Promise.resolve({ _id: id })),
  deleteOne: mock(() => Promise.resolve({ deletedCount: 1 }))
};

const mockDepartmentModel = {
  findById: mock((id: string) => Promise.resolve(mockDepartments.find((d: any) => d._id === id) || null))
};

// Mock the audit middleware
const mockSaveAuditLog = mock(() => Promise.resolve());

mock.module('../../src/models', () => ({
  Course: mockCourseModel,
  Department: mockDepartmentModel
}));

mock.module('../../src/middleware/audit.middleware', () => ({
  saveAuditLog: mockSaveAuditLog,
  getAuditLogData: () => ({})
}));

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

      await CoursesController.getById(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });

    it('should return course with prerequisites', async () => {
      const courseId = generateObjectId();
      mockCourses.push({ _id: courseId, name: 'Data Structures', code: 'CS201', prerequisites: [] });

      const req = createMockRequest(testUsers.admin);
      req.params = { id: courseId };
      const res = createMockResponse();

      await CoursesController.getById(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('name');
      expect(res._json?.data).toHaveProperty('code');
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
      mockCourseModel.findOne = mock(() => Promise.resolve(existingCourse));

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
  });

  describe('PUT /api/courses/:id', () => {
    it('should update course successfully', async () => {
      const courseId = generateObjectId();
      const existingCourse = { _id: courseId, name: 'Old Name', code: 'CS101', credits: 3 };
      mockCourseModel.findOne = mock(() => Promise.resolve(null));

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
      mockCourseModel.findById = mock(() => Promise.resolve({ _id: courseId, name: 'Course to Delete', code: 'CS101' }));

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
