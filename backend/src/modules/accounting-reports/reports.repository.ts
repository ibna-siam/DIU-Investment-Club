import { getDbAdmin } from '../../config/supabase';
import {
  TrialBalanceReport,
  AccountingDashboardSummary,
  AccountLedgerStatement,
  GeneralLedgerLine,
  SubsidiaryLedgerItem,
  AccountingMapping,
} from '../../types';

export class AccountingReportsRepository {
  async getTrialBalance(startDate?: string, endDate?: string): Promise<TrialBalanceReport> {
    const { data, error } = await getDbAdmin().rpc('get_trial_balance', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;
    return data as TrialBalanceReport;
  }

  async getDashboardSummary(): Promise<AccountingDashboardSummary> {
    const { data, error } = await getDbAdmin().rpc('get_accounting_dashboard_summary');
    if (error) throw error;
    return data as AccountingDashboardSummary;
  }

  async getGeneralLedger(params: {
    account_id: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AccountLedgerStatement> {
    // 1. Fetch Account Details
    const { data: account, error: accErr } = await getDbAdmin()
      .from('chart_of_accounts')
      .select('*')
      .eq('id', params.account_id)
      .single();

    if (accErr || !account) throw new Error('Account not found');

    const isDebitNormal = account.normal_balance === 'DEBIT';

    // 2. Compute Opening Balance (All posted journal lines strictly before start_date)
    let openingBalance = 0;
    if (params.start_date) {
      const { data: priorLines, error: priorErr } = await getDbAdmin()
        .from('journal_entry_lines')
        .select(`
          debit_amount,
          credit_amount,
          journal_entry:journal_entry_id!inner(entry_date, status)
        `)
        .eq('account_id', params.account_id)
        .eq('journal_entry.status', 'POSTED')
        .lt('journal_entry.entry_date', params.start_date);

      if (priorErr) throw priorErr;

      const priorDebit = priorLines?.reduce((sum, l: any) => sum + Number(l.debit_amount), 0) || 0;
      const priorCredit = priorLines?.reduce((sum, l: any) => sum + Number(l.credit_amount), 0) || 0;
      openingBalance = isDebitNormal ? priorDebit - priorCredit : priorCredit - priorDebit;
    }

    // 3. Fetch Lines within Range
    let query = getDbAdmin()
      .from('journal_entry_lines')
      .select(`
        id,
        debit_amount,
        credit_amount,
        description,
        journal_entry:journal_entry_id!inner(
          id,
          journal_number,
          entry_date,
          reference_type,
          description,
          status
        )
      `)
      .eq('account_id', params.account_id)
      .eq('journal_entry.status', 'POSTED')
      .order('journal_entry(entry_date)', { ascending: true })
      .order('created_at', { ascending: true });

    if (params.start_date) {
      query = query.gte('journal_entry.entry_date', params.start_date);
    }
    if (params.end_date) {
      query = query.lte('journal_entry.entry_date', params.end_date);
    }

    const { data: linesRaw, error: linesErr } = await query;
    if (linesErr) throw linesErr;

    // 4. Calculate Running Balances
    let currentBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const lines: GeneralLedgerLine[] = (linesRaw || []).map((l: any) => {
      const debit = Number(l.debit_amount) || 0;
      const credit = Number(l.credit_amount) || 0;
      totalDebit += debit;
      totalCredit += credit;

      if (isDebitNormal) {
        currentBalance += debit - credit;
      } else {
        currentBalance += credit - debit;
      }

      return {
        id: l.id,
        entry_date: l.journal_entry?.entry_date,
        journal_number: l.journal_entry?.journal_number,
        reference_type: l.journal_entry?.reference_type,
        description: l.description || l.journal_entry?.description,
        debit_amount: debit,
        credit_amount: credit,
        running_balance: currentBalance,
        journal_entry_id: l.journal_entry?.id,
      };
    });

    return {
      account,
      opening_balance: openingBalance,
      lines,
      total_debit: totalDebit,
      total_credit: totalCredit,
      closing_balance: currentBalance,
    };
  }

  async getSubsidiaryLedger(subledgerType: 'MEMBER' | 'SPONSOR' | 'EVENT'): Promise<SubsidiaryLedgerItem[]> {
    // 1. Fetch subledger journal lines
    const { data: lines, error } = await getDbAdmin()
      .from('journal_entry_lines')
      .select(`
        subledger_type,
        subledger_id,
        debit_amount,
        credit_amount,
        journal_entry:journal_entry_id!inner(entry_date, status)
      `)
      .eq('subledger_type', subledgerType)
      .eq('journal_entry.status', 'POSTED');

    if (error) throw error;

    // Aggregate by subledger_id
    const map = new Map<string, { totalDebit: number; totalCredit: number; lastDate?: string }>();
    (lines || []).forEach((l: any) => {
      if (!l.subledger_id) return;
      const cur = map.get(l.subledger_id) || { totalDebit: 0, totalCredit: 0 };
      cur.totalDebit += Number(l.debit_amount) || 0;
      cur.totalCredit += Number(l.credit_amount) || 0;
      if (!cur.lastDate || (l.journal_entry?.entry_date && l.journal_entry.entry_date > cur.lastDate)) {
        cur.lastDate = l.journal_entry?.entry_date;
      }
      map.set(l.subledger_id, cur);
    });

    // 2. Fetch Entity Names
    const results: SubsidiaryLedgerItem[] = [];

    if (subledgerType === 'MEMBER') {
      const { data: members } = await getDbAdmin().from('members').select('id, full_name, student_id');
      const memberMap = new Map((members || []).map((m: any) => [m.id, m]));

      map.forEach((val, id) => {
        const m = memberMap.get(id);
        results.push({
          subledger_type: 'MEMBER',
          subledger_id: id,
          name: m ? m.full_name : 'Unknown Member',
          code: m ? m.student_id : id.slice(0, 8),
          total_debit: val.totalDebit,
          total_credit: val.totalCredit,
          balance: val.totalDebit - val.totalCredit,
          last_transaction_date: val.lastDate,
        });
      });
    } else if (subledgerType === 'SPONSOR') {
      const { data: sponsors } = await getDbAdmin().from('sponsors').select('id, name, sponsor_code');
      const sponsorMap = new Map((sponsors || []).map((s: any) => [s.id, s]));

      map.forEach((val, id) => {
        const s = sponsorMap.get(id);
        results.push({
          subledger_type: 'SPONSOR',
          subledger_id: id,
          name: s ? s.name : 'Unknown Sponsor',
          code: s ? s.sponsor_code : id.slice(0, 8),
          total_debit: val.totalDebit,
          total_credit: val.totalCredit,
          balance: val.totalDebit - val.totalCredit,
          last_transaction_date: val.lastDate,
        });
      });
    } else {
      const { data: events } = await getDbAdmin().from('events').select('id, title, event_code');
      const eventMap = new Map((events || []).map((e: any) => [e.id, e]));

      map.forEach((val, id) => {
        const e = eventMap.get(id);
        results.push({
          subledger_type: 'EVENT',
          subledger_id: id,
          name: e ? e.title : 'Unknown Event',
          code: e ? e.event_code : id.slice(0, 8),
          total_debit: val.totalDebit,
          total_credit: val.totalCredit,
          balance: val.totalDebit - val.totalCredit,
          last_transaction_date: val.lastDate,
        });
      });
    }

    return results;
  }

  async getAccountingMappings(): Promise<AccountingMapping[]> {
    const { data, error } = await getDbAdmin()
      .from('accounting_mappings')
      .select(`
        *,
        debit_account:debit_account_id(id, account_code, account_name, account_type),
        credit_account:credit_account_id(id, account_code, account_name, account_type)
      `)
      .order('transaction_type', { ascending: true });

    if (error) throw error;
    return (data || []) as AccountingMapping[];
  }

  async syncHistorical(userId: string): Promise<any> {
    const { data, error } = await getDbAdmin().rpc('sync_historical_operational_journals', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  }
}

export const reportsRepository = new AccountingReportsRepository();
