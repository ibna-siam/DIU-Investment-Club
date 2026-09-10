/**
 * DIU Investment Club - Dynamic Email Automation Settings & Environment Mode Manager
 *
 * Implements:
 * - Dynamic rule enablement/disablement for Super Admin without code changes
 * - Clear separation between LIVE MODE and TEST MODE
 * - Safe test email recipient routing for manual diagnostics
 */

import { settingsRepository } from '../settings/settings.repository';
import { isValidEmail } from './email.security';

export interface EmailAutomationRuleConfig {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'MEMBERSHIP' | 'FINANCIAL' | 'TASKS' | 'MEETINGS' | 'EVENTS' | 'SECURITY';
  isProtected?: boolean; // Security alerts cannot be disabled by non-super-admins
}

export interface EmailAutomationSettings {
  environmentMode: 'LIVE' | 'TEST';
  testRecipientEmail: string;
  rules: {
    newMemberWelcome: boolean;
    expenseApproval: boolean;
    taskAssignment: boolean;
    meetingReminder: boolean;
    eventReminder: boolean;
    securityAlert: boolean;
  };
}

const DEFAULT_SETTINGS: EmailAutomationSettings = {
  environmentMode: 'LIVE',
  testRecipientEmail: 'siamibna75@gmail.com',
  rules: {
    newMemberWelcome: true,
    expenseApproval: true,
    taskAssignment: true,
    meetingReminder: true,
    eventReminder: true,
    securityAlert: true,
  },
};

// In-memory cache for instant non-blocking lookups in email queue
let cachedSettings: EmailAutomationSettings = { ...DEFAULT_SETTINGS };

export class EmailAutomationManager {
  constructor() {
    this.refreshFromSettingsRepository();
  }

