import { getDbAdmin } from '../../config/supabase';
import {
  AutomationRule,
  AutomationRuleStatus,
  AutomationLog,
  AutomationDashboardMetrics,
} from '../../types';

export class AutomationRepository {
  async getRules(params?: { status?: string; trigger_type?: string }): Promise<AutomationRule[]> {
    let query = getDbAdmin()
      .from('automation_rules')
      .select(`
        *,
        creator:profiles!created_by(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.trigger_type) {
      query = query.eq('trigger_type', params.trigger_type);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      creator_name: r.creator?.full_name || null,
    })) as AutomationRule[];
  }

  async getRuleById(id: string): Promise<AutomationRule | null> {
    const { data, error } = await getDbAdmin()
      .from('automation_rules')
      .select(`
        *,
        creator:profiles!created_by(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return {
      ...data,
      creator_name: data.creator?.full_name || null,
    } as AutomationRule;
  }

  async createRule(payload: Partial<AutomationRule>, userId?: string): Promise<AutomationRule> {
    const { data, error } = await getDbAdmin()
      .from('automation_rules')
      .insert({
        name: payload.name,
        description: payload.description || null,
        trigger_type: payload.trigger_type,
        conditions: payload.conditions || [],
        actions: payload.actions || [],
        status: payload.status || 'ACTIVE',
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AutomationRule;
  }

  async updateRule(id: string, payload: Partial<AutomationRule>): Promise<AutomationRule> {
    const { data, error } = await getDbAdmin()
      .from('automation_rules')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AutomationRule;
  }

  async setRuleStatus(id: string, status: AutomationRuleStatus): Promise<AutomationRule> {
    return this.updateRule(id, { status });
  }

  async deleteRule(id: string): Promise<void> {
    const { error } = await getDbAdmin()
      .from('automation_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getLogs(params?: {
    rule_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AutomationLog[]; total: number }> {
    let query = getDbAdmin()
      .from('automation_logs')
      .select(`
        *,
        rule:automation_rules(id, name)
      `, { count: 'exact' })
      .order('execution_time', { ascending: false });

    if (params?.rule_id) {
      query = query.eq('rule_id', params.rule_id);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const logs = (data || []).map((l: any) => ({
      ...l,
      rule_name: l.rule?.name || null,
    })) as AutomationLog[];

    return { logs, total: count || 0 };
  }

  async logExecution(entry: Partial<AutomationLog>): Promise<AutomationLog> {
    const { data, error } = await getDbAdmin()
      .from('automation_logs')
      .insert({
        rule_id: entry.rule_id || null,
        trigger_type: entry.trigger_type,
        execution_time: entry.execution_time || new Date().toISOString(),
        action_type: entry.action_type,
        result: entry.result || {},
        status: entry.status || 'SUCCESS',
        error_message: entry.error_message || null,
        record_id: entry.record_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Increment execution count and timestamp on rule
    if (entry.rule_id) {
      const { data: currentRule } = await getDbAdmin()
        .from('automation_rules')
        .select('execution_count')
        .eq('id', entry.rule_id)
        .single();

      await getDbAdmin()
        .from('automation_rules')
        .update({
          execution_count: (currentRule?.execution_count || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', entry.rule_id);
    }

    return data as AutomationLog;
  }

  async getDashboardMetrics(): Promise<AutomationDashboardMetrics> {
    const db = getDbAdmin();

    const [
      rulesRes,
      logsTodayRes,
      pendingRemindersRes,
      recurringTxRes,
      recurringTasksRes,
      overdueTasksRes,
      overdueDuesRes,
      pendingEscalationsRes,
    ] = await Promise.all([
      db.from('automation_rules').select('status'),
      db.from('automation_logs').select('status').gte('execution_time', new Date(new Date().setHours(0,0,0,0)).toISOString()),
      db.from('reminders').select('id', { count: 'exact' }).eq('status', 'PENDING'),
      db.from('recurring_transactions').select('id', { count: 'exact' }).eq('status', 'ACTIVE'),
      db.from('recurring_tasks').select('id', { count: 'exact' }).eq('status', 'ACTIVE'),
      db.from('tasks').select('id', { count: 'exact' }).lt('due_date', new Date().toISOString().split('T')[0]).not('status', 'in', '("COMPLETED","CANCELLED")'),
      db.from('member_dues').select('id', { count: 'exact' }).lt('due_date', new Date().toISOString().split('T')[0]).not('status', 'eq', 'PAID'),
      db.from('approval_requests').select('id', { count: 'exact' }).eq('status', 'PENDING').lt('created_at', new Date(Date.now() - 3 * 86400000).toISOString()),
    ]);

    const rules = rulesRes.data || [];
    const activeRules = rules.filter(r => r.status === 'ACTIVE').length;
    const logsToday = logsTodayRes.data || [];
    const successfulExecs = logsToday.filter(l => l.status === 'SUCCESS').length;
    const failedExecs = logsToday.filter(l => l.status === 'FAILED').length;

    return {
      active_rules_count: activeRules,
      total_rules_count: rules.length,
      executions_today: logsToday.length,
      successful_executions: successfulExecs,
      failed_executions: failedExecs,
      pending_reminders_count: pendingRemindersRes.count || 0,
      active_recurring_transactions: recurringTxRes.count || 0,
      active_recurring_tasks: recurringTasksRes.count || 0,
      overdue_tasks_count: overdueTasksRes.count || 0,
      overdue_dues_count: overdueDuesRes.count || 0,
      pending_escalations_count: pendingEscalationsRes.count || 0,
    };
  }
}

export const automationRepository = new AutomationRepository();
