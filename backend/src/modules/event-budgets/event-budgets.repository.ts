import { supabaseAdmin, supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { EventBudget, EventBudgetItem } from '../../types';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class EventBudgetsRepository {
  private get client() {
    return supabaseAdmin || supabaseClient;
  }

  async getByEventId(eventId: string): Promise<EventBudget | null> {
    if (!isSupabaseConfigured() || !this.client) return null;

    // Get latest budget for event
    const { data: budget, error: bErr } = await this.client
      .from('event_budgets')
      .select('*, creator:profiles!event_budgets_created_by_fkey(full_name), approver:profiles!event_budgets_approved_by_fkey(full_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bErr || !budget) return null;

    // Fetch budget items
    const { data: items, error: iErr } = await this.client
      .from('event_budget_items')
      .select('*, category:expense_categories!event_budget_items_expense_category_id_fkey(name)')
      .eq('event_budget_id', budget.id)
      .order('created_at', { ascending: true });

    if (iErr) throw new Error(iErr.message);

    // Fetch actual spent on each item and overall event from paid expenses
    const { data: paidExpenses } = await this.client
      .from('expenses')
      .select('amount, event_budget_item_id')
      .eq('event_id', eventId)
      .eq('status', 'PAID')
      .is('deleted_at', null);

    const expensesList = paidExpenses || [];
    const totalSpent = expensesList.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

    const budgetItems: EventBudgetItem[] = (items || []).map((item: any) => {
      const itemSpent = expensesList
        .filter((e: any) => e.event_budget_item_id === item.id)
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      const allocated = Number(item.allocated_amount || 0);

      return {
        id: item.id,
        event_budget_id: item.event_budget_id,
        expense_category_id: item.expense_category_id,
        category_name: item.category?.name || null,
        title: item.title,
        description: item.description,
        allocated_amount: allocated,
        actual_spent: itemSpent,
        remaining_amount: Math.max(0, allocated - itemSpent),
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    });

    const approvedAmount = Number(budget.approved_amount || 0);
    const proposedAmount = Number(budget.proposed_amount || 0);
    const effectiveBudget = approvedAmount > 0 ? approvedAmount : proposedAmount;

    return {
      ...budget,
      proposed_amount: proposedAmount,
      approved_amount: approvedAmount,
      spent_amount: totalSpent,
      remaining_amount: Math.max(0, effectiveBudget - totalSpent),
      creator_name: budget.creator?.full_name || null,
      approver_name: budget.approver?.full_name || null,
      items: budgetItems,
    };
  }

  async getById(id: string): Promise<EventBudget | null> {
    if (!isSupabaseConfigured() || !this.client) return null;

    const { data: budget, error } = await this.client
      .from('event_budgets')
      .select('event_id')
      .eq('id', id)
      .single();

    if (error || !budget) return null;
    return this.getByEventId(budget.event_id);
  }

  async create(
    payload: {
      event_id: string;
      title?: string;
      description?: string;
      notes?: string;
      proposed_amount?: number;
      proposed_budget?: number;
      items?: any[];
    },
    userId: string
  ): Promise<EventBudget> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    const proposedAmount = Number(payload.proposed_amount ?? payload.proposed_budget ?? 0);
    if (proposedAmount <= 0) {
      throw new Error('Proposed budget must be greater than zero');
    }

    const title = payload.title || 'Official Event Budget';
    const description = payload.description || payload.notes || null;
    const rawItems = payload.items || [];

    // Normalize items
    const normalizedItems = rawItems.map((item: any) => ({
      expense_category_id: item.expense_category_id || item.category_id,
      title: item.title || item.name || 'Budget Item',
      description: item.description || item.notes || null,
      allocated_amount: Number(item.allocated_amount || 0),
    }));

    // Validate sum of items <= proposed_amount
    const totalAllocated = normalizedItems.reduce(
      (sum, item) => sum + Number(item.allocated_amount || 0),
      0
    );

    if (totalAllocated > proposedAmount) {
      throw new Error(
        `Sum of allocated items (৳${totalAllocated}) exceeds the proposed budget of ৳${proposedAmount}`
      );
    }

    // 1. Generate Budget Number
    const { data: numData, error: numErr } = await this.client.rpc('generate_budget_number');
    if (numErr || !numData) {
      throw new Error(`Failed to generate budget number: ${numErr?.message}`);
    }
    const budgetNumber = numData;

    // 2. Insert Event Budget
    const { data: budget, error: bErr } = await this.client
      .from('event_budgets')
      .insert({
        event_id: payload.event_id,
        budget_number: budgetNumber,
        title,
        description,
        proposed_amount: proposedAmount,
        approved_amount: 0,
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (bErr || !budget) {
      throw new Error(bErr?.message || 'Failed to create event budget');
    }

    // 3. Insert Budget Items
    if (normalizedItems.length > 0) {
      const itemsToInsert = normalizedItems.map((item) => ({
        event_budget_id: budget.id,
        expense_category_id: item.expense_category_id,
        title: item.title,
        description: item.description || null,
        allocated_amount: item.allocated_amount,
      }));

      const { error: itemsErr } = await this.client
        .from('event_budget_items')
        .insert(itemsToInsert);

      if (itemsErr) throw new Error(itemsErr.message);
    }

    await auditLogsRepository.log({
      user_id: userId,
      action: 'EVENT_BUDGET_CREATED',
      module: 'event_budgets',
      record_id: budget.id,
      new_data: budget,
    });

    return (await this.getByEventId(payload.event_id))!;
  }

  async update(
    id: string,
    payload: {
      title?: string;
      description?: string;
      proposed_amount?: number;
      items?: {
        id?: string;
        expense_category_id: string;
        title: string;
        description?: string;
        allocated_amount: number;
      }[];
    },
    userId: string
  ): Promise<EventBudget> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    const current = await this.getById(id);
    if (!current) throw new Error('Budget not found');

    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(current.status)) {
      throw new Error(
        `Budget in status "${current.status}" cannot be modified. Only DRAFT or CHANGES_REQUESTED budgets can be edited.`
      );
    }

    const proposedAmount = payload.proposed_amount ?? current.proposed_amount;

    if (payload.items) {
      const totalAllocated = payload.items.reduce(
        (sum, item) => sum + Number(item.allocated_amount || 0),
        0
      );
      if (totalAllocated > proposedAmount) {
        throw new Error(
          `Sum of allocated items (৳${totalAllocated}) exceeds the proposed budget of ৳${proposedAmount}`
        );
      }
    }

    // Update budget header
    const updateData: any = { updated_at: new Date().toISOString() };
    if (payload.title) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.proposed_amount !== undefined) updateData.proposed_amount = payload.proposed_amount;

    const { error: uErr } = await this.client
      .from('event_budgets')
      .update(updateData)
      .eq('id', id);

    if (uErr) throw new Error(uErr.message);

    // Replace items if provided
    if (payload.items) {
      await this.client.from('event_budget_items').delete().eq('event_budget_id', id);

      const itemsToInsert = payload.items.map((item) => ({
        event_budget_id: id,
        expense_category_id: item.expense_category_id,
        title: item.title,
        description: item.description || null,
        allocated_amount: item.allocated_amount,
      }));

      const { error: itemsErr } = await this.client
        .from('event_budget_items')
        .insert(itemsToInsert);

      if (itemsErr) throw new Error(itemsErr.message);
    }

    await auditLogsRepository.log({
      user_id: userId,
      action: 'EVENT_BUDGET_UPDATED',
      module: 'event_budgets',
      record_id: id,
      new_data: { id, ...updateData },
    });

    return (await this.getById(id))!;
  }

  async submitForApproval(id: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured() || !this.client) {
      return { success: false, error: 'Database is not connected' };
    }

    try {
      const { data, error } = await this.client.rpc('submit_event_budget_for_approval', {
        p_budget_id: id,
        p_user_id: userId,
      });

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to submit budget for approval' };
    }
  }
}

export const eventBudgetsRepository = new EventBudgetsRepository();
