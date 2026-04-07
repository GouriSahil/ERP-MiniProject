import { Request, Response } from 'express';
import { CustomRole, Permission } from '../models';
import { successResponse, createdResponse, errorResponse, notFoundResponse } from '../utils/response.util';
import { saveAuditLog } from '../middleware/audit.middleware';
import { User } from '../models/User';

export class CustomRoleController {
  // List all custom roles
  static async listRoles(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string)?.trim();

      const query: any = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [roles, total] = await Promise.all([
        CustomRole.find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CustomRole.countDocuments(query)
      ]);

      // Get user count for each role
      const rolesWithCounts = await Promise.all(
        roles.map(async (role) => {
          const userCount = await User.countDocuments({ customRoleId: role._id });
          return {
            ...role,
            userCount
          };
        })
      );

      return successResponse(res, {
        data: rolesWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get role by ID
  static async getRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const role = await CustomRole.findById(id).lean();

      if (!role) {
        return notFoundResponse(res, 'Custom role');
      }

      // Get users with this custom role
      const users = await User.find({ customRoleId: id })
        .select('_id name email role')
        .lean();

      return successResponse(res, {
        ...role,
        users
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Create a new custom role
  static async createRole(req: Request, res: Response) {
    try {
      const { name, permissions, description } = req.body;

      if (!name || !permissions || !Array.isArray(permissions)) {
        return errorResponse(res, 'Name and permissions array are required', 400);
      }

      if (name.length > 50) {
        return errorResponse(res, 'Role name cannot exceed 50 characters', 400);
      }

      // Check for duplicate role name
      const existingRole = await CustomRole.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (existingRole) {
        return errorResponse(res, 'A role with this name already exists', 409);
      }

      // Validate all permissions
      const validPermissions = Object.values(Permission);
      const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p as Permission));

      if (invalidPermissions.length > 0) {
        return errorResponse(res, `Invalid permissions: ${invalidPermissions.join(', ')}`, 400);
      }

      const role = await CustomRole.create({
        name: name.trim(),
        permissions,
        description: description?.trim()
      });

      await saveAuditLog({
        actorUserId: (req as any).user?.userId || null,
        actorRole: (req as any).user?.role || 'unknown',
        action: 'create',
        targetType: 'custom_role',
        targetId: role._id.toString(),
        status: 'success',
        metadata: { roleName: name, permissions },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return createdResponse(res, role, 'Custom role created successfully');
    } catch (error: any) {
      // Handle duplicate key error for name
      if (error.code === 11000 && error.keyPattern?.name) {
        return errorResponse(res, 'A role with this name already exists', 409);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Update a custom role
  static async updateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, permissions, description } = req.body;

      const role = await CustomRole.findById(id);

      if (!role) {
        return notFoundResponse(res, 'Custom role');
      }

      // Validate name if provided
      if (name) {
        if (name.length > 50) {
          return errorResponse(res, 'Role name cannot exceed 50 characters', 400);
        }

        // Check for duplicate name (excluding current role)
        const existingRole = await CustomRole.findOne({
          name: new RegExp(`^${name}$`, 'i'),
          _id: { $ne: id }
        });
        if (existingRole) {
          return errorResponse(res, 'A role with this name already exists', 409);
        }

        role.name = name.trim();
      }

      // Validate permissions if provided
      if (permissions && Array.isArray(permissions)) {
        const validPermissions = Object.values(Permission);
        const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p as Permission));

        if (invalidPermissions.length > 0) {
          return errorResponse(res, `Invalid permissions: ${invalidPermissions.join(', ')}`, 400);
        }

        role.permissions = permissions;
      }

      if (description !== undefined) {
        role.description = description?.trim();
      }

      await role.save();

      await saveAuditLog({
        actorUserId: (req as any).user?.userId || null,
        actorRole: (req as any).user?.role || 'unknown',
        action: 'update',
        targetType: 'custom_role',
        targetId: id,
        status: 'success',
        metadata: { changes: { name, permissions, description } },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, role, 'Custom role updated successfully');
    } catch (error: any) {
      // Handle duplicate key error for name
      if (error.code === 11000 && error.keyPattern?.name) {
        return errorResponse(res, 'A role with this name already exists', 409);
      }
      return errorResponse(res, error.message, 500);
    }
  }

  // Delete a custom role
  static async deleteRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const role = await CustomRole.findById(id);

      if (!role) {
        return notFoundResponse(res, 'Custom role');
      }

      // Check if role is assigned to any users
      const userCount = await User.countDocuments({ customRoleId: id });

      if (userCount > 0) {
        return errorResponse(
          res,
          `Cannot delete role. It is assigned to ${userCount} user(s). Please reassign users first.`,
          400
        );
      }

      await CustomRole.findByIdAndDelete(id);

      await saveAuditLog({
        actorUserId: (req as any).user?.userId || null,
        actorRole: (req as any).user?.role || 'unknown',
        action: 'delete',
        targetType: 'custom_role',
        targetId: id,
        status: 'success',
        metadata: { roleName: role.name },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Custom role deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Get all available permissions
  static async listPermissions(req: Request, res: Response) {
    try {
      // Group permissions by resource
      const permissionGroups: Record<string, string[]> = {};

      Object.values(Permission).forEach((permission) => {
        const [resource, action] = permission.split('.');
        if (!permissionGroups[resource]) {
          permissionGroups[resource] = [];
        }
        permissionGroups[resource].push(action);
      });

      return successResponse(res, {
        all: Object.values(Permission),
        grouped: permissionGroups
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Assign custom role to user
  static async assignRoleToUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { customRoleId } = req.body;

      if (!customRoleId) {
        return errorResponse(res, 'customRoleId is required', 400);
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return notFoundResponse(res, 'User');
      }

      // Check if custom role exists
      const customRole = await CustomRole.findById(customRoleId);
      if (!customRole) {
        return notFoundResponse(res, 'Custom role');
      }

      // Assign custom role to user
      user.customRoleId = customRoleId;
      await user.save();

      await saveAuditLog({
        actorUserId: (req as any).user?.userId || null,
        actorRole: (req as any).user?.role || 'unknown',
        action: 'update',
        targetType: 'user',
        targetId: userId,
        status: 'success',
        metadata: { customRoleId, customRoleName: customRole.name },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, {
        userId: user._id,
        customRoleId: user.customRoleId,
        customRole
      }, 'Custom role assigned to user successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  // Remove custom role from user
  static async removeRoleFromUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return notFoundResponse(res, 'User');
      }

      if (!user.customRoleId) {
        return errorResponse(res, 'User does not have a custom role assigned', 400);
      }

      const previousCustomRoleId = user.customRoleId;
      user.customRoleId = undefined;
      await user.save();

      await saveAuditLog({
        actorUserId: (req as any).user?.userId || null,
        actorRole: (req as any).user?.role || 'unknown',
        action: 'update',
        targetType: 'user',
        targetId: userId,
        status: 'success',
        metadata: { removedCustomRoleId: previousCustomRoleId },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });

      return successResponse(res, null, 'Custom role removed from user successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}
