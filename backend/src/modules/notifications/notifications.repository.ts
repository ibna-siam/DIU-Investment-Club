import crypto from 'crypto';
import { getDbAdmin, isSupabaseConfigured } from '../../config/supabase';
import { NotificationItem, NotificationPreference, NotificationStatus, NotificationRuleItem } from '../../types/governance.types';
import {
  notificationPreferencesManager,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notification.preferences';
import { emailQueue } from '../email/email.queue';
import { EMAIL_BRAND } from '../email/email.brand';
import { rolesRepository } from '../roles/roles.repository';
import { usersRepository } from '../users/users.repository';

export interface DispatchNotificationPayload {
  user_id?: string;
  userId?: string;
  recipientEmail?: string;
  recipientName?: string;
  title: string;
  message: string;
  type?: string;
  category?: 'FINANCIAL' | 'APPROVAL' | 'MEETING' | 'TASK' | 'EVENT' | 'DOCUMENT' | 'SYSTEM' | 'SECURITY' | 'REMINDERS' | 'GENERAL' | string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL' | string;
  link?: string;
  actionUrl?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  idempotency_key?: string;
  deduplicateHours?: number;
  skipEmail?: boolean;
  metadata?: Record<string, any>;
}

export class NotificationsRepository {
  // Dual persistence in-memory cache
  private inMemoryNotifications: Map<string, NotificationItem> = new Map();
  private inMemoryPreferences: Map<string, NotificationPreference> = new Map();

  private canUseDb(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Section 7 & 10: Retrieve notifications with status filters (UNREAD, READ, ARCHIVED, ALL)
   */
  async getUserNotifications(
    userId: string,
    params?: {
      status?: 'UNREAD' | 'READ' | 'ARCHIVED' | 'ALL';
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<NotificationItem[]> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    const targetStatus = params?.status || 'ALL';
    const prefs = await this.getPreferences(userId);

    const combinedMap = new Map<string, NotificationItem>();

    // 1. Fetch from Supabase if available
    if (this.canUseDb()) {
      try {
        let query = getDbAdmin()
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit * 2);

        if (params?.category && params.category !== 'ALL') {
          query = query.eq('category', params.category);
        }

        const { data, error } = await query;
        if (!error && data) {
          for (const item of data) {
            const mapped: NotificationItem = {
              ...item,
              status: (item.status as NotificationStatus) || (item.is_read ? 'READ' : 'UNREAD'),
            };
            combinedMap.set(mapped.id, mapped);
          }
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] DB fetch failed, using memory:', (err as any)?.message);
      }
    }

    // 2. Merge with in-memory store
    for (const item of this.inMemoryNotifications.values()) {
      if (item.user_id === userId) {
        combinedMap.set(item.id, item);
      }
    }

    let items = Array.from(combinedMap.values());

    // 3. Status filter
    if (targetStatus === 'UNREAD') {
      items = items.filter((item) => !item.is_read && item.status !== 'ARCHIVED');
    } else if (targetStatus === 'READ') {
      items = items.filter((item) => item.is_read && item.status !== 'ARCHIVED');
    } else if (targetStatus === 'ARCHIVED') {
      items = items.filter((item) => item.status === 'ARCHIVED');
    } else {
      // 'ALL' represents the default active feed; archived notifications are excluded
      items = items.filter((item) => item.status !== 'ARCHIVED');
    }

    // 4. Category filter
    if (params?.category && params.category !== 'ALL') {
      items = items.filter(
        (item) => item.category === params.category || item.type === params.category
      );
    }

    // 5. Section 4 & 5: Preference filtering
    items = items.filter((item) =>
      notificationPreferencesManager.canDeliverInApp(prefs, item.category, item.type)
    );

    // 6. Sort newest first
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return items.slice(offset, offset + limit);
  }

  /**
   * Section 11: Accurate real unread count using fast DB indexed count query
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (this.canUseDb()) {
      try {
        const { count, error } = await getDbAdmin()
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (!error && typeof count === 'number') {
          return count;
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] DB getUnreadCount failed:', (err as any)?.message);
      }
    }
    const unread = await this.getUserNotifications(userId, { status: 'UNREAD', limit: 200 });
    return unread.length;
  }

  /**
   * Section 7: Mark single notification as READ permanently in database and memory
   */
  async markAsRead(id: string, userId: string): Promise<NotificationItem | null> {
    const nowIso = new Date().toISOString();

    // 1. Update in-memory
    const existing = this.inMemoryNotifications.get(id);
    let updated: NotificationItem;
    if (existing) {
      updated = {
        ...existing,
        is_read: true,
        status: 'READ',
        read_at: nowIso,
      };
      this.inMemoryNotifications.set(id, updated);
    } else {
      updated = {
        id,
        user_id: userId,
        title: '',
        message: '',
        type: 'INFO',
        category: 'SYSTEM',
        priority: 'NORMAL',
        is_read: true,
        status: 'READ',
        read_at: nowIso,
        created_at: nowIso,
      };
      this.inMemoryNotifications.set(id, updated);
    }

    // 2. Persist permanently to Supabase DB
    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('notifications')
          .update({
            is_read: true,
            status: 'READ',
            read_at: nowIso,
          })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (!error && data) {
          const merged: NotificationItem = {
            ...updated,
            ...data,
            status: 'READ',
            is_read: true,
          };
          this.inMemoryNotifications.set(id, merged);
          return merged;
        } else if (error) {
          console.warn('⚠️ [NotificationsRepository] DB markAsRead error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] DB markAsRead failed:', (err as any)?.message);
      }
    }

    return updated;
  }

  /**
   * Section 7: Mark all unread notifications as READ permanently
   */
  async markAllAsRead(userId: string): Promise<number> {
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    // 1. Update in-memory
    for (const [id, item] of this.inMemoryNotifications.entries()) {
      if (item.user_id === userId && !item.is_read && item.status !== 'ARCHIVED') {
        this.inMemoryNotifications.set(id, {
          ...item,
          is_read: true,
          status: 'READ',
          read_at: nowIso,
        });
        updatedCount++;
      }
    }

    // 2. Update DB
    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('notifications')
          .update({
            is_read: true,
            status: 'READ',
            read_at: nowIso,
          })
          .eq('user_id', userId)
          .eq('is_read', false)
          .select('id');

        if (!error && data) {
          updatedCount = Math.max(updatedCount, data.length);
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] DB markAllAsRead failed:', (err as any)?.message);
      }
    }

    return updatedCount;
  }

  /**
   * Section 7: Archive a notification
   */
  async archiveNotification(id: string, userId: string): Promise<NotificationItem | null> {
    const nowIso = new Date().toISOString();

    const existing = this.inMemoryNotifications.get(id);
    let updated: NotificationItem;
    if (existing) {
      updated = {
        ...existing,
        status: 'ARCHIVED',
        archived_at: nowIso,
      };
      this.inMemoryNotifications.set(id, updated);
    } else {
      updated = {
        id,
        user_id: userId,
        title: '',
        message: '',
        type: 'INFO',
        category: 'SYSTEM',
        priority: 'NORMAL',
        is_read: true,
        status: 'ARCHIVED',
        archived_at: nowIso,
        created_at: nowIso,
      };
      this.inMemoryNotifications.set(id, updated);
    }

    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('notifications')
          .update({
            status: 'ARCHIVED',
            archived_at: nowIso,
          })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (!error && data) {
          const merged: NotificationItem = {
            ...updated,
            ...data,
            status: 'ARCHIVED',
          };
          this.inMemoryNotifications.set(id, merged);
          return merged;
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] DB archiveNotification failed:', (err as any)?.message);
      }
    }

    return updated;
  }

  /**
   * Section 7: Archive all READ notifications
   */
  async archiveAllRead(userId: string): Promise<number> {
    const nowIso = new Date().toISOString();
    let archivedCount = 0;

    for (const [id, item] of this.inMemoryNotifications.entries()) {
      if (item.user_id === userId && item.is_read && item.status !== 'ARCHIVED') {
        this.inMemoryNotifications.set(id, {
          ...item,
          status: 'ARCHIVED',
          archived_at: nowIso,
        });
        archivedCount++;
      }
    }

    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('notifications')
          .update({
            status: 'ARCHIVED',
            archived_at: nowIso,
          })
          .eq('user_id', userId)
          .eq('is_read', true)
          .select('id');

        if (!error && data) {
          archivedCount = Math.max(archivedCount, data.length);
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] DB archiveAllRead failed:', (err as any)?.message);
      }
    }

    return archivedCount;
  }

  /**
   * Section 4 & 5: Retrieve user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    // 1. Check in-memory
    const mem = this.inMemoryPreferences.get(userId);
    if (mem) {
      return mem;
    }

    // 2. Check DB
    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          const loaded: NotificationPreference = {
            ...DEFAULT_NOTIFICATION_PREFERENCES(userId),
            ...data,
            security_alerts: true,
          };
          this.inMemoryPreferences.set(userId, loaded);
          return loaded;
        }
      } catch (err) {
        // Fallback to defaults
      }
    }

    const defaultPrefs = DEFAULT_NOTIFICATION_PREFERENCES(userId);
    this.inMemoryPreferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  /**
   * Section 4 & 5: Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    payload: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const existing = await this.getPreferences(userId);
    const updated: NotificationPreference = {
      ...existing,
      ...payload,
      user_id: userId,
      security_alerts: true, // Section 5: immutable critical security alerts
      updated_at: new Date().toISOString(),
    };

    // Save in-memory
    this.inMemoryPreferences.set(userId, updated);

    // Save in DB
    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('notification_preferences')
          .upsert(
            {
              user_id: userId,
              in_app_enabled: updated.in_app_enabled,
              email_enabled: updated.email_enabled,
              events_in_app: updated.events_in_app,
              events_email: updated.events_email,
              meetings_in_app: updated.meetings_in_app,
              meetings_email: updated.meetings_email,
              tasks_in_app: updated.tasks_in_app,
              tasks_email: updated.tasks_email,
              announcements_in_app: updated.announcements_in_app,
              announcements_email: updated.announcements_email,
              reminders_in_app: updated.reminders_in_app,
              reminders_email: updated.reminders_email,
              financial_in_app: updated.financial_in_app,
              financial_email: updated.financial_email,
              task_reminders_enabled: updated.tasks_in_app,
              meeting_reminders_enabled: updated.meetings_in_app,
              financial_alerts_enabled: updated.financial_in_app,
              updated_at: updated.updated_at,
            },
            { onConflict: 'user_id' }
          )
          .select()
          .single();

        if (!error && data) {
          const merged: NotificationPreference = {
            ...updated,
            ...data,
            security_alerts: true,
          };
          this.inMemoryPreferences.set(userId, merged);
          return merged;
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] DB updatePreferences failed:', (err as any)?.message);
      }
    }

    return updated;
  }

  private inMemoryUserRoles: Map<string, string[]> = new Map();

  setUserRolesForTest(userId: string, roleSlugs: string[]): void {
    this.inMemoryUserRoles.set(userId, roleSlugs);
  }

  /**
   * Section 12 & 13: RBAC Recipient Authorization Validation
   */
  async checkRecipientAuthorization(
    userId: string,
    category?: string,
    type?: string
  ): Promise<{ authorized: boolean; reason?: string }> {
    const cat = (category || type || '').toUpperCase();

    // Critical security alerts are always authorized for the affected user
    if (notificationPreferencesManager.isCriticalNotification(type, category)) {
      return { authorized: true };
    }

    try {
      const memRoles = this.inMemoryUserRoles.get(userId);
      let roleSlugs = memRoles || [];
      if (!memRoles && this.canUseDb()) {
        const { data: userRoles } = await getDbAdmin()
          .from('user_roles')
          .select('role:roles(name)')
          .eq('user_id', userId);
        if (userRoles) {
          roleSlugs = userRoles.map((ur: any) =>
            (ur.role?.name || '').toUpperCase().replace(/[\s-]+/g, '_')
          );
          this.inMemoryUserRoles.set(userId, roleSlugs);
        }
      }

      // Personal member notices (own receipts, personal expense status) do not require administrative approval rights
      const isPersonalNotice = ['PAYMENT_CONFIRMED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'PAYMENT_RECEIPT', 'MEMBERSHIP', 'INFO'].includes(type || '') || cat === 'GENERAL';

      // Administrative financial approval notifications require financial management access
      if (
        !isPersonalNotice &&
        (cat.includes('APPROVAL') || cat.includes('PAYMENT_APPROVAL') || cat === 'EXPENSE_SUBMITTED')
      ) {
        const hasFinancialAccess = roleSlugs.some((s) =>
          ['SUPER_ADMIN', 'ADMIN', 'TREASURER', 'PRESIDENT', 'VICE_PRESIDENT'].includes(s)
        );
        if (!hasFinancialAccess) {
          return {
            authorized: false,
            reason: `User ${userId} lacks financial permissions for restricted notification category ${cat}`,
          };
        }
      }

      // Administrative system alerts require Admin access
      if (cat === 'ADMIN_ALERT' || cat === 'SYSTEM_AUDIT') {
        const hasAdminAccess = roleSlugs.some((s) => ['SUPER_ADMIN', 'ADMIN'].includes(s));
        if (!hasAdminAccess) {
          return {
            authorized: false,
            reason: `User ${userId} lacks administrative access for category ${cat}`,
          };
        }
      }
    } catch (err) {
      // If roles lookup fails, allow non-restricted or fallback
    }

    return { authorized: true };
  }

  /**
   * Section 2, 6, 8 & 14: Centralized Notification Dispatch Pipeline
   */
  async dispatchNotification(payload: DispatchNotificationPayload): Promise<NotificationItem | null> {
    const targetUserId = payload.user_id || payload.userId;
    if (!targetUserId) {
      console.warn('[dispatchNotification] No recipient user_id provided, aborting dispatch');
      return null;
    }

    const type = payload.type || 'INFO';
    const category = payload.category || 'GENERAL';
    const priority = (payload.priority || 'NORMAL').toUpperCase() as any;
    const isCritical = notificationPreferencesManager.isCriticalNotification(type, category);

    // 1. Section 12: RBAC check
    const rbacCheck = await this.checkRecipientAuthorization(targetUserId, category, type);
    if (!rbacCheck.authorized) {
      console.warn(`🛑 [NotificationsRepository] Dispatch blocked by RBAC: ${rbacCheck.reason}`);
      return null;
    }

    // 2. Section 4 & 5: Preference Check
    const prefs = await this.getPreferences(targetUserId);
    const allowInApp = notificationPreferencesManager.canDeliverInApp(prefs, category, type);
    const allowEmail = !payload.skipEmail && notificationPreferencesManager.canDeliverEmail(prefs, category, type);

    if (!allowInApp && !allowEmail) {
      console.log(`ℹ️ [NotificationsRepository] Recipient ${targetUserId} opted out of both In-App & Email for category ${category}. Suppressing.`);
      return null;
    }

    // 3. Section 8: Deterministic Idempotency Key & Duplicate Prevention
    const entityType = payload.related_entity_type || 'SYSTEM';
    const entityId = payload.related_entity_id || 'NONE';
    const idempotencyKey =
      payload.idempotency_key ||
      `${type}:${entityType}:${entityId}:${targetUserId}`;

    // Deduplication window (default 24h)
    const windowHours = payload.deduplicateHours !== undefined ? payload.deduplicateHours : 24;
    const windowDate = new Date(Date.now() - windowHours * 3600000).toISOString();

    // Check duplicate in-memory
    for (const existing of this.inMemoryNotifications.values()) {
      if (
        existing.user_id === targetUserId &&
        existing.idempotency_key === idempotencyKey &&
        existing.created_at >= windowDate
      ) {
        console.log(`🛑 [NotificationsRepository] Duplicate notification blocked (Key: ${idempotencyKey}). Status: ${existing.status}`);
        return existing;
      }
    }

    // Check duplicate in DB if available
    if (this.canUseDb()) {
      try {
        let dedupQuery = getDbAdmin()
          .from('notifications')
          .select('*')
          .eq('user_id', targetUserId)
          .gte('created_at', windowDate);

        if (payload.idempotency_key) {
          dedupQuery = dedupQuery.eq('idempotency_key', payload.idempotency_key);
        } else if (payload.related_entity_type && payload.related_entity_id) {
          dedupQuery = dedupQuery
            .eq('related_entity_type', payload.related_entity_type)
            .eq('related_entity_id', payload.related_entity_id);
        } else {
          dedupQuery = dedupQuery.eq('title', payload.title);
        }

        const { data: existingDb } = await dedupQuery.limit(1);
        if (existingDb && existingDb.length > 0) {
          const match = existingDb[0];
          console.log(`🛑 [NotificationsRepository] DB duplicate blocked for user ${targetUserId} (ID: ${match.id})`);
          return match as NotificationItem;
        }
      } catch (err) {
        // Continue if DB check fails
      }
    }

    // 4. Section 3: Channel Selection & Delivery
    let createdItem: NotificationItem | null = null;
    const nowIso = new Date().toISOString();
    const notificationId = crypto.randomUUID();

    // Channel A: In-App Notification
    if (allowInApp) {
      const inAppItem: NotificationItem = {
        id: notificationId,
        user_id: targetUserId,
        title: payload.title,
        message: payload.message,
        type,
        category: category as any,
        priority,
        status: 'UNREAD',
        channel: allowEmail ? 'BOTH' : 'IN_APP',
        idempotency_key: idempotencyKey,
        link: payload.link || payload.actionUrl || undefined,
        related_entity_type: payload.related_entity_type || null,
        related_entity_id: payload.related_entity_id || null,
        is_read: false,
        read_at: null,
        archived_at: null,
        metadata: payload.metadata || {},
        created_at: nowIso,
      };

      createdItem = inAppItem;

      // Store in memory
      this.inMemoryNotifications.set(inAppItem.id, inAppItem);

      // Store in DB
      if (this.canUseDb()) {
        try {
          const { data, error } = await getDbAdmin()
            .from('notifications')
            .insert({
              id: inAppItem.id,
              user_id: targetUserId,
              title: payload.title,
              message: payload.message,
              type,
              category,
              priority,
              status: 'UNREAD',
              channel: inAppItem.channel,
              idempotency_key: idempotencyKey,
              link: inAppItem.link || null,
              related_entity_type: inAppItem.related_entity_type,
              related_entity_id: inAppItem.related_entity_id,
              is_read: false,
              read_at: null,
              created_at: nowIso,
            })
            .select()
            .single();

          if (!error && data) {
            const merged: NotificationItem = { ...inAppItem, ...data };
            createdItem = merged;
            this.inMemoryNotifications.set(merged.id, merged);
          }
        } catch (dbErr) {
          console.warn('⚠️ [NotificationsRepository] DB insert failed, using memory record:', (dbErr as any)?.message);
        }
      }
    }

    // Channel B: Email Dispatch
    if (allowEmail) {
      try {
        let recipientEmail = payload.recipientEmail;
        let recipientName = payload.recipientName || 'Valued Member';

        if (!recipientEmail) {
          const user = await usersRepository.findById(targetUserId);
          if (user) {
            recipientEmail = user.email;
            recipientName = user.full_name || recipientName;
          }
        }

        if (recipientEmail) {
          emailQueue.enqueue({
            idempotencyKey: `EMAIL:${idempotencyKey}`,
            emailType: isCritical ? 'SECURITY_ALERT' : 'REMINDER',
            category: isCritical ? 'SECURITY' : 'REMINDERS',
            recipient: recipientEmail,
            subject: `${payload.title} | ${EMAIL_BRAND.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
                <h2 style="color: #ffffff; margin-top: 0;">${payload.title}</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">${payload.message}</p>
                ${payload.link ? `<p><a href="${payload.link}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">View Details</a></p>` : ''}
                <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">${EMAIL_BRAND.name} • ${EMAIL_BRAND.universityAffiliation}</p>
              </div>
            `,
            text: `${payload.title}\n\n${payload.message}\n\n${payload.link || ''}\n\n${EMAIL_BRAND.name} • ${EMAIL_BRAND.universityAffiliation}`,
            relatedEntityType: payload.related_entity_type || 'notification',
            relatedEntityId: payload.related_entity_id || createdItem?.id || 'NONE',
            triggerSource: 'NOTIFICATION_SERVICE',
          });
        }
      } catch (emailErr) {
        console.warn('⚠️ [NotificationsRepository] Email queue enqueue failed:', (emailErr as any)?.message);
      }
    }

    return createdItem;
  }

  /**
   * Section 4: Notification Rules Management
   */
  async getNotificationRules(): Promise<NotificationRuleItem[]> {
    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('notification_rules')
          .select('*')
          .order('priority', { ascending: false });
        if (!error && data) {
          return data as NotificationRuleItem[];
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] Failed to fetch notification_rules:', (err as any)?.message);
      }
    }
    return [];
  }

  async updateNotificationRule(
    ruleKey: string,
    updates: { enabled?: boolean; delivery_channels?: string[]; priority?: string }
  ): Promise<NotificationRuleItem | null> {
    if (this.canUseDb()) {
      try {
        const payload: any = { updated_at: new Date().toISOString() };
        if (typeof updates.enabled === 'boolean') payload.enabled = updates.enabled;
        if (Array.isArray(updates.delivery_channels)) payload.delivery_channels = updates.delivery_channels;
        if (updates.priority) payload.priority = updates.priority;

        const { data, error } = await getDbAdmin()
          .from('notification_rules')
          .update(payload)
          .eq('rule_key', ruleKey)
          .select()
          .single();

        if (!error && data) {
          return data as NotificationRuleItem;
        }
      } catch (err) {
        console.warn('⚠️ [NotificationsRepository] Failed to update notification rule:', (err as any)?.message);
      }
    }
    return null;
  }
}

export const notificationsRepository = new NotificationsRepository();

