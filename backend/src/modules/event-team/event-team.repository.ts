import { supabaseAdmin, supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { EventMember, EventRole } from '../../types';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class EventTeamRepository {
  private get client() {
    return supabaseAdmin || supabaseClient;
  }

  async list(eventId: string, includeRemoved: boolean = false): Promise<EventMember[]> {
    if (!isSupabaseConfigured() || !this.client) return [];

    let query = this.client
      .from('event_members')
      .select('*, user:profiles!event_members_user_id_fkey(full_name, email), assigner:profiles!event_members_assigned_by_fkey(full_name)')
      .eq('event_id', eventId);

    if (!includeRemoved) {
      query = query.is('removed_at', null);
    }

    const { data, error } = await query.order('assigned_at', { ascending: true });
    if (error) throw new Error(error.message);

    return (data || []).map((m: any) => ({
      ...m,
      role: m.event_role,
      responsibilities: m.responsibility,
      user_name: m.user?.full_name || null,
      user_email: m.user?.email || null,
      assigned_by_name: m.assigner?.full_name || null,
    }));
  }

  async addMember(payload: {
    event_id: string;
    user_id: string;
    event_role: EventRole;
    responsibility?: string;
    assigned_by: string;
  }): Promise<EventMember> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    // Check if member is already actively assigned
    const { data: existing } = await this.client
      .from('event_members')
      .select('id')
      .eq('event_id', payload.event_id)
      .eq('user_id', payload.user_id)
      .is('removed_at', null)
      .maybeSingle();

    if (existing) {
      throw new Error('This user is already an active member of this event committee');
    }

    const insertData = {
      event_id: payload.event_id,
      user_id: payload.user_id,
      event_role: payload.event_role || 'TEAM_MEMBER',
      responsibility: payload.responsibility || null,
      assigned_by: payload.assigned_by,
      assigned_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('event_members')
      .insert(insertData)
      .select('*, user:profiles!event_members_user_id_fkey(full_name, email), assigner:profiles!event_members_assigned_by_fkey(full_name)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to assign event member');
    }

    await auditLogsRepository.log({
      user_id: payload.assigned_by,
      action: 'EVENT_MEMBER_ASSIGNED',
      module: 'events',
      record_id: data.id,
      new_data: data,
    });

    return {
      ...data,
      role: data.event_role,
      responsibilities: data.responsibility,
      user_name: data.user?.full_name || null,
      user_email: data.user?.email || null,
      assigned_by_name: data.assigner?.full_name || null,
    };
  }

  async updateMember(
    id: string,
    payload: { event_role?: EventRole; responsibility?: string },
    userId: string
  ): Promise<EventMember> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    const { data, error } = await this.client
      .from('event_members')
      .update(payload)
      .eq('id', id)
      .select('*, user:profiles!event_members_user_id_fkey(full_name, email), assigner:profiles!event_members_assigned_by_fkey(full_name)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update event member');
    }

    await auditLogsRepository.log({
      user_id: userId,
      action: 'EVENT_MEMBER_UPDATED',
      module: 'events',
      record_id: id,
      new_data: data,
    });

    return {
      ...data,
      user_name: data.user?.full_name || null,
      user_email: data.user?.email || null,
      assigned_by_name: data.assigner?.full_name || null,
    };
  }

  async removeMember(id: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    // Soft remove: set removed_at = NOW()
    const { data, error } = await this.client
      .from('event_members')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await auditLogsRepository.log({
      user_id: userId,
      action: 'EVENT_MEMBER_REMOVED',
      module: 'events',
      record_id: id,
      old_data: data,
    });

    return true;
  }
}

export const eventTeamRepository = new EventTeamRepository();
