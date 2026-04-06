/**
 * Students Controller Tests
 * Tests for student CRUD operations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { StudentsController } from '../../src/controllers/students.controller';
import { createMockRequest, createMockResponse, testUsers, generateObjectId } from '../utils/test-helpers';

// Mock the models
const mockStudents: any[] = [];
const mockDepartments: any[] = [];

const mockStudentModel = {
  find: mock(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve(mockStudents) }) }) }) })),
  countDocuments: mock(() => Promise.resolve(mockStudents.length)),
  findById: mock((id: string) => ({ populate: () => ({ lean: () => Promise.resolve(mockStudents.find((s: any) => s._id === id) || null) }) })),
  findOne: mock(() => Promise.resolve(null)),
  create: mock((data: any) => Promise.resolve({ _id: generateObjectId(), ...data, createdAt: new Date(), updatedAt: new Date() })),
  findByIdAndUpdate: mock((id: string, data: any) => ({ populate: () => ({ lean: () => Promise.resolve({ _id: id, ...data }) }) })),
  findByIdAndDelete: mock((id: string) => Promise.resolve({ _id: id }))
};

const mockDepartmentModel = {
  findById: mock((id: string) => Promise.resolve(mockDepartments.find((d: any) => d._id === id) || null))
};

// Mock the audit middleware
const mockSaveAuditLog = mock(() => Promise.resolve());

mock.module('../../src/models', () => ({
  Student: mockStudentModel,
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

describe('StudentsController - List', () => {
  beforeEach(() => {
    mockStudents.length = 0;
  });

  describe('GET /api/students', () => {
    it('should return paginated list of students', async () => {
      const deptId = generateObjectId();
      mockStudents.push(
        { _id: generateObjectId(), name: 'John Doe', rollNumber: 'CS001', email: 'john@example.com', departmentId: deptId },
        { _id: generateObjectId(), name: 'Jane Smith', rollNumber: 'CS002', email: 'jane@example.com', departmentId: deptId }
      );

      const req = createMockRequest(testUsers.admin);
      req.query = {};
      const res = createMockResponse();

      await StudentsController.list(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
      expect(res._json?.pagination).toHaveProperty('total');
    });

    it('should filter students by department', async () => {
      const req = createMockRequest(testUsers.admin);
      req.query = { departmentId: generateObjectId() };
      const res = createMockResponse();

      await StudentsController.list(req as any, res as any);

      expect(res._status).toBe(200);
    });
  });
});

describe('StudentsController - Create', () => {
  beforeEach(() => {
    mockStudents.length = 0;
    mockDepartments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/students', () => {
    it('should create a new student', async () => {
      const deptId = generateObjectId();
      mockDepartments.push({ _id: deptId, name: 'Computer Science', code: 'CS' });

      const req = createMockRequest(testUsers.admin);
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        rollNumber: 'CS001',
        departmentId: deptId,
        batch: '2024',
        semester: 1
      };
      const res = createMockResponse();

      await StudentsController.create(req as any, res as any);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('name', 'John Doe');
      expect(res._json?.data).toHaveProperty('rollNumber', 'CS001');
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 409 if roll number already exists in department', async () => {
      const deptId = generateObjectId();
      const existingStudent = { _id: generateObjectId(), name: 'Existing Student', rollNumber: 'CS001', departmentId: deptId };
      mockStudentModel.findOne = mock(() => Promise.resolve(existingStudent));

      const req = createMockRequest(testUsers.admin);
      req.body = {
        name: 'New Student',
        email: 'new@example.com',
        rollNumber: 'CS001',
        departmentId: deptId
      };
      const res = createMockResponse();

      await StudentsController.create(req as any, res as any);

      expect(res._status).toBe(409);
      expect(res._json?.error).toContain('already exists');
    });
  });
});

describe('StudentsController - Update', () => {
  beforeEach(() => {
    mockStudents.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('PUT /api/students/:id', () => {
    it('should update student successfully', async () => {
      const studentId = generateObjectId();
      const existingStudent = { _id: studentId, name: 'John Doe', rollNumber: 'CS001', email: 'john@example.com' };
      mockStudentModel.findOne = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: studentId };
      req.body = { name: 'John Updated', email: 'john.updated@example.com' };
      const res = createMockResponse();

      await StudentsController.update(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });
  });
});

describe('StudentsController - Delete', () => {
  beforeEach(() => {
    mockStudents.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('DELETE /api/students/:id', () => {
    it('should delete student successfully', async () => {
      const studentId = generateObjectId();
      mockStudentModel.findById = mock(() => Promise.resolve({ _id: studentId, name: 'Student to Delete', rollNumber: 'CS001' }));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: studentId };
      const res = createMockResponse();

      await StudentsController.delete(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 404 if student not found', async () => {
      mockStudentModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await StudentsController.delete(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });
  });
});
