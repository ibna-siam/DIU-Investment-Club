import { getDbAdmin } from '../../config/supabase';
import { ClubDecision, ClubTask } from '../../types';

export class DecisionsRepository {
  async getDecisions(params?: {
    status?: string;
    decision_type?: string;
    meeting_id?: string;
  }): Promise<ClubDecision[]> {
    let query = getDbAdmin()
      .from('decisions')
      .select(`
        *,
        meeting:meetings(id, title, meeting_date),
        responsible_person:profiles!responsible_person_id(id, full_name, email),
        tasks:tasks(id)
      `)
      .order('decision_date', { ascending: false });

    if (params?.status) query = query.eq('status', params.status);
    if (params?.decision_type) query = query.eq('decision_type', params.decision_type);
    if (params?.meeting_id) query = query.eq('meeting_id', params.meeting_id);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((d: any) => ({
      ...d,
      tasks_count: d.tasks?.length || 0,
    })) as ClubDecision[];
  }

  async getDecisionById(id: string): Promise<ClubDecision | null> {
    const { data, error } = await getDbAdmin()
      .from('decisions')
      .select(`
        *,
        meeting:meetings(id, title, meeting_date, location),
        responsible_person:profiles!responsible_person_id(id, full_name, email),
        tasks:tasks(
          id, title, status, priority, due_date,
          assignee:profiles!assigned_to(full_name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data as ClubDecision;
  }

  async createDecision(payload: {
    meeting_id?: string;
    title: string;
    description: string;
    decision_date?: string;
    decision_type?: string;
    status?: string;
    effective_date?: string;
    responsible_person_id?: string;
    created_by?: string;
  }): Promise<ClubDecision> {
    const { data, error } = await getDbAdmin()
      .from('decisions')
      .insert({
        meeting_id: payload.meeting_id || null,
        title: payload.title,
        description: payload.description,
        decision_date: payload.decision_date || new Date().toISOString().split('T')[0],
        decision_type: payload.decision_type || 'GOVERNANCE',
        status: payload.status || 'PROPOSED',
        effective_date: payload.effective_date || null,
        responsible_person_id: payload.responsible_person_id || null,
        created_by: payload.created_by || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClubDecision;
  }

  async updateDecision(id: string, payload: Partial<ClubDecision>): Promise<ClubDecision> {
    const { data, error } = await getDbAdmin()
      .from('decisions')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ClubDecision;
  }

  async createActionItemTask(
    decisionId: string,
    payload: {
      title: string;
      description?: string;
      assigned_to?: string;
      due_date?: string;
      priority?: string;
      created_by?: string;
    }
  ): Promise<ClubTask> {
    const decision = await this.getDecisionById(decisionId);
    if (!decision) throw new Error('Decision not found');

    const { data, error } = await getDbAdmin()
      .from('tasks')
      .insert({
        title: payload.title,
        description: payload.description || `Action item resulting from club decision: ${decision.title}`,
        priority: payload.priority || 'HIGH',
        status: 'TODO',
        assigned_to: payload.assigned_to || decision.responsible_person_id || null,
        created_by: payload.created_by || null,
        due_date: payload.due_date || decision.effective_date || null,
        related_decision_id: decisionId,
        related_meeting_id: decision.meeting_id || null,
      })
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data as ClubTask;
  }
}

export const decisionsRepository = new DecisionsRepository();
