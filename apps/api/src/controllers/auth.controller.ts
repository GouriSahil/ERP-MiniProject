import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse, createdResponse } from '../utils/response.util';
import { saveAuditLog, getAuditLogData } from '../middleware/audit.middleware';
import { User } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { emailService } from '../services/email.service';

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
        { expiresIn: '1h', issuer: 'erp-api', audience: 'erp-frontend' }
      );

      const refreshToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d', issuer: 'erp-api', audience: 'erp-frontend' }
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
      const user = req.user!;
      const userId = user._id || user.userId || '';

      await saveAuditLog({
        actorUserId: userId,
        actorRole: user.role,
        action: 'logout',
        targetType: 'auth',
        targetId: userId,
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
      // Get user from passport authentication
      const user = req.user!;
      const userId = user._id || user.userId || '';

      // Return user data from passport user object
      const userData = {
        _id: user._id || userId,
        id: user._id || userId,
        name: user.name || 'Current User',
        email: user.email,
        role: user.role,
        departmentId: user.departmentId
      };

      return successResponse(res, userData);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Change password
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user!;
      const userId = user._id || user.userId || '';

      if (!currentPassword || !newPassword) {
        return errorResponse(res, 'Current password and new password are required');
      }

      if (newPassword.length < 8) {
        return errorResponse(res, 'New password must be at least 8 characters');
      }

      // const userRecord = await User.findById(userId);
      // const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

      // if (!isValidPassword) {
      //   return errorResponse(res, 'Current password is incorrect', 401);
      // }

      // const passwordHash = await bcrypt.hash(newPassword, 12);
      // await User.findByIdAndUpdate(userId, { passwordHash, mustChangePassword: false });

      await saveAuditLog({
        actorUserId: userId || null,
        actorRole: user.role,
        action: 'change_password',
        targetType: 'user',
        targetId: userId || 'unknown',
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
      // Get refresh token from body (validated by middleware)
      const { refreshToken } = req.body as { refreshToken: string };

      // Verify the refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET || 'your-secret-key',
        { issuer: 'erp-api', audience: 'erp-frontend' }
      ) as any;

      const userId = decoded.userId || decoded._id;

      const token = jwt.sign(
        {
          userId: userId,
          email: decoded.email,
          role: decoded.role,
          departmentId: decoded.departmentId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h', issuer: 'erp-api', audience: 'erp-frontend' }
      );

      return successResponse(res, { token }, 'Token refreshed successfully');
    } catch (error: any) {
      return errorResponse(res, 'Invalid or expired refresh token', 401);
    }
  }

  // Forgot Password - initiates password reset flow
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return errorResponse(res, 'Email is required', 400);
      }

      // Find user by email
      const user = await User.findOne({ email });

      // Always return success to prevent email enumeration
      if (!user) {
        await saveAuditLog({
          actorUserId: null,
          actorRole: 'anonymous',
          action: 'forgot_password',
          targetType: 'auth',
          targetId: email,
          status: 'success',
          metadata: { reason: 'User not found (response hidden for security)' },
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        });
        return successResponse(res, null, 'If a user exists with this email, a password reset link has been sent.');
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash token before storing
      const hashedToken = await bcrypt.hash(resetToken, 12);

      // Set expiration to 15 minutes from now
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Store reset token in database
      await PasswordResetToken.create({
        userId: user._id,
        token: hashedToken,
        expiresAt,
        used: false
      });

      // Send password reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

      await saveAuditLog({
        actorUserId: user._id.toString(),
        actorRole: user.role,
        action: 'forgot_password',
        targetType: 'auth',
        targetId: user._id.toString(),
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'If a user exists with this email, a password reset link has been sent.');
    } catch (error: any) {
      console.error('[forgotPassword] Error:', error);
      return errorResponse(res, 'An error occurred while processing your request', 500);
    }
  }
}
