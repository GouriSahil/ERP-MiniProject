import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, errorResponse, createdResponse } from '../utils/response.util';
import { saveAuditLog, getAuditLogData } from '../middleware/audit.middleware';
// Import User directly to avoid Mongoose v8 re-export issues with .select()
import { User } from '../models/User';
import { UserStatus } from '../models/User';
import { UserSession } from '../models/UserSession';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { emailService } from '../services/email.service';

export class AuthController {
  // Login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return errorResponse(res, 'Email and password are required');
      }

      // Find user by email with password field
      const user = await User.findOne({ email }).select('+passwordHash').populate('departmentId', 'name code').lean();

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

      // Check user status
      switch (user.status) {
        case UserStatus.PENDING:
          await saveAuditLog({
            actorUserId: user._id.toString(),
            actorRole: user.role,
            action: 'login',
            targetType: 'auth',
            targetId: user._id.toString(),
            status: 'failure',
            errorMessage: 'Account pending approval',
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent') || 'unknown'
          });
          return errorResponse(
            res,
            'Your account is pending admin approval. Please wait for an administrator to approve your registration.',
            403
          );

        case UserStatus.REJECTED:
          await saveAuditLog({
            actorUserId: user._id.toString(),
            actorRole: user.role,
            action: 'login',
            targetType: 'auth',
            targetId: user._id.toString(),
            status: 'failure',
            errorMessage: 'Account rejected',
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent') || 'unknown'
          });
          return errorResponse(
            res,
            'Your account has been rejected. Please contact the administrator for more information.',
            403
          );

        case UserStatus.SUSPENDED:
          await saveAuditLog({
            actorUserId: user._id.toString(),
            actorRole: user.role,
            action: 'login',
            targetType: 'auth',
            targetId: user._id.toString(),
            status: 'failure',
            errorMessage: 'Account suspended',
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent') || 'unknown'
          });
          return errorResponse(
            res,
            'Your account has been suspended. Please contact the administrator.',
            403
          );
      }

      // Generate a unique token ID for session tracking
      const tokenId = crypto.randomUUID();

      const accessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
          status: user.status
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h', issuer: 'erp-api', audience: 'erp-frontend', jwtid: tokenId }
      );

      const refreshToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d', issuer: 'erp-api', audience: 'erp-frontend', jwtid: tokenId }
      );

      // Hash the token for storage (we don't store the actual token)
      const tokenHash = await bcrypt.hash(accessToken, 10);

      // Create session record for tracking
      // Calculate expiration time (1 hour from now for access token)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      try {
        await UserSession.create({
          userId: user._id,
          token: tokenHash,
          tokenId: tokenId,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          expiresAt: expiresAt
        });
      } catch (sessionError) {
        // Log session creation error but don't fail the login
        console.error('[Login] Failed to create session record:', sessionError);
      }

      await saveAuditLog({
        actorUserId: user._id.toString(),
        actorRole: user.role,
        action: 'login',
        targetType: 'auth',
        targetId: user._id.toString(),
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
          status: user.status,
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

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        await saveAuditLog({
          actorUserId: null,
          actorRole: 'anonymous',
          action: 'register',
          targetType: 'user',
          targetId: email,
          status: 'failure',
          errorMessage: 'Email already exists',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        });
        return errorResponse(res, 'User with this email already exists', 409);
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // Super admin users are auto-active for initial system setup
      const isSuperAdmin = role === 'super_admin';

      // Create user with PENDING status - requires admin approval (except super_admin)
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: role || 'student',
        departmentId,
        mustChangePassword: false,
        status: isSuperAdmin ? UserStatus.ACTIVE : UserStatus.PENDING,
        ...(isSuperAdmin && {
          approvedAt: new Date()
        })
      });

      // Set approvedBy to self for super_admin (initial setup)
      if (isSuperAdmin) {
        await User.findByIdAndUpdate(user._id, { approvedBy: user._id });
      }

      // TODO: Send notification email to admins about new registration
      // This feature will be implemented when the email service is enhanced

      await saveAuditLog({
        actorUserId: user._id.toString(),
        actorRole: user.role,
        action: 'register',
        targetType: 'user',
        targetId: user._id.toString(),
        status: 'success',
        metadata: {
          status: user.status,
          requiresApproval: !isSuperAdmin
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      const successMessage = isSuperAdmin
        ? 'Registration successful. Super admin account is now active.'
        : 'Registration successful. Your account is pending admin approval. You will receive an email once your account is approved.';

      return createdResponse(res, {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }, successMessage);
    } catch (error: any) {
      // Handle duplicate key error for email
      if (error.code === 11000 && error.keyPattern?.email) {
        return errorResponse(res, 'User with this email already exists', 409);
      }
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

  // Get current user profile (alias for /me with consistent response format)
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      // Get authenticated user from middleware
      const user = req.user!;
      const userId = user._id || user.userId || '';

      // Fetch fresh user data from database to ensure consistency
      const userRecord = await User.findById(userId)
        .populate('departmentId', 'name code')
        .lean();

      if (!userRecord) {
        return errorResponse(res, 'User not found', 404);
      }

      // Return user data matching /me response format
      const userData = {
        id: userRecord._id,
        _id: userRecord._id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        status: userRecord.status,
        departmentId: userRecord.departmentId,
        mustChangePassword: userRecord.mustChangePassword
      };

      return successResponse(res, userData);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Update current user profile
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, email, phone, departmentId } = req.body;
      const user = req.user!;
      const userId = user._id || user.userId || '';

      // Build update object with only provided fields
      const updateData: Record<string, any> = {};

      if (name !== undefined && name !== null && name.trim() !== '') {
        updateData.name = name.trim();
      }

      if (email !== undefined && email !== null && email.trim() !== '') {
        const trimmedEmail = email.trim().toLowerCase();

        // Check if email is already taken by another user
        const existingUser = await User.findOne({
          email: trimmedEmail,
          _id: { $ne: userId }
        });

        if (existingUser) {
          return errorResponse(res, 'Email is already in use by another account', 409);
        }

        updateData.email = trimmedEmail;
      }

      // Handle departmentId update - validate it exists if provided
      if (departmentId !== undefined && departmentId !== null && departmentId !== '') {
        const { Department } = require('../models/index');
        const department = await Department.findById(departmentId);

        if (!department) {
          return errorResponse(res, 'Invalid department ID', 400);
        }

        updateData.departmentId = departmentId;
      }

      // Update user record
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('departmentId', 'name code').lean();

      if (!updatedUser) {
        return errorResponse(res, 'User not found', 404);
      }

      await saveAuditLog({
        actorUserId: userId,
        actorRole: user.role,
        action: 'update_profile',
        targetType: 'user',
        targetId: userId,
        status: 'success',
        metadata: { updatedFields: Object.keys(updateData) },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      // Return updated user data matching the expected response format
      const userData = {
        id: updatedUser._id,
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        departmentId: updatedUser.departmentId,
        mustChangePassword: updatedUser.mustChangePassword
      };

      return successResponse(res, userData, 'Profile updated successfully');
    } catch (error: any) {
      // Handle duplicate key error for email
      if (error.code === 11000 && error.keyPattern?.email) {
        return errorResponse(res, 'Email is already in use by another account', 409);
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        return errorResponse(res, validationErrors.join(', '), 400);
      }

      return errorResponse(res, error.message || 'An error occurred while updating profile', 500);
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

  // Reset Password - completes password reset with token
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return errorResponse(res, 'Token and new password are required', 400);
      }

      // Find all reset tokens for this user and check each one
      // We need to find the token by comparing the hashed values
      const allTokens = await PasswordResetToken.find({
        used: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      let validToken = null;
      let userId = null;

      // Check each token to find a match
      for (const resetToken of allTokens) {
        const isValid = await bcrypt.compare(token, resetToken.token);
        if (isValid) {
          validToken = resetToken;
          userId = resetToken.userId;
          break;
        }
      }

      if (!validToken || !userId) {
        await saveAuditLog({
          actorUserId: null,
          actorRole: 'anonymous',
          action: 'reset_password',
          targetType: 'auth',
          targetId: 'unknown',
          status: 'failure',
          errorMessage: 'Invalid or expired reset token',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown'
        });
        return errorResponse(res, 'Invalid or expired reset token', 400);
      }

      // Find user by ID
      const user = await User.findById(userId);

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update user password
      await User.findByIdAndUpdate(userId, {
        passwordHash,
        mustChangePassword: false
      });

      // Mark token as used
      await PasswordResetToken.findByIdAndUpdate(validToken._id, {
        used: true
      });

      await saveAuditLog({
        actorUserId: user._id.toString(),
        actorRole: user.role,
        action: 'reset_password',
        targetType: 'user',
        targetId: user._id.toString(),
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Password has been reset successfully.');
    } catch (error: any) {
      console.error('[resetPassword] Error:', error);
      return errorResponse(res, 'An error occurred while resetting your password', 500);
    }
  }
}
