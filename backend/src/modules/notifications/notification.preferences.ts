import { NotificationPreference } from '../../types/governance.types';

export type NotificationCategory =
  | 'EVENTS'
  | 'MEETINGS'
  | 'TASKS'
  | 'GENERAL_ANNOUNCEMENTS'
  | 'REMINDERS'
  | 'OPTIONAL_FINANCIAL_UPDATES'
  | 'SECURITY';

export const CRITICAL_NOTIFICATION_TYPES = [
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'SECURITY_ALERT',
  'ACCOUNT_SECURITY_EVENT',
  'CRITICAL_ACCOUNT_NOTIFICATION',
  'SYSTEM_CRITICAL_ALERT',
  'SECURITY',
] as const;

export const DEFAULT_NOTIFICATION_PREFERENCES = (userId: string): NotificationPreference => ({
  user_id: userId,
  in_app_enabled: true,
  email_enabled: true,
  events_in_app: true,
  events_email: true,
  meetings_in_app: true,
  meetings_email: true,
  tasks_in_app: true,
  tasks_email: true,
  announcements_in_app: true,
  announcements_email: true,
  reminders_in_app: true,
  reminders_email: true,
  financial_in_app: true,
  financial_email: true,
  security_alerts: true,
  task_reminders_enabled: true,
  meeting_reminders_enabled: true,
  financial_alerts_enabled: true,
  updated_at: new Date().toISOString(),
});

export class NotificationPreferencesManager {
  /**
   * Section 5: Checks if a notification is a protected critical security alert.
   * Critical security alerts CANNOT be disabled under any circumstances.
   */
  isCriticalNotification(type?: string, category?: string): boolean {
    const t = (type || '').toUpperCase();
    const c = (category || '').toUpperCase();
    return (
      CRITICAL_NOTIFICATION_TYPES.some((crit) => t.includes(crit) || c.includes(crit)) ||
      t === 'PASSWORD_RESET' ||
      t === 'PASSWORD_CHANGED' ||
      t === 'SECURITY_ALERT' ||
      c === 'SECURITY'
    );
  }

  /**
   * Normalizes incoming category strings to canonical categories
   */
  normalizeCategory(category?: string, type?: string): NotificationCategory {
    const raw = (category || type || 'GENERAL').toUpperCase();
    if (raw.includes('EVENT')) return 'EVENTS';
    if (raw.includes('MEET')) return 'MEETINGS';
    if (raw.includes('TASK')) return 'TASKS';
    if (raw.includes('REMIND')) return 'REMINDERS';
    if (raw.includes('FINANC') || raw.includes('EXPENSE') || raw.includes('INCOME') || raw.includes('DUE') || raw.includes('PAYMENT')) {
      return 'OPTIONAL_FINANCIAL_UPDATES';
    }
    if (raw.includes('SECURITY') || raw.includes('PASSWORD') || raw.includes('ALERT')) {
      return 'SECURITY';
    }
    return 'GENERAL_ANNOUNCEMENTS';
  }

  /**
   * Section 4 & 5: Determine if in-app notification can be delivered
   */
  canDeliverInApp(prefs: NotificationPreference, category?: string, type?: string): boolean {
    // 1. Critical security alerts ALWAYS delivered
    if (this.isCriticalNotification(type, category)) {
      return true;
    }

    // 2. Global in-app master toggle
    if (prefs.in_app_enabled === false) {
      return false;
    }

    // 3. Category level toggle
    const cat = this.normalizeCategory(category, type);
    switch (cat) {
      case 'EVENTS':
        return prefs.events_in_app !== false;
      case 'MEETINGS':
        return prefs.meetings_in_app !== false && prefs.meeting_reminders_enabled !== false;
      case 'TASKS':
        return prefs.tasks_in_app !== false && prefs.task_reminders_enabled !== false;
      case 'REMINDERS':
        return prefs.reminders_in_app !== false;
      case 'OPTIONAL_FINANCIAL_UPDATES':
        return prefs.financial_in_app !== false && prefs.financial_alerts_enabled !== false;
      case 'GENERAL_ANNOUNCEMENTS':
      default:
        return prefs.announcements_in_app !== false;
    }
  }

  /**
   * Section 4 & 5: Determine if email notification can be delivered
   */
  canDeliverEmail(prefs: NotificationPreference, category?: string, type?: string): boolean {
    // 1. Critical security alerts ALWAYS delivered
    if (this.isCriticalNotification(type, category)) {
      return true;
    }

    // 2. Global email master toggle
    if (prefs.email_enabled === false) {
      return false;
    }

    // 3. Category level toggle
    const cat = this.normalizeCategory(category, type);
    switch (cat) {
      case 'EVENTS':
        return prefs.events_email !== false;
      case 'MEETINGS':
        return prefs.meetings_email !== false;
      case 'TASKS':
        return prefs.tasks_email !== false;
      case 'REMINDERS':
        return prefs.reminders_email !== false;
      case 'OPTIONAL_FINANCIAL_UPDATES':
        return prefs.financial_email !== false;
      case 'GENERAL_ANNOUNCEMENTS':
      default:
        return prefs.announcements_email !== false;
    }
  }
}

export const notificationPreferencesManager = new NotificationPreferencesManager();
