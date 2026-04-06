/**
 * Authentication Integration Tests with Real Database
 * Tests authentication endpoints with actual MongoDB operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  testFixtures,
} from './setup';
import { User, UserRole } from '../../src/models/User';
import { AuthController } from '../../src/controllers/auth.controller';
import { createMockRequest, createMockResponse } from '../utils/test-helpers';

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  describe('User Registration - Real Database', () => {
    it('should create a new user in the database', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        role: UserRole.STUDENT,
      };

      const req = createMockRequest();
      req.body = userData;
      const res = createMockResponse();

      await AuthController.register(req, res);

      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('id');

      // Verify user exists in database
      const user = await User.findOne({ email: userData.email }).select(
        '+passwordHash'
      );
      expect(user).not.toBeNull();
      expect(user?.name).toBe(userData.name);
      expect(user?.email).toBe(userData.email);
      expect(user?.role).toBe(userData.role);

      // Verify password is hashed
      expect(user?.passwordHash).not.toBe(userData.password);
      const isPasswordValid = await bcrypt.compare(
        userData.password,
        user?.passwordHash || ''
      );
      expect(isPasswordValid).toBe(true);
    });

    it('should not allow duplicate email addresses', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'SecurePass123!',
        role: UserRole.STUDENT,
      };

      // First registration should succeed
      const req1 = createMockRequest();
      req1.body = userData;
      const res1 = createMockResponse();

      await AuthController.register(req1, res1);
      expect(res1._status).toBe(201);

      // Second registration with same email should fail
      const req2 = createMockRequest();
      req2.body = { ...userData, name: 'Jane Smith' };
      const res2 = createMockResponse();

      await AuthController.register(req2, res2);
      expect(res2._status).toBe(400);
      expect(res2._json?.success).toBe(false);
    });

    it('should create users with different roles', async () => {
      const roles = [
        UserRole.STUDENT,
        UserRole.FACULTY,
        UserRole.ADMIN,
        UserRole.DEPT_HEAD,
        UserRole.STAFF,
      ];

      for (const role of roles) {
        const userData = {
          name: `Test ${role}`,
          email: `${role}@test.com`,
          password: 'SecurePass123!',
          role,
        };

        const req = createMockRequest();
        req.body = userData;
        const res = createMockResponse();

        await AuthController.register(req, res);

        expect(res._status).toBe(201);
        expect(res._json?.data?.role).toBe(role);

        // Verify in database
        const user = await User.findOne({ email: userData.email });
        expect(user?.role).toBe(role);
      }
    });

    it('should create super admin user', async () => {
      const userData = {
        name: 'Super Admin',
        email: 'superadmin@erp.com',
        password: 'AdminPass123!',
        role: UserRole.SUPER_ADMIN,
      };

      const req = createMockRequest();
      req.body = userData;
      const res = createMockResponse();

      await AuthController.register(req, res);

      expect(res._status).toBe(201);
      expect(res._json?.data?.role).toBe(UserRole.SUPER_ADMIN);

      const user = await User.findOne({ email: userData.email });
      expect(user?.role).toBe(UserRole.SUPER_ADMIN);
    });
  });

  describe('User Login - Real Database', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await testFixtures.createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: UserRole.STUDENT,
      });
    });

    it('should login with correct credentials', async () => {
      const req = createMockRequest();
      req.body = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };
      const res = createMockResponse();

      await AuthController.login(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('accessToken');
      expect(res._json?.data).toHaveProperty('refreshToken');
      expect(res._json?.data?.user?.email).toBe('test@example.com');
    });

    it('should not login with incorrect password', async () => {
      const req = createMockRequest();
      req.body = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };
      const res = createMockResponse();

      await AuthController.login(req, res);

      expect(res._status).toBe(401);
      expect(res._json?.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const req = createMockRequest();
      req.body = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      };
      const res = createMockResponse();

      await AuthController.login(req, res);

      expect(res._status).toBe(401);
      expect(res._json?.success).toBe(false);
    });

    it('should generate valid JWT token on login', async () => {
      const req = createMockRequest();
      req.body = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };
      const res = createMockResponse();

      await AuthController.login(req, res);

      const accessToken = res._json?.data?.accessToken;
      expect(accessToken).toBeTruthy();

      // Verify token is valid JWT
      const decoded = jwt.decode(accessToken) as { userId: string; email: string };
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('Get Current User - Real Database', () => {
    it('should return user data from database', async () => {
      const userData = await testFixtures.createUser({
        name: 'Current User',
        email: 'current@example.com',
        password: 'Password123!',
        role: UserRole.FACULTY,
      });

      const req = createMockRequest({
        userId: userData.id,
        email: userData.email,
        role: userData.role,
      });
      const res = createMockResponse();

      await AuthController.me(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data).toHaveProperty('_id');
      expect(res._json?.data?.email).toBe(userData.email);
      expect(res._json?.data?.name).toBe(userData.name);
      expect(res._json?.data).not.toHaveProperty('passwordHash');
    });

    it('should include department info for users with department', async () => {
      const dept = await testFixtures.createDepartment({
        name: 'Computer Science',
        code: 'CS',
      });

      const userData = await testFixtures.createUser({
        name: 'Dept User',
        email: 'deptuser@example.com',
        password: 'Password123!',
        role: UserRole.DEPT_HEAD,
        departmentId: dept.id as unknown as any,
      });

      const req = createMockRequest({
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        departmentId: dept.id,
      });
      const res = createMockResponse();

      await AuthController.me(req, res);

      expect(res._status).toBe(200);
      expect(res._json?.data?.departmentId).toBeTruthy();
    });
  });

  describe('Change Password - Real Database', () => {
    beforeEach(async () => {
      await testFixtures.createUser({
        name: 'Password User',
        email: 'passworduser@example.com',
        password: 'OldPassword123!',
        role: UserRole.STUDENT,
      });
    });

    it('should update password in database', async () => {
      const req = createMockRequest({
        userId: 'any-id',
        email: 'passworduser@example.com',
        role: UserRole.STUDENT,
      });
      req.body = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };
      const res = createMockResponse();

      await AuthController.changePassword(req, res);

      expect(res._status).toBe(200);

      // Verify password was updated in database
      const user = await User
        .findOne({ email: 'passworduser@example.com' })
        .select('+passwordHash');

      const isNewPasswordValid = await bcrypt.compare(
        'NewPassword456!',
        user?.passwordHash || ''
      );
      expect(isNewPasswordValid).toBe(true);

      const isOldPasswordValid = await bcrypt.compare(
        'OldPassword123!',
        user?.passwordHash || ''
      );
      expect(isOldPasswordValid).toBe(false);
    });

    it('should not change password with incorrect current password', async () => {
      const req = createMockRequest({
        userId: 'any-id',
        email: 'passworduser@example.com',
        role: UserRole.STUDENT,
      });
      req.body = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword456!',
      };
      const res = createMockResponse();

      await AuthController.changePassword(req, res);

      expect(res._status).toBe(401);

      // Verify password was NOT changed
      const user = await User
        .findOne({ email: 'passworduser@example.com' })
        .select('+passwordHash');

      const isOldPasswordValid = await bcrypt.compare(
        'OldPassword123!',
        user?.passwordHash || ''
      );
      expect(isOldPasswordValid).toBe(true);
    });
  });

  describe('Token Generation and Validation', () => {
    it('should generate tokens that expire at correct time', async () => {
      await testFixtures.createUser({
        name: 'Token User',
        email: 'tokenuser@example.com',
        password: 'Password123!',
        role: UserRole.STUDENT,
      });

      const req = createMockRequest();
      req.body = {
        email: 'tokenuser@example.com',
        password: 'Password123!',
      };
      const res = createMockResponse();

      await AuthController.login(req, res);

      const accessToken = res._json?.data?.accessToken;
      const decoded = jwt.decode(accessToken) as { exp: number };

      // Access token should expire in 1 hour (3600 seconds)
      const expirationTime = decoded.exp * 1000;
      const now = Date.now();
      const timeUntilExpiry = expirationTime - now;

      expect(timeUntilExpiry).toBeGreaterThan(3500 * 1000); // ~58 minutes
      expect(timeUntilExpiry).toBeLessThan(3600 * 1000); // 60 minutes
    });
  });
});

// Clean up after all tests
afterAll(async () => {
  await teardownTestDatabase();
});
