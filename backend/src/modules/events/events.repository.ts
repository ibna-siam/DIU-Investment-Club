import { supabaseAdmin, supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { Event, EventStatus, EventType } from '../../types';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class EventsRepository {
  private get client() {
    return supabaseAdmin || supabaseClient;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async list(options: {
    page?: number;
    limit?: number;
    status?: string;
    event_type?: string;
    search?: string;
  }): Promise<{ data: Event[]; total: number; page: number; limit: number; totalPages: number }> {
    if (!isSupabaseConfigured() || !this.client) {
      return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }

    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    let query = this.client
      .from('events')
      .select('*, creator:profiles!events_created_by_fkey(full_name)', { count: 'exact' })
      .is('deleted_at', null);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.event_type) {
      query = query.eq('event_type', options.event_type);
    }
    if (options.search) {
      const s = `%${options.search}%`;
      query = query.or(`title.ilike.${s},event_code.ilike.${s},venue.ilike.${s}`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    const total = count || 0;
    const events: Event[] = (data || []).map((e: any) => ({
      ...e,
      creator_name: e.creator?.full_name || null,
    }));

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Event | null> {
    if (!isSupabaseConfigured() || !this.client) return null;

    const { data, error } = await this.client
      .from('events')
      .select('*, creator:profiles!events_created_by_fkey(full_name)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      creator_name: data.creator?.full_name || null,
    };
  }

  async findBySlug(slug: string): Promise<Event | null> {
    if (!isSupabaseConfigured() || !this.client) return null;

    const { data, error } = await this.client
      .from('events')
      .select('*, creator:profiles!events_created_by_fkey(full_name)')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      creator_name: data.creator?.full_name || null,
    };
  }

  async create(
    payload: {
      title: string;
      short_description?: string;
      description?: string;
      event_type: EventType;
      start_date: string;
      end_date: string;
      venue: string;
      location?: string;
      organizer?: string;
      expected_participants?: number;
      cover_image?: string;
    },
    userId: string
  ): Promise<Event> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    // 1. Generate Event Code
    const { data: codeData, error: codeErr } = await this.client.rpc('generate_event_code');
    if (codeErr || !codeData) {
      throw new Error(`Failed to generate event code: ${codeErr?.message}`);
    }
    const eventCode = codeData;

    // 2. Generate Unique Slug
    let baseSlug = this.slugify(payload.title);
    if (!baseSlug) baseSlug = 'event';
    const slug = `${baseSlug}-${eventCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const insertData = {
      event_code: eventCode,
      title: payload.title,
      slug,
      short_description: payload.short_description || null,
      description: payload.description || null,
      event_type: payload.event_type || 'SEMINAR',
      status: 'DRAFT',
      start_date: payload.start_date,
      end_date: payload.end_date,
      venue: payload.venue,
      location: payload.location || null,
      organizer: payload.organizer || 'DIU Investment Club',
      expected_participants: payload.expected_participants || 0,
      actual_participants: 0,
      cover_image: payload.cover_image || null,
      created_by: userId,
    };

    const { data, error } = await this.client
      .from('events')
      .insert(insertData)
      .select('*, creator:profiles!events_created_by_fkey(full_name)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create event');
    }

    await auditLogsRepository.log({
      user_id: userId,
      action: 'EVENT_CREATED',
      module: 'events',
      record_id: data.id,
      new_data: data,
    });

    return {
      ...data,
      creator_name: data.creator?.full_name || null,
    };
  }

  async update(
    id: string,
    payload: Partial<{
      title: string;
      short_description: string;
      description: string;
      event_type: EventType;
      start_date: string;
      end_date: string;
      venue: string;
      location: string;
      organizer: string;
      expected_participants: number;
      actual_participants: number;
      cover_image: string;
    }>,
    userId: string
  ): Promise<Event> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    const current = await this.findById(id);
    if (!current) throw new Error('Event not found');

    if (current.status === 'CLOSED') {
      throw new Error('Closed events cannot be edited without reopening');
    }

    const { data, error } = await this.client
      .from('events')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, creator:profiles!events_created_by_fkey(full_name)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update event');
    }

    await auditLogsRepository.log({
      user_id: userId,
      action: 'EVENT_UPDATED',
      module: 'events',
      record_id: id,
      old_data: current,
      new_data: data,
    });

    return {
      ...data,
      creator_name: data.creator?.full_name || null,
    };
  }

  async updateStatus(id: string, newStatus: EventStatus, userId: string, reason?: string): Promise<Event> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    const current = await this.findById(id);
    if (!current) throw new Error('Event not found');

    if (current.status === newStatus) {
      return current;
    }

    // Special procedure: Close Event
    if (newStatus === 'CLOSED') {
      const { data: closeData, error: closeErr } = await this.client.rpc('close_event', {
        p_event_id: id,
        p_user_id: userId,
      });
      if (closeErr) throw new Error(closeErr.message);
      return (await this.findById(id))!;
    }

    // Special procedure: Reopen Event
    if (current.status === 'CLOSED' && newStatus === 'FINANCIAL_REVIEW') {
      const { data: reopenData, error: reopenErr } = await this.client.rpc('reopen_event', {
        p_event_id: id,
        p_reason: reason || 'Administrative review',
        p_user_id: userId,
      });
      if (reopenErr) throw new Error(reopenErr.message);
      return (await this.findById(id))!;
    }

    // Validate allowed status transitions
    const allowedTransitions: Record<EventStatus, EventStatus[]> = {
      DRAFT: ['PLANNED', 'CANCELLED'],
      PLANNED: ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED', 'DRAFT'],
      PENDING_APPROVAL: ['APPROVED', 'PLANNED', 'CANCELLED'],
      APPROVED: ['ONGOING', 'CANCELLED', 'PLANNED'],
      ONGOING: ['COMPLETED', 'CANCELLED'],
      COMPLETED: ['FINANCIAL_REVIEW', 'ONGOING'],
      FINANCIAL_REVIEW: ['CLOSED', 'COMPLETED'],
      CLOSED: ['FINANCIAL_REVIEW'], // via reopen_event
      CANCELLED: ['DRAFT', 'PLANNED'],
      ARCHIVED: ['DRAFT'],
    };

    const allowed = allowedTransitions[current.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid event status transition from "${current.status}" to "${newStatus}". Allowed: ${allowed.join(', ')}`
      );
    }

    const { data, error } = await this.client
      .from('events')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, creator:profiles!events_created_by_fkey(full_name)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update event status');
    }

    await auditLogsRepository.log({
      user_id: userId,
      action: `EVENT_STATUS_${newStatus}`,
      module: 'events',
      record_id: id,
      old_data: { status: current.status },
      new_data: { status: newStatus, reason },
    });

    return {
      ...data,
      creator_name: data.creator?.full_name || null,
    };
  }

  async delete(id: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    const event = await this.findById(id);
    if (!event) throw new Error('Event not found');

    // Rule: Events with financial records (income or expenses) cannot be permanently deleted
    const { count: incCount } = await this.client
      .from('incomes')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .is('deleted_at', null);

    const { count: expCount } = await this.client
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .is('deleted_at', null);

    if ((incCount || 0) > 0 || (expCount || 0) > 0) {
      throw new Error(
        'Integrity Guard: Events containing financial transactions (income or expenses) cannot be deleted. Use Archive instead.'
      );
    }

    // Soft delete
    const { error } = await this.client
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    await auditLogsRepository.log({
      user_id: userId,
      action: 'EVENT_DELETED',
      module: 'events',
      record_id: id,
      old_data: event,
    });

    return true;
  }
}

export const eventsRepository = new EventsRepository();
