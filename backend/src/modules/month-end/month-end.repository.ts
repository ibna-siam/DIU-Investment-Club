import { getDbAdmin } from '../../config/supabase';
import {
  MonthEndChecklist,
  MonthEndChecklistItem,
  MonthEndChecklistStatus,
} from '../../types';

export class MonthEndRepository {
  private defaultChecklistTemplate = [
    {
      item_key: 'PENDING_EXPENSES',
      title: 'Review Pending Expenses',
      description: 'Ensure all expense submissions for the period have been evaluated or resolved.',
      order_index: 1,
    },
    {
      item_key: 'PENDING_INCOMES',
      title: 'Review Pending Incomes',
      description: 'Verify all incoming fees, sponsorships, and donations have been confirmed.',
      order_index: 2,
    },
    {
      item_key: 'PENDING_APPROVALS',
      title: 'Review Pending Approvals',
      description: 'Ensure all financial approval workflows for the month are cleared.',
      order_index: 3,
    },
    {
      item_key: 'CASH_RECONCILIATION',
      title: 'Reconcile Cash Accounts',
      description: 'Match physical cash-on-hand records with club cash ledger accounts.',
      order_index: 4,
    },
    {
      item_key: 'BANK_RECONCILIATION',
      title: 'Review Bank Balances',
      description: 'Confirm club bank account statements match recorded transactions.',
      order_index: 5,
    },
    {
      item_key: 'JOURNAL_ENTRIES',
      title: 'Verify Journal Entries',
      description: 'Check that all double-entry journal transactions are balanced and posted.',
      order_index: 6,
    },
    {
      item_key: 'TRIAL_BALANCE',
      title: 'Generate Trial Balance',
      description: 'Verify total debits strictly equal total credits across all accounts.',
      order_index: 7,
    },
    {
      item_key: 'FINANCIAL_REPORTS',
      title: 'Review Monthly Financial Reports',
      description: 'Generate and examine the monthly Income Statement and Balance Sheet.',
      order_index: 8,
    },
  ];

