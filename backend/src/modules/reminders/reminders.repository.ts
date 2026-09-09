import { getDbAdmin, isSupabaseConfigured } from '../../config/supabase';
import { Reminder, ReminderStatus, ReminderType, ReminderPriority } from '../../types';
import { notificationsRepository } from '../notifications/notifications.repository';
import { emailQueue } from '../email/email.queue';
import { renderReminderEmail } from '../email/email.templates';
import { EMAIL_BRAND } from '../email/email.brand';
import { calculateScheduledTime, isTimestampDue, formatDhakaDateTime } from './reminder.timezone';
import { emailEventBus } from '../email/email.events';

export interface ScheduleEntityOptions {
  entityType: 'EVENT' | 'MEETING' | 'TASK' | 'MEMBER_DUE' | 'PAYMENT_DUE' | 'CUSTOM_ADMIN';
  entityId: string;
  title: string;
  targetDate: string; // ISO string
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
  recipientRole?: string | null;
  message?: string;
  priority?: ReminderPriority;
  customOffsets?: string[]; // e.g. ['-24h', '-1h']
  metadata?: Record<string, any>;
}

export class RemindersRepository {
  // Resilient in-memory fallback cache
  private inMemoryReminders: Map<string, Reminder> = new Map();

  constructor() {
    this.registerLifecycleListeners();
  }

  private registerLifecycleListeners(): void {
    try {
      emailEventBus.on('EVENT_CANCELLED', (data: any) => {
        this.cancelRemindersForEntity('EVENT', data.eventId, data.reason || 'Event was cancelled');
      });

      emailEventBus.on('MEETING_CANCELLED', (data: any) => {
        this.cancelRemindersForEntity('MEETING', data.meetingId, data.reason || 'Meeting was cancelled');
      });

      emailEventBus.on('TASK_COMPLETED', (data: any) => {
        this.cancelRemindersForEntity('TASK', data.taskId, 'Task was marked completed');
      });

      emailEventBus.on('MEMBER_DUE_PAID', (data: any) => {
        this.cancelRemindersForEntity('MEMBER_DUE', data.dueId, 'Membership dues paid in full');
      });
    } catch (err) {
      console.warn('⚠️ [RemindersRepository] Could not attach lifecycle listeners:', err);
    }
  }

  /**
   * Helper to determine if Supabase table is accessible
   */
  private canUseDb(): boolean {
    return isSupabaseConfigured();
  }

