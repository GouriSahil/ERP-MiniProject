/**
 * Departments Controller Tests
 * Tests for department CRUD operations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DepartmentsController } from '../../src/controllers/departments.controller';
import { createMockRequest, createMockResponse, testUsers, testDepartments, generateObjectId } from '../utils/test-helpers';

// Mock the models
const mockDepartments: any[] = [];
const mockFaculty: any[] = [];
const mockStudents: any[] = [];
const mockCourses: any[] = [];

const mockDepartmentModel = {
  find: mock(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve(mockDepartments) }) }) }) })),
  countDocuments: mock(() => Promise.resolve(mockDepartments.length)),
  findById: mock((id: string) => ({
    lean: () => Promise.resolve(mockDepartments.find((d: any) => d._id === id) || null)
  })),
  findOne: mock((query: any) => Promise.resolve(mockDepartments.find((d: any) => d.code === query.code) || null)),
  create: mock((data: any) => Promise.resolve({ _id: generateObjectId(), ...data, createdAt: new Date(), updatedAt: new Date() })),
  findByIdAndUpdate: mock((id: string, data: any) => ({
    lean: () => Promise.resolve({ _id: id, ...data })
  })),
  findByIdAndDelete: mock((id: string) => Promise.resolve({ _id: id }))
};

const mockFacultyModel = {
  countDocuments: mock((query: any) => Promise.resolve(mockFaculty.filter((f: any) => f.departmentId === query.departmentId).length)),
  find: mock(() => ({ populate: () => ({ lean: () => Promise.resolve(mockFaculty) }) }))
};

const mockStudentModel = {
  countDocuments: mock((query: any) => Promise.resolve(mockStudents.filter((s: any) => s.departmentId === query.departmentId).length))
};

const mockCourseModel = {
  countDocuments: mock((query: any) => Promise.resolve(mockCourses.filter((c: any) => c.departmentId === query.departmentId).length)),
  find: mock(() => ({ populate: () => ({ lean: () => Promise.resolve(mockCourses) }) }))
};

// Mock the audit middleware
const mockSaveAuditLog = mock(() => Promise.resolve());

mock.module('../../src/models', () => ({
  Department: mockDepartmentModel,
  Faculty: mockFacultyModel,
  Student: mockStudentModel,
  Course: mockCourseModel
}));

mock.module('../../src/middleware/audit.middleware', () => ({
  saveAuditLog: mockSaveAuditLog,
  getAuditLogData: () => ({})
}));

mock.module('../../src/utils/pagination.util', () => ({
  getPaginationParams: () => ({ page: 1, limit: 10, search: '', sortBy: 'createdAt', sortOrder: -1 }),
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

describe('DepartmentsController - List', () => {
  beforeEach(() => {
    mockDepartments.length = 0;
    mockSaveAuditLog.mockClear();
    mockDepartmentModel.find.mockClear();
    mockDepartmentModel.countDocuments.mockClear();
  });

  describe('GET /api/departments', () => {
    it('should return paginated list of departments', async () => {
      mockDepartments.push(
        { _id: generateObjectId(), name: 'Computer Science', code: 'CS', createdAt: new Date(), updatedAt: new Date() },
        { _id: generateObjectId(), name: 'Mathematics', code: 'MATH', createdAt: new Date(), updatedAt: new Date() }
      );

      const req = createMockRequest(testUsers.admin);
      req.query = {};
      const res = createMockResponse();

      await DepartmentsController.list(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
      expect(res._json?.pagination).toHaveProperty('page');
      expect(res._json?.pagination).toHaveProperty('limit');
      expect(res._json?.pagination).toHaveProperty('total');
    });

    it('should apply search filter when provided', async () => {
      const req = createMockRequest(testUsers.admin);
      req.query = { search: 'Computer' };
      const res = createMockResponse();

      await DepartmentsController.list(req as any, res as any);

      expect(mockDepartmentModel.find).toHaveBeenCalled();
    });
  });
});

describe('DepartmentsController - Get By ID', () => {
  beforeEach(() => {
    mockDepartments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('GET /api/departments/:id', () => {
    it('should return 404 if department not found', async () => {
      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await DepartmentsController.getById(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
      expect(res._json?.error).toContain('not found');
    });

    it('should return department with stats', async () => {
      const deptId = generateObjectId();
      mockDepartments.push({ _id: deptId, name: 'Computer Science', code: 'CS' });
      mockFaculty.push({ departmentId: deptId });
      mockStudents.push({ departmentId: deptId });
      mockCourses.push({ departmentId: deptId });

      const req = createMockRequest(testUsers.admin);
      req.params = { id: deptId };
      const res = createMockResponse();

      await DepartmentsController.getById(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('stats');
      expect(res._json?.data?.stats).toHaveProperty('facultyCount');
      expect(res._json?.data?.stats).toHaveProperty('studentCount');
      expect(res._json?.data?.stats).toHaveProperty('courseCount');
    });
  });
});

describe('DepartmentsController - Create', () => {
  beforeEach(() => {
    mockDepartments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/departments', () => {
    it('should create a new department', async () => {
      const req = createMockRequest(testUsers.admin);
      req.body = { name: 'Computer Science', code: 'CS' };
      const res = createMockResponse();

      await DepartmentsController.create(req as any, res as any);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('name', 'Computer Science');
      expect(res._json?.data).toHaveProperty('code', 'CS');
      expect(mockSaveAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          targetType: 'department',
          status: 'success'
        })
      );
    });

    it('should return 409 if department code already exists', async () => {
      const existingDept = { _id: generateObjectId(), name: 'Computer Science', code: 'CS' };
      mockDepartmentModel.findOne = mock(() => Promise.resolve(existingDept));

      const req = createMockRequest(testUsers.admin);
      req.body = { name: 'Computer Science New', code: 'CS' };
      const res = createMockResponse();

      await DepartmentsController.create(req as any, res as any);

      expect(res._status).toBe(409);
      expect(res._json?.success).toBe(false);
      expect(res._json?.error).toContain('already exists');
    });
  });
});

describe('DepartmentsController - Update', () => {
  beforeEach(() => {
    mockDepartments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('PUT /api/departments/:id', () => {
    it('should return 404 if department not found', async () => {
      mockDepartmentModel.findById = mock(() => ({ lean: () => Promise.resolve(null) }));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      req.body = { name: 'Updated Name', code: 'UPD' };
      const res = createMockResponse();

      await DepartmentsController.update(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });

    it('should update department successfully', async () => {
      const deptId = generateObjectId();
      const existingDept = { _id: deptId, name: 'Computer Science', code: 'CS' };
      mockDepartmentModel.findById = mock(() => ({ lean: () => Promise.resolve(existingDept) }));
      mockDepartmentModel.findOne = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: deptId };
      req.body = { name: 'Updated Computer Science', code: 'CS' };
      const res = createMockResponse();

      await DepartmentsController.update(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          targetType: 'department'
        })
      );
    });

    it('should return 409 if new code already exists', async () => {
      const deptId = generateObjectId();
      const existingDept = { _id: deptId, name: 'Computer Science', code: 'CS' };
      const otherDept = { _id: generateObjectId(), name: 'Mathematics', code: 'MATH' };
      mockDepartmentModel.findById = mock(() => ({ lean: () => Promise.resolve(existingDept) }));
      mockDepartmentModel.findOne = mock(() => Promise.resolve(otherDept));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: deptId };
      req.body = { name: 'Computer Science', code: 'MATH' };
      const res = createMockResponse();

      await DepartmentsController.update(req as any, res as any);

      expect(res._status).toBe(409);
      expect(res._json?.error).toContain('already exists');
    });
  });
});

describe('DepartmentsController - Delete', () => {
  beforeEach(() => {
    mockDepartments.length = 0;
    mockFaculty.length = 0;
    mockStudents.length = 0;
    mockCourses.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('DELETE /api/departments/:id', () => {
    it('should return 404 if department not found', async () => {
      mockDepartmentModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await DepartmentsController.delete(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });

    it('should delete department successfully', async () => {
      const deptId = generateObjectId();
      const existingDept = { _id: deptId, name: 'Computer Science', code: 'CS' };
      mockDepartmentModel.findById = mock(() => Promise.resolve(existingDept));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: deptId };
      const res = createMockResponse();

      await DepartmentsController.delete(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          targetType: 'department'
        })
      );
    });

    it('should return 400 if department has dependent records', async () => {
      const deptId = generateObjectId();
      const existingDept = { _id: deptId, name: 'Computer Science', code: 'CS' };
      mockDepartmentModel.findById = mock(() => Promise.resolve(existingDept));
      mockFaculty.push({ departmentId: deptId });

      const req = createMockRequest(testUsers.admin);
      req.params = { id: deptId };
      const res = createMockResponse();

      await DepartmentsController.delete(req as any, res as any);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
      expect(res._json?.error).toContain('Cannot delete department');
    });
  });
});

describe('DepartmentsController - Get Faculty', () => {
  describe('GET /api/departments/:id/faculty', () => {
    it('should return 404 if department not found', async () => {
      mockDepartmentModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await DepartmentsController.getFaculty(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });

    it('should return department faculty', async () => {
      const deptId = generateObjectId();
      const existingDept = { _id: deptId, name: 'Computer Science', code: 'CS' };
      mockDepartmentModel.findById = mock(() => Promise.resolve(existingDept));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: deptId };
      const res = createMockResponse();

      await DepartmentsController.getFaculty(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockFacultyModel.find).toHaveBeenCalled();
    });
  });
});

describe('DepartmentsController - Get Courses', () => {
  describe('GET /api/departments/:id/courses', () => {
    it('should return 404 if department not found', async () => {
      mockDepartmentModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await DepartmentsController.getCourses(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });

    it('should return department courses', async () => {
      const deptId = generateObjectId();
      const existingDept = { _id: deptId, name: 'Computer Science', code: 'CS' };
      mockDepartmentModel.findById = mock(() => Promise.resolve(existingDept));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: deptId };
      const res = createMockResponse();

      await DepartmentsController.getCourses(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockCourseModel.find).toHaveBeenCalled();
    });
  });
});
