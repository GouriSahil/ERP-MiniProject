/**
 * Custom Role Controller Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { setupTestDatabase, clearTestDatabase, testFixtures } from './setup';
import { CustomRoleController } from '../../src/controllers/custom-roles.controller';
import { createMockRequest, createMockResponse } from '../utils/test-helpers';
import { CustomRole, User } from '../../src/models';
import { UserRole } from '../../src/models/User';
import { Permission } from '../../src/models/CustomRole';

describe('CustomRoleController', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  describe('listRoles', () => {
    it('should list all custom roles', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      await CustomRole.create({
        name: 'Test Role 1',
        permissions: [Permission.USERS_READ, Permission.STUDENTS_READ],
        description: 'Test role 1'
      });

      await CustomRole.create({
        name: 'Test Role 2',
        permissions: [Permission.COURSES_READ],
        description: 'Test role 2'
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.query = {};
      const res = createMockResponse();

      // Act
      await CustomRoleController.listRoles(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.data).toHaveLength(2);
      expect(res._json?.data?.pagination?.total).toBe(2);
    });

    it('should filter roles by search term', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      await CustomRole.create({
        name: 'Finance Manager',
        permissions: [Permission.USERS_READ],
        description: 'Finance role'
      });

      await CustomRole.create({
        name: 'HR Manager',
        permissions: [Permission.STUDENTS_READ],
        description: 'HR role'
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.query = { search: 'Finance' };
      const res = createMockResponse();

      // Act
      await CustomRoleController.listRoles(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.data?.data).toHaveLength(1);
      expect(res._json?.data?.data[0].name).toBe('Finance Manager');
    });

    it('should paginate results correctly', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      // Create 15 roles
      for (let i = 1; i <= 15; i++) {
        await CustomRole.create({
          name: `Role ${i}`,
          permissions: [Permission.USERS_READ],
          description: `Test role ${i}`
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
      await CustomRoleController.listRoles(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.data?.data).toHaveLength(5);
      expect(res._json?.data?.pagination?.page).toBe(2);
      expect(res._json?.data?.pagination?.limit).toBe(5);
      expect(res._json?.data?.pagination?.total).toBe(15);
      expect(res._json?.data?.pagination?.totalPages).toBe(3);
    });
  });

  describe('getRole', () => {
    it('should get a role by ID', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const role = await CustomRole.create({
        name: 'Test Role',
        permissions: [Permission.USERS_READ, Permission.USERS_UPDATE],
        description: 'Test description'
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { id: role._id.toString() };
      const res = createMockResponse();

      // Act
      await CustomRoleController.getRole(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.name).toBe('Test Role');
      expect(res._json?.data?.permissions).toEqual([Permission.USERS_READ, Permission.USERS_UPDATE]);
    });

    it('should return 404 for non-existent role', async () => {
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
      req.params = { id: '507f1f77bcf86cd799439011' };
      const res = createMockResponse();

      // Act
      await CustomRoleController.getRole(req, res);

      // Assert
      expect(res._status).toBe(404);
      expect(res._json?.error).toContain('not found');
    });
  });

  describe('createRole', () => {
    it('should create a new custom role', async () => {
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
      req.body = {
        name: 'Course Manager',
        permissions: [Permission.COURSES_CREATE, Permission.COURSES_READ, Permission.COURSES_UPDATE],
        description: 'Can manage courses'
      };
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await CustomRoleController.createRole(req, res);

      // Assert
      expect(res._status).toBe(201);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.name).toBe('Course Manager');
      expect(res._json?.data?.permissions).toEqual([
        Permission.COURSES_CREATE,
        Permission.COURSES_READ,
        Permission.COURSES_UPDATE
      ]);

      // Verify in database
      const role = await CustomRole.findOne({ name: 'Course Manager' });
      expect(role).toBeDefined();
      expect(role?.permissions).toHaveLength(3);
    });

    it('should return 400 if name is missing', async () => {
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
      req.body = {
        permissions: [Permission.USERS_READ]
      };
      const res = createMockResponse();

      // Act
      await CustomRoleController.createRole(req, res);

      // Assert
      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('Name and permissions array are required');
    });

    it('should return 400 if permissions array is missing', async () => {
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
      req.body = {
        name: 'Test Role'
      };
      const res = createMockResponse();

      // Act
      await CustomRoleController.createRole(req, res);

      // Assert
      expect(res._status).toBe(400);
      expect(res._json?.error).toBe('Name and permissions array are required');
    });

    it('should return 409 for duplicate role name', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      await CustomRole.create({
        name: 'Duplicate Role',
        permissions: [Permission.USERS_READ]
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.body = {
        name: 'Duplicate Role',
        permissions: [Permission.USERS_READ]
      };
      const res = createMockResponse();

      // Act
      await CustomRoleController.createRole(req, res);

      // Assert
      expect(res._status).toBe(409);
      expect(res._json?.error).toContain('already exists');
    });

    it('should return 400 for invalid permissions', async () => {
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
      req.body = {
        name: 'Test Role',
        permissions: ['invalid.permission', Permission.USERS_READ]
      };
      const res = createMockResponse();

      // Act
      await CustomRoleController.createRole(req, res);

      // Assert
      expect(res._status).toBe(400);
      expect(res._json?.error).toContain('Invalid permissions');
    });
  });

  describe('updateRole', () => {
    it('should update an existing role', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const role = await CustomRole.create({
        name: 'Original Name',
        permissions: [Permission.USERS_READ],
        description: 'Original description'
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { id: role._id.toString() };
      req.body = {
        name: 'Updated Name',
        permissions: [Permission.USERS_READ, Permission.USERS_UPDATE],
        description: 'Updated description'
      };
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await CustomRoleController.updateRole(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.name).toBe('Updated Name');
      expect(res._json?.data?.description).toBe('Updated description');
      expect(res._json?.data?.permissions).toHaveLength(2);

      // Verify in database
      const updatedRole = await CustomRole.findById(role._id);
      expect(updatedRole?.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent role', async () => {
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
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { name: 'Updated' };
      const res = createMockResponse();

      // Act
      await CustomRoleController.updateRole(req, res);

      // Assert
      expect(res._status).toBe(404);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const role = await CustomRole.create({
        name: 'To Delete',
        permissions: [Permission.USERS_READ]
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { id: role._id.toString() };
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await CustomRoleController.deleteRole(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);

      // Verify deleted from database
      const deletedRole = await CustomRole.findById(role._id);
      expect(deletedRole).toBeNull();
    });

    it('should return 400 if role is assigned to users', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const role = await CustomRole.create({
        name: 'Assigned Role',
        permissions: [Permission.USERS_READ]
      });

      // Create a user with this custom role
      await User.create({
        name: 'Test User',
        email: 'custom@test.com',
        passwordHash: 'hash',
        role: UserRole.STUDENT,
        customRoleId: role._id
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { id: role._id.toString() };
      const res = createMockResponse();

      // Act
      await CustomRoleController.deleteRole(req, res);

      // Assert
      expect(res._status).toBe(400);
      expect(res._json?.error).toContain('assigned to');
      expect(res._json?.error).toContain('user');
    });
  });

  describe('listPermissions', () => {
    it('should list all available permissions', async () => {
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
      const res = createMockResponse();

      // Act
      await CustomRoleController.listPermissions(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.all).toBeArray();
      expect(res._json?.data?.all.length).toBeGreaterThan(0);
      expect(res._json?.data?.grouped).toBeDefined();
      expect(Object.keys(res._json?.data?.grouped || {}).length).toBeGreaterThan(0);
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign custom role to user', async () => {
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

      const customRole = await CustomRole.create({
        name: 'Additional Permissions',
        permissions: [Permission.COURSES_CREATE]
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { userId: targetUser.id };
      req.body = { customRoleId: customRole._id.toString() };
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await CustomRoleController.assignRoleToUser(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);
      expect(res._json?.data?.customRoleId?.toString()).toBe(customRole._id.toString());

      // Verify in database
      const updatedUser = await User.findById(targetUser.id);
      expect(updatedUser?.customRoleId?.toString()).toBe(customRole._id.toString());
    });

    it('should return 404 for non-existent user', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const customRole = await CustomRole.create({
        name: 'Test Role',
        permissions: [Permission.USERS_READ]
      });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { userId: '507f1f77bcf86cd799439011' };
      req.body = { customRoleId: customRole._id.toString() };
      const res = createMockResponse();

      // Act
      await CustomRoleController.assignRoleToUser(req, res);

      // Assert
      expect(res._status).toBe(404);
      expect(res._json?.error).toContain('User not found');
    });

    it('should return 404 for non-existent custom role', async () => {
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

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { userId: targetUser.id };
      req.body = { customRoleId: '507f1f77bcf86cd799439011' };
      const res = createMockResponse();

      // Act
      await CustomRoleController.assignRoleToUser(req, res);

      // Assert
      expect(res._status).toBe(404);
      expect(res._json?.error).toContain('Custom role not found');
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove custom role from user', async () => {
      // Arrange
      const adminUser = await testFixtures.createUser({
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.ADMIN
      });

      const customRole = await CustomRole.create({
        name: 'Test Role',
        permissions: [Permission.USERS_READ]
      });

      const targetUser = await testFixtures.createUser({
        name: 'Target User',
        email: 'target@test.com',
        role: UserRole.STUDENT
      });

      await User.findByIdAndUpdate(targetUser.id, { customRoleId: customRole._id });

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { userId: targetUser.id };
      req.ip = '127.0.0.1';
      req.get = (header: string) => (header === 'user-agent' ? 'test-agent' : undefined);
      const res = createMockResponse();

      // Act
      await CustomRoleController.removeRoleFromUser(req, res);

      // Assert
      expect(res._status).toBe(200);
      expect(res._json?.success).toBe(true);

      // Verify in database
      const updatedUser = await User.findById(targetUser.id);
      expect(updatedUser?.customRoleId).toBeUndefined();
    });

    it('should return 400 if user has no custom role', async () => {
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

      const req = createMockRequest({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      req.params = { userId: targetUser.id };
      const res = createMockResponse();

      // Act
      await CustomRoleController.removeRoleFromUser(req, res);

      // Assert
      expect(res._status).toBe(400);
      expect(res._json?.error).toContain('does not have a custom role');
    });
  });
});
