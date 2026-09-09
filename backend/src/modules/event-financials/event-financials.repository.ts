import { supabaseAdmin, supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { EventFinancialSummary } from '../../types';

export class EventFinancialsRepository {
  private get client() {
    return supabaseAdmin || supabaseClient;
  }

  async getFinancialSummary(eventId: string): Promise<EventFinancialSummary> {
    if (!isSupabaseConfigured() || !this.client) {
      throw new Error('Database is not connected');
    }

    const { data, error } = await this.client.rpc('get_event_financial_summary', {
      p_event_id: eventId,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to get event financial summary');
    }

    const totalIncome = Number(data.total_income || 0);
    const totalExpenses = Number(data.total_expenses || 0);
    const netResult = Number(data.net_financial_result || 0);
    const utilization = Number(data.budget_utilization || 0);

    return {
      event_id: data.event_id,
      event_code: data.event_code,
      event_title: data.event_title,
      event_status: data.event_status,
      proposed_budget: Number(data.proposed_budget || 0),
      approved_budget: Number(data.approved_budget || 0),
      total_income: totalIncome,
      total_incomes: totalIncome,
      total_expenses: totalExpenses,
      pending_expenses: Number(data.pending_expenses || 0),
      remaining_budget: Number(data.remaining_budget || 0),
      net_financial_result: netResult,
      net_profit_loss: netResult,
      budget_utilization: utilization,
      budget_utilization_percentage: utilization,
      utilization_status: data.utilization_status || 'NORMAL',
    };
  }

  async getBudgetVsActual(eventId: string): Promise<any[]> {
    if (!isSupabaseConfigured() || !this.client) return [];

    // Get latest approved or draft budget
    const { data: budget } = await this.client
      .from('event_budgets')
      .select('id')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!budget) return [];

    const { data: items, error: iErr } = await this.client
      .from('event_budget_items')
      .select('*, category:expense_categories!event_budget_items_expense_category_id_fkey(name)')
      .eq('event_budget_id', budget.id);

    if (iErr) throw new Error(iErr.message);

    // Get paid expenses for event
    const { data: expenses } = await this.client
      .from('expenses')
      .select('amount, event_budget_item_id, category_id')
      .eq('event_id', eventId)
      .eq('status', 'PAID')
      .is('deleted_at', null);

    const paidList = expenses || [];

    return (items || []).map((item: any) => {
      const actualSpent = paidList
        .filter((e: any) => e.event_budget_item_id === item.id)
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      const allocated = Number(item.allocated_amount || 0);
      const variance = allocated - actualSpent;

      let status = 'ON_BUDGET';
      if (variance > 0) status = 'UNDER_BUDGET';
      else if (variance < 0) status = 'OVER_BUDGET';

      return {
        id: item.id,
        category_name: item.category?.name || item.title,
        title: item.title,
        allocated_amount: allocated,
        actual_spent: actualSpent,
        variance,
        status,
        utilization_pct: allocated > 0 ? Math.round((actualSpent / allocated) * 100) : 0,
      };
    });
  }

  async getEventLedger(eventId: string): Promise<any[]> {
    if (!isSupabaseConfigured() || !this.client) return [];

    const { data: incomes } = await this.client
      .from('incomes')
      .select('*, category:income_categories!incomes_category_id_fkey(name), account:financial_accounts!incomes_financial_account_id_fkey(name)')
      .eq('event_id', eventId)
      .eq('status', 'COMPLETED')
      .is('deleted_at', null);

    const { data: expenses } = await this.client
      .from('expenses')
      .select('*, category:expense_categories!expenses_category_id_fkey(name), account:financial_accounts!expenses_financial_account_id_fkey(name)')
      .eq('event_id', eventId)
      .eq('status', 'PAID')
      .is('deleted_at', null);

    const entries = [
      ...(incomes || []).map((i: any) => ({
        id: i.id,
        date: i.transaction_date,
        number: i.income_number,
        type: 'INCOME',
        direction: 'CREDIT',
        category: i.category?.name || 'Income',
        party: i.received_from,
        amount: Number(i.amount || 0),
        account: i.account?.name || 'Account',
        description: i.description,
      })),
      ...(expenses || []).map((e: any) => ({
        id: e.id,
        date: e.expense_date,
        number: e.expense_number,
        type: 'EXPENSE',
        direction: 'DEBIT',
        category: e.category?.name || 'Expense',
        party: e.vendor_name,
        amount: Number(e.amount || 0),
        account: e.account?.name || 'Account',
        description: e.description,
      })),
    ];

    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries;
  }
}

export const eventFinancialsRepository = new EventFinancialsRepository();
