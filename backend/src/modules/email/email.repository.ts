/**
 * DIU Investment Club - Email Delivery Logs Repository
 *
 * Persists transactional email telemetry to Supabase `public.email_logs`.
 * Provides idempotency lookup, status tracking, and authorized admin audit querying.
 */

import { getDbAdmin, isSupabaseConfigured } from '../../config/supabase';

export interface EmailLogRecord {
  id: string;
  idempotency_key?: string | null;
  email_type: string;
  recipient: string;
  subject: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  trigger_source?: string | null;
  provider_message_id?: string | null;
  provider?: 'RESEND' | 'SMTP' | null;
  provider_status_code?: number | null;
  error_category?: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING' | 'SKIPPED' | 'CANCELLED' | 'TEST';
  attempt_count: number;
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
}

export interface CreateEmailLogInput {
  idempotency_key?: string;
  email_type: string;
  recipient: string;
  subject: string;
  related_entity_type?: string;
  related_entity_id?: string;
  trigger_source?: string;
  provider_message_id?: string;
  provider?: 'RESEND' | 'SMTP';
  provider_status_code?: number;
  error_category?: string;
  status?: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING' | 'SKIPPED' | 'CANCELLED' | 'TEST';
  attempt_count?: number;
  error_message?: string;
}

// In-memory fallback buffer in case database is briefly unreachable
const inMemoryLogs: EmailLogRecord[] = [];

export class EmailRepository {
  async findByIdempotencyKey(key: string): Promise<EmailLogRecord | null> {
    if (!key) return null;

    if (isSupabaseConfigured()) {
      try {
        const db = getDbAdmin();
        const { data, error } = await db
          .from('email_logs')
          .select('*')
          .eq('idempotency_key', key)
          .maybeSingle();

        if (!error && data) {
          return data as EmailLogRecord;
        }
      } catch (err: any) {
        console.warn('⚠️ [EmailRepository] Supabase query error, checking fallback:', err.message);
      }
    }

    const found = inMemoryLogs.find((l) => l.idempotency_key === key);
    return found || null;
  }

  async create(input: CreateEmailLogInput): Promise<EmailLogRecord> {
    const record: EmailLogRecord = {
      id: crypto.randomUUID(),
      idempotency_key: input.idempotency_key || null,
      email_type: input.email_type,
      recipient: input.recipient,
      subject: input.subject,
      related_entity_type: input.related_entity_type || null,
      related_entity_id: input.related_entity_id || null,
      trigger_source: input.trigger_source || null,
      provider_message_id: input.provider_message_id || null,
      provider: input.provider || null,
      provider_status_code: input.provider_status_code || null,
      error_category: input.error_category || null,
      status: input.status || 'PENDING',
      attempt_count: input.attempt_count ?? 1,
      error_message: input.error_message || null,
      created_at: new Date().toISOString(),
      sent_at: input.status === 'SENT' ? new Date().toISOString() : null,
    };

    if (isSupabaseConfigured()) {
      try {
        const db = getDbAdmin();
        const { data, error } = await db
          .from('email_logs')
          .insert({
            id: record.id,
            idempotency_key: record.idempotency_key,
            email_type: record.email_type,
            recipient: record.recipient,
            subject: record.subject,
            related_entity_type: record.related_entity_type,
            related_entity_id: record.related_entity_id,
            trigger_source: record.trigger_source,
            provider_message_id: record.provider_message_id,
            provider: record.provider,
            provider_status_code: record.provider_status_code,
            error_category: record.error_category,
            status: record.status,
            attempt_count: record.attempt_count,
            error_message: record.error_message,
            created_at: record.created_at,
            sent_at: record.sent_at,
          })
          .select()
          .single();

        if (error) {
          console.warn('⚠️ [EmailRepository] Supabase insert error:', error.message);
        } else if (data) {
          inMemoryLogs.unshift(data as EmailLogRecord);
          return data as EmailLogRecord;
        }
      } catch (err: any) {
        console.warn('⚠️ [EmailRepository] Failed to insert log to Supabase, saving to in-memory store:', err.message);
      }
    }

    inMemoryLogs.unshift(record);
    return record;
  }

