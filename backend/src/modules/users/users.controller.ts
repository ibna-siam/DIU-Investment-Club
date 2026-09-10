import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { usersRepository } from './users.repository';
import { rolesRepository } from '../roles/roles.repository';
import { randomUUID } from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase';
import { emailEventBus } from '../email/email.events';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { env, getPrimaryClientUrl } from '../../config/env';

const createUserSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  phone: z.string().optional(),
  student_id: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

const updateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  student_id: z.string().nullable().optional(),
  profile_image: z.string().nullable().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']),
});

const assignRoleSchema = z.object({
  role_id: z.string().uuid('Invalid role ID format'),
});

export class UsersController {
  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const role = req.query.role as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await usersRepository.findAll({ search, status, role, page, limit });
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await usersRepository.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createUserSchema.parse(req.body);
      const normalizedEmail = data.email.toLowerCase().trim();

      // Check email uniqueness before creation
      const existingUser = await usersRepository.findByEmail(normalizedEmail);
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_USER', message: `User with email ${normalizedEmail} already exists` },
        });
        return;
      }

      // Secure high-entropy temporary credential (never a plain default password)
      const setupSecret = data.password && data.password.trim() ? data.password.trim() : randomUUID();

      const user = await usersRepository.createUser({
        email: normalizedEmail,
        password: setupSecret,
        full_name: data.full_name,
        phone: data.phone || null,
        student_id: data.student_id || null,
        role_id: data.role_id || null,
        status: data.status,
        created_by: req.user?.id,
      });

      // Resolve role name for invitation email
      let roleName = 'Member';
      if (data.role_id) {
        const role = await rolesRepository.findById(data.role_id);
        if (role) roleName = role.name;
      }

      // Generate secure setup URL via Supabase Auth or secure token
      const clientBase = getPrimaryClientUrl();
      let setupUrl = `${clientBase}/reset-password?setup=true&email=${encodeURIComponent(normalizedEmail)}`;
      if (isSupabaseConfigured() && supabaseAdmin) {
        try {
          const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: normalizedEmail,
            options: {
              redirectTo: `${clientBase}/reset-password?setup=true`,
            },
          });
          if (linkData?.properties?.action_link) {
            setupUrl = linkData.properties.action_link;
          }
        } catch (e: any) {
          console.warn('Supabase generate invite link notice:', e.message);
        }
      } else {
        const inviteToken = jwt.sign(
          { id: user.id, email: normalizedEmail, type: 'recovery', purpose: 'account_setup' },
          env.JWT_SECRET,
          { expiresIn: '48h' }
        );
        setupUrl = `${clientBase}/reset-password?token=${inviteToken}&setup=true`;
      }

      // 1. Emit domain event for asynchronous Welcome Email
      emailEventBus.emitEvent({
        type: 'USER_CREATED',
        payload: {
          userId: user.id,
          email: normalizedEmail,
          fullName: user.full_name,
          loginUrl: `${clientBase}/login`,
          createdBy: req.user?.id,
        },
      });

      // 2. Emit domain event for asynchronous secure Account Activation / Invitation Email
      emailEventBus.emitEvent({
        type: 'USER_INVITED',
        payload: {
          userId: user.id,
          email: normalizedEmail,
          fullName: user.full_name,
          setupUrl,
          roleName,
          invitedBy: req.user?.id,
          expiresInHours: 48,
        },
      });

      // Audit logs
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'USER_CREATED',
        module: 'users',
        record_id: user.id,
        new_data: { email: normalizedEmail, full_name: user.full_name, role: roleName },
        ip_address: req.ip,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'INVITATION_SENT',
        module: 'users',
        record_id: user.id,
        new_data: { email: normalizedEmail },
        ip_address: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'User provisioned and secure invitation dispatched successfully',
        data: user,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_USER', message: err.message },
        });
        return;
      }
      next(err);
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateUserSchema.parse(req.body);

      const updated = await usersRepository.updateProfile(id, data);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = updateStatusSchema.parse(req.body);

      // Prevent user from deactivating themselves
      if (req.user?.id === id && status !== 'active') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_OPERATION', message: 'You cannot deactivate your own account' },
        });
        return;
      }

      const user = await usersRepository.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      const updated = await usersRepository.updateStatus(id, status);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      // If user suspended/inactive, invalidate session
      if (status === 'suspended' || status === 'inactive') {
        if (isSupabaseConfigured() && supabaseAdmin) {
          try {
            await supabaseAdmin.auth.admin.signOut(id);
          } catch (e) {}
        }
      }

      // Emit domain event for asynchronous account status email (Section 10)
      emailEventBus.emitEvent({
        type: 'ACCOUNT_STATUS_CHANGED',
        payload: {
          userId: updated.id,
          email: updated.email,
          fullName: updated.full_name,
          status: status as any,
          reason: req.body.reason,
          changedBy: req.user?.id,
        },
      });

      // Audit log
      const auditAction = (status === 'suspended' || status === 'inactive') ? 'ACCOUNT_DISABLED' : 'ACCOUNT_ENABLED';
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: auditAction,
        module: 'users',
        record_id: updated.id,
        new_data: { status, reason: req.body.reason },
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        message: `User status changed to ${status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async assignRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role_id } = assignRoleSchema.parse(req.body);

      const user = await usersRepository.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      const role = await rolesRepository.findById(role_id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' },
        });
        return;
      }

      await usersRepository.assignRole(id, role_id);
      const updatedUser = await usersRepository.findById(id);

      // Emit domain event for role change security notification (Section 9)
      emailEventBus.emitEvent({
        type: 'USER_ROLE_CHANGED',
        payload: {
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          newRoleName: role.name,
          changedBy: req.user?.full_name || 'System Administrator',
        },
      });

      // Audit log
      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'ROLE_CHANGED',
        module: 'roles',
        record_id: user.id,
        new_data: { role_id: role.id, role_name: role.name },
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        message: `Role ${role.name} assigned to ${user.full_name}`,
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  async removeRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, roleId } = req.params;

      const user = await usersRepository.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      // Prevent a Super Admin from revoking their own Super Admin status
      const role = await rolesRepository.findById(roleId);
      if (req.user?.id === id && role?.slug === 'SUPER_ADMIN') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_OPERATION', message: 'You cannot revoke your own Super Admin role' },
        });
        return;
      }

      await usersRepository.removeRole(id, roleId);
      const updatedUser = await usersRepository.findById(id);

      res.status(200).json({
        success: true,
        message: 'Role removed from user',
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await usersRepository.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      const direct = await usersRepository.getUserDirectPermissions(id);
      const effective = await usersRepository.getUserPermissions(id);

      res.status(200).json({
        success: true,
        data: {
          direct,
          effective,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async assignUserPermission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { permission_id } = req.body;

      if (!permission_id) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'permission_id is required' },
        });
        return;
      }

      const user = await usersRepository.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      await usersRepository.assignUserPermission(id, permission_id, req.user?.id);
      const direct = await usersRepository.getUserDirectPermissions(id);
      const effective = await usersRepository.getUserPermissions(id);

      res.status(200).json({
        success: true,
        message: 'Custom user permission granted successfully',
        data: { direct, effective },
      });
    } catch (err) {
      next(err);
    }
  }

  async removeUserPermission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, permissionId } = req.params;

      const user = await usersRepository.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      await usersRepository.removeUserPermission(id, permissionId);
      const direct = await usersRepository.getUserDirectPermissions(id);
      const effective = await usersRepository.getUserPermissions(id);

      res.status(200).json({
        success: true,
        message: 'Custom user permission removed successfully',
        data: { direct, effective },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
