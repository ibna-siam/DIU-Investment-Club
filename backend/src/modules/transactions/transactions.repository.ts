import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { FinancialTransaction, PaginatedResponse } from '../../types';

export class TransactionsRepository {
  async findAll(params: {
    search?: string;
    account_id?: string;
    transaction_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<FinancialTransaction>> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 15;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      let query = supabaseClient
        .from('financial_transactions')
        .select(`
          *,
          account:financial_accounts(name, account_type)
        `, { count: 'exact' });

      if (params.account_id) {
        query = query.eq('financial_account_id', params.account_id);
      }
      if (params.transaction_type) {
        query = query.eq('transaction_type', params.transaction_type);
      }
      if (params.start_date) {
        query = query.gte('transaction_date', params.start_date);
      }
      if (params.end_date) {
        query = query.lte('transaction_date', params.end_date);
      }
      if (params.search) {
        query = query.or(`transaction_number.ilike.%${params.search}%,description.ilike.%${params.search}%,reference_number.ilike.%${params.search}%`);
      }

      const { data, count, error } = await query
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        const total = count || data.length;
        const mapped: FinancialTransaction[] = data.map((row: any) => ({
          ...row,
          account_name: row.account?.name,
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

  async findById(id: string): Promise<FinancialTransaction | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('financial_transactions')
        .select(`
          *,
          account:financial_accounts(name, account_type, account_number, provider_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        let referenceDetails: any = null;

        if (data.reference_type === 'INCOME' && data.reference_id) {
          const { data: inc } = await supabaseClient
            .from('incomes')
            .select('id, income_number, received_from, description')
            .eq('id', data.reference_id)
            .maybeSingle();
          referenceDetails = inc;
        } else if (data.reference_type === 'EXPENSE' && data.reference_id) {
          const { data: exp } = await supabaseClient
            .from('expenses')
            .select('id, expense_number, paid_to, description, invoice_number')
            .eq('id', data.reference_id)
            .maybeSingle();
          referenceDetails = exp;
        }

        return {
          ...data,
          account_name: data.account?.name,
          account_details: data.account,
          reference_details: referenceDetails,
        } as any;
      }
    }

    return null;
  }
}

export const transactionsRepository = new TransactionsRepository();
