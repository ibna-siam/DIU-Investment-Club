import { getDbAdmin, isSupabaseConfigured } from '../../config/supabase';
import { Income, PaginatedResponse } from '../../types';
import { financialEngineService } from '../financial-engine/financial-engine.service';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class IncomeRepository {
  async findAll(params: {
    search?: string;
    category_id?: string;
    financial_account_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    event_id?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Income>> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured()) {
      let query = getDbAdmin()
        .from('incomes')
        .select(`
          *,
          category:income_categories(name),
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
      if (params.start_date) {
        query = query.gte('transaction_date', params.start_date);
      }
      if (params.end_date) {
        query = query.lte('transaction_date', params.end_date);
      }
      if (params.search) {
        query = query.or(`income_number.ilike.%${params.search}%,received_from.ilike.%${params.search}%,reference_number.ilike.%${params.search}%`);
      }

      const { data, count, error } = await query
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching incomes from Supabase:', error);
      }

      if (!error && data) {
        const total = count || data.length;
        const mapped: Income[] = data.map((row: any) => ({
          ...row,
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

  async findById(id: string): Promise<Income | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await getDbAdmin()
        .from('incomes')
        .select(`
          *,
          category:income_categories(name),
          account:financial_accounts(name, account_type, current_balance),
          transaction:financial_transactions(*)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching income record ${id}:`, error);
        return null;
      }

      if (data) {
        return {
          ...data,
          category_name: data.category?.name,
          account_name: data.account?.name,
          transaction_number: data.transaction?.transaction_number,
        } as Income;
      }
    }
    return null;
  }

  async create(data: {
    transaction_date: string;
    category_id: string;
    amount: number;
    received_from: string;
    financial_account_id: string;
    payment_method?: string;
    reference_number?: string;
    description?: string;
    event_id?: string | null;
    created_by?: string;
  }): Promise<Income> {
    if (isSupabaseConfigured()) {
      const incomeNumber = await financialEngineService.generateIncomeNumber();

      const { data: created, error } = await getDbAdmin()
        .from('incomes')
        .insert({
          income_number: incomeNumber,
          transaction_date: data.transaction_date,
          category_id: data.category_id,
          amount: data.amount,
          received_from: data.received_from,
          financial_account_id: data.financial_account_id,
          payment_method: data.payment_method || null,
          reference_number: data.reference_number || null,
          description: data.description || null,
          event_id: data.event_id || null,
          status: 'DRAFT',
          created_by: data.created_by || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await auditLogsRepository.log({
        user_id: data.created_by,
        action: 'INCOME_CREATED',
        module: 'income',
        record_id: created.id,
        new_data: created,
      });

      return created as Income;
    }
    throw new Error('Database connection required');
  }

  async update(id: string, data: {
    transaction_date?: string;
    category_id?: string;
    amount?: number;
    received_from?: string;
    financial_account_id?: string;
    payment_method?: string;
    reference_number?: string;
    description?: string;
    event_id?: string | null;
  }, userId?: string): Promise<Income | null> {
    const current = await this.findById(id);
    if (!current) return null;

    if (current.status !== 'DRAFT') {
      throw new Error('Only DRAFT income records can be modified');
    }

    if (isSupabaseConfigured()) {
      const { data: updated, error } = await getDbAdmin()
        .from('incomes')
        .update({
          ...(data.transaction_date ? { transaction_date: data.transaction_date } : {}),
          ...(data.category_id ? { category_id: data.category_id } : {}),
          ...(data.amount !== undefined ? { amount: data.amount } : {}),
          ...(data.received_from ? { received_from: data.received_from } : {}),
          ...(data.financial_account_id ? { financial_account_id: data.financial_account_id } : {}),
          ...(data.payment_method !== undefined ? { payment_method: data.payment_method } : {}),
          ...(data.reference_number !== undefined ? { reference_number: data.reference_number } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.event_id !== undefined ? { event_id: data.event_id } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && updated) {
        await auditLogsRepository.log({
          user_id: userId,
          action: 'INCOME_UPDATED',
          module: 'income',
          record_id: id,
          old_data: current,
          new_data: updated,
        });
        return updated as Income;
      }
    }
    return null;
  }

  async complete(id: string, userId: string): Promise<any> {
    return financialEngineService.completeIncome(id, userId);
  }

  async cancel(id: string, userId: string): Promise<Income | null> {
    const current = await this.findById(id);
    if (!current) return null;

    if (current.status === 'COMPLETED') {
      throw new Error('Completed income cannot be cancelled directly without reversal');
    }

    if (isSupabaseConfigured()) {
      const { data: updated, error } = await getDbAdmin()
        .from('incomes')
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
          action: 'INCOME_CANCELLED',
          module: 'income',
          record_id: id,
          old_data: { status: current.status },
          new_data: { status: 'CANCELLED' },
        });
        return updated as Income;
      }
    }
    return null;
  }
}

export const incomeRepository = new IncomeRepository();
