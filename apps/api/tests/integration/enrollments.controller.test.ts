/**
 * Enrollments Controller Tests
 * Tests for enrollment CRUD operations and bulk enrollment
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { EnrollmentsController } from '../../src/controllers/enrollments.controller';
import { createMockRequest, createMockResponse, testUsers, generateObjectId } from '../utils/test-helpers';

// Mock the models
const mockEnrollments: any[] = [];
const mockStudents: any[] = [];
const mockOfferings: any[] = [];

const mockEnrollmentModel = {
  find: mock(() => ({ populate: () => ({ lean: () => Promise.resolve(mockEnrollments) }) })),
  countDocuments: mock(() => Promise.resolve(mockEnrollments.length)),
  findOne: mock(() => Promise.resolve(null)),
  findById: mock((id: string) => ({ populate: () => ({ lean: () => Promise.resolve(mockEnrollments.find((e: any) => e._id === id) || null) }) })),
  create: mock((data: any) => Promise.resolve({ _id: generateObjectId(), ...data, createdAt: new Date(), updatedAt: new Date() })),
  findByIdAndUpdate: mock((id: string, data: any) => ({ lean: () => Promise.resolve({ _id: id, ...data }) })),
  findByIdAndDelete: mock((id: string) => Promise.resolve({ _id: id })),
  deleteMany: mock(() => Promise.resolve({ deletedCount: 1 }))
};

const mockStudentModel = {
  findById: mock((id: string) => Promise.resolve(mockStudents.find((s: any) => s._id === id) || null))
};

const mockOfferingModel = {
  findById: mock((id: string) => Promise.resolve(mockOfferings.find((o: any) => o._id === id) || null)),
  countDocuments: mock(() => Promise.resolve(0))
};

// Mock the audit middleware
const mockSaveAuditLog = mock(() => Promise.resolve());

mock.module('../../src/models', () => ({
  Enrollment: mockEnrollmentModel,
  Student: mockStudentModel,
  CourseOffering: mockOfferingModel
}));

mock.module('../../src/middleware/audit.middleware', () => ({
  saveAuditLog: mockSaveAuditLog,
  getAuditLogData: () => ({})
}));

mock.module('../../src/utils/pagination.util', () => ({
  getPaginationParams: () => ({ page: 1, limit: 10, search: '' }),
  buildPaginationMeta: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  })
}));

describe('EnrollmentsController - Create', () => {
  beforeEach(() => {
    mockEnrollments.length = 0;
    mockStudents.length = 0;
    mockOfferings.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/enrollments', () => {
    it('should create a new enrollment', async () => {
      const studentId = generateObjectId();
      const offeringId = generateObjectId();

      mockStudents.push({ _id: studentId, name: 'John Doe', rollNumber: 'CS001' });
      mockOfferings.push({ _id: offeringId, capacity: 30, status: 'active' });
      mockOfferingModel.countDocuments = mock(() => Promise.resolve(10));

      const req = createMockRequest(testUsers.admin);
      req.body = {
        studentId,
        offeringId,
        status: 'active'
      };
      const res = createMockResponse();

      await EnrollmentsController.create(req as any, res as any);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 409 if student already enrolled', async () => {
      const studentId = generateObjectId();
      const offeringId = generateObjectId();
      const existingEnrollment = { _id: generateObjectId(), studentId, offeringId };

      mockStudents.push({ _id: studentId, name: 'John Doe' });
      mockOfferings.push({ _id: offeringId, capacity: 30 });
      mockEnrollmentModel.findOne = mock(() => Promise.resolve(existingEnrollment));

      const req = createMockRequest(testUsers.admin);
      req.body = { studentId, offeringId };
      const res = createMockResponse();

      await EnrollmentsController.create(req as any, res as any);

      expect(res._status).toBe(409);
      expect(res._json?.error).toContain('already enrolled');
    });

    it('should return 400 if offering is at full capacity', async () => {
      const studentId = generateObjectId();
      const offeringId = generateObjectId();

      mockStudents.push({ _id: studentId, name: 'John Doe' });
      mockOfferings.push({ _id: offeringId, capacity: 30 });
      mockOfferingModel.countDocuments = mock(() => Promise.resolve(30));

      const req = createMockRequest(testUsers.admin);
      req.body = { studentId, offeringId };
      const res = createMockResponse();

      await EnrollmentsController.create(req as any, res as any);

      expect(res._status).toBe(400);
      expect(res._json?.error).toContain('capacity');
    });
  });
});

describe('EnrollmentsController - Bulk Enroll', () => {
  beforeEach(() => {
    mockEnrollments.length = 0;
    mockStudents.length = 0;
    mockOfferings.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/enrollments/bulk', () => {
    it('should enroll multiple students', async () => {
      const offeringId = generateObjectId();
      const student1Id = generateObjectId();
      const student2Id = generateObjectId();

      mockStudents.push(
        { _id: student1Id, name: 'Student 1' },
        { _id: student2Id, name: 'Student 2' }
      );
      mockOfferings.push({ _id: offeringId, capacity: 30 });
      mockOfferingModel.countDocuments = mock(() => Promise.resolve(0));

      const req = createMockRequest(testUsers.admin);
      req.body = {
        offeringId,
        studentIds: [student1Id, student2Id]
      };
      const res = createMockResponse();

      await EnrollmentsController.bulkEnroll(req as any, res as any);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('successful');
      expect(res._json?.data).toHaveProperty('failed');
    });

    it('should handle partial failures gracefully', async () => {
      const offeringId = generateObjectId();
      const student1Id = generateObjectId();
      const student2Id = generateObjectId();

      mockStudents.push({ _id: student1Id, name: 'Student 1' });
      mockStudents.push({ _id: student2Id, name: 'Student 2' });
      mockOfferings.push({ _id: offeringId, capacity: 30 });
      mockOfferingModel.countDocuments = mock(() => Promise.resolve(29));

      const req = createMockRequest(testUsers.admin);
      req.body = {
        offeringId,
        studentIds: [student1Id, student2Id]
      };
      const res = createMockResponse();

      await EnrollmentsController.bulkEnroll(req as any, res as any);

      expect(res._status).toBe(207); // Multi-status for partial success
      expect(res._json?.data).toHaveProperty('results');
    });
  });
});

describe('EnrollmentsController - Drop', () => {
  beforeEach(() => {
    mockEnrollments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('DELETE /api/enrollments/:id', () => {
    it('should drop enrollment successfully', async () => {
      const enrollmentId = generateObjectId();
      const enrollment = { _id: enrollmentId, studentId: generateObjectId(), offeringId: generateObjectId(), status: 'active' };

      mockEnrollmentModel.findById = mock(() => Promise.resolve(enrollment));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: enrollmentId };
      req.body = { reason: 'Student request' };
      const res = createMockResponse();

      await EnrollmentsController.drop(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 404 if enrollment not found', async () => {
      mockEnrollmentModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await EnrollmentsController.drop(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });
  });
});

describe('EnrollmentsController - List By Offering', () => {
  beforeEach(() => {
    mockEnrollments.length = 0;
  });

  describe('GET /api/enrollments/offering/:offeringId', () => {
    it('should return enrollments for an offering', async () => {
      const offeringId = generateObjectId();
      mockEnrollments.push(
        { _id: generateObjectId(), studentId: generateObjectId(), offeringId, status: 'active' },
        { _id: generateObjectId(), studentId: generateObjectId(), offeringId, status: 'active' }
      );

      const req = createMockRequest(testUsers.admin);
      req.params = { offeringId };
      const res = createMockResponse();

      await EnrollmentsController.getByOffering(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
    });
  });
});

describe('EnrollmentsController - List By Student', () => {
  beforeEach(() => {
    mockEnrollments.length = 0;
  });

  describe('GET /api/enrollments/student/:studentId', () => {
    it('should return enrollments for a student', async () => {
      const studentId = generateObjectId();
      mockEnrollments.push(
        { _id: generateObjectId(), studentId, offeringId: generateObjectId(), status: 'active' },
        { _id: generateObjectId(), studentId, offeringId: generateObjectId(), status: 'completed' }
      );

      const req = createMockRequest(testUsers.admin);
      req.params = { studentId };
      const res = createMockResponse();

      await EnrollmentsController.getByStudent(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
    });
  });
});
