import { getDbAdmin, isSupabaseConfigured } from '../../config/supabase';
import { FinancialAccount, PaginatedResponse, AccountStatus } from '../../types';
import { financialEngineService } from '../financial-engine/financial-engine.service';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class AccountsRepository {
  async findAll(params: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<FinancialAccount[]> {
    if (isSupabaseConfigured()) {
      let query = getDbAdmin()
        .from('financial_accounts')
        .select('*')
        .is('deleted_at', null);

      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.type) {
        query = query.eq('account_type', params.type);
      }
      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,provider_name.ilike.%${params.search}%,account_number.ilike.%${params.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching financial accounts from Supabase:', error);
        return [];
      }
      if (data) {
        return data as FinancialAccount[];
      }
    }
    return [];
  }

  async findById(id: string): Promise<FinancialAccount | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await getDbAdmin()
        .from('financial_accounts')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) {
        console.error(`Error fetching financial account ${id}:`, error);
        return null;
      }
      if (data) {
        return data as FinancialAccount;
      }
    }
    return null;
  }

  async create(data: {
    name: string;
    account_type: string;
    account_number?: string;
    provider_name?: string;
    opening_balance: number;
    description?: string;
    created_by?: string;
  }): Promise<FinancialAccount> {
    return financialEngineService.createAccount(data);
  }

  async update(id: string, data: {
    name?: string;
    account_number?: string | null;
    provider_name?: string | null;
    description?: string | null;
  }, userId?: string): Promise<FinancialAccount | null> {
    if (isSupabaseConfigured()) {
      const current = await this.findById(id);
      if (!current) return null;

      const { data: updated, error } = await getDbAdmin()
        .from('financial_accounts')
        .update({
          ...(data.name ? { name: data.name } : {}),
          ...(data.account_number !== undefined ? { account_number: data.account_number } : {}),
          ...(data.provider_name !== undefined ? { provider_name: data.provider_name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && updated) {
        await auditLogsRepository.log({
          user_id: userId,
          action: 'ACCOUNT_UPDATED',
          module: 'financial_accounts',
          record_id: id,
          old_data: current,
          new_data: updated,
        });
        return updated as FinancialAccount;
      }
    }
    return null;
  }

  async updateStatus(id: string, status: AccountStatus, userId?: string): Promise<FinancialAccount | null> {
    if (isSupabaseConfigured()) {
      const current = await this.findById(id);
      if (!current) return null;

      const { data: updated, error } = await getDbAdmin()
        .from('financial_accounts')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && updated) {
        await auditLogsRepository.log({
          user_id: userId,
          action: 'ACCOUNT_STATUS_CHANGED',
          module: 'financial_accounts',
          record_id: id,
          old_data: { status: current.status },
          new_data: { status },
        });
        return updated as FinancialAccount;
      }
    }
    return null;
  }

  async getAccountTransactions(accountId: string, limit = 20): Promise<any[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await getDbAdmin()
        .from('financial_transactions')
        .select('*')
        .eq('financial_account_id', accountId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) {
        return data;
      }
    }
    return [];
  }

  async getAccountSummary(accountId: string): Promise<{
    total_in: number;
    total_out: number;
    current_balance: number;
  }> {
    const account = await this.findById(accountId);
    if (!account) {
      return { total_in: 0, total_out: 0, current_balance: 0 };
    }

    if (isSupabaseConfigured()) {
      const { data: credits } = await getDbAdmin()
        .from('financial_transactions')
        .select('amount')
        .eq('financial_account_id', accountId)
        .eq('direction', 'CREDIT');

      const { data: debits } = await getDbAdmin()
        .from('financial_transactions')
        .select('amount')
        .eq('financial_account_id', accountId)
        .eq('direction', 'DEBIT');

      const totalIn = (credits || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const totalOut = (debits || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

      return {
        total_in: totalIn,
        total_out: totalOut,
        current_balance: account.current_balance,
      };
    }

    return { total_in: 0, total_out: 0, current_balance: account.current_balance };
  }
}

export const accountsRepository = new AccountsRepository();
