import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { notificationsRepository } from './notifications.repository';

export class NotificationsController {
  async getUserNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, status, limit, offset } = req.query as {
        category?: string;
        status?: 'UNREAD' | 'READ' | 'ARCHIVED' | 'ALL';
        limit?: string;
        offset?: string;
      };
      const userId = req.user?.id || '';
      const data = await notificationsRepository.getUserNotifications(userId, {
        category,
        status,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const count = await notificationsRepository.getUnreadCount(userId);
      res.status(200).json({ success: true, data: { unreadCount: count } });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      const updated = await notificationsRepository.markAsRead(id, userId);
      res.status(200).json({ success: true, message: 'Notification marked as read', data: updated });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const count = await notificationsRepository.markAllAsRead(userId);
      res.status(200).json({ success: true, message: `${count} notifications marked as read`, count });
    } catch (error) {
      next(error);
    }
  }

  async archiveNotification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '';
      const updated = await notificationsRepository.archiveNotification(id, userId);
      res.status(200).json({ success: true, message: 'Notification archived', data: updated });
    } catch (error) {
      next(error);
    }
  }

  async archiveAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const count = await notificationsRepository.archiveAllRead(userId);
      res.status(200).json({ success: true, message: `${count} read notifications archived`, count });
    } catch (error) {
      next(error);
    }
  }

  async getPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const data = await notificationsRepository.getPreferences(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || '';
      const data = await notificationsRepository.updatePreferences(userId, req.body);
      res.status(200).json({ success: true, message: 'Communication preferences updated', data });
    } catch (error) {
      next(error);
    }
  }

  async dispatchNotification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await notificationsRepository.dispatchNotification(req.body);
      res.status(201).json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  }

  async getNotificationRules(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await notificationsRepository.getNotificationRules();
      res.status(200).json({ success: true, data: rules });
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationRule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const updated = await notificationsRepository.updateNotificationRule(key, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
