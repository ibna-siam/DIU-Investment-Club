/**
 * DIU Investment Club - Centralized Professional Email Service
 *
 * Implements Resend Node.js SDK with:
 * - Brand Name: "DIU Investment Club"
 * - Reusable branded component templates
 * - Secure input sanitization
 * - Transmission auditing & logging
 */

import { EMAIL_BRAND } from './email.brand';
import { emailLogger } from './email.logger';
import { emailRepository } from './email.repository';
import { isValidEmail } from './email.security';
import { emailAutomationManager } from './email.automation.settings';
export { emailQueue } from './email.queue';
export { emailEventBus } from './email.events';
import {
  renderMemberWelcomeEmail,
  renderUserWelcomeEmail,
  renderWelcomeEmail,
  renderPaymentConfirmationEmail,
  renderExpenseSubmittedEmail,
  renderExpenseApprovedEmail,
  renderExpenseRejectedEmail,
  renderEventNotificationEmail,
  renderMeetingInvitationEmail,
  renderTaskAssignedEmail,
  renderReminderEmail,
  renderPasswordResetEmail,
  renderTestEmail,
} from './email.templates';

import { emailProvider, emailProviderManager } from './email.provider';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  emailType?: string;
  triggerSource?: string;
  sentByUserId?: string;
  idempotencyKey?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  providerName?: 'RESEND';
}

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
  recipient: string | string[];
  sentAt: string;
  provider?: 'RESEND';
  statusCode?: number;
}

