/**
 * Faculty Controller Tests
 * Tests for faculty CRUD operations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { FacultyController } from '../../src/controllers/faculty.controller';
import { createMockRequest, createMockResponse, testUsers, generateObjectId } from '../utils/test-helpers';

// Mock the models
const mockFaculty: any[] = [];
const mockDepartments: any[] = [];

const mockFacultyModel = {
  find: mock(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ populate: () => ({ lean: () => Promise.resolve(mockFaculty) }) }) }) }) })),
  countDocuments: mock(() => Promise.resolve(mockFaculty.length)),
  findById: mock((id: string) => ({ populate: () => ({ lean: () => Promise.resolve(mockFaculty.find((f: any) => f._id === id) || null) }) })),
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
  Faculty: mockFacultyModel,
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
  buildSearchFilter: () => ({})
}));

describe('FacultyController - List', () => {
  beforeEach(() => {
    mockFaculty.length = 0;
  });

  describe('GET /api/faculty', () => {
    it('should return paginated list of faculty', async () => {
      const deptId = generateObjectId();
      mockFaculty.push(
        { _id: generateObjectId(), name: 'Dr. Smith', email: 'smith@example.com', departmentId: deptId, specialization: 'Computer Science' },
        { _id: generateObjectId(), name: 'Dr. Johnson', email: 'johnson@example.com', departmentId: deptId, specialization: 'Mathematics' }
      );

      const req = createMockRequest(testUsers.admin);
      req.query = {};
      const res = createMockResponse();

      await FacultyController.list(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
      expect(res._json?.pagination).toHaveProperty('total');
    });
  });
});

describe('FacultyController - Create', () => {
  beforeEach(() => {
    mockFaculty.length = 0;
    mockDepartments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/faculty', () => {
    it('should create a new faculty member', async () => {
      const deptId = generateObjectId();
      mockDepartments.push({ _id: deptId, name: 'Computer Science', code: 'CS' });

      const req = createMockRequest(testUsers.admin);
      req.body = {
        name: 'Dr. John Smith',
        email: 'jsmith@example.com',
        userId: generateObjectId(),
        departmentId: deptId,
        specialization: 'Artificial Intelligence'
      };
      const res = createMockResponse();

      await FacultyController.create(req as any, res as any);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('name', 'Dr. John Smith');
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });
  });
});

describe('FacultyController - Update', () => {
  beforeEach(() => {
    mockFaculty.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('PUT /api/faculty/:id', () => {
    it('should update faculty successfully', async () => {
      const facultyId = generateObjectId();
      const existingFaculty = { _id: facultyId, name: 'Dr. Smith', email: 'smith@example.com', specialization: 'AI' };

      const req = createMockRequest(testUsers.admin);
      req.params = { id: facultyId };
      req.body = { name: 'Dr. Smith Jr.', specialization: 'Machine Learning' };
      const res = createMockResponse();

      await FacultyController.update(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });
  });
});

describe('FacultyController - Delete', () => {
  beforeEach(() => {
    mockFaculty.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('DELETE /api/faculty/:id', () => {
    it('should delete faculty successfully', async () => {
      const facultyId = generateObjectId();
      mockFacultyModel.findById = mock(() => Promise.resolve({ _id: facultyId, name: 'Dr. to Delete', email: 'delete@example.com' }));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: facultyId };
      const res = createMockResponse();

      await FacultyController.delete(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 404 if faculty not found', async () => {
      mockFacultyModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await FacultyController.delete(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });
  });
});
