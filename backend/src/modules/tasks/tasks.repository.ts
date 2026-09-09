import { getDbAdmin } from '../../config/supabase';
import { ClubTask, TaskCommentItem } from '../../types';

export class TasksRepository {
  async getTasks(params?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    related_event_id?: string;
    related_meeting_id?: string;
    search?: string;
  }): Promise<ClubTask[]> {
    let query = getDbAdmin()
      .from('tasks')
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, email),
        creator:profiles!created_by(id, full_name),
        related_event:events(id, title),
        related_meeting:meetings(id, title),
        related_decision:decisions(id, title),
        comments:task_comments(id)
      `)
      .order('created_at', { ascending: false });

    if (params?.status) query = query.eq('status', params.status);
    if (params?.priority) query = query.eq('priority', params.priority);
    if (params?.assigned_to) query = query.eq('assigned_to', params.assigned_to);
    if (params?.related_event_id) query = query.eq('related_event_id', params.related_event_id);
    if (params?.related_meeting_id) query = query.eq('related_meeting_id', params.related_meeting_id);
    if (params?.search) query = query.ilike('title', `%${params.search}%`);

    const { data, error } = await query;
    if (error) throw error;

    const todayStr = new Date().toISOString().split('T')[0];

    return (data || []).map((t: any) => ({
      ...t,
      is_overdue: t.due_date && t.due_date < todayStr && t.status !== 'COMPLETED' && t.status !== 'CANCELLED',
    })) as ClubTask[];
  }

  async getTaskById(id: string): Promise<ClubTask | null> {
    const { data, error } = await getDbAdmin()
      .from('tasks')
      .select(`
        *,
        assignee:profiles!assigned_to(id, full_name, email),
        creator:profiles!created_by(id, full_name),
        related_event:events(id, title),
        related_meeting:meetings(id, title),
        related_decision:decisions(id, title),
        comments:task_comments(
          id, task_id, user_id, comment, created_at,
          user:profiles(id, full_name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    return {
      ...data,
      is_overdue:
        data.due_date &&
        data.due_date < todayStr &&
        data.status !== 'COMPLETED' &&
        data.status !== 'CANCELLED',
    } as ClubTask;
  }

  async createTask(payload: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    assigned_to?: string;
    created_by?: string;
    due_date?: string;
    related_event_id?: string;
    related_meeting_id?: string;
    related_decision_id?: string;
  }): Promise<ClubTask> {
    const { data, error } = await getDbAdmin()
      .from('tasks')
      .insert({
        title: payload.title,
        description: payload.description,
        priority: payload.priority || 'MEDIUM',
        status: payload.status || 'TODO',
        assigned_to: payload.assigned_to || null,
        created_by: payload.created_by || null,
        due_date: payload.due_date || null,
        related_event_id: payload.related_event_id || null,
        related_meeting_id: payload.related_meeting_id || null,
        related_decision_id: payload.related_decision_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClubTask;
  }

  async updateTask(id: string, payload: Partial<ClubTask>): Promise<ClubTask> {
    const updates: any = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    if (payload.status === 'COMPLETED' && !payload.completed_at) {
      updates.completed_at = new Date().toISOString();
    } else if (payload.status && payload.status !== 'COMPLETED') {
      updates.completed_at = null;
    }

    const { data, error } = await getDbAdmin()
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ClubTask;
  }

  async addComment(
    taskId: string,
    payload: { user_id: string; comment: string }
  ): Promise<TaskCommentItem> {
    const { data, error } = await getDbAdmin()
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: payload.user_id,
        comment: payload.comment,
      })
      .select(`
        *,
        user:profiles(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data as TaskCommentItem;
  }

  async deleteTask(
    id: string,
    action: 'CANCEL' | 'ARCHIVE' | 'HARD_DELETE' = 'CANCEL',
    reason?: string
  ): Promise<{ success: boolean; message: string; actionTaken: string }> {
    const task = await this.getTaskById(id);
    if (!task) throw new Error('Task not found');

    if (action === 'HARD_DELETE') {
      // Remove comments first
      await getDbAdmin().from('task_comments').delete().eq('task_id', id);
      const { error } = await getDbAdmin().from('tasks').delete().eq('id', id);
      if (error) throw error;
      return {
        success: true,
        message: 'Task item deleted permanently.',
        actionTaken: 'HARD_DELETE',
      };
    }

    // Default to CANCELLED status
    const { error } = await getDbAdmin()
      .from('tasks')
      .update({
        status: 'CANCELLED',
        description: reason ? `[Cancelled: ${reason}] ${task.description || ''}`.trim() : task.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return {
      success: true,
      message: 'Task cancelled safely. Accountability audit history preserved.',
      actionTaken: 'CANCEL',
    };
  }
}

export const tasksRepository = new TasksRepository();

