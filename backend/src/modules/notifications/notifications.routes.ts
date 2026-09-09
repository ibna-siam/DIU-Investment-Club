import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// User Notifications
router.get('/', notificationsController.getUserNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.put('/mark-all-read', notificationsController.markAllAsRead);
router.patch('/mark-all-read', notificationsController.markAllAsRead);
router.put('/archive-read', notificationsController.archiveAllRead);
router.patch('/archive-read', notificationsController.archiveAllRead);
router.put('/:id/read', notificationsController.markAsRead);
router.patch('/:id/read', notificationsController.markAsRead);
router.put('/:id/archive', notificationsController.archiveNotification);
router.patch('/:id/archive', notificationsController.archiveNotification);

// Preferences
router.get('/preferences', notificationsController.getPreferences);
router.put('/preferences', notificationsController.updatePreferences);

// Dispatch (Administrative / System)
router.post('/dispatch', requirePermission('notifications.manage'), notificationsController.dispatchNotification);

export default router;
