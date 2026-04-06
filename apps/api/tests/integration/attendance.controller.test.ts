/**
 * Attendance Controller Tests
 * Tests for attendance marking, bulk operations, and reports
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AttendanceController } from '../../src/controllers/attendance.controller';
import { createMockRequest, createMockResponse, testUsers, generateObjectId } from '../utils/test-helpers';

// Mock the models
const mockAttendance: any[] = [];
const mockSessions: any[] = [];
const mockEnrollments: any[] = [];

const mockAttendanceModel = {
  find: mock(() => ({ populate: () => ({ lean: () => Promise.resolve(mockAttendance) }) })),
  countDocuments: mock(() => Promise.resolve(mockAttendance.length)),
  findOne: mock(() => Promise.resolve(null)),
  findById: mock((id: string) => ({ populate: () => ({ lean: () => Promise.resolve(mockAttendance.find((a: any) => a._id === id) || null) }) })),
  create: mock((data: any) => Promise.resolve({ _id: generateObjectId(), ...data, createdAt: new Date(), updatedAt: new Date() })),
  findByIdAndUpdate: mock((id: string, data: any) => ({ lean: () => Promise.resolve({ _id: id, ...data }) })),
  findByIdAndDelete: mock((id: string) => Promise.resolve({ _id: id }))
};

const mockSessionModel = {
  findById: mock((id: string) => Promise.resolve(mockSessions.find((s: any) => s._id === id) || null)),
  find: mock(() => ({ select: () => Promise.resolve([]) }))
};

const mockEnrollmentModel = {
  findOne: mock(() => Promise.resolve(null)),
  find: mock(() => ({ populate: () => ({ lean: () => Promise.resolve(mockEnrollments) }) }))
};

// Mock the audit middleware
const mockSaveAuditLog = mock(() => Promise.resolve());

mock.module('../../src/models', () => ({
  AttendanceRecord: mockAttendanceModel,
  Session: mockSessionModel,
  Enrollment: mockEnrollmentModel
}));

mock.module('../../src/middleware/audit.middleware', () => ({
  saveAuditLog: mockSaveAuditLog,
  getAuditLogData: () => ({})
}));

mock.module('../../src/utils/pagination.util', () => ({
  getPaginationParams: () => ({ page: 1, limit: 10, search: '', sortBy: 'markedAt', sortOrder: 'desc' }),
  buildPaginationMeta: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  })
}));

describe('AttendanceController - Create', () => {
  beforeEach(() => {
    mockAttendance.length = 0;
    mockSessions.length = 0;
    mockEnrollments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/attendance', () => {
    it('should mark attendance for a student', async () => {
      const sessionId = generateObjectId();
      const studentId = generateObjectId();
      const offeringId = generateObjectId();

      mockSessions.push({ _id: sessionId, offeringId, date: new Date(), status: 'scheduled' });
      mockEnrollments.push({ _id: generateObjectId(), studentId, offeringId, status: 'active' });
      mockEnrollmentModel.findOne = mock(() => Promise.resolve({ studentId, offeringId }));

      const req = createMockRequest(testUsers.faculty);
      req.body = {
        studentId,
        sessionId,
        status: 'present'
      };
      const res = createMockResponse();

      await AttendanceController.create(req as any, res as any);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 409 if attendance already marked', async () => {
      const sessionId = generateObjectId();
      const studentId = generateObjectId();
      const existingAttendance = { _id: generateObjectId(), sessionId, studentId };

      mockSessions.push({ _id: sessionId, offeringId: generateObjectId() });
      mockAttendanceModel.findOne = mock(() => Promise.resolve(existingAttendance));

      const req = createMockRequest(testUsers.faculty);
      req.body = { sessionId, studentId, status: 'present' };
      const res = createMockResponse();

      await AttendanceController.create(req as any, res as any);

      expect(res._status).toBe(409);
      expect(res._json?.error).toContain('already exists');
    });

    it('should return 404 if session not found', async () => {
      mockSessionModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.faculty);
      req.body = {
        sessionId: generateObjectId(),
        studentId: generateObjectId(),
        status: 'present'
      };
      const res = createMockResponse();

      await AttendanceController.create(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });

    it('should return 400 if student not enrolled', async () => {
      const sessionId = generateObjectId();
      const studentId = generateObjectId();
      const offeringId = generateObjectId();

      mockSessions.push({ _id: sessionId, offeringId });
      mockEnrollmentModel.findOne = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.faculty);
      req.body = { sessionId, studentId, status: 'present' };
      const res = createMockResponse();

      await AttendanceController.create(req as any, res as any);

      expect(res._status).toBe(400);
      expect(res._json?.error).toContain('not enrolled');
    });
  });
});

describe('AttendanceController - Mark Session Attendance', () => {
  beforeEach(() => {
    mockAttendance.length = 0;
    mockSessions.length = 0;
    mockEnrollments.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/attendance/mark-session', () => {
    it('should mark attendance for multiple students', async () => {
      const sessionId = generateObjectId();
      const student1Id = generateObjectId();
      const student2Id = generateObjectId();
      const offeringId = generateObjectId();

      mockSessions.push({ _id: sessionId, offeringId, status: 'scheduled' });
      mockEnrollmentModel.findOne = mock(() => Promise.resolve({ studentId: student1Id, offeringId }));

      const req = createMockRequest(testUsers.faculty);
      req.body = {
        sessionId,
        attendance: [
          { studentId: student1Id, status: 'present' },
          { studentId: student2Id, status: 'absent' }
        ]
      };
      const res = createMockResponse();

      await AttendanceController.markSessionAttendance(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('created');
      expect(res._json?.data).toHaveProperty('updated');
      expect(res._json?.data).toHaveProperty('failed');
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 400 for invalid attendance array', async () => {
      const req = createMockRequest(testUsers.faculty);
      req.body = {
        sessionId: generateObjectId(),
        attendance: 'not-an-array'
      };
      const res = createMockResponse();

      await AttendanceController.markSessionAttendance(req as any, res as any);

      expect(res._status).toBe(400);
      expect(res._json?.error).toContain('array is required');
    });

    it('should return 404 if session not found', async () => {
      mockSessionModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.faculty);
      req.body = {
        sessionId: generateObjectId(),
        attendance: [{ studentId: generateObjectId(), status: 'present' }]
      };
      const res = createMockResponse();

      await AttendanceController.markSessionAttendance(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });
  });
});

describe('AttendanceController - Get By Session', () => {
  beforeEach(() => {
    mockAttendance.length = 0;
  });

  describe('GET /api/attendance/session/:sessionId', () => {
    it('should return attendance records for a session', async () => {
      const sessionId = generateObjectId();
      mockAttendance.push(
        { _id: generateObjectId(), sessionId, studentId: generateObjectId(), status: 'present' },
        { _id: generateObjectId(), sessionId, studentId: generateObjectId(), status: 'absent' }
      );

      const req = createMockRequest(testUsers.faculty);
      req.params = { sessionId };
      const res = createMockResponse();

      await AttendanceController.getBySession(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
    });
  });
});

describe('AttendanceController - Get By Student', () => {
  beforeEach(() => {
    mockAttendance.length = 0;
  });

  describe('GET /api/attendance/student/:studentId', () => {
    it('should return attendance records for a student', async () => {
      const studentId = generateObjectId();
      mockAttendance.push(
        { _id: generateObjectId(), studentId, sessionId: generateObjectId(), status: 'present' },
        { _id: generateObjectId(), studentId, sessionId: generateObjectId(), status: 'present' }
      );

      const req = createMockRequest(testUsers.admin);
      req.params = { studentId };
      const res = createMockResponse();

      await AttendanceController.getByStudent(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
    });
  });
});

describe('AttendanceController - Update', () => {
  beforeEach(() => {
    mockAttendance.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('PUT /api/attendance/:id', () => {
    it('should update attendance record', async () => {
      const attendanceId = generateObjectId();
      const existingRecord = { _id: attendanceId, studentId: generateObjectId(), sessionId: generateObjectId(), status: 'absent' };

      const req = createMockRequest(testUsers.faculty);
      req.params = { id: attendanceId };
      req.body = { status: 'present', remarks: 'Late arrival' };
      const res = createMockResponse();

      await AttendanceController.update(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 404 if record not found', async () => {
      mockAttendanceModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.faculty);
      req.params = { id: generateObjectId() };
      req.body = { status: 'present' };
      const res = createMockResponse();

      await AttendanceController.update(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });
  });
});

describe('AttendanceController - Delete', () => {
  beforeEach(() => {
    mockAttendance.length = 0;
    mockSaveAuditLog.mockClear();
  });

  describe('DELETE /api/attendance/:id', () => {
    it('should delete attendance record', async () => {
      const attendanceId = generateObjectId();
      const existingRecord = { _id: attendanceId, studentId: generateObjectId(), sessionId: generateObjectId() };

      const req = createMockRequest(testUsers.admin);
      req.params = { id: attendanceId };
      const res = createMockResponse();

      await AttendanceController.delete(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should return 404 if record not found', async () => {
      mockAttendanceModel.findById = mock(() => Promise.resolve(null));

      const req = createMockRequest(testUsers.admin);
      req.params = { id: generateObjectId() };
      const res = createMockResponse();

      await AttendanceController.delete(req as any, res as any);

      expect(res._status).toBe(404);
      expect(res._json?.success).toBe(false);
    });
  });
});

describe('AttendanceController - List', () => {
  beforeEach(() => {
    mockAttendance.length = 0;
  });

  describe('GET /api/attendance', () => {
    it('should return paginated attendance records', async () => {
      const sessionId = generateObjectId();
      mockAttendance.push(
        { _id: generateObjectId(), sessionId, studentId: generateObjectId(), status: 'present' },
        { _id: generateObjectId(), sessionId, studentId: generateObjectId(), status: 'absent' }
      );

      const req = createMockRequest(testUsers.admin);
      req.query = { sessionId };
      const res = createMockResponse();

      await AttendanceController.list(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toBeInstanceOf(Array);
      expect(res._json?.pagination).toHaveProperty('total');
    });
  });
});
