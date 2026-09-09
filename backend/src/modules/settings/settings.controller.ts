import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { settingsRepository } from './settings.repository';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class SettingsController {
  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const flat = req.query.format === 'flat';
      if (flat) {
        const settings = await settingsRepository.getAll();
        res.json({
          success: true,
          data: settings,
        });
      } else {
        const grouped = await settingsRepository.getGrouped();
        res.json({
          success: true,
          data: grouped,
        });
      }
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updates = req.body;
      if (!updates || typeof updates !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Expected a JSON object of setting key-value pairs',
          },
        });
        return;
      }

      // Security check: Never allow editing of critical infrastructure keys
      const forbiddenKeys = [
        'supabase_url',
        'supabase_key',
        'service_role_key',
        'jwt_secret',
        'database_url',
        'db_password',
        'api_secret',
        'resend_api_key',
        'resend',
      ];
      for (const key of Object.keys(updates)) {
        if (forbiddenKeys.some((f) => key.toLowerCase().includes(f))) {
          res.status(403).json({
            success: false,
            error: {
              code: 'CRITICAL_KEY_RESTRICTED',
              message: `Setting key '${key}' is security-critical and cannot be modified via the Admin Panel`,
            },
          });
          return;
        }
      }

      const userId = req.user?.id;
      await settingsRepository.updateSettings(updates, userId);

      // Audit log the configuration change
      await auditLogsRepository.log({
        user_id: userId,
        module: 'SETTINGS',
        action: 'UPDATE_SETTINGS',
        new_data: { updated_keys: Object.keys(updates) },
        ip_address: req.ip || '127.0.0.1',
      });

      const updated = await settingsRepository.getGrouped();
      res.json({
        success: true,
        message: 'System settings updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();
