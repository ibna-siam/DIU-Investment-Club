import { getDbAdmin } from '../../config/supabase';
import { OperationsSummary } from '../../types';

export class OperationsRepository {
  async getOperationsSummary(): Promise<OperationsSummary> {
    const today = new Date().toISOString().split('T')[0];

    // 1. Upcoming Meetings
    const { data: upcomingMeetings, error: meetErr } = await getDbAdmin()
      .from('meetings')
      .select('*, committee:club_committees(committee_name)')
      .gte('meeting_date', today)
      .neq('status', 'CANCELLED')
      .order('meeting_date', { ascending: true })
      .limit(5);

    // 2. Pending Decisions
    const { data: pendingDecisions, error: decErr } = await getDbAdmin()
      .from('decisions')
      .select('*, responsible_person:profiles!responsible_person_id(full_name, email)')
      .eq('status', 'PROPOSED')
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. Active Tasks & Overdue Tasks
    const { data: activeTasks, error: taskErr } = await getDbAdmin()
      .from('tasks')
      .select('*, assignee:profiles!assigned_to(full_name, email)')
      .in('status', ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW'])
      .order('due_date', { ascending: true })
      .limit(6);

    const { count: activeTasksCount } = await getDbAdmin()
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW']);

    const { count: overdueTasksCount } = await getDbAdmin()
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW'])
      .lt('due_date', today);

    // 4. Documents Count & Recent Documents
    const { count: totalDocsCount } = await getDbAdmin()
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    const { data: recentDocs } = await getDbAdmin()
      .from('documents')
      .select('*, uploader:profiles(full_name)')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(5);

    // 5. Assets Count & Status
    const { count: totalAssetsCount } = await getDbAdmin()
      .from('club_assets')
      .select('id', { count: 'exact', head: true });

    const { count: assetsInUseCount } = await getDbAdmin()
      .from('club_assets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['ASSIGNED', 'IN_USE']);

    // 6. Active Committee
    const { data: activeCommittee } = await getDbAdmin()
      .from('club_committees')
      .select('*, members:committee_members(id)')
      .eq('status', 'ACTIVE')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 7. Recent Governance Activity from audit_logs
    const { data: recentLogs } = await getDbAdmin()
      .from('audit_logs')
      .select('id, action, module, created_at, user:profiles(full_name)')
      .in('module', ['committee', 'documents', 'meetings', 'decisions', 'tasks', 'assets'])
      .order('created_at', { ascending: false })
      .limit(8);

    const formattedLogs = (recentLogs || []).map((l: any) => ({
      id: l.id,
      action: l.action,
      module: l.module,
      user_name: l.user?.full_name || 'System / Officer',
      created_at: l.created_at,
    }));

    return {
      upcoming_meetings_count: upcomingMeetings?.length || 0,
      pending_decisions_count: pendingDecisions?.length || 0,
      active_tasks_count: activeTasksCount || 0,
      overdue_tasks_count: overdueTasksCount || 0,
      total_documents_count: totalDocsCount || 0,
      total_assets_count: totalAssetsCount || 0,
      assets_in_use_count: assetsInUseCount || 0,
      active_committee_name: activeCommittee?.committee_name,
      active_committee_members_count: activeCommittee?.members?.length || 0,
      recent_meetings: (upcomingMeetings || []) as any,
      recent_tasks: (activeTasks || []).map((t: any) => ({
        ...t,
        is_overdue: t.due_date && t.due_date < today,
      })) as any,
      recent_decisions: (pendingDecisions || []) as any,
      recent_documents: (recentDocs || []) as any,
      recent_activity: formattedLogs,
    };
  }
}

export const operationsRepository = new OperationsRepository();
