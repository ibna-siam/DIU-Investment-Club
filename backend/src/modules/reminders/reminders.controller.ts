import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { remindersRepository } from './reminders.repository';
import { reminderScheduler } from './reminder.scheduler';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class RemindersController {
  async getReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, reminder_type, user_id, search, limit, offset } = req.query;
      const reminders = await remindersRepository.getReminders({
        status: status as string,
        reminder_type: reminder_type as string,
        user_id: user_id as string,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });
      res.json({ success: true, data: reminders });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getReminderById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reminder = await remindersRepository.getReminderById(req.params.id);
      if (!reminder) {
        res.status(404).json({ success: false, message: 'Reminder not found' });
        return;
      }
      res.json({ success: true, data: reminder });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await remindersRepository.getReminderStats();
      const schedulerStatus = reminderScheduler.getStatus();
      res.json({
        success: true,
        data: {
          ...stats,
          scheduler: schedulerStatus,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reminder = await remindersRepository.createReminder(req.body);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'REMINDER_CREATED',
        module: 'reminders',
        record_id: reminder.id,
        new_data: reminder,
      });

      res.status(201).json({ success: true, data: reminder });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async scheduleEntity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { entityType, entityId, title, targetDate, recipientUserId, recipientEmail, recipientName, message, priority, customOffsets } = req.body;
      if (!entityType || !entityId || !title || !targetDate) {
        res.status(400).json({ success: false, message: 'entityType, entityId, title, and targetDate are required' });
        return;
      }

      const reminders = await remindersRepository.scheduleEntityReminders({
        entityType,
        entityId,
        title,
        targetDate,
        recipientUserId,
        recipientEmail,
        recipientName,
        message,
        priority,
        customOffsets,
      });

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'REMINDER_SCHEDULED',
        module: 'reminders',
        record_id: entityId,
        new_data: { count: reminders.length, entityType, title },
      });

      res.status(201).json({ success: true, data: reminders });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reminder = await remindersRepository.updateReminder(req.params.id, req.body);
      res.json({ success: true, data: reminder });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async cancelReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reason } = req.body || {};
      const reminder = await remindersRepository.cancelReminder(req.params.id, reason);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'REMINDER_CANCELLED',
        module: 'reminders',
        record_id: req.params.id,
        new_data: { reason: reason || 'Manual Admin Cancellation' },
      });

      res.json({ success: true, data: reminder });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async rescheduleReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { scheduledAt, reason } = req.body || {};
      if (!scheduledAt) {
        res.status(400).json({ success: false, message: 'scheduledAt timestamp is required' });
        return;
      }

      const reminder = await remindersRepository.rescheduleReminder(req.params.id, scheduledAt, req.user?.id, reason);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'REMINDER_RESCHEDULED',
        module: 'reminders',
        record_id: req.params.id,
        new_data: { newScheduledAt: scheduledAt, reason },
      });

      res.json({ success: true, data: reminder });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async retryReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reminder = await remindersRepository.retryReminder(req.params.id, req.user?.id);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'REMINDER_RETRIED',
        module: 'reminders',
        record_id: req.params.id,
      });

      res.json({ success: true, data: reminder });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async processDue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await remindersRepository.processDueReminders();
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async runOverdueSweep(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await remindersRepository.runOverdueSweep();
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Scheduler controls
  async getSchedulerStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: reminderScheduler.getStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async triggerSchedulerTick(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await reminderScheduler.triggerManualTick();
      res.json({ success: true, message: 'Scheduler tick executed', data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const remindersController = new RemindersController();