export class EmailService {
  /**
   * Primary centralized method to dispatch emails via active provider (Resend or SMTP).
   * All other template methods route through this.
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const sentAt = new Date().toISOString();
    const emailType = options.emailType || 'TRANSACTIONAL';
    const triggerSource = options.triggerSource || 'SYSTEM';

    const provider = emailProvider;

    if (!provider.isConfigured()) {
      console.warn(`⚠️ [EmailService] Provider ${provider.name} is not configured. Email sending skipped.`);
      await emailLogger.logTransmission({
        emailType,
        recipient: options.to,
        triggerSource,
        status: 'SKIPPED',
        errorMessage: `Email provider ${provider.name} is unconfigured.`,
        sentByUserId: options.sentByUserId,
        timestamp: sentAt,
      });

      return {
        success: false,
        provider: provider.name,
        error: `Email provider ${provider.name} is currently unconfigured.`,
        recipient: options.to,
        sentAt,
      };
    }

    try {
      const to = Array.isArray(options.to) ? options.to : [options.to];

      // Validate email format
      if (!to.length || to.every((r) => !r)) {
        const err = 'Recipient email address is required';
        await emailLogger.logTransmission({
          emailType,
          recipient: options.to,
          triggerSource,
          status: 'FAILED',
          errorMessage: err,
          sentByUserId: options.sentByUserId,
          timestamp: sentAt,
        });

        return {
          success: false,
          provider: provider.name,
          error: err,
          recipient: options.to,
          sentAt,
        };
      }

      for (const recipient of to) {
        if (!isValidEmail(recipient)) {
          const err = `Invalid email recipient format: "${recipient}"`;
          await emailLogger.logTransmission({
            emailType,
            recipient: options.to,
            triggerSource,
            status: 'FAILED',
            errorMessage: err,
            sentByUserId: options.sentByUserId,
            timestamp: sentAt,
          });

          return {
            success: false,
            provider: provider.name,
            error: err,
            recipient: options.to,
            sentAt,
          };
        }
      }

      const settings = emailAutomationManager.getSettings();
      const isTestMode = settings.environmentMode === 'TEST';
      const effectiveTo = isTestMode
        ? [settings.testRecipientEmail || 'siamibna75@gmail.com']
        : to;

      if (isTestMode) {
        console.log(`🧪 [EmailService] TEST MODE ACTIVE: Isolating dispatch from [${to.join(', ')}] -> [${effectiveTo.join(', ')}]`);
      } else {
        console.log(`🌐 [EmailService] LIVE MODE ACTIVE: Delivering directly to intended recipients: ${effectiveTo.join(', ')}`);
      }

      console.log(`📨 [EmailService] [${emailType}] Dispatching via [${provider.name}] to: ${effectiveTo.join(', ')} | Subject: "${options.subject}"`);

      const result = await provider.send({
        from: options.from,
        to: effectiveTo,
        subject: isTestMode ? `[TEST MODE] ${options.subject}` : options.subject,
        html: options.html,
        replyTo: options.replyTo || (EMAIL_BRAND as any).replyToEmail || EMAIL_BRAND.supportEmail || '252-58-083@diu.edu.bd',
      });

      if (!result.success) {
        console.error(`❌ [EmailService] Provider [${result.provider}] Error:`, result.error);
        await emailLogger.logTransmission({
          emailType,
          recipient: options.to,
          triggerSource,
          status: 'FAILED',
          errorMessage: result.error,
          sentByUserId: options.sentByUserId,
          timestamp: sentAt,
        });

        await emailRepository.create({
          idempotency_key: options.idempotencyKey,
          email_type: emailType,
          recipient: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: options.subject,
          related_entity_type: options.relatedEntityType,
          related_entity_id: options.relatedEntityId,
          trigger_source: triggerSource,
          provider: result.provider,
          provider_status_code: result.statusCode,
          error_category: result.errorCategory || 'PERMANENT',
          status: 'FAILED',
          error_message: result.error,
        });

        return {
          success: false,
          provider: result.provider,
          statusCode: result.statusCode,
          error: result.error || 'Provider rejected the message transmission',
          recipient: options.to,
          sentAt,
        };
      }

      console.log(`✅ [EmailService] Email successfully sent via [${result.provider}]! Provider ID: ${result.id}`);
      const finalStatus = emailType === 'TEST_VERIFICATION' ? 'TEST' : 'SENT';
      await emailLogger.logTransmission({
        emailType,
        recipient: options.to,
        triggerSource,
        providerMessageId: result.id,
        status: finalStatus,
        sentByUserId: options.sentByUserId,
        timestamp: sentAt,
      });

      await emailRepository.create({
        idempotency_key: options.idempotencyKey,
        email_type: emailType,
        recipient: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        related_entity_type: options.relatedEntityType,
        related_entity_id: options.relatedEntityId,
        trigger_source: triggerSource,
        provider: result.provider,
        provider_message_id: result.id,
        provider_status_code: result.statusCode || 200,
        status: finalStatus,
      });

      return {
        success: true,
        id: result.id,
        provider: result.provider,
        statusCode: result.statusCode || 200,
        recipient: options.to,
        sentAt,
      };
    } catch (err: any) {
      console.error('❌ [EmailService] Unexpected Error during email transmission:', err.message || err);
      await emailLogger.logTransmission({
        emailType,
        recipient: options.to,
        triggerSource,
        status: 'FAILED',
        errorMessage: err.message,
        sentByUserId: options.sentByUserId,
        timestamp: sentAt,
      });

      return {
        success: false,
        error: err.message || 'Internal transmission error during email dispatch',
        recipient: options.to,
        sentAt,
      };
    }
  }

  /**
   * 1A. Send Dedicated Member Welcome Email (Strictly Member Directory - NO access button)
   */
  async sendMemberWelcomeEmail(options: {
    to: string;
    userName: string;
    department?: string;
    batch?: string;
    memberCode?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderMemberWelcomeEmail({
      userName: options.userName,
      recipientEmail: options.to,
      department: options.department,
      batch: options.batch,
      memberCode: options.memberCode,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'MEMBER_WELCOME',
      triggerSource: 'MEMBER_REGISTRATION',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 1B. Send User Welcome Email (Strictly User Management - Access button is in invitation)
   */
  async sendUserWelcomeEmail(options: {
    to: string;
    userName: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderUserWelcomeEmail({
      userName: options.userName,
      recipientEmail: options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'USER_WELCOME',
      triggerSource: 'USER_REGISTRATION',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 1C. Send Welcome Email (Legacy / Default fallback to User Welcome)
   */
  async sendWelcomeEmail(options: {
    to: string;
    userName: string;
    loginUrl?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    return this.sendUserWelcomeEmail({
      to: options.to,
      userName: options.userName,
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 2. Send Payment Confirmation Email (Section 7)
   */
  async sendPaymentConfirmationEmail(options: {
    to: string;
    memberName: string;
    amount: number;
    paymentReference: string;
    paymentType?: string;
    paymentDate?: string;
    receiptNumber?: string;
    receiptToken?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderPaymentConfirmationEmail({
      memberName: options.memberName,
      amount: options.amount,
      paymentReference: options.paymentReference,
      paymentType: options.paymentType,
      paymentDate: options.paymentDate,
      receiptNumber: options.receiptNumber,
      receiptToken: options.receiptToken,
      recipientEmail: options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'PAYMENT_CONFIRMATION',
      triggerSource: 'PAYMENT_RECEIVED',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 3A. Send Expense Approved Email (Section 8)
   */
  async sendExpenseApprovedEmail(options: {
    to: string;
    userName: string;
    expenseReference: string;
    expenseTitle: string;
    amount: number;
    approvalDate?: string;
    approverName?: string;
    notes?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderExpenseApprovedEmail({
      userName: options.userName,
      expenseReference: options.expenseReference,
      expenseTitle: options.expenseTitle,
      amount: options.amount,
      approvalDate: options.approvalDate,
      approverName: options.approverName,
      notes: options.notes,
      recipientEmail: options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'EXPENSE_APPROVED',
      triggerSource: 'FINANCIAL_APPROVAL',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 3B. Send Expense Rejected / Update Required Email (Section 8)
   */
  async sendExpenseRejectedEmail(options: {
    to: string;
    userName: string;
    expenseReference: string;
    expenseTitle: string;
    amount: number;
    reason: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderExpenseRejectedEmail({
      userName: options.userName,
      expenseReference: options.expenseReference,
      expenseTitle: options.expenseTitle,
      amount: options.amount,
      reason: options.reason,
      recipientEmail: options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'EXPENSE_REJECTED',
      triggerSource: 'FINANCIAL_REVIEW',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 4. Send Event Notification Email (Section 9)
   */
  async sendEventNotificationEmail(options: {
    to: string | string[];
    memberName: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string;
    location: string;
    description?: string;
    eventUrl?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderEventNotificationEmail({
      memberName: options.memberName,
      eventTitle: options.eventTitle,
      eventDate: options.eventDate,
      eventTime: options.eventTime,
      location: options.location,
      description: options.description,
      eventUrl: options.eventUrl,
      recipientEmail: Array.isArray(options.to) ? options.to[0] : options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'EVENT_INVITATION',
      triggerSource: 'EVENT_ANNOUNCEMENT',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 5. Send Meeting Invitation Email (Section 10)
   */
  async sendMeetingInvitationEmail(options: {
    to: string | string[];
    memberName: string;
    meetingTitle: string;
    meetingDate: string;
    meetingTime: string;
    location: string;
    agendaSummary?: string;
    meetingUrl?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderMeetingInvitationEmail({
      memberName: options.memberName,
      meetingTitle: options.meetingTitle,
      meetingDate: options.meetingDate,
      meetingTime: options.meetingTime,
      location: options.location,
      agendaSummary: options.agendaSummary,
      meetingUrl: options.meetingUrl,
      recipientEmail: Array.isArray(options.to) ? options.to[0] : options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'MEETING_INVITATION',
      triggerSource: 'MEETING_SCHEDULED',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 6. Send Reminder Email (Section 11)
   */
  async sendReminderEmail(options: {
    to: string;
    memberName: string;
    reminderType: 'payment' | 'due' | 'meeting' | 'event' | 'task';
    title: string;
    dueDateOrDate: string;
    description?: string;
    actionUrl?: string;
    actionLabel?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderReminderEmail({
      memberName: options.memberName,
      reminderType: options.reminderType,
      title: options.title,
      dueDateOrDate: options.dueDateOrDate,
      description: options.description,
      actionUrl: options.actionUrl,
      actionLabel: options.actionLabel,
      recipientEmail: options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: `REMINDER_${options.reminderType.toUpperCase()}`,
      triggerSource: 'SMART_REMINDER',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 6B. Send Expense Submitted Notification Email (Section 4)
   */
  async sendExpenseSubmittedEmail(options: {
    to: string | string[];
    approverName: string;
    submitterName: string;
    expenseReference: string;
    expenseTitle: string;
    amount: number;
    categoryName?: string;
    submittedDate?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderExpenseSubmittedEmail({
      approverName: options.approverName,
      submitterName: options.submitterName,
      expenseReference: options.expenseReference,
      expenseTitle: options.expenseTitle,
      amount: options.amount,
      categoryName: options.categoryName,
      submittedDate: options.submittedDate,
      recipientEmail: Array.isArray(options.to) ? options.to[0] : options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'EXPENSE_SUBMITTED',
      triggerSource: 'EXPENSE_SUBMISSION',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 6C. Send Task Assigned Notification Email (Section 9)
   */
  async sendTaskAssignedEmail(options: {
    to: string;
    assigneeName: string;
    assignedByName?: string;
    taskTitle: string;
    dueDate?: string;
    priority?: string;
    description?: string;
    taskId: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderTaskAssignedEmail({
      assigneeName: options.assigneeName,
      assignedByName: options.assignedByName,
      taskTitle: options.taskTitle,
      dueDate: options.dueDate,
      priority: options.priority,
      description: options.description,
      taskId: options.taskId,
      recipientEmail: options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'TASK_ASSIGNED',
      triggerSource: 'TASK_ASSIGNMENT',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 7. Send Password Reset Email (Section 12)
   */
  async sendPasswordResetEmail(options: {
    to: string;
    userName: string;
    resetUrl: string;
    expiresInMinutes?: number;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = renderPasswordResetEmail({
      userName: options.userName,
      resetUrl: options.resetUrl,
      expiresInMinutes: options.expiresInMinutes,
      recipientEmail: options.to,
    });

    return this.sendEmail({
      to: options.to,
      subject,
      html,
      text,
      emailType: 'PASSWORD_RESET',
      triggerSource: 'AUTH_RECOVERY',
      sentByUserId: options.sentByUserId,
    });
  }

  /**
   * 8. Send Verification Test Email (Diagnostics)
   */
  async sendTestEmail(options: {
    to: string;
    recipientName?: string;
    notes?: string;
    sentByUserId?: string;
  }): Promise<EmailSendResult> {
    const to = options?.to?.trim();
    if (!to || !isValidEmail(to)) {
      return {
        success: false,
        error: `Invalid or missing recipient email address: "${options?.to || ''}"`,
        recipient: options?.to || '',
        sentAt: new Date().toISOString(),
      };
    }

    const serverTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'full',
      timeStyle: 'long',
    });

    const { subject, html, text } = renderTestEmail({
      recipientName: options?.recipientName,
      serverTime,
      environment: process.env.NODE_ENV || 'development',
      notes: options?.notes,
      recipientEmail: to,
    });

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      emailType: 'TEST_VERIFICATION',
      triggerSource: 'SYSTEM_DIAGNOSTICS',
      sentByUserId: options?.sentByUserId,
    });
  }
}

export const emailService = new EmailService();
