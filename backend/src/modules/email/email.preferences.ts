/**
 * DIU Investment Club - Email Preferences & Notification Channels Foundation
 *
 * Enforces security constraints:
 * - Critical security emails (password reset, account verification, security alerts) CANNOT be unsubscribed.
 * - Optional transactional notices (events, reminders, general financial updates) can be toggled.
 */

export type EmailCategory = 'SECURITY' | 'FINANCIAL' | 'EVENTS' | 'REMINDERS' | 'GENERAL';

export interface UserEmailPreferences {
  userId: string;
  financialNotifications: boolean;
  eventNotifications: boolean;
  reminderNotifications: boolean;
  marketingAnnouncements: boolean;
  // Security notifications are immutable and always TRUE
  readonly securityAlerts: true;
}

export const DEFAULT_EMAIL_PREFERENCES: Omit<UserEmailPreferences, 'userId'> = {
  financialNotifications: true,
  eventNotifications: true,
  reminderNotifications: true,
  marketingAnnouncements: true,
  securityAlerts: true,
};

// In-memory store for user notification preferences (keyed by userId)
const preferencesStore = new Map<string, UserEmailPreferences>();

export class EmailPreferencesManager {
  /**
   * Retrieve email preferences for a specific user, returning defaults if not yet set.
   */
  getPreferences(userId: string): UserEmailPreferences {
    if (!userId) {
      return { userId: 'anonymous', ...DEFAULT_EMAIL_PREFERENCES, securityAlerts: true };
    }
    const existing = preferencesStore.get(userId);
    if (existing) {
      return existing;
    }
    const initial: UserEmailPreferences = {
      userId,
      ...DEFAULT_EMAIL_PREFERENCES,
      securityAlerts: true,
    };
    preferencesStore.set(userId, initial);
    return initial;
  }

  /**
   * Update non-critical email preferences for a specific user.
   * Critical security alerts are strictly immutable and cannot be toggled.
   */
  updatePreferences(userId: string, updates: Partial<UserEmailPreferences>): UserEmailPreferences {
    const current = this.getPreferences(userId);
    const updated: UserEmailPreferences = {
      ...current,
      ...updates,
      userId,
      // Security notifications are strictly immutable and cannot be disabled
      securityAlerts: true,
    };
    preferencesStore.set(userId, updated);
    return updated;
  }

  /**
   * Determine if an email category can be legally/safely delivered to the user.
   */
  canDeliver(category: EmailCategory, prefs?: Partial<UserEmailPreferences>): boolean {
    // 1. Mandatory security emails are ALWAYS delivered
    if (category === 'SECURITY') {
      return true;
    }

    if (!prefs) {
      return true; // Default to opted-in for official transactional club communications
    }

    switch (category) {
      case 'FINANCIAL':
        return prefs.financialNotifications !== false;
      case 'EVENTS':
        return prefs.eventNotifications !== false;
      case 'REMINDERS':
        return prefs.reminderNotifications !== false;
      case 'GENERAL':
        return prefs.marketingAnnouncements !== false;
      default:
        return true;
    }
  }
}

export const emailPreferencesManager = new EmailPreferencesManager();
