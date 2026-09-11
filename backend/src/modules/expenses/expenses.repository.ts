import { getDbAdmin, isSupabaseConfigured } from '../../config/supabase';
import { Expense, PaginatedResponse } from '../../types';
import { financialEngineService } from '../financial-engine/financial-engine.service';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class ExpensesRepository {
  async findAll(params: {
    search?: string;
    category_id?: string;
    financial_account_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    event_id?: string;
    event_budget_item_id?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Expense>> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured()) {
      let query = getDbAdmin()
        .from('expenses')
        .select(`
          *,
          category:expense_categories(name),
          account:financial_accounts(name, account_type),
          transaction:financial_transactions(transaction_number)
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (params.category_id) {
        query = query.eq('category_id', params.category_id);
      }
      if (params.financial_account_id) {
        query = query.eq('financial_account_id', params.financial_account_id);
      }
      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.event_id) {
        query = query.eq('event_id', params.event_id);
      }
      if (params.event_budget_item_id) {
        query = query.eq('event_budget_item_id', params.event_budget_item_id);
      }
      if (params.start_date) {
        query = query.gte('expense_date', params.start_date);
      }
      if (params.end_date) {
        query = query.lte('expense_date', params.end_date);
      }
      if (params.search) {
        query = query.or(`expense_number.ilike.%${params.search}%,vendor_name.ilike.%${params.search}%,reference_number.ilike.%${params.search}%`);
      }

      const { data, count, error } = await query
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching expenses from Supabase:', error);
      }

      if (!error && data) {
        const total = count || data.length;
        const mapped: Expense[] = data.map((row: any) => ({
          ...row,
          paid_to: row.vendor_name,
          invoice_number: row.reference_number,
          category_name: row.category?.name,
          account_name: row.account?.name,
          transaction_number: row.transaction?.transaction_number,
        }));

        return {
          data: mapped,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    }

    return { data: [], total: 0, page, limit, totalPages: 1 };
  }

  async findById(id: string): Promise<Expense | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await getDbAdmin()
        .from('expenses')
        .select(`
          *,
          category:expense_categories(name),
          account:financial_accounts(name, account_type, current_balance),
          transaction:financial_transactions(*)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching expense record ${id}:`, error);
        return null;
      }

      if (data) {
        return {
          ...data,
          paid_to: data.vendor_name,
          invoice_number: data.reference_number,
          category_name: data.category?.name,
          account_name: data.account?.name,
          transaction_number: data.transaction?.transaction_number,
        } as Expense;
      }
    }

    return null;
  }

  async create(data: {
    expense_date: string;
    category_id: string;
    amount: number;
    paid_to: string;
    financial_account_id: string;
    payment_method?: string;
    invoice_number?: string;
    receipt_url?: string;
    description?: string;
    event_id?: string | null;
    event_budget_item_id?: string | null;
    created_by?: string;
  }): Promise<Expense> {
    if (isSupabaseConfigured()) {
      const expenseNumber = await financialEngineService.generateExpenseNumber();

      const { data: created, error } = await getDbAdmin()
        .from('expenses')
        .insert({
          expense_number: expenseNumber,
          expense_date: data.expense_date,
          category_id: data.category_id,
          amount: data.amount,
          vendor_name: data.paid_to,
          financial_account_id: data.financial_account_id,
          payment_method: data.payment_method || null,
          reference_number: data.invoice_number || null,
          description: data.description || null,
          event_id: data.event_id || null,
          event_budget_item_id: data.event_budget_item_id || null,
          status: 'DRAFT',
          requested_by: data.created_by || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await auditLogsRepository.log({
        user_id: data.created_by,
        action: 'EXPENSE_CREATED',
        module: 'expense',
        record_id: created.id,
        new_data: created,
      });

      return created as Expense;
    }
    throw new Error('Database connection required');
  }

  async update(id: string, data: {
    expense_date?: string;
    category_id?: string;
    amount?: number;
    paid_to?: string;
    financial_account_id?: string;
    payment_method?: string;
    invoice_number?: string;
    receipt_url?: string;
    description?: string;
    event_id?: string | null;
    event_budget_item_id?: string | null;
  }, userId?: string): Promise<Expense | null> {
    const current = await this.findById(id);
    if (!current) return null;

    if (current.status !== 'DRAFT' && current.status !== 'CHANGES_REQUESTED') {
      throw new Error('Only DRAFT or CHANGES_REQUESTED expense records can be modified');
    }

    if (isSupabaseConfigured()) {
      const { data: updated, error } = await getDbAdmin()
        .from('expenses')
        .update({
          ...(data.expense_date ? { expense_date: data.expense_date } : {}),
          ...(data.category_id ? { category_id: data.category_id } : {}),
          ...(data.amount !== undefined ? { amount: data.amount } : {}),
          ...(data.paid_to ? { paid_to: data.paid_to } : {}),
          ...(data.financial_account_id ? { financial_account_id: data.financial_account_id } : {}),
          ...(data.payment_method !== undefined ? { payment_method: data.payment_method } : {}),
          ...(data.invoice_number !== undefined ? { invoice_number: data.invoice_number } : {}),
          ...(data.receipt_url !== undefined ? { receipt_url: data.receipt_url } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.event_id !== undefined ? { event_id: data.event_id } : {}),
          ...(data.event_budget_item_id !== undefined ? { event_budget_item_id: data.event_budget_item_id } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && updated) {
        await auditLogsRepository.log({
          user_id: userId,
          action: 'EXPENSE_UPDATED',
          module: 'expense',
          record_id: id,
          old_data: current,
          new_data: updated,
        });
        return updated as Expense;
      }
    }
    return null;
  }

  async submitForApproval(id: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database is not connected' };
    }

    try {
      const { data, error } = await getDbAdmin().rpc('submit_expense_for_approval', {
        p_expense_id: id,
        p_user_id: userId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to submit expense for approval' };
    }
  }

  async submit(id: string, userId: string): Promise<Expense | null> {
    const res = await this.submitForApproval(id, userId);
    if (!res.success) {
      throw new Error(res.error || 'Failed to submit expense');
    }
    return this.findById(id);
  }

  async pay(id: string, userId: string): Promise<any> {
    return financialEngineService.payExpense(id, userId);
  }

  async cancel(id: string, userId: string): Promise<Expense | null> {
    const current = await this.findById(id);
    if (!current) return null;

    if (current.status === 'PAID') {
      throw new Error('Paid expense cannot be cancelled directly without reversal');
    }

    if (isSupabaseConfigured()) {
      const { data: updated, error } = await getDbAdmin()
        .from('expenses')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && updated) {
        await auditLogsRepository.log({
          user_id: userId,
          action: 'EXPENSE_CANCELLED',
          module: 'expense',
          record_id: id,
          old_data: { status: current.status },
          new_data: { status: 'CANCELLED' },
        });
        return updated as Expense;
      }
    }
    return null;
  }
}

export const expensesRepository = new ExpensesRepository();
