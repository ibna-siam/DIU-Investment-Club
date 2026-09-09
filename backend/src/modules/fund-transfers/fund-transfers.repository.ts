import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { FundTransfer, PaginatedResponse } from '../../types';

export class FundTransfersRepository {
  async findAll(params: {
    from_account_id?: string;
    to_account_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<FundTransfer>> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    if (!isSupabaseConfigured() || !supabaseClient) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    try {
      let query = supabaseClient
        .from('fund_transfers')
        .select(
          `
          *,
          from_acc:financial_accounts!fund_transfers_from_account_id_fkey(name),
          to_acc:financial_accounts!fund_transfers_to_account_id_fkey(name),
          creator:profiles!fund_transfers_created_by_fkey(full_name)
        `,
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (params.from_account_id) {
        query = query.eq('from_account_id', params.from_account_id);
      }
      if (params.to_account_id) {
        query = query.eq('to_account_id', params.to_account_id);
      }
      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.start_date) {
        query = query.gte('transfer_date', params.start_date);
      }
      if (params.end_date) {
        query = query.lte('transfer_date', params.end_date);
      }

      const { data, count, error } = await query
        .order('transfer_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }

      const total = count || data.length;
      const formatted: FundTransfer[] = data.map((t: any) => ({
        id: t.id,
        transfer_number: t.transfer_number,
        from_account_id: t.from_account_id,
        from_account_name: t.from_acc?.name || 'Unknown Account',
        to_account_id: t.to_account_id,
        to_account_name: t.to_acc?.name || 'Unknown Account',
        amount: parseFloat(t.amount),
        transfer_date: t.transfer_date,
        description: t.description,
        reference_number: t.reference_number,
        status: t.status,
        out_transaction_id: t.out_transaction_id,
        in_transaction_id: t.in_transaction_id,
        created_by: t.created_by,
        created_by_name: t.creator?.full_name || 'System User',
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

      return {
        data: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (e) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  async findById(id: string): Promise<FundTransfer | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient
        .from('fund_transfers')
        .select(
          `
          *,
          from_acc:financial_accounts!fund_transfers_from_account_id_fkey(name, account_type),
          to_acc:financial_accounts!fund_transfers_to_account_id_fkey(name, account_type),
          creator:profiles!fund_transfers_created_by_fkey(full_name, email)
        `
        )
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        transfer_number: data.transfer_number,
        from_account_id: data.from_account_id,
        from_account_name: data.from_acc?.name || 'Unknown Account',
        to_account_id: data.to_account_id,
        to_account_name: data.to_acc?.name || 'Unknown Account',
        amount: parseFloat(data.amount),
        transfer_date: data.transfer_date,
        description: data.description,
        reference_number: data.reference_number,
        status: data.status,
        out_transaction_id: data.out_transaction_id,
        in_transaction_id: data.in_transaction_id,
        created_by: data.created_by,
        created_by_name: data.creator?.full_name || 'System User',
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (e) {
      return null;
    }
  }

  async executeTransfer(params: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    transfer_date?: string;
    description?: string;
    reference_number?: string;
    user_id: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured() || !supabaseClient) {
      return { success: false, error: 'Database is not connected' };
    }

    try {
      const { data, error } = await supabaseClient.rpc('execute_fund_transfer', {
        p_from_account_id: params.from_account_id,
        p_to_account_id: params.to_account_id,
        p_amount: params.amount,
        p_transfer_date: params.transfer_date || new Date().toISOString().split('T')[0],
        p_description: params.description || null,
        p_reference_number: params.reference_number || null,
        p_user_id: params.user_id,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const transferId = data?.transfer_id || data?.id;
      if (transferId) {
        // Automatically post double-entry contra journal and contra voucher
        try {
          const { accountingEngine } = await import('../accounting/accounting.engine');
          await accountingEngine.postOperationalEvent('TRANSFER', transferId, params.user_id);
        } catch (postErr) {
          console.warn('Accounting auto-posting deferred:', postErr);
        }
      }

      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to execute fund transfer' };
    }
  }
}
