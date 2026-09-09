import { getDbAdmin } from '../../config/supabase';
import { FinancialYear, AccountingPeriod, AccountingPeriodStatus } from '../../types';

export class AccountingPeriodsRepository {
  async findAllYears(): Promise<FinancialYear[]> {
    const { data, error } = await getDbAdmin()
      .from('financial_years')
      .select('*, periods:accounting_periods(*)')
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data || []) as FinancialYear[];
  }

  async findYearById(id: string): Promise<FinancialYear | null> {
    const { data, error } = await getDbAdmin()
      .from('financial_years')
      .select('*, periods:accounting_periods(*)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as FinancialYear) || null;
  }

  async createYear(data: { name: string; start_date: string; end_date: string }): Promise<FinancialYear> {
    const { data: created, error } = await getDbAdmin()
      .from('financial_years')
      .insert({
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (error) throw error;

    // Auto generate 12 monthly periods
    const startDate = new Date(data.start_date);
    const periodsToInsert: any[] = [];

    for (let i = 1; i <= 12; i++) {
      const pStart = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), 1);
      const pEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i, 0);
      const pName = pStart.toLocaleString('default', { month: 'long', year: 'numeric' });

      periodsToInsert.push({
        financial_year_id: created.id,
        name: pName,
        period_number: i,
        start_date: pStart.toISOString().split('T')[0],
        end_date: pEnd.toISOString().split('T')[0],
        status: 'OPEN',
      });
    }

    await getDbAdmin().from('accounting_periods').insert(periodsToInsert);

    return this.findYearById(created.id) as Promise<FinancialYear>;
  }

  async findAllPeriods(filter?: { financial_year_id?: string; status?: string }): Promise<AccountingPeriod[]> {
    let query = getDbAdmin()
      .from('accounting_periods')
      .select('*, financial_year:financial_year_id(id, name, status)')
      .order('start_date', { ascending: true });

    if (filter?.financial_year_id) {
      query = query.eq('financial_year_id', filter.financial_year_id);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AccountingPeriod[];
  }

  async findPeriodById(id: string): Promise<AccountingPeriod | null> {
    const { data, error } = await getDbAdmin()
      .from('accounting_periods')
      .select('*, financial_year:financial_year_id(*)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as AccountingPeriod) || null;
  }

  async updatePeriodStatus(periodId: string, status: AccountingPeriodStatus, userId: string): Promise<AccountingPeriod> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'CLOSED' || status === 'LOCKED') {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by = userId;
    } else {
      updateData.closed_at = null;
      updateData.closed_by = null;
    }

    const { data: updated, error } = await getDbAdmin()
      .from('accounting_periods')
      .update(updateData)
      .eq('id', periodId)
      .select()
      .single();

    if (error) throw error;
    return updated as AccountingPeriod;
  }

  async getCurrentPeriod(): Promise<AccountingPeriod | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await getDbAdmin()
      .from('accounting_periods')
      .select('*, financial_year:financial_year_id(*)')
      .lte('start_date', today)
      .gte('end_date', today)
      .eq('status', 'OPEN')
      .order('period_number', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as AccountingPeriod) || null;
  }
}

export const periodsRepository = new AccountingPeriodsRepository();
