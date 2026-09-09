import { getDbAdmin } from '../../config/supabase';
import { Meeting, MeetingAgenda, MeetingAttendanceItem, MeetingMinutes } from '../../types';

export class MeetingsRepository {
  async getMeetings(params?: {
    status?: string;
    meeting_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Meeting[]> {
    let query = getDbAdmin()
      .from('meetings')
      .select(`
        *,
        committee:club_committees(id, committee_name),
        agendas:meeting_agendas(id),
        attendance:meeting_attendance(id, attendance_status)
      `)
      .order('meeting_date', { ascending: false });

    if (params?.status) query = query.eq('status', params.status);
    if (params?.meeting_type) query = query.eq('meeting_type', params.meeting_type);
    if (params?.start_date) query = query.gte('meeting_date', params.start_date);
    if (params?.end_date) query = query.lte('meeting_date', params.end_date);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((m: any) => {
      const att = m.attendance || [];
      const present = att.filter((a: any) => a.attendance_status === 'PRESENT').length;
      const total = att.length;
      return {
        ...m,
        attendance_stats: {
          total_invited: total,
          present,
          absent: att.filter((a: any) => a.attendance_status === 'ABSENT').length,
          late: att.filter((a: any) => a.attendance_status === 'LATE').length,
          attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0,
        },
      };
    }) as Meeting[];
  }

  async getMeetingById(id: string): Promise<Meeting | null> {
    const { data, error } = await getDbAdmin()
      .from('meetings')
      .select(`
        *,
        committee:club_committees(id, committee_name),
        agendas:meeting_agendas(*),
        attendance:meeting_attendance(
          *,
          member:members(
            id, member_code, student_id, full_name, email, phone
          )
        ),
        minutes:meeting_minutes(
          *,
          preparer:profiles!prepared_by(full_name, email),
          approver:profiles!approved_by(full_name, email)
        ),
        decisions:decisions(*),
        tasks:tasks(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('getMeetingById error:', error);
      return null;
    }

    const att = data.attendance || [];
    const present = att.filter((a: any) => a.attendance_status === 'PRESENT').length;
    const total = att.length;

    // Order agendas by agenda_order
    if (data.agendas) {
      data.agendas.sort((a: any, b: any) => a.agenda_order - b.agenda_order);
    }

    return {
      ...data,
      attendance_stats: {
        total_invited: total,
        present,
        absent: att.filter((a: any) => a.attendance_status === 'ABSENT').length,
        late: att.filter((a: any) => a.attendance_status === 'LATE').length,
        attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0,
      },
    } as Meeting;
  }

  async createMeeting(payload: {
    title: string;
    meeting_type: string;
    description?: string;
    meeting_date: string;
    start_time: string;
    end_time?: string;
    location?: string;
    meeting_link?: string;
    committee_id?: string;
    created_by?: string;
  }): Promise<Meeting> {
    const { data, error } = await getDbAdmin()
      .from('meetings')
      .insert({
        title: payload.title,
        meeting_type: payload.meeting_type || 'EXECUTIVE_MEETING',
        description: payload.description,
        meeting_date: payload.meeting_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        location: payload.location || 'DIU Main Campus / Virtual',
        meeting_link: payload.meeting_link,
        committee_id: payload.committee_id || null,
        status: 'SCHEDULED',
        created_by: payload.created_by || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Meeting;
  }

  async updateMeeting(id: string, payload: Partial<Meeting>): Promise<Meeting> {
    const { data, error } = await getDbAdmin()
      .from('meetings')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Meeting;
  }

  async addAgenda(
    meetingId: string,
    payload: {
      title: string;
      description?: string;
      priority?: string;
      agenda_order?: number;
    }
  ): Promise<MeetingAgenda> {
    const { data, error } = await getDbAdmin()
      .from('meeting_agendas')
      .insert({
        meeting_id: meetingId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority || 'MEDIUM',
        agenda_order: payload.agenda_order || 1,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    return data as MeetingAgenda;
  }

  async updateAgenda(
    agendaId: string,
    payload: Partial<MeetingAgenda>
  ): Promise<MeetingAgenda> {
    const { data, error } = await getDbAdmin()
      .from('meeting_agendas')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agendaId)
      .select()
      .single();

    if (error) throw error;
    return data as MeetingAgenda;
  }

  async deleteAgenda(agendaId: string): Promise<void> {
    const { error } = await getDbAdmin().from('meeting_agendas').delete().eq('id', agendaId);
    if (error) throw error;
  }

  async recordAttendance(
    meetingId: string,
    items: {
      member_id: string;
      attendance_status: string;
      arrival_time?: string;
      notes?: string;
    }[],
    recordedBy?: string
  ): Promise<void> {
    for (const item of items) {
      await getDbAdmin()
        .from('meeting_attendance')
        .upsert(
          {
            meeting_id: meetingId,
            member_id: item.member_id,
            attendance_status: item.attendance_status,
            arrival_time: item.arrival_time || null,
            notes: item.notes || null,
            recorded_by: recordedBy || null,
          },
          { onConflict: 'meeting_id, member_id' }
        );
    }
  }

  async saveMinutes(
    meetingId: string,
    payload: {
      summary: string;
      discussion_notes?: string;
      prepared_by?: string;
    }
  ): Promise<MeetingMinutes> {
    const { data, error } = await getDbAdmin()
      .from('meeting_minutes')
      .upsert(
        {
          meeting_id: meetingId,
          summary: payload.summary,
          discussion_notes: payload.discussion_notes,
          prepared_by: payload.prepared_by || null,
          status: 'SUBMITTED',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'meeting_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as MeetingMinutes;
  }

  async getMeetingImpact(id: string): Promise<{
    meeting: Meeting;
    agendasCount: number;
    attendanceCount: number;
    decisionsCount: number;
    tasksCount: number;
    hasMinutes: boolean;
    canHardDelete: boolean;
    blockReason?: string;
  }> {
    const meeting = await this.getMeetingById(id);
    if (!meeting) throw new Error('Meeting not found');

    const agendasCount = meeting.agendas?.length || 0;
    const attendanceCount = meeting.attendance?.length || 0;
    const decisionsCount = meeting.decisions?.length || 0;
    const tasksCount = meeting.tasks?.length || 0;
    const hasMinutes = !!meeting.minutes;

    const hasGovernanceRecords = decisionsCount > 0 || hasMinutes;
    const canHardDelete = !hasGovernanceRecords;

    let blockReason: string | undefined;
    if (hasGovernanceRecords) {
      blockReason = 'This meeting has official recorded governance minutes or adopted decisions. It cannot be permanently deleted. Use "Cancel Meeting" instead to preserve institutional records.';
    }

    return {
      meeting,
      agendasCount,
      attendanceCount,
      decisionsCount,
      tasksCount,
      hasMinutes,
      canHardDelete,
      blockReason,
    };
  }

  async deleteMeeting(
    id: string,
    action: 'CANCEL' | 'HARD_DELETE',
    reason?: string
  ): Promise<{ success: boolean; message: string; actionTaken: string }> {
    const impact = await this.getMeetingImpact(id);

    if (action === 'HARD_DELETE') {
      if (!impact.canHardDelete) {
        throw new Error(impact.blockReason || 'Cannot permanently delete meeting with adopted decisions or minutes.');
      }

      // Remove non-governance child rows
      await getDbAdmin().from('tasks').update({ related_meeting_id: null }).eq('related_meeting_id', id);
      await getDbAdmin().from('meeting_attendance').delete().eq('meeting_id', id);
      await getDbAdmin().from('meeting_agendas').delete().eq('meeting_id', id);

      const { error } = await getDbAdmin().from('meetings').delete().eq('id', id);
      if (error) throw error;

      return {
        success: true,
        message: 'Meeting scheduled session deleted permanently.',
        actionTaken: 'HARD_DELETE',
      };
    }

    // Default to CANCEL: sets status = CANCELLED
    const { error } = await getDbAdmin()
      .from('meetings')
      .update({
        status: 'CANCELLED',
        description: reason ? `[Cancelled: ${reason}] ${impact.meeting.description || ''}`.trim() : impact.meeting.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return {
      success: true,
      message: 'Meeting cancelled safely. All governance records remain intact.',
      actionTaken: 'CANCEL',
    };
  }

  async approveMinutes(minutesId: string, approvedBy: string): Promise<MeetingMinutes> {
    const { data, error } = await getDbAdmin()
      .from('meeting_minutes')
      .update({
        status: 'PUBLISHED',
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', minutesId)
      .select()
      .single();

    if (error) throw error;
    return data as MeetingMinutes;
  }
}

export const meetingsRepository = new MeetingsRepository();

