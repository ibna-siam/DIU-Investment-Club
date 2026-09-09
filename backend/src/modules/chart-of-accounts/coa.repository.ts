import { getDbAdmin } from '../../config/supabase';
import { ChartOfAccount, AccountCategoryType, NormalBalanceType, AccountSubtype } from '../../types';

export class ChartOfAccountsRepository {
  async findAll(filter?: { type?: string; is_active?: boolean; search?: string }): Promise<ChartOfAccount[]> {
    let query = getDbAdmin()
      .from('chart_of_accounts')
      .select('*, parent_account:parent_account_id(id, account_code, account_name)')
      .order('account_code', { ascending: true });

    if (filter?.type) {
      query = query.eq('account_type', filter.type.toUpperCase());
    }

    if (filter?.is_active !== undefined) {
      query = query.eq('is_active', filter.is_active);
    }

    if (filter?.search) {
      query = query.or(`account_code.ilike.%${filter.search}%,account_name.ilike.%${filter.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ChartOfAccount[];
  }

  async findById(id: string): Promise<ChartOfAccount | null> {
    const { data, error } = await getDbAdmin()
      .from('chart_of_accounts')
      .select('*, parent_account:parent_account_id(*)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as ChartOfAccount) || null;
  }

  async findByCode(code: string): Promise<ChartOfAccount | null> {
    const { data, error } = await getDbAdmin()
      .from('chart_of_accounts')
      .select('*')
      .eq('account_code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as ChartOfAccount) || null;
  }

  async create(data: {
    account_code: string;
    account_name: string;
    account_type: AccountCategoryType;
    account_subtype?: AccountSubtype | null;
    parent_account_id?: string | null;
    normal_balance: NormalBalanceType;
    description?: string | null;
  }): Promise<ChartOfAccount> {
    // Determine normal balance if not provided
    let normalBalance = data.normal_balance;
    if (!normalBalance) {
      normalBalance = ['ASSET', 'EXPENSE'].includes(data.account_type) ? 'DEBIT' : 'CREDIT';
    }

    const { data: created, error } = await getDbAdmin()
      .from('chart_of_accounts')
      .insert({
        account_code: data.account_code,
        account_name: data.account_name,
        account_type: data.account_type,
        account_subtype: data.account_subtype || null,
        parent_account_id: data.parent_account_id || null,
        normal_balance: normalBalance,
        is_system_account: false,
        is_active: true,
        description: data.description || null,
      })
      .select()
      .single();

    if (error) throw error;
    return created as ChartOfAccount;
  }

  async update(id: string, data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const { data: updated, error } = await getDbAdmin()
      .from('chart_of_accounts')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as ChartOfAccount;
  }

  async delete(id: string): Promise<void> {
    // Check if system account
    const account = await this.findById(id);
    if (!account) throw new Error('Account not found');
    if (account.is_system_account) {
      throw new Error('System standard accounts cannot be deleted');
    }

    // Check if journal lines exist
    const { count, error: countErr } = await getDbAdmin()
      .from('journal_entry_lines')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', id);

    if (countErr) throw countErr;
    if (count && count > 0) {
      // Cannot delete account with transaction history - soft deactivate instead
      await this.update(id, { is_active: false });
      return;
    }

    const { error } = await getDbAdmin()
      .from('chart_of_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getHierarchy(): Promise<any[]> {
    const all = await this.findAll();
    
    // Group into trees
    const accountMap = new Map<string, any>();
    all.forEach(acc => {
      accountMap.set(acc.id, { ...acc, children: [] });
    });

    const rootAccounts: any[] = [];
    all.forEach(acc => {
      if (acc.parent_account_id && accountMap.has(acc.parent_account_id)) {
        accountMap.get(acc.parent_account_id).children.push(accountMap.get(acc.id));
      } else {
        rootAccounts.push(accountMap.get(acc.id));
      }
    });

    return rootAccounts;
  }
}

export const coaRepository = new ChartOfAccountsRepository();
