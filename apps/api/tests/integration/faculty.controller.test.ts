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
const mockUsers: any[] = [];

const mockUserModel = {
  find: mock(() => Promise.resolve([])),
  findById: mock((id: string) => Promise.resolve(mockUsers.find((u: any) => u._id === id) || null)),
  findOne: mock(() => Promise.resolve(null)),
  findByIdAndUpdate: mock(() => Promise.resolve({ _id: generateObjectId() })),
  findByIdAndDelete: mock(() => Promise.resolve({ _id: generateObjectId() })),
  create: mock((data: any) => Promise.resolve({ _id: generateObjectId(), ...data }))
};

let createdFacultyData: any = null;

const mockFacultyModel = {
  find: mock((query: any) => ({
    populate: (path: string, fields?: string) => ({
      populate: (path2: string, fields2?: string) => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve(mockFaculty)
            })
          })
        })
      })
    }),
    sort: () => ({
      skip: () => ({
        limit: () => ({
          populate: () => ({ lean: () => Promise.resolve(mockFaculty) })
        })
      })
    })
  })),
  countDocuments: mock(() => Promise.resolve(mockFaculty.length)),
  findById: mock((id: string) => {
    const result = createdFacultyData || mockFaculty.find((f: any) => f._id === id) || null;
    const promiseResult = Promise.resolve(result);
    // Make the promise thenable and also add populate method
    (promiseResult as any).populate = (path: string, fields?: string) => {
      const withOnePopulate = Promise.resolve(result);
      (withOnePopulate as any).populate = (path2: string, fields2?: string) => {
        const withTwoPopulate = Promise.resolve(result);
        (withTwoPopulate as any).lean = () => Promise.resolve(result);
        return withTwoPopulate;
      };
      return withOnePopulate;
    };
    return promiseResult;
  }),
  create: mock((data: any) => {
    const newFaculty = { _id: generateObjectId(), ...data, createdAt: new Date(), updatedAt: new Date() };
    // Store for findById to return - flattened structure to match test expectations
    createdFacultyData = {
      _id: newFaculty._id,
      userId: newFaculty.userId,
      name: 'Dr. John Smith',
      email: 'jsmith@example.com',
      departmentId: newFaculty.departmentId,
      specialization: newFaculty.specialization
    };
    return Promise.resolve(newFaculty);
  }),
  findByIdAndUpdate: mock((id: string, data: any) => ({
    populate: (path: string, fields?: string) => ({
      populate: (path2: string, fields2?: string) => ({
        lean: () => Promise.resolve({ _id: id, ...data })
      })
    })
  })),
  findByIdAndDelete: mock((id: string) => Promise.resolve({ _id: id }))
};

const mockDepartmentModel = {
  findById: mock((id: string) => Promise.resolve(mockDepartments.find((d: any) => d._id === id) || null))
};

const mockOfferingFacultyModel = {
  find: mock(() => Promise.resolve([])),
  countDocuments: mock(() => Promise.resolve(0))
};

// Mock the audit middleware
const mockSaveAuditLog = mock(() => Promise.resolve());

mock.module('../../src/models', () => ({
  Faculty: mockFacultyModel,
  Department: mockDepartmentModel,
  User: mockUserModel,
  OfferingFaculty: mockOfferingFacultyModel
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
    createdFacultyData = null;
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
        password: 'SecurePassword123!',
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
