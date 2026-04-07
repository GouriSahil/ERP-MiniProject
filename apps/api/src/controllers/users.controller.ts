import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { successResponse, createdResponse, notFoundResponse, errorResponse, conflictResponse } from '../utils/response.util';
import { getPaginationParams, buildPaginationMeta, buildSearchFilter, PaginatedResult } from '../utils/pagination.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { User, Student, Faculty, UserStatus } from "../models";
import * as bcrypt from 'bcrypt';

export class UsersController {
  // List all users with pagination, search, and filters
  static async list(req: AuthRequest, res: Response) {
    try {
      const paginationParams = getPaginationParams(req.query);
      const page = paginationParams.page || 1;
      const limit = paginationParams.limit || 10;
      const sortBy = paginationParams.sortBy || "createdAt";
      const sortOrder = paginationParams.sortOrder || "desc";
      const { role, departmentId } = req.query;

      // Build filter
      const filter: any = {};
      if (role) filter.role = role;
      if (departmentId) filter.departmentId = departmentId;

      // Add search filter
      if (paginationParams.search) {
        const searchFilter = buildSearchFilter(
          ["name", "email"],
          paginationParams.search,
        );
        Object.assign(filter, searchFilter);
      }

      // Execute query with pagination
      const users = await User.find(filter)
        .populate("departmentId", "name code")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await User.countDocuments(filter);
      const pagination = buildPaginationMeta(page, limit, total);

      return res.status(200).json({
        success: true,
        data: users,
        pagination,
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get user by ID
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const user = await User.findById(id)
        .populate("departmentId", "name code")
        .lean();

      if (!user) {
        return notFoundResponse(res, "User");
      }

      return successResponse(res, user);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create new user
  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, email, password, role, departmentId } = req.body;

      // Check for existing user
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return conflictResponse(res, "User with this email already exists");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        name,
        email,
        passwordHash,
        role,
        departmentId,
        mustChangePassword: true,
      });

      await saveAuditLog({
        actorUserId: req.user!.userId || null,
        actorRole: req.user!.role,
        action: "create",
        targetType: "user",
        targetId: user._id.toString(),
        status: "success",
        metadata: { userName: name, email, role },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      return createdResponse(res, user, "User created successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Update user
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, role, departmentId } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return notFoundResponse(res, "User");
      }

      // Check email uniqueness if email is being changed
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return conflictResponse(res, "Email already in use");
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { name, email, role, departmentId },
        { new: true, runValidators: true },
      ).populate("departmentId", "name code");

      await saveAuditLog({
        actorUserId: req.user!.userId || null,
        actorRole: req.user!.role,
        action: "update",
        targetType: "user",
        targetId: id,
        status: "success",
        metadata: { changes: req.body },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      return successResponse(res, updatedUser, "User updated successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete user
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Don't allow deleting yourself
      if (id === req.user!.userId) {
        return errorResponse(res, "Cannot delete your own account", 400);
      }

      const user = await User.findById(id);
      if (!user) {
        return notFoundResponse(res, "User");
      }

      // Check for dependent records
      const student = await Student.findOne({ userId: id });
      const faculty = await Faculty.findOne({ userId: id });
      if (student || faculty) {
        return errorResponse(
          res,
          "Cannot delete user with dependent records",
          400,
        );
      }

      await User.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: req.user!.userId || null,
        actorRole: req.user!.role,
        action: "delete",
        targetType: "user",
        targetId: id,
        status: "success",
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      return successResponse(res, null, "User deleted successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Deactivate user
  static async deactivate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const user = await User.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true },
      );

      if (!user) {
        return notFoundResponse(res, "User");
      }

      await saveAuditLog({
        actorUserId: req.user!.userId || null,
        actorRole: req.user!.role,
        action: "deactivate",
        targetType: "user",
        targetId: id,
        status: "success",
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      return successResponse(res, user, "User deactivated successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Reactivate user
  static async reactivate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const user = await User.findByIdAndUpdate(
        id,
        { isActive: true },
        { new: true },
      );

      if (!user) {
        return notFoundResponse(res, "User");
      }

      await saveAuditLog({
        actorUserId: req.user!.userId || null,
        actorRole: req.user!.role,
        action: "reactivate",
        targetType: "user",
        targetId: id,
        status: "success",
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      return successResponse(res, user, "User reactivated successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Reset password
  static async resetPassword(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      const passwordHash = await bcrypt.hash(newPassword, 12);
      const user = await User.findByIdAndUpdate(
        id,
        { passwordHash, mustChangePassword: true },
        { new: true },
      );

      if (!user) {
        return notFoundResponse(res, "User");
      }

      await saveAuditLog({
        actorUserId: req.user!.userId || null,
        actorRole: req.user!.role,
        action: "reset_password",
        targetType: "user",
        targetId: id,
        status: "success",
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      return successResponse(
        res,
        null,
        "Password reset successfully. User must change password on next login.",
      );
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // List pending users (for admin approval)
  static async listPending(req: AuthRequest, res: Response) {
    try {
      const paginationParams = getPaginationParams(req.query);
      const page = paginationParams.page || 1;
      const limit = paginationParams.limit || 10;
      const sortBy = paginationParams.sortBy || "createdAt";
      const sortOrder = paginationParams.sortOrder || "desc";
      const { role } = req.query;

      // Build filter for pending users
      const filter: any = { status: UserStatus.PENDING };
      if (role) filter.role = role;

      // Add search filter
      if (paginationParams.search) {
        const searchFilter = buildSearchFilter(
          ["name", "email"],
          paginationParams.search,
        );
        Object.assign(filter, searchFilter);
      }

      // Execute query with pagination
      const users = await User.find(filter)
        .populate("departmentId", "name code")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await User.countDocuments(filter);
      const pagination = buildPaginationMeta(page, limit, total);

      return successResponse(res, {
        users,
        pagination,
        summary: {
          totalPending: total,
        },
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Approve user
  static async approveUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = req.user!.userId || req.user!._id;

      const user = await User.findById(id);

      if (!user) {
        return notFoundResponse(res, "User");
      }

      if (user.status !== UserStatus.PENDING) {
        return errorResponse(
          res,
          `User is not in pending status. Current status: ${user.status}`,
          400,
        );
      }

      // Update user status to APPROVED
      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          status: UserStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: adminUserId,
        },
        { new: true },
      ).populate("departmentId", "name code");

      await saveAuditLog({
        actorUserId: String(adminUserId),
        actorRole: req.user!.role,
        action: "approve_user",
        targetType: "user",
        targetId: id,
        status: "success",
        metadata: {
          previousStatus: user.status,
          newStatus: UserStatus.APPROVED,
        },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      // TODO: Send approval email to user

      return successResponse(res, updatedUser, "User approved successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Reject user
  static async rejectUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminUserId = req.user!.userId || req.user!._id;

      const user = await User.findById(id);

      if (!user) {
        return notFoundResponse(res, "User");
      }

      if (user.status !== UserStatus.PENDING) {
        return errorResponse(
          res,
          `User is not in pending status. Current status: ${user.status}`,
          400,
        );
      }

      // Update user status to REJECTED
      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          status: UserStatus.REJECTED,
          rejectionReason: reason || "No reason provided",
        },
        { new: true },
      ).populate("departmentId", "name code");

      await saveAuditLog({
        actorUserId: String(adminUserId),
        actorRole: req.user!.role,
        action: "reject_user",
        targetType: "user",
        targetId: id,
        status: "success",
        metadata: {
          previousStatus: user.status,
          newStatus: UserStatus.REJECTED,
          rejectionReason: reason,
        },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      // TODO: Send rejection email to user

      return successResponse(res, updatedUser, "User rejected successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Suspend user
  static async suspendUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminUserId = req.user!.userId || req.user!._id;

      const user = await User.findById(id);

      if (!user) {
        return notFoundResponse(res, "User");
      }

      if (user.status === UserStatus.SUSPENDED) {
        return errorResponse(res, "User is already suspended", 400);
      }

      // Update user status to SUSPENDED
      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          status: UserStatus.SUSPENDED,
          rejectionReason: reason || "No reason provided",
        },
        { new: true },
      ).populate("departmentId", "name code");

      await saveAuditLog({
        actorUserId: String(adminUserId),
        actorRole: req.user!.role,
        action: "suspend_user",
        targetType: "user",
        targetId: id,
        status: "success",
        metadata: {
          previousStatus: user.status,
          newStatus: UserStatus.SUSPENDED,
          suspensionReason: reason,
        },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      return successResponse(res, updatedUser, "User suspended successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Unsuspend/activate user
  static async activateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = req.user!.userId || req.user!._id;

      const user = await User.findById(id);

      if (!user) {
        return notFoundResponse(res, "User");
      }

      if (user.status === UserStatus.ACTIVE) {
        return errorResponse(res, "User is already active", 400);
      }

      // Update user status to ACTIVE
      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          status: UserStatus.ACTIVE,
          $unset: { rejectionReason: "" },
        },
        { new: true },
      ).populate("departmentId", "name code");

      await saveAuditLog({
        actorUserId: String(adminUserId),
        actorRole: req.user!.role,
        action: "activate_user",
        targetType: "user",
        targetId: id,
        status: "success",
        metadata: {
          previousStatus: user.status,
          newStatus: UserStatus.ACTIVE,
        },
        ipAddress: req.ip || "unknown",
        userAgent: req.get("user-agent") || "unknown",
      });

      return successResponse(res, updatedUser, "User activated successfully");
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