  async getReminders(params?: {
    status?: string;
    reminder_type?: string;
    user_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Reminder[]> {
    const limit = params?.limit || 100;
    const offset = params?.offset || 0;

    if (this.canUseDb()) {
      try {
        let query = getDbAdmin()
          .from('reminders')
          .select(`
            *,
            recipient:profiles!recipient_user_id(id, full_name, email)
          `)
          .order('scheduled_at', { ascending: false });

        if (params?.status && params.status !== 'ALL') {
          query = query.eq('status', params.status);
        }
        if (params?.reminder_type && params.reminder_type !== 'ALL') {
          query = query.eq('reminder_type', params.reminder_type);
        }
        if (params?.user_id) {
          query = query.eq('recipient_user_id', params.user_id);
        }
        if (params?.search) {
          query = query.ilike('title', `%${params.search}%`);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;
        const dbList = (!error && data)
          ? data.map((r: any) => ({
              ...r,
              recipient_name: r.recipient?.full_name || r.recipient_name || null,
              recipient_email: r.recipient?.email || r.recipient_email || null,
            }))
          : [];

        // Merge DB list with in-memory records so test/unpersisted records are never dropped
        const combinedMap = new Map<string, Reminder>();
        for (const r of dbList) combinedMap.set(r.id, r as Reminder);
        for (const r of this.inMemoryReminders.values()) {
          combinedMap.set(r.id, r);
        }

        let list = Array.from(combinedMap.values());
        if (params?.status && params.status !== 'ALL') {
          list = list.filter((r) => r.status === params.status);
        }
        if (params?.reminder_type && params.reminder_type !== 'ALL') {
          list = list.filter((r) => r.reminder_type === params.reminder_type);
        }
        if (params?.user_id) {
          list = list.filter((r) => r.recipient_user_id === params.user_id);
        }
        if (params?.search) {
          const s = params.search.toLowerCase();
          list = list.filter((r) => r.title.toLowerCase().includes(s) || r.message?.toLowerCase().includes(s));
        }

        list.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
        return list.slice(offset, offset + limit);
      } catch (err) {
        console.warn('⚠️ [RemindersRepository] DB query failed, using in-memory store:', (err as any)?.message);
      }
    }

    // Fallback in-memory
    let list = Array.from(this.inMemoryReminders.values());
    if (params?.status && params.status !== 'ALL') {
      list = list.filter((r) => r.status === params.status);
    }
    if (params?.reminder_type && params.reminder_type !== 'ALL') {
      list = list.filter((r) => r.reminder_type === params.reminder_type);
    }
    if (params?.user_id) {
      list = list.filter((r) => r.recipient_user_id === params.user_id);
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(s) || r.message?.toLowerCase().includes(s));
    }

    list.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    return list.slice(offset, offset + limit);
  }

  async getReminderById(id: string): Promise<Reminder | null> {
    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('reminders')
          .select(`
            *,
            recipient:profiles!recipient_user_id(id, full_name, email)
          `)
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            ...data,
            recipient_name: data.recipient?.full_name || data.recipient_name || null,
            recipient_email: data.recipient?.email || data.recipient_email || null,
          } as Reminder;
        }
      } catch {
        // fall through to memory
      }
    }

    return this.inMemoryReminders.get(id) || null;
  }

  async findByIdempotencyKey(key: string): Promise<Reminder | null> {
    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('reminders')
          .select('*')
          .eq('idempotency_key', key)
          .maybeSingle();

        if (!error && data) return data as Reminder;
      } catch {
        // fall through to memory
      }
    }

    for (const r of this.inMemoryReminders.values()) {
      if (r.idempotency_key === key) return r;
    }
    return null;
  }

  async createReminder(payload: Partial<Reminder>): Promise<Reminder> {
    const id = payload.id || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const record: Reminder = {
      id,
      title: payload.title || 'Untitled Reminder',
      reminder_type: payload.reminder_type || 'GENERAL',
      target_date: payload.target_date || nowIso,
      schedule_offset_days: payload.schedule_offset_days || 0,
      schedule_point: payload.schedule_point,
      idempotency_key: payload.idempotency_key,
      priority: payload.priority || 'NORMAL',
      scheduled_at: payload.scheduled_at || nowIso,
      is_sent: payload.is_sent || false,
      sent_at: payload.sent_at || null,
      recipient_user_id: payload.recipient_user_id || null,
      recipient_name: payload.recipient_name || null,
      recipient_email: payload.recipient_email || null,
      recipient_role: payload.recipient_role || null,
      related_record_id: payload.related_record_id || null,
      related_module: payload.related_module || null,
      message: payload.message || '',
      status: payload.status || 'SCHEDULED',
      attempt_count: payload.attempt_count || 0,
      error_message: payload.error_message || null,
      metadata: payload.metadata || {},
      created_at: payload.created_at || nowIso,
      updated_at: payload.updated_at || nowIso,
    };

    // Store in memory cache
    this.inMemoryReminders.set(id, record);

    if (this.canUseDb()) {
      try {
        const dbPayload: any = {
          id: record.id,
          title: record.title,
          reminder_type: record.reminder_type,
          target_date: record.target_date,
          schedule_offset_days: record.schedule_offset_days,
          scheduled_at: record.scheduled_at,
          recipient_user_id: record.recipient_user_id,
          recipient_role: record.recipient_role,
          related_record_id: record.related_record_id,
          related_module: record.related_module,
          message: record.message,
          status: record.status,
          created_at: record.created_at,
          updated_at: record.updated_at,
        };

        const { data, error } = await getDbAdmin()
          .from('reminders')
          .insert(dbPayload)
          .select()
          .single();

        if (!error && data) {
          const merged = { ...record, ...data };
          this.inMemoryReminders.set(id, merged);
          return merged;
        }
      } catch (err) {
        console.warn('⚠️ [RemindersRepository] DB insert failed, using memory record:', (err as any)?.message);
      }
    }

    return record;
  }

  async updateReminder(id: string, payload: Partial<Reminder>): Promise<Reminder> {
    const existing = await this.getReminderById(id);
    const updated: Reminder = {
      ...(existing || ({} as Reminder)),
      ...payload,
      id,
      updated_at: new Date().toISOString(),
    };

    this.inMemoryReminders.set(id, updated);

    if (this.canUseDb()) {
      try {
        const { data, error } = await getDbAdmin()
          .from('reminders')
          .update({
            ...payload,
            updated_at: updated.updated_at,
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const merged = { ...updated, ...data };
          this.inMemoryReminders.set(id, merged);
          return merged;
        }
      } catch {
        // memory already updated
      }
    }

    return updated;
  }

  async cancelReminder(id: string, reason?: string): Promise<Reminder> {
    return this.updateReminder(id, {
      status: 'CANCELLED',
      error_message: reason ? `Cancelled: ${reason}` : 'Cancelled by system/admin',
    });
  }


  /**
   * Section 4 & 5: Centralized Smart Scheduling for Business Entities
   * Computes schedule points (-7d, -24h, -1h, DUE, etc.), creates unique idempotency keys,
   * and registers scheduled reminder records.
   */
  async scheduleEntityReminders(options: ScheduleEntityOptions): Promise<Reminder[]> {
    let offsets: string[] = [];

    switch (options.entityType) {
      case 'EVENT':
        offsets = options.customOffsets || ['-7d', '-3d', '-1d', '-1h'];
        break;
      case 'MEETING':
        offsets = options.customOffsets || ['-24h', '-1h'];
        break;
      case 'TASK':
        offsets = options.customOffsets || ['-3d', '-1d', 'DUE', '+1d'];
        break;
      case 'MEMBER_DUE':
      case 'PAYMENT_DUE':
        offsets = options.customOffsets || ['-7d', 'DUE', '+3d'];
        break;
      case 'CUSTOM_ADMIN':
      default:
        offsets = options.customOffsets || ['DUE'];
        break;
    }

    const scheduledReminders: Reminder[] = [];

    for (const offset of offsets) {
      const scheduledAt = calculateScheduledTime(options.targetDate, offset);

      // Section 5 & 6: Deterministic Idempotency Key
      const reminderType =
        options.entityType === 'EVENT'
          ? 'EVENT_DATE'
          : options.entityType === 'MEETING'
          ? 'MEETING_DATE'
          : options.entityType === 'TASK'
          ? 'TASK_DEADLINE'
          : options.entityType === 'MEMBER_DUE'
          ? 'MEMBER_DUES'
          : options.entityType === 'PAYMENT_DUE'
          ? 'PAYMENT_DUE'
          : 'CUSTOM_ADMIN';

      const recipientIdentifier = options.recipientUserId || options.recipientRole || options.recipientEmail || 'GLOBAL';
      const idempotencyKey = `${reminderType}:${options.entityId}:${recipientIdentifier}:${offset}`;

      // Check if already scheduled or sent
      const existing = await this.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        console.log(`ℹ️ [RemindersEngine] Reminder with key "${idempotencyKey}" already exists (status: ${existing.status}). Skipping.`);
        scheduledReminders.push(existing);
        continue;
      }

      const title = `${options.title} [${offset}]`;
      const message =
        options.message ||
        `Reminder for ${options.entityType.toLowerCase().replace('_', ' ')} scheduled for ${formatDhakaDateTime(
          options.targetDate
        )}.`;

      const created = await this.createReminder({
        title,
        reminder_type: reminderType as ReminderType,
        target_date: options.targetDate,
        schedule_offset_days: offset.includes('d') ? parseInt(offset, 10) : 0,
        schedule_point: offset,
        idempotency_key: idempotencyKey,
        priority: options.priority || 'NORMAL',
        scheduled_at: scheduledAt,
        recipient_user_id: options.recipientUserId || null,
        recipient_email: options.recipientEmail || null,
        recipient_name: options.recipientName || null,
        recipient_role: options.recipientRole || null,
        related_record_id: options.entityId,
        related_module: options.entityType,
        message,
        status: 'SCHEDULED',
        metadata: {
          ...options.metadata,
          offsetSpec: offset,
          createdVia: 'SMART_SCHEDULER_ENGINE',
        },
      });

      scheduledReminders.push(created);
      console.log(`📅 [RemindersEngine] Scheduled: ${title} at ${scheduledAt} (Key: ${idempotencyKey})`);
    }

    return scheduledReminders;
  }

  /**
   * Section 10: Automatic Reminder Cancellation for Business Events
   * (Event cancelled, task completed, dues paid, meeting cancelled)
   */
  async cancelRemindersForEntity(
    entityType: 'EVENT' | 'MEETING' | 'TASK' | 'MEMBER_DUE' | 'PAYMENT_DUE' | string,
    entityId: string,
    reason: string
  ): Promise<{ cancelledCount: number; reminders: Reminder[] }> {
    console.log(`🛑 [RemindersEngine] Cancelling reminders for ${entityType} ID: ${entityId} | Reason: ${reason}`);

    // Cancel in-memory immediately & synchronously
    const matchingToCancel: Reminder[] = [];
    for (const [id, r] of this.inMemoryReminders.entries()) {
      const matchesEntity =
        r.related_record_id === entityId ||
        (r.idempotency_key && r.idempotency_key.includes(`:${entityId}:`));

      if (matchesEntity && (r.status === 'SCHEDULED' || r.status === 'PENDING')) {
        const updated: Reminder = {
          ...r,
          status: 'CANCELLED',
          error_message: reason ? `Cancelled: ${reason}` : 'Cancelled by system/admin',
          updated_at: new Date().toISOString(),
        };
        this.inMemoryReminders.set(id, updated);
        matchingToCancel.push(updated);
      }
    }

    // Cancel in DB if available (parallelized)
    if (this.canUseDb()) {
      try {
        const { data: dbMatches } = await getDbAdmin()
          .from('reminders')
          .select('id')
          .eq('related_record_id', entityId)
          .in('status', ['PENDING', 'SCHEDULED']);

        const idsToUpdate = new Set<string>();
        for (const item of matchingToCancel) idsToUpdate.add(item.id);
        if (dbMatches) {
          for (const m of dbMatches) idsToUpdate.add(m.id);
        }

        if (idsToUpdate.size > 0) {
          await getDbAdmin()
            .from('reminders')
            .update({
              status: 'CANCELLED',
              error_message: reason ? `Cancelled: ${reason}` : 'Cancelled by system/admin',
              updated_at: new Date().toISOString(),
            })
            .in('id', Array.from(idsToUpdate));
        }
      } catch (err) {
        console.warn('⚠️ [RemindersEngine] DB cancellation update error:', (err as any)?.message);
      }
    }

    console.log(`✅ [RemindersEngine] Successfully cancelled ${matchingToCancel.length} pending reminders for ${entityType} ${entityId}`);
    return { cancelledCount: matchingToCancel.length, reminders: matchingToCancel };
  }

  /**
   * Section 7, 9 & 18: Process all pending/scheduled reminders that are due
   * Enforces: Eligibility Check -> Duplicate Check -> Email Queue Dispatch -> Delivery Log
   */
  async processDueReminders(): Promise<{ sent: number; skipped: number; cancelled: number; reminders: any[] }> {
    const nowIso = new Date().toISOString();
    console.log(`⏱️ [RemindersEngine] Processing due reminders as of: ${nowIso}`);

    // Fetch due candidates
    const allReminders = await this.getReminders({ limit: 500 });
    const dueReminders = allReminders.filter(
      (r) => (r.status === 'PENDING' || r.status === 'SCHEDULED') && isTimestampDue(r.scheduled_at)
    );

    if (dueReminders.length === 0) {
      console.log('💤 [RemindersEngine] No due reminders found at this time.');
      return { sent: 0, skipped: 0, cancelled: 0, reminders: [] };
    }

    console.log(`🔍 [RemindersEngine] Found ${dueReminders.length} due reminder(s) to process.`);

    let sentCount = 0;
    let skippedCount = 0;
    let cancelledCount = 0;
    const processed: any[] = [];

    for (const rem of dueReminders) {
      try {
        // 1. SECTION 9: SMART ELIGIBILITY CHECK
        const isEligible = await this.checkReminderEligibility(rem);
        if (!isEligible.eligible) {
          console.log(`🚫 [RemindersEngine] Reminder ${rem.id} no longer eligible: ${isEligible.reason}. Auto-cancelling.`);
          await this.cancelReminder(rem.id, isEligible.reason);
          cancelledCount++;
          processed.push({ id: rem.id, title: rem.title, status: 'CANCELLED', reason: isEligible.reason });
          continue;
        }

        // 2. SECTION 5 & 6: DUPLICATE CHECK
        if (rem.is_sent || rem.status === 'SENT') {
          console.warn(`🛑 [RemindersEngine] DUPLICATE DETECTED: Reminder ${rem.id} already marked SENT. Skipping.`);
          skippedCount++;
          continue;
        }

        // Mark as PROCESSING
        await this.updateReminder(rem.id, { status: 'PROCESSING' });

        // Resolve Recipient User & Email
        let recipientEmail = rem.recipient_email;
        let recipientName = rem.recipient_name || 'Valued Member';

        if (!recipientEmail && rem.recipient_user_id) {
          try {
            const { usersRepository } = await import('../users/users.repository');
            const user = await usersRepository.findById(rem.recipient_user_id);
            if (user) {
              recipientEmail = user.email;
              recipientName = user.full_name || recipientName;
            }
          } catch (uErr) {
            console.warn(`Could not resolve user profile for reminder ${rem.id}:`, uErr);
          }
        }

        // Fallback email if null
        if (!recipientEmail) {
          recipientEmail = 'member@diu.edu.bd';
        }

        // 3. SECTION 11: DISPATCH VIA RESEND & EMAIL QUEUE
        const reminderTypeCategory =
          rem.reminder_type === 'EVENT_DATE'
            ? 'event'
            : rem.reminder_type === 'MEETING_DATE'
            ? 'meeting'
            : rem.reminder_type === 'TASK_DEADLINE'
            ? 'task'
            : 'due';

        const { subject, html, text } = renderReminderEmail({
          memberName: recipientName,
          reminderType: reminderTypeCategory,
          title: rem.title,
          description: rem.message,
          dueDateOrDate: rem.target_date ? formatDhakaDateTime(rem.target_date) : formatDhakaDateTime(rem.scheduled_at),
          actionUrl: rem.related_module ? `/${rem.related_module.toLowerCase()}` : '/reminders',
          actionLabel: 'View in Club Portal',
          recipientEmail,
        });

        const emailJobId = emailQueue.enqueue({
          idempotencyKey: rem.idempotency_key || `REMINDER:${rem.id}`,
          emailType: 'REMINDER',
          category: 'REMINDERS',
          recipient: recipientEmail,
          subject,
          html,
          text,
          relatedEntityType: rem.related_module || 'reminder',
          relatedEntityId: rem.related_record_id || rem.id,
          triggerSource: 'SMART_REMINDER_ENGINE',
        });

        // 4. In-App Notification Dispatch
        if (rem.recipient_user_id) {
          await notificationsRepository.dispatchNotification({
            user_id: rem.recipient_user_id,
            title: rem.title,
            message: rem.message,
            type: rem.priority === 'HIGH' || rem.priority === 'CRITICAL' ? 'WARNING' : 'INFO',
            category: rem.reminder_type === 'MEMBER_DUES' ? 'FINANCIAL' : 'REMINDER',
            priority: rem.priority === 'CRITICAL' ? 'HIGH' : rem.priority || 'NORMAL',
            link: rem.related_module ? `/${rem.related_module.toLowerCase()}` : '/reminders',
            related_entity_type: rem.related_module || 'reminder',
            related_entity_id: rem.related_record_id || rem.id,
            deduplicateHours: 12,
          });
        }

        // 5. Update Status to SENT
        const updated = await this.updateReminder(rem.id, {
          status: 'SENT',
          is_sent: true,
          sent_at: new Date().toISOString(),
          attempt_count: (rem.attempt_count || 0) + 1,
          metadata: {
            ...rem.metadata,
            dispatchedEmailJobId: emailJobId,
            dispatchedAt: new Date().toISOString(),
          },
        });

        sentCount++;
        processed.push({ id: updated.id, title: updated.title, status: 'SENT', recipientEmail });
        console.log(`✅ [RemindersEngine] Successfully dispatched reminder ${rem.id} to ${recipientEmail}`);
      } catch (err: any) {
        console.error(`❌ [RemindersEngine] Error processing reminder ${rem.id}:`, err.message);
        await this.updateReminder(rem.id, {
          status: 'FAILED',
          attempt_count: (rem.attempt_count || 0) + 1,
          error_message: err.message || 'Delivery failed',
        });
        processed.push({ id: rem.id, title: rem.title, status: 'FAILED', error: err.message });
      }
    }

    return { sent: sentCount, skipped: skippedCount, cancelled: cancelledCount, reminders: processed };
  }

  /**
   * Section 9: Smart Eligibility Verifier
   */
  private async checkReminderEligibility(
    rem: Reminder
  ): Promise<{ eligible: boolean; reason?: string }> {
    if (!rem.related_module || !rem.related_record_id) {
      return { eligible: true };
    }

    const moduleType = rem.related_module.toUpperCase();
    const recordId = rem.related_record_id;

    try {
      if (this.canUseDb()) {
        const db = getDbAdmin();

        if (moduleType === 'EVENT') {
          const { data: event } = await db.from('events').select('status').eq('id', recordId).maybeSingle();
          if (event && (event.status === 'CANCELLED' || event.status === 'CLOSED')) {
            return { eligible: false, reason: `Event is ${event.status}` };
          }
        }

        if (moduleType === 'MEETING') {
          const { data: meeting } = await db.from('meetings').select('status').eq('id', recordId).maybeSingle();
          if (meeting && meeting.status === 'CANCELLED') {
            return { eligible: false, reason: 'Meeting was cancelled' };
          }
        }

        if (moduleType === 'TASK') {
          const { data: task } = await db.from('tasks').select('status').eq('id', recordId).maybeSingle();
          if (task && (task.status === 'COMPLETED' || task.status === 'CANCELLED')) {
            return { eligible: false, reason: `Task already ${task.status}` };
          }
        }

        if (moduleType === 'MEMBER_DUE' || moduleType === 'PAYMENT_DUE') {
          const { data: due } = await db.from('member_dues').select('status').eq('id', recordId).maybeSingle();
          if (due && due.status === 'PAID') {
            return { eligible: false, reason: 'Membership dues already paid' };
          }
        }
      }
    } catch {
      // If DB check fails, assume eligible
    }

    return { eligible: true };
  }

  /**
   * Section 15: Reschedule a reminder
   */
  async rescheduleReminder(id: string, newScheduledAt: string, userId?: string, reason?: string): Promise<Reminder> {
    const existing = await this.getReminderById(id);
    if (!existing) {
      throw new Error('Reminder not found');
    }

    return this.updateReminder(id, {
      scheduled_at: newScheduledAt,
      status: 'SCHEDULED',
      is_sent: false,
      sent_at: null,
      error_message: null,
      metadata: {
        ...existing.metadata,
        rescheduledBy: userId || 'admin',
        rescheduleReason: reason || 'Manual Admin Reschedule',
        rescheduledAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Section 15: Retry a failed reminder
   */
  async retryReminder(id: string, userId?: string): Promise<Reminder> {
    const existing = await this.getReminderById(id);
    if (!existing) {
      throw new Error('Reminder not found');
    }

    if (existing.status === 'SENT') {
      throw new Error('Reminder was already sent successfully (duplicate prevention active)');
    }

    return this.updateReminder(id, {
      status: 'SCHEDULED',
      scheduled_at: new Date().toISOString(), // trigger immediately
      error_message: `Retry queued by ${userId || 'admin'}`,
    });
  }

  /**
   * Section 14: Real Reminder Telemetry & Dashboard Stats
   */
  async getReminderStats(): Promise<{
    total: number;
    upcoming: number;
    sentToday: number;
    pending: number;
    failed: number;
    cancelled: number;
    byType: Record<string, number>;
    timezone: string;
    evaluatedAt: string;
  }> {
    const all = await this.getReminders({ limit: 1000 });
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    let upcoming = 0;
    let sentToday = 0;
    let pending = 0;
    let failed = 0;
    let cancelled = 0;
    const byType: Record<string, number> = {};

    for (const r of all) {
      // By status
      if (r.status === 'SENT') {
        if (r.sent_at && r.sent_at >= todayStart) {
          sentToday++;
        }
      } else if (r.status === 'FAILED') {
        failed++;
      } else if (r.status === 'CANCELLED') {
        cancelled++;
      } else if (r.status === 'PENDING' || r.status === 'SCHEDULED') {
        pending++;
        if (new Date(r.scheduled_at).getTime() > now.getTime()) {
          upcoming++;
        }
      }

      // By type
      const t = r.reminder_type || 'GENERAL';
      byType[t] = (byType[t] || 0) + 1;
    }

    return {
      total: all.length,
      upcoming,
      sentToday,
      pending,
      failed,
      cancelled,
      byType,
      timezone: 'Asia/Dhaka (UTC+6)',
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Run overdue sweep across tasks, member dues, asset returns, and pending approvals
   */
  async runOverdueSweep(): Promise<{
    overdue_tasks: number;
    overdue_dues: number;
    overdue_assets: number;
    pending_escalations: number;
    alerts_created: number;
  }> {
    if (!this.canUseDb()) {
      return { overdue_tasks: 0, overdue_dues: 0, overdue_assets: 0, pending_escalations: 0, alerts_created: 0 };
    }

    const db = getDbAdmin();
    const todayStr = new Date().toISOString().split('T')[0];
    let alertsCreated = 0;

    // 1. Overdue tasks
    const { data: overdueTasks } = await db
      .from('tasks')
      .select('id, title, due_date, assigned_to')
      .not('status', 'in', '("COMPLETED","CANCELLED")')
      .lt('due_date', todayStr);

    const taskCount = overdueTasks?.length || 0;
    if (overdueTasks) {
      for (const t of overdueTasks) {
        if (t.assigned_to) {
          await notificationsRepository.dispatchNotification({
            user_id: t.assigned_to,
            title: `Task Overdue: ${t.title}`,
            message: `Your assigned task was due on ${t.due_date}. Please update progress.`,
            type: 'WARNING',
            category: 'TASK',
            priority: 'HIGH',
            link: '/tasks',
            related_entity_type: 'task',
            related_entity_id: t.id,
            deduplicateHours: 24,
          });
          alertsCreated++;
        }
      }
    }

    // 2. Overdue member dues
    const { data: overdueDues } = await db
      .from('member_dues')
      .select('id, amount, due_date, member:members(user_id, full_name)')
      .not('status', 'eq', 'PAID')
      .lt('due_date', todayStr);

    const duesCount = overdueDues?.length || 0;
    if (overdueDues) {
      for (const d of overdueDues) {
        const memberUser = (d.member as any)?.user_id;
        if (memberUser) {
          await notificationsRepository.dispatchNotification({
            user_id: memberUser,
            title: `Membership Dues Overdue`,
            message: `Your membership dues of BDT ${d.amount} were due on ${d.due_date}. Please clear your balance.`,
            type: 'WARNING',
            category: 'FINANCIAL',
            priority: 'HIGH',
            link: '/member-dues',
            related_entity_type: 'member_due',
            related_entity_id: d.id,
            deduplicateHours: 24,
          });
          alertsCreated++;
        }
      }
    }

    // 3. Overdue asset returns
    const { data: overdueAssets } = await db
      .from('club_assets')
      .select('id, name, expected_return_date, assigned_to')
      .eq('status', 'ASSIGNED')
      .not('expected_return_date', 'is', null)
      .lt('expected_return_date', todayStr);

    const assetCount = overdueAssets?.length || 0;

    // 4. Pending approvals
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data: pendingApprovals } = await db
      .from('approval_requests')
      .select('id, title, created_at, requested_by')
      .eq('status', 'PENDING')
      .lt('created_at', threeDaysAgo);

    const escalationsCount = pendingApprovals?.length || 0;

    return {
      overdue_tasks: taskCount,
      overdue_dues: duesCount,
      overdue_assets: assetCount,
      pending_escalations: escalationsCount,
      alerts_created: alertsCreated,
    };
  }
}

export const remindersRepository = new RemindersRepository();
