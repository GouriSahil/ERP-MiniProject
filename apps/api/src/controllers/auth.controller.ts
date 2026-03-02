import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse, createdResponse } from '../utils/response.util';
import { saveAuditLog, getAuditLogData } from '../middleware/audit.middleware';

// Mock User model - will be replaced with actual Mongoose model
interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  departmentId?: string;
  mustChangePassword?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthController {
  // Login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return errorResponse(res, 'Email and password are required');
      }

      // Mock user lookup - replace with actual database query
      // const user = await User.findOne({ email }).populate('departmentId');

      // Mock authentication for now
      const user = {
        _id: 'mock-user-id',
        name: 'Test User',
        email: email,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'super_admin',
        createdAt: new Date(),
        updatedAt: new Date()
      } as User;

      if (!user) {
        await saveAuditLog({
          actorUserId: null,
          actorRole: 'anonymous',
          action: 'login',
          targetType: 'auth',
          targetId: email,
          status: 'failure',
          errorMessage: 'Invalid credentials',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        });
        return errorResponse(res, 'Invalid credentials', 401);
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        await saveAuditLog({
          actorUserId: null,
          actorRole: 'anonymous',
          action: 'login',
          targetType: 'auth',
          targetId: email,
          status: 'failure',
          errorMessage: 'Invalid credentials',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        });
        return errorResponse(res, 'Invalid credentials', 401);
      }

      const accessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      await saveAuditLog({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'login',
        targetType: 'auth',
        targetId: user._id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
          mustChangePassword: user.mustChangePassword
        }
      }, 'Login successful');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Register
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, role = 'student', departmentId } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return errorResponse(res, 'Name, email, and password are required', 400);
      }

      if (password.length < 8) {
        return errorResponse(res, 'Password must be at least 8 characters long', 400);
      }

      // Map frontend roles to backend UserRole enum
      const roleMapping: { [key: string]: string } = {
        'student': 'student',
        'faculty': 'faculty',
        'admin': 'admin'
      };

      const mappedRole = roleMapping[role];
      if (!mappedRole) {
        return errorResponse(res, 'Invalid role. Must be one of: student, faculty, admin', 400);
      }

      // Check if user exists
      // const existingUser = await User.findOne({ email });
      // if (existingUser) {
      //   return conflictResponse(res, 'User with this email already exists');
      // }

      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      // const user = await User.create({
      //   name,
      //   email,
      //   passwordHash,
      //   role: role || 'student',
      //   departmentId,
      //   mustChangePassword: true
      // });

      const user = {
        _id: 'new-user-id',
        name,
        email,
        role: role || 'student',
        departmentId
      } as User;

      await saveAuditLog({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'register',
        targetType: 'user',
        targetId: user._id,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }, 'Registration successful. Please wait for admin approval.');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Logout
  static async logout(req: AuthRequest, res: Response) {
    try {
      // For JWT-based auth, logout is handled client-side by removing the token
      // But we can log the activity for audit purposes
      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'logout',
        targetType: 'auth',
        targetId: req.user!.userId,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Logout successful');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get current user
  static async me(req: AuthRequest, res: Response) {
    try {
      // const user = await User.findById(req.user!.userId).populate('departmentId');

      const user = {
        _id: req.user!.userId,
        name: 'Current User',
        email: req.user!.email,
        role: req.user!.role,
        departmentId: req.user!.departmentId
      };

      return successResponse(res, user);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Change password
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return errorResponse(res, 'Current password and new password are required');
      }

      if (newPassword.length < 8) {
        return errorResponse(res, 'New password must be at least 8 characters');
      }

      // const user = await User.findById(req.user!.userId);
      // const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

      // if (!isValidPassword) {
      //   return errorResponse(res, 'Current password is incorrect', 401);
      // }

      // const passwordHash = await bcrypt.hash(newPassword, 12);
      // await User.findByIdAndUpdate(req.user!.userId, { passwordHash, mustChangePassword: false });

      await saveAuditLog({
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'change_password',
        targetType: 'user',
        targetId: req.user!.userId,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Password changed successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Refresh token
  static async refreshToken(req: AuthRequest, res: Response) {
    try {
      const token = jwt.sign(
        {
          userId: req.user!.userId,
          email: req.user!.email,
          role: req.user!.role,
          departmentId: req.user!.departmentId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      return successResponse(res, { token }, 'Token refreshed successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
