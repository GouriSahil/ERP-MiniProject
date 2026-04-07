/**
 * User Sessions Controller Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { setupTestDatabase, clearTestDatabase, testFixtures } from './setup';
import { UserSessionsController } from '../../src/controllers/user-sessions.controller';
import { createMockRequest, createMockResponse, generateObjectId } from '../utils/test-helpers';
import { UserSession, User } from '../../src/models';
import { UserRole } from '../../src/models/User';
import { SessionStatus } from '../../src/models/UserSession';
import bcrypt from 'bcrypt';

describe('UserSessionsController', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  describe('listSessions', () => {
    it('should list sessions for a user (admin)', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const targetUser = await testFixtures.createUser({
        name: 'Target User',
        email: 'target@test.com',
        role: UserRole.STUDENT
      });

      // Create some test sessions
      await UserSession.create({
        userId: targetUser.id,
        token: 'hash1',
        tokenId: generateObjectId(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      await UserSession.create({
        userId: targetUser.id,
        token: 'hash2',
        tokenId: generateObjectId(),
        ipAddress: '192.168.1.2',
        userAgent: 'Chrome/120.0',
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
        revokeReason: 'Test revocation'
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { userId: targetUser.id };
      const res = createMockResponse();

      // Act
      await UserSessionsController.listSessions(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.sessions).toHaveLength(2);
      expect(res._json?.data?.activeCount).toBe(1);
      expect(res._json?.data?.revokedCount).toBe(1);
    });

    it('should allow users to view their own sessions', async () => {
      // Arrange
      const targetUser = await testFixtures.createUser({
        name: 'Target User',
        email: 'target@test.com',
        role: UserRole.STUDENT
      });

      await UserSession.create({
        userId: targetUser.id,
        token: 'hash1',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      const req = createMockRequest({
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role
      });
      req.params = { userId: targetUser.id };
      const res = createMockResponse();

      // Act
      await UserSessionsController.listSessions(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
    });

    it('should deny non-admins viewing other users sessions', async () => {
      // Arrange
      const student1 = await testFixtures.createUser({
        name: 'Student 1',
        email: 'student1@test.com',
        role: UserRole.STUDENT
      });

      const student2 = await testFixtures.createUser({
        name: 'Student 2',
        email: 'student2@test.com',
        role: UserRole.STUDENT
      });

      const req = createMockRequest({
        userId: student1.id,
        email: student1.email,
        role: student1.role
      });
      req.params = { userId: student2.id };
      const res = createMockResponse();

      // Act
      await UserSessionsController.listSessions(req, res);

      // Assert
      expect(res._status).toBe(403);
      expect(res._json?.error).toContain('permission');
    });
  });

  describe('getCurrentSession', () => {
    it('should return current session info', async () => {
      // Arrange
      const user = await testFixtures.createUser({
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.STUDENT
      });

      const tokenId = generateObjectId();
      await UserSession.create({
        userId: user.id,
        token: 'hashed-token',
        tokenId: tokenId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      const req = createMockRequest({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      req.user = { ...req.user, tokenId: tokenId, jti: tokenId };
      const res = createMockResponse();

      // Act
      await UserSessionsController.getCurrentSession(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.tokenId).toBe(tokenId);
    });

    it('should return 400 when tokenId is not available', async () => {
      // Arrange
      const user = await testFixtures.createUser({
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.STUDENT
      });

      const req = createMockRequest({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      const res = createMockResponse();

      // Act
      await UserSessionsController.getCurrentSession(req, res);

      // Assert
      expect(res._status).toBe(400);
      expect(res._json?.error).toContain('Session info not available');
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session as admin', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const targetUser = await testFixtures.createUser({
        name: 'Target User',
        email: 'target@test.com',
        role: UserRole.STUDENT
      });

      const session = await UserSession.create({
        userId: targetUser.id,
        token: 'hashed-token',
        tokenId: generateObjectId(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { sessionId: session._id.toString() };
      req.body = { reason: 'Suspicious activity detected' };
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await UserSessionsController.revokeSession(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);

      // Verify in database
      const revokedSession = await UserSession.findById(session._id);
      expect(revokedSession?.status).toBe(SessionStatus.REVOKED);
      expect(revokedSession?.revokeReason).toBe('Suspicious activity detected');
    });

    it('should allow users to revoke their own sessions', async () => {
      // Arrange
      const user = await testFixtures.createUser({
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.STUDENT
      });

      const session = await UserSession.create({
        userId: user.id,
        token: 'hashed-token',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      const req = createMockRequest({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      req.params = { sessionId: session._id.toString() };
      req.body = {};
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await UserSessionsController.revokeSession(req, res);

      // Assert
      expect(res._status).toBe(200);
    });

    it('should return 404 for non-existent session', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { sessionId: '507f1f77bcf86cd799439011' };
      req.body = {};
      const res = createMockResponse();

      // Act
      await UserSessionsController.revokeSession(req, res);

      // Assert
      expect(res._status).toBe(404);
    });

    it('should return 400 for already revoked session', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const session = await UserSession.create({
        userId: adminUser.id,
        token: 'hashed-token',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.REVOKED,
        revokedAt: new Date()
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { sessionId: session._id.toString() };
      req.body = {};
      const res = createMockResponse();

      // Act
      await UserSessionsController.revokeSession(req, res);

      // Assert
      expect(res._status).toBe(400);
      expect(res._json?.error).toContain('already revoked');
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions for a user (admin)', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const targetUser = await testFixtures.createUser({
        name: 'Target User',
        email: 'target@test.com',
        role: UserRole.STUDENT
      });

      const tokenId1 = generateObjectId();
      const tokenId2 = generateObjectId();

      await UserSession.create({
        userId: targetUser.id,
        token: 'hash1',
        tokenId: tokenId1,
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      await UserSession.create({
        userId: targetUser.id,
        token: 'hash2',
        tokenId: tokenId2,
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { userId: targetUser.id };
      req.body = { reason: 'Security breach', excludeCurrent: false };
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await UserSessionsController.revokeAllUserSessions(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.revokedCount).toBe(2);

      // Verify in database
      const activeSessions = await UserSession.countDocuments({
        userId: targetUser.id,
        status: SessionStatus.ACTIVE
      });
      expect(activeSessions).toBe(0);
    });

    it('should exclude current session when requested', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const currentTokenId = generateObjectId();
      const otherTokenId = generateObjectId();

      await UserSession.create({
        userId: adminUser.id,
        token: 'hash1',
        tokenId: currentTokenId,
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      await UserSession.create({
        userId: adminUser.id,
        token: 'hash2',
        tokenId: otherTokenId,
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.user = { ...req.user, tokenId: currentTokenId, jti: currentTokenId };
      req.params = { userId: adminUser.id };
      req.body = { excludeCurrent: true };
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await UserSessionsController.revokeAllUserSessions(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.data?.revokedCount).toBe(1);

      // Verify current session is still active
      const currentSession = await UserSession.findOne({ tokenId: currentTokenId });
      expect(currentSession?.status).toBe(SessionStatus.ACTIVE);
    });

    it('should allow users to revoke their own sessions', async () => {
      // Arrange
      const user = await testFixtures.createUser({
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.STUDENT
      });

      await UserSession.create({
        userId: user.id,
        token: 'hash1',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      const req = createMockRequest({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      req.params = { userId: user.id };
      req.body = {};
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await UserSessionsController.revokeAllUserSessions(req, res);

      // Assert
      expect(res._status).toBe(200);
    });
  });

  describe('getAllActiveSessions', () => {
    it('should return all active sessions for admin', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const user1 = await testFixtures.createUser({
        name: 'User 1',
        email: 'user1@test.com',
        role: UserRole.STUDENT
      });

      const user2 = await testFixtures.createUser({
        name: 'User 2',
        email: 'user2@test.com',
        role: UserRole.FACULTY
      });

      await UserSession.create({
        userId: user1.id,
        token: 'hash1',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      await UserSession.create({
        userId: user2.id,
        token: 'hash2',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.ACTIVE
      });

      await UserSession.create({
        userId: user1.id,
        token: 'hash3',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() + 3600000),
        status: SessionStatus.REVOKED
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.query = {};
      const res = createMockResponse();

      // Act
      await UserSessionsController.getAllActiveSessions(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.data).toHaveLength(2);
      expect(res._json?.data?.pagination?.total).toBe(2);
    });

    it('should paginate results correctly', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const user1 = await testFixtures.createUser({
        name: 'User 1',
        email: 'user1@test.com',
        role: UserRole.STUDENT
      });

      // Create 15 active sessions
      for (let i = 0; i < 15; i++) {
        await UserSession.create({
          userId: user1.id,
          token: `hash${i}`,
          tokenId: generateObjectId(),
          expiresAt: new Date(Date.now() + 3600000),
          status: SessionStatus.ACTIVE
        });
      }

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.query = { page: '2', limit: '5' };
      const res = createMockResponse();

      // Act
      await UserSessionsController.getAllActiveSessions(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.data?.data).toHaveLength(5);
      expect(res._json?.data?.pagination?.page).toBe(2);
      expect(res._json?.data?.pagination?.totalPages).toBe(3);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should mark expired sessions as expired', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      await UserSession.create({
        userId: adminUser.id,
        token: 'hash1',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() - 1000000), // Expired
        status: SessionStatus.ACTIVE
      });

      await UserSession.create({
        userId: adminUser.id,
        token: 'hash2',
        tokenId: generateObjectId(),
        expiresAt: new Date(Date.now() + 3600000), // Still active
        status: SessionStatus.ACTIVE
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.body = {};
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await UserSessionsController.cleanupExpiredSessions(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.expiredCount).toBe(1);

      // Verify in database
      const expiredSessions = await UserSession.countDocuments({ status: SessionStatus.EXPIRED });
      expect(expiredSessions).toBe(1);

      const activeSessions = await UserSession.countDocuments({ status: SessionStatus.ACTIVE });
      expect(activeSessions).toBe(1);
    });

    it('should deny non-admins from cleanup', async () => {
      // Arrange
      const student = await testFixtures.createUser({
        name: 'Student User',
        email: 'student@test.com',
        role: UserRole.STUDENT
      });

      const req = createMockRequest({
        userId: student.id,
        email: student.email,
        role: student.role
      });
      req.body = {};
      const res = createMockResponse();

      // Act
      await UserSessionsController.cleanupExpiredSessions(req, res);

      // Assert
      expect(res._status).toBe(403);
      expect(res._json?.error).toContain('Only admins');
    });
  });
});
