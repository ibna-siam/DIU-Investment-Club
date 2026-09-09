import { Router } from 'express';
import { remindersController } from './reminders.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Telemetry & Dashboard Stats
router.get('/stats', requirePermission('reminders.read'), (req, res) => remindersController.getStats(req, res));

// Scheduler status & manual tick trigger
router.get('/scheduler/status', requirePermission('reminders.read'), (req, res) => remindersController.getSchedulerStatus(req, res));
router.post('/scheduler/tick', requirePermission('reminders.manage'), (req, res) => remindersController.triggerSchedulerTick(req, res));

// Batch processing endpoints
router.post('/process-due', requirePermission('reminders.manage'), (req, res) => remindersController.processDue(req, res));
router.post('/overdue-sweep', requirePermission('reminders.manage'), (req, res) => remindersController.runOverdueSweep(req, res));

// Centralized smart scheduling for business records
router.post('/schedule-entity', requirePermission('reminders.manage'), (req, res) => remindersController.scheduleEntity(req, res));

// Core CRUD & Lifecycle
router.get('/', requirePermission('reminders.read'), (req, res) => remindersController.getReminders(req, res));
router.get('/:id', requirePermission('reminders.read'), (req, res) => remindersController.getReminderById(req, res));
router.post('/', requirePermission('reminders.manage'), (req, res) => remindersController.createReminder(req, res));
router.put('/:id', requirePermission('reminders.manage'), (req, res) => remindersController.updateReminder(req, res));
router.patch('/:id/cancel', requirePermission('reminders.manage'), (req, res) => remindersController.cancelReminder(req, res));
router.patch('/:id/reschedule', requirePermission('reminders.manage'), (req, res) => remindersController.rescheduleReminder(req, res));
router.post('/:id/retry', requirePermission('reminders.manage'), (req, res) => remindersController.retryReminder(req, res));

export default router;
