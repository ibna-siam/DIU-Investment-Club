import { getDbAdmin } from '../../config/supabase';
import { ClubCommittee, CommitteePosition, CommitteeMemberWithDetails } from '../../types';

export class CommitteesRepository {
  async getCommittees(params?: { status?: string }): Promise<ClubCommittee[]> {
    let query = getDbAdmin()
      .from('club_committees')
      .select('*, members:committee_members(id)')
      .order('start_date', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((c: any) => ({
      ...c,
      members_count: c.members?.length || 0,
    })) as ClubCommittee[];
  }

  async getCommitteeById(id: string): Promise<ClubCommittee | null> {
    const { data, error } = await getDbAdmin()
      .from('club_committees')
      .select(`
        *,
        members:committee_members(
          id,
          committee_id,
          member_id,
          position_id,
          start_date,
          end_date,
          status,
          created_at,
          updated_at,
          position:committee_positions(*),
          member:members(
            id,
            member_code,
            student_id,
            full_name,
            email,
            phone
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('getCommitteeById error:', error);
      return null;
    }
    return data as ClubCommittee;
  }

  async createCommittee(payload: {
    committee_name: string;
    committee_type?: string;
    description?: string;
    start_date: string;
    end_date: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  }): Promise<ClubCommittee> {
    const { data, error } = await getDbAdmin()
      .from('club_committees')
      .insert({
        committee_name: payload.committee_name,
        committee_type: payload.committee_type || 'EXECUTIVE',
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: payload.status || 'ACTIVE',
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClubCommittee;
  }

  async updateCommittee(
    id: string,
    payload: Partial<ClubCommittee>
  ): Promise<ClubCommittee> {
    const { data, error } = await getDbAdmin()
      .from('club_committees')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ClubCommittee;
  }

  async getPositions(params?: { include_inactive?: boolean }): Promise<CommitteePosition[]> {
    let query = getDbAdmin()
      .from('committee_positions')
      .select('*')
      .order('hierarchy_level', { ascending: true });

    if (!params?.include_inactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CommitteePosition[];
  }

  async createPosition(payload: {
    position_name: string;
    description?: string;
    hierarchy_level?: number;
  }): Promise<CommitteePosition> {
    const { data, error } = await getDbAdmin()
      .from('committee_positions')
      .insert({
        position_name: payload.position_name,
        description: payload.description,
        hierarchy_level: payload.hierarchy_level || 10,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CommitteePosition;
  }

  async updatePosition(
    id: string,
    payload: {
      position_name?: string;
      description?: string;
      hierarchy_level?: number;
      is_active?: boolean;
    }
  ): Promise<CommitteePosition> {
    const { data, error } = await getDbAdmin()
      .from('committee_positions')
      .update({
        ...(payload.position_name !== undefined ? { position_name: payload.position_name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.hierarchy_level !== undefined ? { hierarchy_level: payload.hierarchy_level } : {}),
        ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CommitteePosition;
  }

  async togglePositionStatus(id: string, is_active: boolean): Promise<CommitteePosition> {
    const { data, error } = await getDbAdmin()
      .from('committee_positions')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CommitteePosition;
  }

  async deletePosition(id: string): Promise<void> {
    // Check if position is currently assigned to officers
    const { count, error: countErr } = await getDbAdmin()
      .from('committee_members')
      .select('*', { count: 'exact', head: true })
      .eq('position_id', id);

    if (countErr) throw countErr;

    if (count && count > 0) {
      throw new Error(
        `Cannot delete position because it has ${count} assigned officer record(s). Please reassign officers or deactivate the position instead.`
      );
    }

    const { error } = await getDbAdmin()
      .from('committee_positions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async assignMember(payload: {
    committee_id: string;
    member_id: string;
    position_id: string;
    start_date: string;
    end_date?: string;
  }): Promise<CommitteeMemberWithDetails> {
    const { data, error } = await getDbAdmin()
      .from('committee_members')
      .insert({
        committee_id: payload.committee_id,
        member_id: payload.member_id,
        position_id: payload.position_id,
        start_date: payload.start_date,
        end_date: payload.end_date || null,
        status: 'ACTIVE',
      })
      .select(`
        *,
        position:committee_positions(*),
        member:members(
          id,
          member_code,
          student_id,
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;
    return data as CommitteeMemberWithDetails;
  }

  async removeMemberAssignment(id: string, permanent: boolean = false): Promise<void> {
    if (permanent) {
      // Remove the committee assignment row completely, leaving members record intact
      const { error } = await getDbAdmin()
        .from('committee_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      // End appointment by setting end_date and COMPLETED status
      const { error } = await getDbAdmin()
        .from('committee_members')
        .update({ status: 'COMPLETED', end_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);

      if (error) throw error;
    }
  }

  async deleteMemberAssignment(id: string): Promise<void> {
    const { error } = await getDbAdmin()
      .from('committee_members')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const committeesRepository = new CommitteesRepository();
