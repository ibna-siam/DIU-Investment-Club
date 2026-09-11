import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { env, getPrimaryClientUrl } from '../../config/env';
import { supabaseAdmin, supabaseClient, isSupabaseConfigured, getDbAdmin } from '../../config/supabase';
import { usersRepository } from '../users/users.repository';
import { rolesRepository } from '../roles/roles.repository';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { store } from '../../database/db';
import { emailEventBus } from '../email/email.events';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const setupAdminSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  student_id: z.string().optional(),
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();

      let token: string | null = null;
      let userProfile = await usersRepository.findByEmail(normalizedEmail);

      // 1. If Supabase is configured, authenticate through Supabase Auth
      if (isSupabaseConfigured() && supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error || !data.user) {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          });
          return;
        }

        token = data.session?.access_token || null;
        if (!userProfile) {
          userProfile = await usersRepository.createProfile({
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            phone: data.user.phone || null,
            status: 'active',
          });
        }
      } else {
        // Standalone / DB-backed authentication
        if (!userProfile) {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          });
          return;
        }

        const storedPasswordHash = userProfile.password_hash;
        if (!storedPasswordHash) {
          res.status(401).json({
            success: false,
            error: {
              code: 'AUTH_METHOD_NOT_SUPPORTED',
              message: 'Account configured for external authentication',
            },
          });
          return;
        }

        const isMatch = await bcrypt.compare(password, storedPasswordHash);
        if (!isMatch) {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          });
          return;
        }

        token = jwt.sign(
          { id: userProfile.id, email: userProfile.email },
          env.JWT_SECRET,
          { expiresIn: '7d' }
        );
      }

      if (userProfile.status !== 'active') {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: `Your account is ${userProfile.status}. Please contact an administrator.`,
          },
        });
        return;
      }

      // Ensure roles & permissions are populated
      const fullProfile = await usersRepository.findById(userProfile.id);

      res.status(200).json({
        success: true,
        data: {
          user: fullProfile,
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {}
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();

      const user = await usersRepository.findByEmail(normalizedEmail);
      if (user) {
        const clientBase = getPrimaryClientUrl();
        let resetUrl = `${clientBase}/reset-password`;

        if (isSupabaseConfigured() && supabaseAdmin) {
          try {
            const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: normalizedEmail,
              options: {
                redirectTo: `${clientBase}/reset-password`,
              },
            });
            if (linkData?.properties?.action_link) {
              resetUrl = linkData.properties.action_link;
            }
          } catch (e: any) {
            console.warn('Supabase generate recovery link notice:', e.message);
          }
        } else {
          // Token for standalone / dev mode
          const token = jwt.sign(
            { id: user.id, email: normalizedEmail, type: 'recovery' },
            env.JWT_SECRET,
            { expiresIn: '30m' }
          );
          resetUrl = `${clientBase}/reset-password?token=${token}`;
        }

        // Emit domain event for asynchronous password reset email
        emailEventBus.emitEvent({
          type: 'PASSWORD_RESET_REQUESTED',
          payload: {
            email: normalizedEmail,
            fullName: user.full_name,
            resetUrl,
            expiresInMinutes: 30,
          },
        });

        // Audit log
        await auditLogsRepository.log({
          user_id: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          module: 'auth',
          record_id: user.id,
          ip_address: req.ip,
          new_data: { email: normalizedEmail },
        });
      }

      // Always return success for privacy/security against enumeration
      res.status(200).json({
        success: true,
        message: 'If that email is registered, password reset instructions have been sent.',
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = resetPasswordSchema.parse(req.body);
      let userId = req.user?.id;
      let userEmail = req.user?.email;
      let userFullName = req.user?.full_name;

      // If token passed in query/body (e.g. from standalone recovery link)
      if (!userId && req.body.token) {
        try {
          const decoded = jwt.verify(req.body.token, env.JWT_SECRET) as any;
          if (decoded.id && decoded.type === 'recovery') {
            userId = decoded.id;
            userEmail = decoded.email;
            if (userId) {
              const profile = await usersRepository.findById(userId);
              userFullName = profile?.full_name;
            }
          }
        } catch (e) {}
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required to reset password' },
        });
        return;
      }

      if (isSupabaseConfigured()) {
        const client = getDbAdmin();
        let updated = false;

        // 1. Try secure SECURITY DEFINER RPC to update auth.users encrypted_password directly
        try {
          const { error: rpcErr } = await client.rpc('admin_set_user_password', {
            p_user_id: userId,
            p_new_password: password,
          });
          if (!rpcErr) {
            updated = true;
          } else {
            console.warn('RPC admin_set_user_password warning:', rpcErr.message);
          }
        } catch (rpcEx: any) {
          console.warn('RPC admin_set_user_password exception:', rpcEx.message);
        }

        // 2. Fall back to Supabase Admin API or Client API
        if (!updated) {
          if (supabaseAdmin) {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
            if (error) throw error;
            updated = true;
          } else if (supabaseClient) {
            const { error } = await supabaseClient.auth.updateUser({ password });
            if (error) console.warn('Supabase updateUser notice:', error.message);
          }
        }
      } else {
        const hash = await bcrypt.hash(password, 10);
        const profile = store.profiles.get(userId);
        if (profile) {
          profile.password_hash = hash;
          profile.updated_at = new Date().toISOString();
        }
      }

      // Emit PASSWORD_CHANGED security notification
      if (userEmail) {
        emailEventBus.emitEvent({
          type: 'PASSWORD_CHANGED',
          payload: {
            userId,
            email: userEmail,
            fullName: userFullName || 'Member',
            changedAt: new Date().toUTCString(),
            ipAddress: req.ip,
          },
        });
      }

      // Audit log PASSWORD_CHANGED
      await auditLogsRepository.log({
        user_id: userId,
        action: 'PASSWORD_CHANGED',
        module: 'auth',
        record_id: userId,
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Password updated successfully. Please log in with your new password.',
      });
    } catch (err) {
      next(err);
    }
  }

  async requestEmailVerification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        return;
      }

      const user = req.user;
      const clientBase = getPrimaryClientUrl();
      let verificationUrl = `${clientBase}/verify-email`;

      if (isSupabaseConfigured() && supabaseAdmin) {
        try {
          const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email: user.email,
            password: 'TempPassword@123',
            options: { redirectTo: `${clientBase}/verify-email` },
          });
          if (linkData?.properties?.action_link) {
            verificationUrl = linkData.properties.action_link;
          }
        } catch (e: any) {}
      } else {
        const token = jwt.sign(
          { id: user.id, email: user.email, type: 'verify_email' },
          env.JWT_SECRET,
          { expiresIn: '60m' }
        );
        verificationUrl = `${clientBase}/verify-email?token=${token}`;
      }

      emailEventBus.emitEvent({
        type: 'EMAIL_VERIFICATION_REQUESTED',
        payload: {
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          verificationUrl,
          expiresInMinutes: 60,
        },
      });

      await auditLogsRepository.log({
        user_id: user.id,
        action: 'EMAIL_VERIFICATION_REQUESTED',
        module: 'auth',
        record_id: user.id,
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Verification email dispatched. Please check your inbox.',
      });
    } catch (err) {
      next(err);
    }
  }

  async confirmEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Verification token is required' } });
        return;
      }

      let userId: string | null = null;
      let email: string | null = null;

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        if (decoded.id && decoded.type === 'verify_email') {
          userId = decoded.id;
          email = decoded.email;
        }
      } catch (e) {}

      if (!userId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' } });
        return;
      }

      await auditLogsRepository.log({
        user_id: userId,
        action: 'EMAIL_VERIFIED',
        module: 'auth',
        record_id: userId,
        ip_address: req.ip,
        new_data: { email },
      });

      res.status(200).json({
        success: true,
        message: 'Email address verified successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    const profile = await usersRepository.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: profile,
    });
  }

  async setupInitialAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if any SUPER_ADMIN already exists
      const superAdminRole = await rolesRepository.findBySlug('SUPER_ADMIN');
      if (!superAdminRole) {
        res.status(500).json({
          success: false,
          error: { code: 'ROLE_CONFIG_ERROR', message: 'System role SUPER_ADMIN is missing' },
        });
        return;
      }

      let superAdminExists = false;
      if (isSupabaseConfigured()) {
        const { count, error } = await getDbAdmin()
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', superAdminRole.id);
        if (!error && (count ?? 0) > 0) {
          superAdminExists = true;
        }
      } else {
        const usersWithSuperAdmin: string[] = [];
        for (const ur of store.userRoles) {
          const [uId, rId] = ur.split(':');
          if (rId === superAdminRole.id) {
            usersWithSuperAdmin.push(uId);
          }
        }
        if (usersWithSuperAdmin.length > 0) {
          superAdminExists = true;
        }
      }

      if (superAdminExists) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ADMIN_EXISTS',
            message: 'A Super Administrator has already been configured. Initial setup is locked.',
          },
        });
        return;
      }

      const data = setupAdminSchema.parse(req.body);
      const hash = await bcrypt.hash(data.password, 10);
      const id = 'a0000001-0000-0000-0000-000000000001';

      // Create Supabase Auth user if configured
      if (isSupabaseConfigured() && supabaseAdmin) {
        const { data: suUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: { full_name: data.full_name },
        });
        if (error) {
          console.warn('Could not create admin in remote Supabase:', error.message);
        }
      }

      const profile = await usersRepository.createProfile({
        id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        student_id: data.student_id || null,
        status: 'active',
        password_hash: hash,
      });

      // Assign SUPER_ADMIN role
      await usersRepository.assignRole(profile.id, superAdminRole.id);

      const token = jwt.sign(
        { id: profile.id, email: profile.email },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const hydrated = await usersRepository.findById(profile.id);

      res.status(201).json({
        success: true,
        message: 'Initial Super Administrator successfully created',
        data: {
          user: hydrated,
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async validateSetupToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = ((req.query.token as string) || (req.body?.token as string) || '').trim();
      if (!token) {
        res.status(400).json({
          success: false,
          error: { code: 'TOKEN_REQUIRED', message: 'Setup token is required' },
        });
        return;
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const client = getDbAdmin();

      const { data: record, error: findError } = await client
        .from('account_setup_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (findError || !record) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'This invitation or setup link is invalid, expired, or has already been used.',
          },
        });
        return;
      }

      const profile = await usersRepository.findById(record.user_id);

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          email: profile?.email || null,
          full_name: profile?.full_name || null,
          user_id: record.user_id,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async confirmAccountSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'TOKEN_REQUIRED', message: 'Setup token is required' },
        });
        return;
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long' },
        });
        return;
      }

      const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
      const client = getDbAdmin();

      const { data: record, error: findError } = await client
        .from('account_setup_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (findError || !record) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'This invitation or setup link is invalid, expired, or has already been used.',
          },
        });
        return;
      }

      const userId = record.user_id;

      // 1. Update password in Supabase GoTrue via SECURITY DEFINER function
      if (isSupabaseConfigured()) {
        const { error: rpcErr } = await client.rpc('admin_set_user_password', {
          p_user_id: userId,
          p_new_password: password,
        });

        if (rpcErr) {
          console.error('❌ [confirmAccountSetup] RPC error:', rpcErr);
          if (supabaseAdmin) {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
            if (error) throw error;
          } else {
            throw new Error(`Failed to update user password: ${rpcErr.message}`);
          }
        }
      }

      // Standalone store fallback
      const hash = await bcrypt.hash(password, 10);
      const profile = store.profiles.get(userId);
      if (profile) {
        profile.password_hash = hash;
        profile.updated_at = new Date().toISOString();
      }

      // 2. Mark token as consumed
      await client
        .from('account_setup_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', record.id);

      // 3. Ensure user status is active
      const userProfile = await usersRepository.findById(userId);
      if (userProfile && userProfile.status !== 'active') {
        await usersRepository.updateStatus(userId, 'active');
      }

      // 4. Audit log
      await auditLogsRepository.log({
        user_id: userId,
        action: 'ACCOUNT_SETUP_COMPLETED',
        module: 'auth',
        record_id: userId,
        ip_address: req.ip,
      });

      // 5. Emit PASSWORD_CHANGED security notice
      if (userProfile?.email) {
        emailEventBus.emitEvent({
          type: 'PASSWORD_CHANGED',
          payload: {
            userId,
            email: userProfile.email,
            fullName: userProfile.full_name || 'Member',
            changedAt: new Date().toUTCString(),
            ipAddress: req.ip,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Account setup complete! You can now log in with your new password.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