  async getChecklists(params?: { month_year?: string }): Promise<MonthEndChecklist[]> {
    let query = getDbAdmin()
      .from('month_end_checklists')
      .select(`
        *,
        completer:profiles!completed_by(id, full_name, email),
        items:month_end_checklist_items(id, is_completed)
      `)
      .order('month_year', { ascending: false });

    if (params?.month_year) {
      query = query.eq('month_year', params.month_year);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((c: any) => {
      const items = c.items || [];
      const completedCount = items.filter((i: any) => i.is_completed).length;
      return {
        ...c,
        completed_by_name: c.completer?.full_name || null,
        items_count: items.length,
        completed_items_count: completedCount,
      };
    }) as MonthEndChecklist[];
  }

  async getChecklistById(id: string): Promise<MonthEndChecklist | null> {
    const { data, error } = await getDbAdmin()
      .from('month_end_checklists')
      .select(`
        *,
        completer:profiles!completed_by(id, full_name, email),
        items:month_end_checklist_items(
          *,
          completer:profiles!completed_by(id, full_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) return null;

    const items = (data.items || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((i: any) => ({
        ...i,
        completed_by_name: i.completer?.full_name || null,
      }));

    const completedCount = items.filter((i: any) => i.is_completed).length;

    return {
      ...data,
      completed_by_name: data.completer?.full_name || null,
      items_count: items.length,
      completed_items_count: completedCount,
      items,
    } as MonthEndChecklist;
  }

  async getOrCreateChecklistForMonth(monthYear: string, userId?: string): Promise<MonthEndChecklist> {
    const db = getDbAdmin();

    // Check if checklist already exists
    const { data: existing } = await db
      .from('month_end_checklists')
      .select('id')
      .eq('month_year', monthYear)
      .maybeSingle();

    if (existing) {
      return (await this.getChecklistById(existing.id))!;
    }

    // Find active accounting period if any
    const { data: period } = await db
      .from('accounting_periods')
      .select('id, financial_year_id')
      .eq('status', 'OPEN')
      .limit(1)
      .maybeSingle();

    // Create checklist
    const { data: newChecklist, error: clErr } = await db
      .from('month_end_checklists')
      .insert({
        month_year: monthYear,
        accounting_period_id: period?.id || null,
        financial_year_id: period?.financial_year_id || null,
        status: 'IN_PROGRESS',
      })
      .select()
      .single();

    if (clErr) throw clErr;

    // Seed default items
    const itemsToInsert = this.defaultChecklistTemplate.map(t => ({
      checklist_id: newChecklist.id,
      item_key: t.item_key,
      title: t.title,
      description: t.description,
      order_index: t.order_index,
      is_completed: false,
      auto_verification_status: 'PENDING',
    }));

    const { error: itemErr } = await db
      .from('month_end_checklist_items')
      .insert(itemsToInsert);

    if (itemErr) throw itemErr;

    return (await this.getChecklistById(newChecklist.id))!;
  }

  /**
   * Run automated data verification across all checklist items
   */
  async runAutoVerification(checklistId: string): Promise<MonthEndChecklistItem[]> {
    const db = getDbAdmin();
    const checklist = await this.getChecklistById(checklistId);
    if (!checklist) throw new Error('Checklist not found');

    const [year, month] = checklist.month_year.split('-');
    const startDate = `${checklist.month_year}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${checklist.month_year}-${String(lastDay).padStart(2, '0')}`;

    // 1. Pending Expenses
    const { data: pendingExpenses } = await db
      .from('expenses')
      .select('id, amount, description')
      .in('status', ['PENDING_APPROVAL', 'UNDER_REVIEW'])
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    // 2. Pending Incomes
    const { data: pendingIncomes } = await db
      .from('incomes')
      .select('id, amount, description')
      .eq('status', 'DRAFT')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    // 3. Pending Approvals
    const { data: pendingApprovals } = await db
      .from('approval_requests')
      .select('id, title')
      .eq('status', 'PENDING');

    // 4. Unposted Journal Entries
    const { data: draftJournals } = await db
      .from('journal_entries')
      .select('id, entry_number')
      .eq('status', 'DRAFT')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);

    // 5. Trial Balance Equilibrium
    const { data: journalLines } = await db
      .from('journal_entry_lines')
      .select('debit, credit, journal_entries!inner(status, entry_date)')
      .eq('journal_entries.status', 'POSTED');

    let totalDebit = 0;
    let totalCredit = 0;
    (journalLines || []).forEach((l: any) => {
      totalDebit += Number(l.debit || 0);
      totalCredit += Number(l.credit || 0);
    });
    const tbBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    // 6. Bank accounts status
    const { data: bankAccounts } = await db
      .from('financial_accounts')
      .select('id, account_name, current_balance')
      .eq('is_active', true);

    const negativeAccounts = (bankAccounts || []).filter((a: any) => Number(a.current_balance) < 0);

    // Update each checklist item accordingly
    const items = checklist.items || [];
    for (const item of items) {
      let status: 'VERIFIED' | 'FAILED' | 'MANUAL' = 'VERIFIED';
      let details: Record<string, any> = {};

      switch (item.item_key) {
        case 'PENDING_EXPENSES':
          details = { pending_count: pendingExpenses?.length || 0 };
          status = (pendingExpenses?.length || 0) === 0 ? 'VERIFIED' : 'FAILED';
          break;

        case 'PENDING_INCOMES':
          details = { pending_count: pendingIncomes?.length || 0 };
          status = (pendingIncomes?.length || 0) === 0 ? 'VERIFIED' : 'FAILED';
          break;

        case 'PENDING_APPROVALS':
          details = { pending_count: pendingApprovals?.length || 0 };
          status = (pendingApprovals?.length || 0) === 0 ? 'VERIFIED' : 'FAILED';
          break;

        case 'CASH_RECONCILIATION':
          status = 'MANUAL';
          details = { message: 'Physical cash audit requires manual reconciliation verification.' };
          break;

        case 'BANK_RECONCILIATION':
          details = {
            total_accounts: bankAccounts?.length || 0,
            negative_accounts: negativeAccounts.length,
          };
          status = negativeAccounts.length === 0 ? 'VERIFIED' : 'FAILED';
          break;

        case 'JOURNAL_ENTRIES':
          details = { unposted_draft_count: draftJournals?.length || 0 };
          status = (draftJournals?.length || 0) === 0 ? 'VERIFIED' : 'FAILED';
          break;

        case 'TRIAL_BALANCE':
          details = {
            total_debit: totalDebit,
            total_credit: totalCredit,
            difference: Math.abs(totalDebit - totalCredit),
            is_balanced: tbBalanced,
          };
          status = tbBalanced ? 'VERIFIED' : 'FAILED';
          break;

        case 'FINANCIAL_REPORTS':
          status = 'MANUAL';
          details = { message: 'Review income statement & balance sheet reports for final management sign-off.' };
          break;

        default:
          status = 'MANUAL';
      }

      await db
        .from('month_end_checklist_items')
        .update({
          auto_verification_status: status,
          auto_verification_details: details,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    }

    const updated = await this.getChecklistById(checklistId);
    return updated?.items || [];
  }

  async toggleChecklistItem(
    itemId: string,
    isCompleted: boolean,
    userId?: string,
    notes?: string
  ): Promise<MonthEndChecklistItem> {
    const { data, error } = await getDbAdmin()
      .from('month_end_checklist_items')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        completed_by: isCompleted ? userId : null,
        notes: notes !== undefined ? notes : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data as MonthEndChecklistItem;
  }

  async completeChecklist(
    checklistId: string,
    userId: string,
    notes?: string
  ): Promise<MonthEndChecklist> {
    const { data, error } = await getDbAdmin()
      .from('month_end_checklists')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        completed_by: userId,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', checklistId)
      .select()
      .single();

    if (error) throw error;
    return (await this.getChecklistById(checklistId))!;
  }
}

export const monthEndRepository = new MonthEndRepository();
