/**
 * DIU Investment Club - Dynamic Email Automation Settings & 17 Standard Rules Manager
 *
 * Implements:
 * - Dynamic rule enablement/disablement for Super Admin without code changes
 * - Full database persistence for 17 standard automation rules in Supabase
 * - In-memory cache for instant zero-latency lookups in email queue
 * - Environment mode management (LIVE vs TEST)
 */

import { settingsRepository } from '../settings/settings.repository';
import { isValidEmail } from './email.security';
import { getDbAdmin, isSupabaseConfigured } from '../../config/supabase';

export interface EmailAutomationRuleEntity {
  id: string;
  rule_key: string;
  name: string;
  description: string;
  trigger_event: string;
  recipient_logic: string;
  template_key: string;
  category: 'MEMBERSHIP' | 'FINANCIAL' | 'TASKS' | 'MEETINGS' | 'EVENTS' | 'SECURITY';
  enabled: boolean;
  is_protected: boolean;
  updated_at: string;
  updated_by?: string;
}

export interface EmailAutomationSettings {
  environmentMode: 'LIVE' | 'TEST';
  testRecipientEmail: string;
  rules: Record<string, boolean>;
}

const DEFAULT_SETTINGS: EmailAutomationSettings = {
  environmentMode: 'LIVE',
  testRecipientEmail: 'siamibna75@gmail.com',
  rules: {
    new_member_welcome: true,
    system_user_welcome: true,
    account_invitation: true,
    member_payment_confirmation: false,
    payment_verification: false,
    payment_rejection: true,
    expense_approval_request: true,
    expense_approved: true,
    expense_rejected: true,
    task_assignment: true,
    task_reminder: true,
    meeting_scheduled: true,
    meeting_reminder: true,
    event_announcement: true,
    event_reminder: true,
    password_reset: true,
    security_alert: true,
  },
};

export class EmailAutomationManager {
  private inMemoryRules: Map<string, EmailAutomationRuleEntity> = new Map();
  private environmentMode: 'LIVE' | 'TEST' = 'LIVE';
  private testRecipientEmail: string = 'siamibna75@gmail.com';
  private lastRefreshedAt: number = 0;

  constructor() {
    this.refreshSettingsSync();
    this.refreshRulesFromDb().catch(() => {});
  }

  /**
   * Synchronous refresh of general environment settings
   */
  public refreshSettingsSync(): void {
    try {
      const defaultMode = (process.env.EMAIL_MODE || DEFAULT_SETTINGS.environmentMode).trim().toUpperCase();
      const mode = settingsRepository.getSync('email_environment_mode', defaultMode);
      const defaultTestEmail = process.env.RESEND_TEST_RECIPIENT || DEFAULT_SETTINGS.testRecipientEmail;
      const testEmail = settingsRepository.getSync('email_test_recipient', defaultTestEmail);

      this.environmentMode = mode === 'TEST' ? 'TEST' : 'LIVE';
      this.testRecipientEmail =
        typeof testEmail === 'string' && isValidEmail(testEmail) ? testEmail : DEFAULT_SETTINGS.testRecipientEmail;
    } catch {
      this.environmentMode = 'LIVE';
      this.testRecipientEmail = DEFAULT_SETTINGS.testRecipientEmail;
    }
  }

