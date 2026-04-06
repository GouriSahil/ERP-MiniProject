/**
 * Authentication Controller Tests
 * Tests for user registration, login, logout, token refresh, and password management
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthController } from '../../src/controllers/auth.controller';
import { createMockRequest, createMockResponse, testUsers } from '../utils/test-helpers';

// Mock the audit middleware
const mockSaveAuditLog = mock(() => Promise.resolve());

mock.module('../../src/middleware/audit.middleware', () => ({
  saveAuditLog: mockSaveAuditLog,
  getAuditLogData: () => ({})
}));

describe('AuthController - Login', () => {
  beforeEach(() => {
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email is missing', async () => {
      const req = createMockRequest();
      req.body = { password: 'password123' };
      const res = createMockResponse();

      await AuthController.login(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
      expect(res._json?.error).toBe('Email and password are required');
    });

    it('should return 400 if password is missing', async () => {
      const req = createMockRequest();
      req.body = { email: 'test@example.com' };
      const res = createMockResponse();

      await AuthController.login(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
      expect(res._json?.error).toBe('Email and password are required');
    });

    it('should return access and refresh tokens on successful login', async () => {
      const req = createMockRequest();
      req.body = { email: 'test@example.com', password: 'password123' };
      const res = createMockResponse();

      await AuthController.login(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('accessToken');
      expect(res._json?.data).toHaveProperty('refreshToken');
      expect(res._json?.data).toHaveProperty('user');
      expect(res._json?.data?.user?.email).toBe('test@example.com');
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should log audit entry on successful login', async () => {
      const req = createMockRequest();
      req.body = { email: 'test@example.com', password: 'password123' };
      const res = createMockResponse();

      await AuthController.login(req, res);

      expect(mockSaveAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          status: 'success',
          targetType: 'auth'
        })
      );
    });
  });
});

describe('AuthController - Registration', () => {
  beforeEach(() => {
    mockSaveAuditLog.mockClear();
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if name is missing', async () => {
      const req = createMockRequest();
      req.body = { email: 'test@example.com', password: 'password123' };
      const res = createMockResponse();

      await AuthController.register(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.success).toBe(false);
      expect(res._json?.error).toBe('Name, email, and password are required');
    });

    it('should return 400 if email is missing', async () => {
      const req = createMockRequest();
      req.body = { name: 'Test User', password: 'password123' };
      const res = createMockResponse();

      await AuthController.register(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('Name, email, and password are required');
    });

    it('should return 400 if password is missing', async () => {
      const req = createMockRequest();
      req.body = { name: 'Test User', email: 'test@example.com' };
      const res = createMockResponse();

      await AuthController.register(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('Name, email, and password are required');
    });

    it('should return 400 if password is less than 8 characters', async () => {
      const req = createMockRequest();
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'pass'
      };
      const res = createMockResponse();

      await AuthController.register(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('Password must be at least 8 characters long');
    });

    it('should return 400 for invalid role', async () => {
      const req = createMockRequest();
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid_role'
      };
      const res = createMockResponse();

      await AuthController.register(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('Invalid role. Must be one of: student, faculty, admin');
    });

    it('should return 201 on successful registration', async () => {
      const req = createMockRequest();
      req.body = {
        name: 'Test User',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'student'
      };
      const res = createMockResponse();

      await AuthController.register(req, res);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('id');
      expect(res._json?.data?.name).toBe('Test User');
      expect(res._json?.data?.email).toBe('newuser@example.com');
      expect(res._json?.data?.role).toBe('student');
      expect(mockSaveAuditLog).toHaveBeenCalled();
    });

    it('should accept valid role values', async () => {
      const validRoles = ['student', 'faculty', 'admin'];

      for (const role of validRoles) {
        const req = createMockRequest();
        req.body = {
          name: 'Test User',
          email: `test${role}@example.com`,
          password: 'password123',
          role
        };
        const res = createMockResponse();

        await AuthController.register(req, res);

        expect(res._status).toBe(201);
        expect(res._json?.success).toBe(true);
        expect(res._json?.data?.role).toBe(role);
      }
    });
  });
});

describe('AuthController - Logout', () => {
  describe('POST /api/auth/logout', () => {
    it('should return 200 on successful logout', async () => {
      const req = createMockRequest(testUsers.student);
      const res = createMockResponse();

      await AuthController.logout(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.message).toBe('Logout successful');
      expect(mockSaveAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'logout',
          status: 'success'
        })
      );
    });
  });
});

describe('AuthController - Get Current User', () => {
  describe('GET /api/auth/me', () => {
    it('should return current user data', async () => {
      const req = createMockRequest(testUsers.student);
      const res = createMockResponse();

      await AuthController.me(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('_id');
      expect(res._json?.data).toHaveProperty('name');
      expect(res._json?.data).toHaveProperty('email');
      expect(res._json?.data).toHaveProperty('role');
    });
  });
});

describe('AuthController - Change Password', () => {
  describe('POST /api/auth/change-password', () => {
    it('should return 400 if current password is missing', async () => {
      const req = createMockRequest(testUsers.student);
      req.body = { newPassword: 'newpassword123' };
      const res = createMockResponse();

      await AuthController.changePassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('Current password and new password are required');
    });

    it('should return 400 if new password is missing', async () => {
      const req = createMockRequest(testUsers.student);
      req.body = { currentPassword: 'oldpassword123' };
      const res = createMockResponse();

      await AuthController.changePassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('Current password and new password are required');
    });

    it('should return 400 if new password is less than 8 characters', async () => {
      const req = createMockRequest(testUsers.student);
      req.body = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpass'
      };
      const res = createMockResponse();

      await AuthController.changePassword(req, res);

      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('New password must be at least 8 characters');
    });

    it('should return 200 on successful password change', async () => {
      const req = createMockRequest(testUsers.student);
      req.body = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123'
      };
      const res = createMockResponse();

      await AuthController.changePassword(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.message).toBe('Password changed successfully');
      expect(mockSaveAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'change_password',
          status: 'success'
        })
      );
    });
  });
});

describe('AuthController - Refresh Token', () => {
  describe('POST /api/auth/refresh', () => {
    it('should return a new access token', async () => {
      const req = createMockRequest(testUsers.student);
      const res = createMockResponse();

      await AuthController.refreshToken(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('token');
      expect(res._json?.message).toBe('Token refreshed successfully');
    });
  });
});