  /**
   * Sync memory cache from system_settings cache
   */
  public refreshFromSettingsRepository(): void {
    try {
      const defaultMode = (process.env.EMAIL_MODE || DEFAULT_SETTINGS.environmentMode).trim().toUpperCase();
      const mode = settingsRepository.getSync('email_environment_mode', defaultMode);
      const defaultTestEmail = process.env.RESEND_TEST_RECIPIENT || DEFAULT_SETTINGS.testRecipientEmail;
      const testEmail = settingsRepository.getSync('email_test_recipient', defaultTestEmail);
      const memberWelcome = settingsRepository.getSync('auto_member_welcome_enabled', DEFAULT_SETTINGS.rules.newMemberWelcome);
      const expenseApproval = settingsRepository.getSync('auto_expense_approval_enabled', DEFAULT_SETTINGS.rules.expenseApproval);
      const taskAssignment = settingsRepository.getSync('auto_task_assignment_enabled', DEFAULT_SETTINGS.rules.taskAssignment);
      const meetingReminder = settingsRepository.getSync('auto_meeting_reminder_enabled', DEFAULT_SETTINGS.rules.meetingReminder);
      const eventReminder = settingsRepository.getSync('auto_event_reminder_enabled', DEFAULT_SETTINGS.rules.eventReminder);
      const securityAlert = settingsRepository.getSync('auto_security_alert_enabled', DEFAULT_SETTINGS.rules.securityAlert);

      cachedSettings = {
        environmentMode: mode === 'TEST' ? 'TEST' : 'LIVE',
        testRecipientEmail: typeof testEmail === 'string' && isValidEmail(testEmail) ? testEmail : 'siamibna75@gmail.com',
        rules: {
          newMemberWelcome: Boolean(memberWelcome),
          expenseApproval: Boolean(expenseApproval),
          taskAssignment: Boolean(taskAssignment),
          meetingReminder: Boolean(meetingReminder),
          eventReminder: Boolean(eventReminder),
          securityAlert: Boolean(securityAlert),
        },
      };
    } catch {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Retrieve current email automation settings
   */
  public getSettings(): EmailAutomationSettings {
    this.refreshFromSettingsRepository();
    return { ...cachedSettings };
  }

  /**
   * Get formatted rule metadata for admin UI
   */
  public getRulesMetadata(): EmailAutomationRuleConfig[] {
    const s = this.getSettings();
    return [
      {
        key: 'newMemberWelcome',
        name: 'New Member Welcome Email',
        description: 'Automatically send an official club welcome email to new members upon registration in Member Directory.',
        enabled: s.rules.newMemberWelcome,
        category: 'MEMBERSHIP',
      },
      {
        key: 'expenseApproval',
        name: 'Expense Approval Email',
        description: 'Notify approvers upon expense claim submission, and notify claimants upon approval or rejection.',
        enabled: s.rules.expenseApproval,
        category: 'FINANCIAL',
      },
      {
        key: 'taskAssignment',
        name: 'Task Assignment Email',
        description: 'Send direct action assignments and priority instructions when a task is delegated to a team member.',
        enabled: s.rules.taskAssignment,
        category: 'TASKS',
      },
      {
        key: 'meetingReminder',
        name: 'Meeting Reminder Email',
        description: 'Dispatch calendar meeting invitations, agendas, and venue details to selected participants.',
        enabled: s.rules.meetingReminder,
        category: 'MEETINGS',
      },
      {
        key: 'eventReminder',
        name: 'Event Reminder Email',
        description: 'Deliver event announcements, logistical briefings, and reminder notices to registered members.',
        enabled: s.rules.eventReminder,
        category: 'EVENTS',
      },
      {
        key: 'securityAlert',
        name: 'Security Alert Email',
        description: 'Dispatch account status changes, password updates, and administrative security notices.',
        enabled: s.rules.securityAlert,
        category: 'SECURITY',
        isProtected: true,
      },
    ];
  }

  /**
   * Check whether a specific email job type is allowed by automation settings
   */
  public isEmailAllowed(emailType: string, relatedEntityType?: string | null): { allowed: boolean; reason?: string } {
    const s = this.getSettings();

    // 1. Member Welcome Email
    if (
      emailType === 'MEMBER_WELCOME' ||
      (emailType === 'WELCOME' && relatedEntityType === 'member')
    ) {
      if (!s.rules.newMemberWelcome) {
        return { allowed: false, reason: 'Automation disabled: New Member Welcome Email is toggled OFF by Super Admin' };
      }
    }

    // 2. Expense Approvals & Status Notifications
    if (['EXPENSE_SUBMITTED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED'].includes(emailType)) {
      if (!s.rules.expenseApproval) {
        return { allowed: false, reason: 'Automation disabled: Expense Approval Email is toggled OFF by Super Admin' };
      }
    }

    // 3. Task Assignment
    if (emailType === 'TASK_ASSIGNED') {
      if (!s.rules.taskAssignment) {
        return { allowed: false, reason: 'Automation disabled: Task Assignment Email is toggled OFF by Super Admin' };
      }
    }

    // 4. Meeting Reminders
    if (emailType === 'MEETING_INVITATION') {
      if (!s.rules.meetingReminder) {
        return { allowed: false, reason: 'Automation disabled: Meeting Reminder Email is toggled OFF by Super Admin' };
      }
    }

    // 5. Event Reminders
    if (emailType === 'EVENT_NOTIFICATION') {
      if (!s.rules.eventReminder) {
        return { allowed: false, reason: 'Automation disabled: Event Reminder Email is toggled OFF by Super Admin' };
      }
    }

    // 6. Security & Account Notices
    if (['PASSWORD_CHANGED', 'ROLE_CHANGED', 'STATUS_CHANGED', 'SECURITY_ALERT'].includes(emailType)) {
      if (!s.rules.securityAlert) {
        return { allowed: false, reason: 'Automation disabled: Security Alert Email is toggled OFF by Super Admin' };
      }
    }

    return { allowed: true };
  }

  /**
   * Update automation settings and persist to system settings
   */
  public async updateSettings(
    updates: {
      environmentMode?: 'LIVE' | 'TEST';
      testRecipientEmail?: string;
      rules?: Partial<EmailAutomationSettings['rules']>;
    },
    updatedBy?: string
  ): Promise<EmailAutomationSettings> {
    const payloadToPersist: Record<string, any> = {};

    if (updates.environmentMode && ['LIVE', 'TEST'].includes(updates.environmentMode)) {
      payloadToPersist.email_environment_mode = updates.environmentMode;
      cachedSettings.environmentMode = updates.environmentMode;
    }

    if (updates.testRecipientEmail !== undefined) {
      const email = updates.testRecipientEmail.trim();
      if (!isValidEmail(email)) {
        throw new Error(`Invalid test recipient email address: "${updates.testRecipientEmail}"`);
      }
      payloadToPersist.email_test_recipient = email;
      cachedSettings.testRecipientEmail = email;
    }

    if (updates.rules) {
      if (updates.rules.newMemberWelcome !== undefined) {
        payloadToPersist.auto_member_welcome_enabled = Boolean(updates.rules.newMemberWelcome);
        cachedSettings.rules.newMemberWelcome = Boolean(updates.rules.newMemberWelcome);
      }
      if (updates.rules.expenseApproval !== undefined) {
        payloadToPersist.auto_expense_approval_enabled = Boolean(updates.rules.expenseApproval);
        cachedSettings.rules.expenseApproval = Boolean(updates.rules.expenseApproval);
      }
      if (updates.rules.taskAssignment !== undefined) {
        payloadToPersist.auto_task_assignment_enabled = Boolean(updates.rules.taskAssignment);
        cachedSettings.rules.taskAssignment = Boolean(updates.rules.taskAssignment);
      }
      if (updates.rules.meetingReminder !== undefined) {
        payloadToPersist.auto_meeting_reminder_enabled = Boolean(updates.rules.meetingReminder);
        cachedSettings.rules.meetingReminder = Boolean(updates.rules.meetingReminder);
      }
      if (updates.rules.eventReminder !== undefined) {
        payloadToPersist.auto_event_reminder_enabled = Boolean(updates.rules.eventReminder);
        cachedSettings.rules.eventReminder = Boolean(updates.rules.eventReminder);
      }
      if (updates.rules.securityAlert !== undefined) {
        payloadToPersist.auto_security_alert_enabled = Boolean(updates.rules.securityAlert);
        cachedSettings.rules.securityAlert = Boolean(updates.rules.securityAlert);
      }
    }

    if (Object.keys(payloadToPersist).length > 0) {
      await settingsRepository.updateSettings(payloadToPersist, updatedBy);
    }

    return this.getSettings();
  }
}

export const emailAutomationManager = new EmailAutomationManager();