  async update(
    id: string,
    updates: Partial<Pick<EmailLogRecord, 'status' | 'provider_message_id' | 'provider' | 'provider_status_code' | 'error_category' | 'error_message' | 'attempt_count' | 'sent_at'>>
  ): Promise<EmailLogRecord | null> {
    if (isSupabaseConfigured()) {
      try {
        const db = getDbAdmin();
        const { data, error } = await db
          .from('email_logs')
          .update(updates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) {
          console.warn('⚠️ [EmailRepository] Supabase update error:', error.message);
        } else if (data) {
          const idx = inMemoryLogs.findIndex((l) => l.id === id);
          if (idx >= 0) inMemoryLogs[idx] = data as EmailLogRecord;
          return data as EmailLogRecord;
        }
      } catch (err: any) {
        console.warn('⚠️ [EmailRepository] Failed to update log in Supabase:', err.message);
      }
    }

    const idx = inMemoryLogs.findIndex((l) => l.id === id);
    if (idx >= 0) {
      inMemoryLogs[idx] = { ...inMemoryLogs[idx], ...updates };
      return inMemoryLogs[idx];
    }
    return null;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    emailType?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{ data: EmailLogRecord[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured()) {
      try {
        const db = getDbAdmin();
        let query = db.from('email_logs').select('*', { count: 'exact' });

        if (params.status) {
          query = query.eq('status', params.status);
        }
        if (params.emailType) {
          query = query.eq('email_type', params.emailType);
        }
        if (params.search) {
          query = query.or(`recipient.ilike.%${params.search}%,subject.ilike.%${params.search}%`);
        }
        if (params.fromDate) {
          query = query.gte('created_at', params.fromDate);
        }
        if (params.toDate) {
          query = query.lte('created_at', params.toDate);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (!error && data) {
          const total = count || data.length;
          return {
            data: data as EmailLogRecord[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          };
        }
      } catch (err: any) {
        console.warn('⚠️ [EmailRepository] Supabase search error, falling back to memory:', err.message);
      }
    }

    // In-memory search
    let filtered = [...inMemoryLogs];
    if (params.status) filtered = filtered.filter((l) => l.status === params.status);
    if (params.emailType) filtered = filtered.filter((l) => l.email_type === params.emailType);
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((l) => l.recipient.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q));
    }
    if (params.fromDate) filtered = filtered.filter((l) => l.created_at >= params.fromDate!);
    if (params.toDate) filtered = filtered.filter((l) => l.created_at <= params.toDate!);

    const total = filtered.length;
    const data = filtered.slice(offset, offset + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<EmailLogRecord | null> {
    if (!id) return null;

    if (isSupabaseConfigured()) {
      try {
        const db = getDbAdmin();
        const { data, error } = await db
          .from('email_logs')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return data as EmailLogRecord;
        }
      } catch (err: any) {
        console.warn('⚠️ [EmailRepository] findById Supabase error:', err.message);
      }
    }

    const found = inMemoryLogs.find((l) => l.id === id);
    return found || null;
  }

  async cancel(id: string, reason?: string): Promise<EmailLogRecord | null> {
    return this.update(id, {
      status: 'CANCELLED',
      error_message: reason || 'Delivery cancelled by administrator',
    });
  }

  async getStats(): Promise<{
    total: number;
    sent: number;
    pending: number;
    failed: number;
    retrying: number;
    cancelled: number;
    skipped: number;
    successRate: number;
    failureRate: number;
    sentToday: number;
    sentThisWeek: number;
    duplicatesBlocked: number;
    byType: Record<string, { total: number; sent: number; failed: number; retrying: number }>;
    systemHealth: { status: 'HEALTHY' | 'WARNING' | 'CRITICAL'; score: number; reason: string };
    recentActivity: EmailLogRecord[];
  }> {
    let allLogs: EmailLogRecord[] = [];

    if (isSupabaseConfigured()) {
      try {
        const db = getDbAdmin();
        const { data, error } = await db
          .from('email_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          allLogs = data as EmailLogRecord[];
        }
      } catch (err: any) {
        console.warn('⚠️ [EmailRepository] getStats Supabase error, falling back to memory:', err.message);
      }
    }

    if (allLogs.length === 0) {
      allLogs = [...inMemoryLogs];
    }

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const weekAgoMs = now - 7 * 24 * 60 * 60 * 1000;

    const stats = {
      total: allLogs.length,
      sent: 0,
      pending: 0,
      failed: 0,
      retrying: 0,
      cancelled: 0,
      skipped: 0,
      successRate: 100,
      failureRate: 0,
      sentToday: 0,
      sentThisWeek: 0,
      duplicatesBlocked: 0,
      byType: {} as Record<string, { total: number; sent: number; failed: number; retrying: number }>,
      systemHealth: {
        status: 'HEALTHY' as 'HEALTHY' | 'WARNING' | 'CRITICAL',
        score: 100,
        reason: 'All email transmission pipelines operating normally.',
      },
      recentActivity: allLogs.slice(0, 10),
    };

    for (const log of allLogs) {
      const createdAtMs = new Date(log.created_at).getTime();

      if (log.status === 'SENT') {
        stats.sent++;
        if (createdAtMs >= todayStartMs) stats.sentToday++;
        if (createdAtMs >= weekAgoMs) stats.sentThisWeek++;
      } else if (log.status === 'PENDING') {
        stats.pending++;
      } else if (log.status === 'FAILED') {
        stats.failed++;
      } else if (log.status === 'RETRYING') {
        stats.retrying++;
      } else if (log.status === 'CANCELLED') {
        stats.cancelled++;
      } else if (log.status === 'SKIPPED') {
        stats.skipped++;
        if (log.error_message && log.error_message.toLowerCase().includes('duplicate')) {
          stats.duplicatesBlocked++;
        }
      }

      const type = log.email_type || 'OTHER';
      if (!stats.byType[type]) {
        stats.byType[type] = { total: 0, sent: 0, failed: 0, retrying: 0 };
      }
      stats.byType[type].total++;
      if (log.status === 'SENT') stats.byType[type].sent++;
      if (log.status === 'FAILED') stats.byType[type].failed++;
      if (log.status === 'RETRYING') stats.byType[type].retrying++;
    }

    const operationalTotal = stats.sent + stats.failed;
    if (operationalTotal > 0) {
      stats.successRate = Number(((stats.sent / operationalTotal) * 100).toFixed(1));
      stats.failureRate = Number(((stats.failed / operationalTotal) * 100).toFixed(1));
    } else {
      stats.successRate = 100;
      stats.failureRate = 0;
    }

    // Health Score & Status Calculation
    if (stats.failureRate > 20 || (stats.failed >= 5 && stats.sent === 0)) {
      stats.systemHealth = {
        status: 'CRITICAL',
        score: Math.max(10, Math.round(100 - stats.failureRate * 2)),
        reason: `Elevated failure rate of ${stats.failureRate}% detected. Upstream provider review recommended.`,
      };
    } else if (stats.failureRate > 5 || stats.retrying > 0) {
      stats.systemHealth = {
        status: 'WARNING',
        score: Math.max(60, Math.round(100 - stats.failureRate * 1.5)),
        reason: stats.retrying > 0
          ? `${stats.retrying} emails currently in active backoff retry.`
          : `Minor failure rate of ${stats.failureRate}% within monitoring threshold.`,
      };
    } else {
      stats.systemHealth = {
        status: 'HEALTHY',
        score: Math.max(95, Math.round(100 - stats.failureRate)),
        reason: stats.total > 0
          ? 'All transactional email pipelines operating with optimal delivery rates.'
          : 'Zero email transmissions recorded. Pipeline ready for operation.',
      };
    }

    return stats;
  }
}

export const emailRepository = new EmailRepository();
