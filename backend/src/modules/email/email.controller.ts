import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { emailService } from './email.service';
import { emailRepository } from './email.repository';
import { emailQueue } from './email.queue';
import { emailPreferencesManager } from './email.preferences';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';
import { DEFAULT_FROM_EMAIL } from './email.config';
import { isValidEmail } from './email.security';
import { emailAutomationManager } from './email.automation.settings';
import { EMAIL_BRAND } from './email.brand';
import { emailProviderManager } from './providers/email.provider.manager';

export class EmailController {
  /**
   * Get Email Service operational status & brand info
   * (Zero leakage of API keys or sensitive secrets)
   */
  async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const activeProvider = emailProviderManager.getActiveProviderName();
      const primary = emailProviderManager.getPrimaryProvider();
      res.json({
        success: true,
        data: {
          provider: activeProvider,
          primaryProvider: activeProvider,
          brandName: EMAIL_BRAND.name,
          organization: EMAIL_BRAND.organizationName,
          configured: primary.isConfigured(),
          smtpConfigured: emailProviderManager.isSmtpConfigured(),
          resendConfigured: emailProviderManager.isResendConfigured(),
          from:
            activeProvider === 'SMTP'
              ? `${EMAIL_BRAND.name} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`
              : DEFAULT_FROM_EMAIL,
          environment: process.env.NODE_ENV || 'development',
          sandboxMode: activeProvider === 'RESEND' && !process.env.RESEND_DOMAIN_VERIFIED,
          supportEmail: EMAIL_BRAND.supportEmail,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to retrieve email status' },
      });
    }
  }

  /**
   * General Diagnostics Test Email
   */
  async sendTest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const primary = emailProviderManager.getPrimaryProvider();
      if (!primary.isConfigured()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'EMAIL_SERVICE_UNAVAILABLE',
            message: `Primary email provider (${primary.name}) is not configured. Provider credentials missing.`,
          },
        });
        return;
      }

      const { to, recipientName, notes } = req.body || {};
      const targetRecipient = to || req.user?.email;
      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RECIPIENT',
            message: 'A valid recipient email address is required',
          },
        });
        return;
      }
      const targetName = recipientName || req.user?.full_name || 'Member';

      const result = await emailService.sendTestEmail({
        to: targetRecipient,
        recipientName: targetName,
        notes: notes || `Dispatched via DIU Investment Club API`,
        sentByUserId: req.user?.id,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_TRANSMISSION_FAILED',
            message: result.error || 'Failed to send test email through Resend',
            recipient: result.recipient,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'Test email successfully dispatched via Resend',
          messageId: result.id,
          recipient: result.recipient,
          sentAt: result.sentAt,
        },
      });
    } catch (error: any) {
      console.error('EmailController.sendTest Error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Unexpected error during email transmission',
        },
      });
    }
  }

  /**
   * Test Template 1: Welcome Email
   */
  async testWelcome(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { to, userName } = req.body || {};
      const targetRecipient = to || req.user?.email;
      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RECIPIENT', message: 'A valid recipient email address is required' },
        });
        return;
      }
      const targetName = userName || req.user?.full_name || 'New Member';

      const result = await emailService.sendWelcomeEmail({
        to: targetRecipient,
        userName: targetName,
        sentByUserId: req.user?.id,
      });

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result,
        error: result.error ? { message: result.error } : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Test Template 2: Payment Confirmation Email
   */
  async testPaymentConfirmation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { to, memberName, amount, paymentReference, paymentType } = req.body || {};
      const targetRecipient = to || req.user?.email;
      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RECIPIENT', message: 'A valid recipient email address is required' },
        });
        return;
      }
      const targetName = memberName || req.user?.full_name || 'Valued Member';

      const result = await emailService.sendPaymentConfirmationEmail({
        to: targetRecipient,
        memberName: targetName,
        amount: Number(amount) || 1200,
        paymentReference: paymentReference || `PAY-${Date.now().toString().slice(-6)}`,
        paymentType: paymentType || 'Annual Membership Dues',
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
        sentByUserId: req.user?.id,
      });

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result,
        error: result.error ? { message: result.error } : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Test Template 3: Expense Status Email (Approved or Rejected)
   */
  async testExpenseStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { to, userName, status, reason, notes } = req.body || {};
      const targetRecipient = to || req.user?.email;
      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RECIPIENT', message: 'A valid recipient email address is required' },
        });
        return;
      }
      const targetName = userName || req.user?.full_name || 'Club Executive';
      const isApproved = (status || 'APPROVED').toUpperCase() === 'APPROVED';

      let result;
      if (isApproved) {
        result = await emailService.sendExpenseApprovedEmail({
          to: targetRecipient,
          userName: targetName,
          expenseReference: `EXP-${Date.now().toString().slice(-5)}`,
          expenseTitle: 'National Stock Market Seminar Logistics',
          amount: 4500,
          approverName: req.user?.full_name || 'Club Treasurer',
          notes: notes || 'All receipts verified against vendor invoices.',
          sentByUserId: req.user?.id,
        });
      } else {
        result = await emailService.sendExpenseRejectedEmail({
          to: targetRecipient,
          userName: targetName,
          expenseReference: `EXP-${Date.now().toString().slice(-5)}`,
          expenseTitle: 'Off-Campus Networking Refreshments',
          amount: 2800,
          reason: reason || 'Itemized receipt was unreadable. Please re-upload a clear photo of the merchant bill.',
          sentByUserId: req.user?.id,
        });
      }

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result,
        error: result.error ? { message: result.error } : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Test Template 4: Event Notification Email
   */
  async testEventNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { to, memberName, eventTitle, location, eventDate } = req.body || {};
      const targetRecipient = to || req.user?.email;
      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RECIPIENT', message: 'A valid recipient email address is required' },
        });
        return;
      }
      const targetName = memberName || req.user?.full_name || 'Club Member';

      const result = await emailService.sendEventNotificationEmail({
        to: targetRecipient,
        memberName: targetName,
        eventTitle: eventTitle || 'Dhaka Stock Exchange (DSE) Trading & Analytics Workshop 2026',
        eventDate: eventDate || 'Saturday, March 28, 2026',
        eventTime: '10:00 AM - 1:00 PM',
        location: location || 'DIU Auditorium, Daffodil Smart City',
        description: 'An interactive seminar covering equity valuation, risk management, and portfolio structuring with certified capital market professionals.',
        sentByUserId: req.user?.id,
      });

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result,
        error: result.error ? { message: result.error } : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Test Template 5: Meeting Invitation Email
   */
  async testMeetingInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { to, memberName, meetingTitle, location, meetingDate } = req.body || {};
      const targetRecipient = to || req.user?.email;
      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RECIPIENT', message: 'A valid recipient email address is required' },
        });
        return;
      }
      const targetName = memberName || req.user?.full_name || 'Executive Member';

      const result = await emailService.sendMeetingInvitationEmail({
        to: targetRecipient,
        memberName: targetName,
        meetingTitle: meetingTitle || 'Quarterly Financial Review & Strategic Planning Session',
        meetingDate: meetingDate || 'Monday, March 23, 2026',
        meetingTime: '4:00 PM',
        location: location || 'Conference Room 302 / Google Meet',
        agendaSummary: 'Review Q1 budget execution, upcoming inter-university competition, and membership renewal status.',
        sentByUserId: req.user?.id,
      });

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result,
        error: result.error ? { message: result.error } : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Test Template 6: Reminder Email
   */
  async testReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { to, memberName, reminderType, title, dueDateOrDate } = req.body || {};
      const targetRecipient = to || req.user?.email;
      if (!targetRecipient || !isValidEmail(targetRecipient)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_RECIPIENT', message: 'A valid recipient email address is required' },
        });
        return;
      }
      const targetName = memberName || req.user?.full_name || 'Member';

      const result = await emailService.sendReminderEmail({
        to: targetRecipient,
        memberName: targetName,
        reminderType: reminderType || 'due',
        title: title || 'Semester Membership Subscription Renewal',
        dueDateOrDate: dueDateOrDate || 'March 31, 2026',
        description: 'Please ensure your semester dues are cleared to maintain active voting status and continuous access to trading research papers.',
        sentByUserId: req.user?.id,
      });

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result,
        error: result.error ? { message: result.error } : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Section 18: Admin Email Delivery Log View
   * Access controlled by admin RBAC
   */
  async getEmailLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as string | undefined;
      const emailType = req.query.emailType as string | undefined;
      const search = req.query.search as string | undefined;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;

      const result = await emailRepository.findAll({
        page,
        limit,
        status,
        emailType,
        search,
        fromDate,
        toDate,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Section 12: Admin Email Control Center Metrics & Stats
   */
  async getEmailStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await emailRepository.getStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Section 12: Safe Retry for Failed/Retrying Emails
   * Enforces duplicate protection (already SENT emails cannot be retried)
   */
  async retryEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await emailQueue.retryFailedLog(id, req.user?.id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { message: result.message },
        });
        return;
      }

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'EMAIL_RETRIED',
        module: 'email',
        record_id: id,
        new_data: { retryInitiatedAt: new Date().toISOString() },
      });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Section 13: Authorized Manual Resend with Audit Trail
   */
  async resendEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};

      const result = await emailQueue.resendLog(id, {
        reason,
        requestedByUserId: req.user?.id,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { message: result.message },
        });
        return;
      }

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'EMAIL_RESENT',
        module: 'email',
        record_id: id,
        new_data: { reason: reason || 'Manual Admin Resend', newJobId: result.newJobId },
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { newJobId: result.newJobId },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Section 9: Notification Preferences Management
   */
  async getPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const prefs = emailPreferencesManager.getPreferences(userId);
      res.status(200).json({
        success: true,
        data: prefs,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const updated = emailPreferencesManager.updatePreferences(userId, req.body || {});
      res.status(200).json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Phase 7: Email Analytics, Health & Operational Metrics
   */
  async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await emailRepository.getStats();
      res.status(200).json({
        success: true,
        data: {
          ...stats,
          brand: {
            name: EMAIL_BRAND.name,
            university: EMAIL_BRAND.universityAffiliation,
            supportEmail: EMAIL_BRAND.supportEmail,
          },
          provider: {
            name: emailProviderManager.getActiveProviderName(),
            configured: emailProviderManager.getPrimaryProvider().isConfigured(),
            mode: emailProviderManager.getActiveProviderName() === 'SMTP' ? 'PRODUCTION' : (process.env.RESEND_DOMAIN_VERIFIED ? 'PRODUCTION' : 'SANDBOX'),
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message || 'Failed to compute email analytics' } });
    }
  }

  /**
   * Phase 7: Cancel in-flight, pending or retrying email
   */
  async cancelEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};

      const result = await emailQueue.cancelPendingLog(id, req.user?.id, reason);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { message: result.message },
        });
        return;
      }

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'EMAIL_CANCELLED',
        module: 'email',
        record_id: id,
        new_data: { reason: reason || 'Cancelled by admin', cancelledAt: new Date().toISOString() },
      });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  /**
   * Super Admin: Get Email Automation Settings & Rule Metadata
   */
  async getAutomationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const settings = emailAutomationManager.getSettings();
      const rules = emailAutomationManager.getRulesMetadata();
      res.json({
        success: true,
        data: settings,
        rules,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message || 'Failed to get automation settings' } });
    }
  }

  /**
   * Super Admin: Update Email Automation Settings dynamically
   */
  async updateAutomationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const updated = await emailAutomationManager.updateSettings(req.body || {}, req.user?.id);

      await auditLogsRepository.log({
        user_id: req.user?.id,
        action: 'EMAIL_AUTOMATION_SETTINGS_UPDATED',
        module: 'email',
        record_id: 'automation_settings',
        new_data: updated,
      });

      res.json({
        success: true,
        message: 'Email automation settings updated successfully',
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message || 'Failed to update automation settings' } });
    }
  }

  /**
   * Super Admin: Safe "Send Test Email" function
   * - Marked clearly as TEST
   * - Routes strictly to the configured Test Email Address (siamibna75@gmail.com)
   * - Does not affect real members or trigger real automations
   * - Stored as TEST in email logs
   */
  async sendManualTestEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const primary = emailProviderManager.getPrimaryProvider();
      if (!primary.isConfigured() && !emailProviderManager.getResendProvider().isConfigured()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'EMAIL_SERVICE_UNAVAILABLE',
            message: 'Email service is not configured. Provider credentials missing.',
          },
        });
        return;
      }

      const settings = emailAutomationManager.getSettings();
      const targetRecipient = settings.testRecipientEmail || 'siamibna75@gmail.com';

      const result = await emailService.sendTestEmail({
        to: targetRecipient,
        recipientName: 'Super Admin Diagnostic Tester',
        notes: `Manual Super Admin test trigger in ${settings.environmentMode} mode by ${req.user?.full_name || 'Super Admin'}`,
        sentByUserId: req.user?.id,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'TEST_EMAIL_FAILED',
            message: result.error || 'Test Email Failed',
            recipient: targetRecipient,
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Test Email Sent Successfully',
        data: {
          recipient: targetRecipient,
          messageId: result.id,
          status: 'TEST',
          sentAt: result.sentAt,
          environmentMode: settings.environmentMode,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_EMAIL_FAILED',
          message: error.message || 'Test Email Failed',
        },
      });
    }
  }
}

export const emailController = new EmailController();
