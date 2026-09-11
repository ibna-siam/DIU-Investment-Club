import { api } from '../lib/api';
import {
  AutomationRule,
  AutomationRuleStatus,
  AutomationLog,
  AutomationDashboardMetrics,
  RecurringTransaction,
  RecurringTransactionStatus,
  RecurringTask,
  RecurringTaskStatus,
  Reminder,
  MonthEndChecklist,
  MonthEndChecklistItem,
} from '../types/automation';

function toQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const automationService = {
  // --- Dashboard Metrics & Execution ---
  async getMetrics(): Promise<AutomationDashboardMetrics> {
    const res = await api.get<any>('/automation/metrics');
    return res.data;
  },

  async executeRunner(): Promise<any> {
    const res = await api.post<any>('/automation/execute-runner', {});
    return res.data;
  },

  async getLogs(params?: {
    rule_id?: string;
    status?: string;
    trigger_type?: string;
    search?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AutomationLog[]; total: number; page: number; totalPages: number }> {
    const res = await api.get<any>(`/automation/logs${toQuery(params)}`);
    return {
      logs: res.data || [],
      total: res.total || 0,
      page: res.page || 1,
      totalPages: res.totalPages || 1,
    };
  },

  // --- Automation Rules ---
  async getRules(params?: { status?: string; trigger_type?: string }): Promise<AutomationRule[]> {
    const res = await api.get<any>(`/automation/rules${toQuery(params)}`);
    return res.data || [];
  },

  async getRuleById(id: string): Promise<AutomationRule> {
    const res = await api.get<any>(`/automation/rules/${id}`);
    return res.data;
  },

  async createRule(data: Partial<AutomationRule>): Promise<AutomationRule> {
    const res = await api.post<any>('/automation/rules', data);
    return res.data;
  },

  async updateRule(id: string, data: Partial<AutomationRule>): Promise<AutomationRule> {
    const res = await api.put<any>(`/automation/rules/${id}`, data);
    return res.data;
  },

  async toggleRuleStatus(id: string, status: AutomationRuleStatus): Promise<AutomationRule> {
    const res = await api.patch<any>(`/automation/rules/${id}/status`, { status });
    return res.data;
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/automation/rules/${id}`);
  },

  // --- Recurring Operations: Transactions ---
  async getRecurringTransactions(params?: { status?: string }): Promise<RecurringTransaction[]> {
    const res = await api.get<any>(`/recurring-operations/transactions${toQuery(params)}`);
    return res.data || [];
  },

  async getRecurringTransactionById(id: string): Promise<RecurringTransaction> {
    const res = await api.get<any>(`/recurring-operations/transactions/${id}`);
    return res.data;
  },

  async createRecurringTransaction(data: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    const res = await api.post<any>('/recurring-operations/transactions', data);
    return res.data;
  },

  async updateRecurringTransaction(id: string, data: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    const res = await api.put<any>(`/recurring-operations/transactions/${id}`, data);
    return res.data;
  },

  async setRecurringTransactionStatus(id: string, status: RecurringTransactionStatus): Promise<RecurringTransaction> {
    const res = await api.patch<any>(`/recurring-operations/transactions/${id}/status`, { status });
    return res.data;
  },

  async processDueRecurringTransactions(): Promise<{ generated: number; items: any[] }> {
    const res = await api.post<any>('/recurring-operations/transactions/process-due', {});
    return res.data;
  },

  // --- Recurring Operations: Tasks ---
  async getRecurringTasks(params?: { status?: string }): Promise<RecurringTask[]> {
    const res = await api.get<any>(`/recurring-operations/tasks${toQuery(params)}`);
    return res.data || [];
  },

  async getRecurringTaskById(id: string): Promise<RecurringTask> {
    const res = await api.get<any>(`/recurring-operations/tasks/${id}`);
    return res.data;
  },

  async createRecurringTask(data: Partial<RecurringTask>): Promise<RecurringTask> {
    const res = await api.post<any>('/recurring-operations/tasks', data);
    return res.data;
  },

  async updateRecurringTask(id: string, data: Partial<RecurringTask>): Promise<RecurringTask> {
    const res = await api.put<any>(`/recurring-operations/tasks/${id}`, data);
    return res.data;
  },

  async setRecurringTaskStatus(id: string, status: RecurringTaskStatus): Promise<RecurringTask> {
    const res = await api.patch<any>(`/recurring-operations/tasks/${id}/status`, { status });
    return res.data;
  },

  async processDueRecurringTasks(): Promise<{ generated: number; items: any[] }> {
    const res = await api.post<any>('/recurring-operations/tasks/process-due', {});
    return res.data;
  },

  // --- Smart Reminders & Overdue ---
  async getReminders(params?: {
    status?: string;
    reminder_type?: string;
    user_id?: string;
    search?: string;
  }): Promise<Reminder[]> {
    const res = await api.get<any>(`/reminders${toQuery(params)}`);
    return res.data || [];
  },

  async getReminderById(id: string): Promise<Reminder> {
    const res = await api.get<any>(`/reminders/${id}`);
    return res.data;
  },

  async getReminderStats(): Promise<{
    total: number;
    upcoming: number;
    sentToday: number;
    pending: number;
    failed: number;
    cancelled: number;
    byType: Record<string, number>;
    timezone: string;
    scheduler: {
      running: boolean;
      intervalSeconds: number;
      totalTicks: number;
      lastTickAt: string | null;
      lastResult: any;
    };
  }> {
    const res = await api.get<any>('/reminders/stats');
    return res.data;
  },

  async createReminder(data: Partial<Reminder>): Promise<Reminder> {
    const res = await api.post<any>('/reminders', data);
    return res.data;
  },

  async scheduleEntityReminders(data: {
    entityType: string;
    entityId: string;
    title: string;
    targetDate: string;
    recipientUserId?: string;
    recipientEmail?: string;
    recipientName?: string;
    recipientRole?: string;
    message?: string;
    priority?: string;
    customOffsets?: string[];
  }): Promise<Reminder[]> {
    const res = await api.post<any>('/reminders/schedule-entity', data);
    return res.data || [];
  },

  async cancelReminder(id: string, reason?: string): Promise<Reminder> {
    const res = await api.patch<any>(`/reminders/${id}/cancel`, { reason });
    return res.data;
  },

  async rescheduleReminder(id: string, scheduledAt: string, reason?: string): Promise<Reminder> {
    const res = await api.patch<any>(`/reminders/${id}/reschedule`, { scheduledAt, reason });
    return res.data;
  },

  async retryReminder(id: string): Promise<Reminder> {
    const res = await api.post<any>(`/reminders/${id}/retry`, {});
    return res.data;
  },

  async processDueReminders(): Promise<{ sent: number; reminders: any[] }> {
    const res = await api.post<any>('/reminders/process-due', {});
    return res.data;
  },

  async triggerSchedulerTick(): Promise<any> {
    const res = await api.post<any>('/reminders/scheduler/tick', {});
    return res.data;
  },

  async runOverdueSweep(): Promise<{
    overdue_tasks: number;
    overdue_dues: number;
    overdue_assets: number;
    pending_escalations: number;
    alerts_created: number;
  }> {
    const res = await api.post<any>('/reminders/overdue-sweep', {});
    return res.data;
  },

  // --- Month-End Closing Workflow ---
  async getMonthEndChecklists(params?: { month_year?: string }): Promise<MonthEndChecklist[]> {
    const res = await api.get<any>(`/month-end${toQuery(params)}`);
    return res.data || [];
  },

  async getCurrentMonthChecklist(monthYear?: string): Promise<MonthEndChecklist> {
    const res = await api.get<any>(`/month-end/current${toQuery({ month_year: monthYear })}`);
    return res.data;
  },

  async getMonthEndChecklistById(id: string): Promise<MonthEndChecklist> {
    const res = await api.get<any>(`/month-end/${id}`);
    return res.data;
  },

  async runVerification(checklistId: string): Promise<MonthEndChecklistItem[]> {
    const res = await api.post<any>(`/month-end/${checklistId}/verify`, {});
    return res.data || [];
  },

  async toggleChecklistItem(
    checklistId: string,
    itemId: string,
    isCompleted: boolean,
    notes?: string
  ): Promise<MonthEndChecklistItem> {
    const res = await api.patch<any>(`/month-end/${checklistId}/items/${itemId}`, {
      is_completed: isCompleted,
      notes,
    });
    return res.data;
  },

  async completeMonthEndChecklist(checklistId: string, notes?: string): Promise<MonthEndChecklist> {
    const res = await api.post<any>(`/month-end/${checklistId}/complete`, { notes });
    return res.data;
  },
};
