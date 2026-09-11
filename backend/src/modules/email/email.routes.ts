import { Router } from 'express';
import { emailController } from './email.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// Secure email administration routes
router.use(authenticate);

router.get('/status', (req, res) => emailController.getStatus(req, res));

// Section 12: Admin Email Control Center & Stats
router.get(
  '/stats',
  requireRole('SUPER_ADMIN', 'PRESIDENT', 'GENERAL_SECRETARY', 'TREASURER', 'ADMIN', 'AUDITOR'),
  (req, res) => emailController.getEmailStats(req, res)
);

// Phase 7: Email Analytics, Health & Operational Metrics
router.get(
  '/analytics',
  requireRole('SUPER_ADMIN', 'PRESIDENT', 'GENERAL_SECRETARY', 'TREASURER', 'ADMIN', 'AUDITOR'),
  (req, res) => emailController.getAnalytics(req, res)
);

// Section 18: Admin Email Delivery Log View
router.get(
  '/logs',
  requireRole('SUPER_ADMIN', 'PRESIDENT', 'GENERAL_SECRETARY', 'TREASURER', 'ADMIN', 'AUDITOR'),
  (req, res) => emailController.getEmailLogs(req, res)
);

// Section 12: Safe Retry for Failed/Retrying Emails
router.post(
  '/logs/:id/retry',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  (req, res) => emailController.retryEmail(req, res)
);

// Phase 7: Cancel In-flight, Pending or Retrying Email
router.post(
  '/logs/:id/cancel',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  (req, res) => emailController.cancelEmail(req, res)
);

// Section 13: Authorized Manual Resend
router.post(
  '/logs/:id/resend',
  requireRole('SUPER_ADMIN', 'PRESIDENT', 'GENERAL_SECRETARY', 'TREASURER'),
  (req, res) => emailController.resendEmail(req, res)
);

// Section 9: Notification Preferences
router.get('/preferences', (req, res) => emailController.getPreferences(req, res));
router.patch('/preferences', (req, res) => emailController.updatePreferences(req, res));

// Section 4: Email Automation Rules & Super Admin Settings
router.get(
  '/automation-settings',
  requireRole('SUPER_ADMIN'),
  (req, res) => emailController.getAutomationSettings(req, res)
);

router.patch(
  '/automation-settings',
  requireRole('SUPER_ADMIN'),
  (req, res) => emailController.updateAutomationSettings(req, res)
);

// 17 Standard Email Automation Rules Management
router.get(
  '/automation-rules',
  requireRole('SUPER_ADMIN', 'ADMIN', 'PRESIDENT', 'GENERAL_SECRETARY', 'TREASURER'),
  (req, res) => emailController.getAutomationRules(req, res)
);

router.patch(
  '/automation-rules/:key',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  (req, res) => emailController.toggleAutomationRule(req, res)
);

// Section 7: Safe Super Admin "Send Test Email" Function
router.post(
  '/send-test-email',
  requireRole('SUPER_ADMIN'),
  (req, res) => emailController.sendManualTestEmail(req, res)
);

router.post('/test', (req, res) => emailController.sendTest(req, res));

// Dedicated template test endpoints
router.post('/test/welcome', (req, res) => emailController.testWelcome(req, res));
router.post('/test/payment-confirmation', (req, res) => emailController.testPaymentConfirmation(req, res));
router.post('/test/expense-status', (req, res) => emailController.testExpenseStatus(req, res));
router.post('/test/event-notification', (req, res) => emailController.testEventNotification(req, res));
router.post('/test/meeting-invitation', (req, res) => emailController.testMeetingInvitation(req, res));
router.post('/test/reminder', (req, res) => emailController.testReminder(req, res));

export default router;