  /**
   * Asynchronous database sync for 17 rules
   */
  public async refreshRulesFromDb(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await getDbAdmin()
        .from('email_automation_rules')
        .select('*')
        .order('category', { ascending: true });

      if (!error && data && data.length > 0) {
        for (const item of data) {
          this.inMemoryRules.set(item.rule_key, item as EmailAutomationRuleEntity);
        }
        this.lastRefreshedAt = Date.now();
      }
    } catch (err) {
      console.warn('⚠️ [EmailAutomationManager] Failed to refresh rules from DB:', (err as any)?.message);
    }
  }

  /**
   * Retrieve all 17 rules for Admin UI
   */
  public async getAllRules(): Promise<EmailAutomationRuleEntity[]> {
    if (Date.now() - this.lastRefreshedAt > 30000 || this.inMemoryRules.size === 0) {
      await this.refreshRulesFromDb();
    }
    return Array.from(this.inMemoryRules.values());
  }

  /**
   * Get formatted rule metadata for admin UI (sync compatibility)
   */
  public getRulesMetadata(): Array<{
    key: string;
    name: string;
    description: string;
    enabled: boolean;
    category: string;
    isProtected?: boolean;
  }> {
    return Array.from(this.inMemoryRules.values()).map((r) => ({
      key: r.rule_key,
      name: r.name,
      description: r.description,
      enabled: r.enabled,
      category: r.category,
      isProtected: r.is_protected,
    }));
  }

  /**
   * Toggle a specific rule on or off
   */
  public async toggleRule(ruleKey: string, enabled: boolean, updatedBy?: string): Promise<EmailAutomationRuleEntity | null> {
    const existing = this.inMemoryRules.get(ruleKey);
    if (existing?.is_protected && !enabled) {
      throw new Error(`Rule "${existing.name}" is protected for security and cannot be disabled.`);
    }

    const nowIso = new Date().toISOString();

    if (existing) {
      existing.enabled = enabled;
      existing.updated_at = nowIso;
      if (updatedBy) existing.updated_by = updatedBy;
      this.inMemoryRules.set(ruleKey, existing);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('email_automation_rules')
          .update({
            enabled,
            updated_at: nowIso,
            updated_by: updatedBy || null,
          })
          .eq('rule_key', ruleKey)
          .select()
          .single();

        if (!error && data) {
          const rule = data as EmailAutomationRuleEntity;
          this.inMemoryRules.set(ruleKey, rule);
          return rule;
        }
      } catch (err) {
        console.warn(`⚠️ [EmailAutomationManager] Failed to update rule ${ruleKey} in DB:`, (err as any)?.message);
      }
    }

    return existing || null;
  }

  /**
   * Retrieve general settings object
   */
  public getSettings(): EmailAutomationSettings {
    this.refreshSettingsSync();
    const rulesObj: Record<string, boolean> = {};
    for (const [key, rule] of this.inMemoryRules.entries()) {
      rulesObj[key] = rule.enabled;
    }
    return {
      environmentMode: this.environmentMode,
      testRecipientEmail: this.testRecipientEmail,
      rules: { ...DEFAULT_SETTINGS.rules, ...rulesObj },
    };
  }

  /**
   * Update general environment settings
   */
  public async updateSettings(
    updates: {
      environmentMode?: 'LIVE' | 'TEST';
      testRecipientEmail?: string;
      rules?: Record<string, boolean>;
    },
    updatedBy?: string
  ): Promise<EmailAutomationSettings> {
    const payloadToPersist: Record<string, any> = {};

    if (updates.environmentMode && ['LIVE', 'TEST'].includes(updates.environmentMode)) {
      payloadToPersist.email_environment_mode = updates.environmentMode;
      this.environmentMode = updates.environmentMode;
    }

    if (updates.testRecipientEmail !== undefined) {
      const email = updates.testRecipientEmail.trim();
      if (!isValidEmail(email)) {
        throw new Error(`Invalid test recipient email address: "${updates.testRecipientEmail}"`);
      }
      payloadToPersist.email_test_recipient = email;
      this.testRecipientEmail = email;
    }

    if (Object.keys(payloadToPersist).length > 0) {
      await settingsRepository.updateSettings(payloadToPersist, updatedBy);
    }

    if (updates.rules) {
      for (const [key, enabled] of Object.entries(updates.rules)) {
        await this.toggleRule(key, Boolean(enabled), updatedBy).catch(() => {});
      }
    }

    return this.getSettings();
  }

  /**
   * Check whether a specific email job type is allowed by automation rules
   */
  public isEmailAllowed(emailType: string, relatedEntityType?: string | null): { allowed: boolean; reason?: string } {
    const typeUpper = (emailType || '').toUpperCase();

    // Map emailType to corresponding rule_key
    let mappedRuleKey: string | null = null;

    if (typeUpper === 'MEMBER_WELCOME' || (typeUpper === 'WELCOME' && relatedEntityType === 'member')) {
      mappedRuleKey = 'new_member_welcome';
    } else if (typeUpper === 'USER_WELCOME' || (typeUpper === 'WELCOME' && relatedEntityType !== 'member')) {
      mappedRuleKey = 'system_user_welcome';
    } else if (typeUpper === 'USER_INVITED' || typeUpper === 'ACCOUNT_INVITATION') {
      mappedRuleKey = 'account_invitation';
    } else if (typeUpper === 'PAYMENT_CONFIRMATION' || typeUpper === 'PAYMENT_SUBMITTED') {
      mappedRuleKey = 'member_payment_confirmation';
    } else if (typeUpper === 'PAYMENT_VERIFIED' || typeUpper === 'PAYMENT_CONFIRMED') {
      mappedRuleKey = 'payment_verification';
    } else if (typeUpper === 'PAYMENT_REJECTED') {
      mappedRuleKey = 'payment_rejection';
    } else if (typeUpper === 'EXPENSE_SUBMITTED') {
      mappedRuleKey = 'expense_approval_request';
    } else if (typeUpper === 'EXPENSE_APPROVED') {
      mappedRuleKey = 'expense_approved';
    } else if (typeUpper === 'EXPENSE_REJECTED') {
      mappedRuleKey = 'expense_rejected';
    } else if (typeUpper === 'TASK_ASSIGNED') {
      mappedRuleKey = 'task_assignment';
    } else if (typeUpper === 'TASK_REMINDER') {
      mappedRuleKey = 'task_reminder';
    } else if (typeUpper === 'MEETING_INVITATION' || typeUpper === 'MEETING_SCHEDULED') {
      mappedRuleKey = 'meeting_scheduled';
    } else if (typeUpper === 'MEETING_REMINDER') {
      mappedRuleKey = 'meeting_reminder';
    } else if (typeUpper === 'EVENT_NOTIFICATION' || typeUpper === 'EVENT_CREATED') {
      mappedRuleKey = 'event_announcement';
    } else if (typeUpper === 'EVENT_REMINDER') {
      mappedRuleKey = 'event_reminder';
    } else if (typeUpper === 'PASSWORD_RESET' || typeUpper === 'PASSWORD_RESET_REQUESTED') {
      mappedRuleKey = 'password_reset';
    } else if (['PASSWORD_CHANGED', 'ROLE_CHANGED', 'STATUS_CHANGED', 'SECURITY_ALERT'].includes(typeUpper)) {
      mappedRuleKey = 'security_alert';
    }

    if (mappedRuleKey) {
      const rule = this.inMemoryRules.get(mappedRuleKey);
      if (rule && !rule.enabled) {
        return {
          allowed: false,
          reason: `Email automation rule "${rule.name}" is toggled OFF in Communication Center`,
        };
      }
    }

    return { allowed: true };
  }
}

export const emailAutomationManager = new EmailAutomationManager();
