import { getDbAdmin } from '../../config/supabase';
import {
  RecurringTransaction,
  RecurringTransactionStatus,
  RecurringTask,
  RecurringTaskStatus,
  RecurringFrequency,
} from '../../types';
import { notificationsRepository } from '../notifications/notifications.repository';

export class RecurringOperationsRepository {
  /**
   * Calculate next execution date based on frequency
   */
  calculateNextDate(currentDateStr: string, frequency: RecurringFrequency): string {
    const d = new Date(currentDateStr);
    switch (frequency) {
      case 'DAILY':
        d.setDate(d.getDate() + 1);
        break;
      case 'WEEKLY':
        d.setDate(d.getDate() + 7);
        break;
      case 'MONTHLY':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'QUARTERLY':
        d.setMonth(d.getMonth() + 3);
        break;
      case 'YEARLY':
        d.setFullYear(d.getFullYear() + 1);
        break;
      default:
        d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split('T')[0];
  }

  // ===================== RECURRING TRANSACTIONS =====================

  async getRecurringTransactions(params?: { status?: string }): Promise<RecurringTransaction[]> {
    let query = getDbAdmin()
      .from('recurring_transactions')
      .select(`
        *,
        source_account:financial_accounts!source_account_id(id, account_name, account_number),
        destination_account:financial_accounts!destination_account_id(id, account_name, account_number)
      `)
      .order('created_at', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((t: any) => ({
      ...t,
      source_account_name: t.source_account?.account_name || null,
      destination_account_name: t.destination_account?.account_name || null,
    })) as RecurringTransaction[];
  }

  async getRecurringTransactionById(id: string): Promise<RecurringTransaction | null> {
    const { data, error } = await getDbAdmin()
      .from('recurring_transactions')
      .select(`
        *,
        source_account:financial_accounts!source_account_id(id, account_name, account_number),
        destination_account:financial_accounts!destination_account_id(id, account_name, account_number)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return {
      ...data,
      source_account_name: data.source_account?.account_name || null,
      destination_account_name: data.destination_account?.account_name || null,
    } as RecurringTransaction;
  }

  async createRecurringTransaction(
    payload: Partial<RecurringTransaction>,
    userId?: string
  ): Promise<RecurringTransaction> {
    const startDate = payload.start_date || new Date().toISOString().split('T')[0];
    const { data, error } = await getDbAdmin()
      .from('recurring_transactions')
      .insert({
        name: payload.name,
        transaction_type: payload.transaction_type,
        amount: payload.amount,
        category_id: payload.category_id || null,
        source_account_id: payload.source_account_id,
        destination_account_id: payload.destination_account_id || null,
        frequency: payload.frequency || 'MONTHLY',
        start_date: startDate,
        end_date: payload.end_date || null,
        next_execution_date: payload.next_execution_date || startDate,
        auto_submit_for_approval: payload.auto_submit_for_approval !== undefined ? payload.auto_submit_for_approval : true,
        description: payload.description || null,
        status: payload.status || 'ACTIVE',
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as RecurringTransaction;
  }

  async updateRecurringTransaction(
    id: string,
    payload: Partial<RecurringTransaction>
  ): Promise<RecurringTransaction> {
    const { data, error } = await getDbAdmin()
      .from('recurring_transactions')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as RecurringTransaction;
  }

  async setRecurringTransactionStatus(
    id: string,
    status: RecurringTransactionStatus
  ): Promise<RecurringTransaction> {
    return this.updateRecurringTransaction(id, { status });
  }

  /**
   * Process due recurring transactions safely:
   * Generates PENDING expense/income records and submits approval requests.
   * NEVER posts directly or bypasses approval workflows.
   */
  async processDueRecurringTransactions(): Promise<{ generated: number; items: any[] }> {
    const db = getDbAdmin();
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: dueTemplates, error } = await db
      .from('recurring_transactions')
      .select('*')
      .eq('status', 'ACTIVE')
      .lte('next_execution_date', todayStr);

    if (error) throw error;
    if (!dueTemplates || dueTemplates.length === 0) {
      return { generated: 0, items: [] };
    }

    const generatedItems: any[] = [];

    for (const template of dueTemplates) {
      let createdRecordId: string | null = null;
      let categoryId = template.category_id;

      if (template.transaction_type === 'EXPENSE') {
        if (!categoryId) {
          const { data: cat } = await db.from('expense_categories').select('id').limit(1).maybeSingle();
          categoryId = cat?.id || null;
        }

        const { data: exp, error: expErr } = await db
          .from('expenses')
          .insert({
            expense_number: `EXP-REC-${Date.now().toString().slice(-6)}`,
            amount: template.amount,
            category_id: categoryId,
            financial_account_id: template.source_account_id,
            vendor_name: template.name || 'Recurring Vendor',
            expense_date: todayStr,
            status: 'PENDING_APPROVAL', // STRICT SAFETY: Always PENDING_APPROVAL
            description: `[Recurring] ${template.name} - ${template.frequency}`,
            requested_by: template.created_by,
          })
          .select()
          .single();

        if (expErr) throw expErr;
        createdRecordId = exp.id;
      } else if (template.transaction_type === 'INCOME') {
        if (!categoryId) {
          const { data: cat } = await db.from('income_categories').select('id').limit(1).maybeSingle();
          categoryId = cat?.id || null;
        }

        const { data: inc, error: incErr } = await db
          .from('incomes')
          .insert({
            income_number: `INC-REC-${Date.now().toString().slice(-6)}`,
            amount: template.amount,
            category_id: categoryId,
            financial_account_id: template.source_account_id,
            received_from: template.name || 'Recurring Source',
            transaction_date: todayStr,
            status: 'DRAFT', // STRICT SAFETY: Always DRAFT
            description: `[Recurring] ${template.name} - ${template.frequency}`,
            created_by: template.created_by,
          })
          .select()
          .single();

        if (incErr) throw incErr;
        createdRecordId = inc.id;
      }

      // If auto-submit for approval is requested, register approval request
      if (template.auto_submit_for_approval && createdRecordId) {
        await db.from('approval_requests').insert({
          request_type: template.transaction_type,
          reference_id: createdRecordId,
          title: `Approval Required: Recurring ${template.name}`,
          description: `Scheduled recurring transaction generated on ${todayStr} for BDT ${template.amount}. Human review and authorization required.`,
          requested_by: template.created_by,
          status: 'PENDING',
          current_step: 1,
          total_steps: 2,
        });
      }

      // Calculate next execution date
      const nextDate = this.calculateNextDate(template.next_execution_date, template.frequency);
      const isCompleted = template.end_date && nextDate > template.end_date;

      await db
        .from('recurring_transactions')
        .update({
          last_execution_date: todayStr,
          next_execution_date: nextDate,
          status: isCompleted ? 'COMPLETED' : 'ACTIVE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id);

      generatedItems.push({
        template_id: template.id,
        record_id: createdRecordId,
        type: template.transaction_type,
        amount: template.amount,
        next_date: nextDate,
      });
    }

    return { generated: generatedItems.length, items: generatedItems };
  }

  // ===================== RECURRING TASKS =====================

  async getRecurringTasks(params?: { status?: string }): Promise<RecurringTask[]> {
    let query = getDbAdmin()
      .from('recurring_tasks')
      .select(`
        *,
        assignee:profiles!assignee_id(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((t: any) => ({
      ...t,
      assignee_name: t.assignee?.full_name || null,
    })) as RecurringTask[];
  }

  async getRecurringTaskById(id: string): Promise<RecurringTask | null> {
    const { data, error } = await getDbAdmin()
      .from('recurring_tasks')
      .select(`
        *,
        assignee:profiles!assignee_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return {
      ...data,
      assignee_name: data.assignee?.full_name || null,
    } as RecurringTask;
  }

  async createRecurringTask(payload: Partial<RecurringTask>, userId?: string): Promise<RecurringTask> {
    const startDate = payload.start_date || new Date().toISOString().split('T')[0];
    const { data, error } = await getDbAdmin()
      .from('recurring_tasks')
      .insert({
        title: payload.title,
        description: payload.description || null,
        priority: payload.priority || 'MEDIUM',
        frequency: payload.frequency || 'WEEKLY',
        assignee_id: payload.assignee_id || null,
        due_date_days_offset: payload.due_date_days_offset || 7,
        start_date: startDate,
        end_date: payload.end_date || null,
        next_execution_date: payload.next_execution_date || startDate,
        status: payload.status || 'ACTIVE',
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as RecurringTask;
  }

  async updateRecurringTask(id: string, payload: Partial<RecurringTask>): Promise<RecurringTask> {
    const { data, error } = await getDbAdmin()
      .from('recurring_tasks')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as RecurringTask;
  }

  async setRecurringTaskStatus(id: string, status: RecurringTaskStatus): Promise<RecurringTask> {
    return this.updateRecurringTask(id, { status });
  }

  /**
   * Generate club tasks from active recurring task templates
   */
  async processDueRecurringTasks(): Promise<{ generated: number; items: any[] }> {
    const db = getDbAdmin();
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: dueTemplates, error } = await db
      .from('recurring_tasks')
      .select('*')
      .eq('status', 'ACTIVE')
      .lte('next_execution_date', todayStr);

    if (error) throw error;
    if (!dueTemplates || dueTemplates.length === 0) {
      return { generated: 0, items: [] };
    }

    const generatedItems: any[] = [];

    for (const template of dueTemplates) {
      const dueDate = new Date(Date.now() + (template.due_date_days_offset || 7) * 86400000)
        .toISOString()
        .split('T')[0];

      const { data: newTask, error: taskErr } = await db
        .from('tasks')
        .insert({
          title: template.title,
          description: template.description
            ? `${template.description}\n\n[Recurring Frequency: ${template.frequency}]`
            : `Recurring operational task (${template.frequency})`,
          priority: template.priority,
          status: 'TODO',
          assigned_to: template.assignee_id,
          due_date: dueDate,
          created_by: template.created_by,
        })
        .select()
        .single();

      if (taskErr) throw taskErr;

      // Advance next execution date
      const nextDate = this.calculateNextDate(template.next_execution_date, template.frequency);
      const isCompleted = template.end_date && nextDate > template.end_date;

      await db
        .from('recurring_tasks')
        .update({
          last_generated_at: new Date().toISOString(),
          next_execution_date: nextDate,
          status: isCompleted ? 'COMPLETED' : 'ACTIVE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id);

      // Notify assignee if assigned
      if (template.assignee_id) {
        await notificationsRepository.dispatchNotification({
          user_id: template.assignee_id,
          title: `New Recurring Task: ${template.title}`,
          message: `You have been assigned a recurring task due by ${dueDate}.`,
          type: 'INFO',
          category: 'TASK',
          priority: template.priority === 'URGENT' || template.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
          link: '/tasks',
        });
      }

      generatedItems.push({
        template_id: template.id,
        task_id: newTask.id,
        title: template.title,
        next_date: nextDate,
      });
    }

    return { generated: generatedItems.length, items: generatedItems };
  }
}

export const recurringOperationsRepository = new RecurringOperationsRepository();
