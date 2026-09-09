import { api } from '../lib/api';
import {
  ChartOfAccount,
  FinancialYear,
  AccountingPeriod,
  JournalEntry,
  Voucher,
  AccountingMapping,
  TrialBalanceReport,
  AccountLedgerStatement,
  SubsidiaryLedgerItem,
  AccountingDashboardSummary,
} from '../types/accounting';

function toQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const accountingService = {
  // --- Chart of Accounts ---
  async getAccounts(params?: { type?: string; is_active?: boolean; search?: string }): Promise<ChartOfAccount[]> {
    const res = await api.get<any>(`/chart-of-accounts${toQuery(params)}`);
    return res.data || [];
  },

  async getAccountHierarchy(): Promise<any[]> {
    const res = await api.get<any>('/chart-of-accounts/hierarchy');
    return res.data || [];
  },

  async getAccountById(id: string): Promise<ChartOfAccount> {
    const res = await api.get<any>(`/chart-of-accounts/${id}`);
    return res.data;
  },

  async createAccount(data: {
    account_code: string;
    account_name: string;
    account_type: string;
    account_subtype?: string | null;
    parent_account_id?: string | null;
    normal_balance?: string;
    description?: string | null;
  }): Promise<ChartOfAccount> {
    const res = await api.post<any>('/chart-of-accounts', data);
    return res.data;
  },

  async updateAccount(id: string, data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const res = await api.patch<any>(`/chart-of-accounts/${id}`, data);
    return res.data;
  },

  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/chart-of-accounts/${id}`);
  },

  // --- Financial Years & Accounting Periods ---
  async getFinancialYears(): Promise<FinancialYear[]> {
    const res = await api.get<any>('/financial-years/years');
    return res.data || [];
  },

  async createFinancialYear(data: { name: string; start_date: string; end_date: string }): Promise<FinancialYear> {
    const res = await api.post<any>('/financial-years/years', data);
    return res.data;
  },

  async getAccountingPeriods(params?: { financial_year_id?: string; status?: string }): Promise<AccountingPeriod[]> {
    const res = await api.get<any>(`/accounting-periods/periods${toQuery(params)}`);
    return res.data || [];
  },

  async getCurrentPeriod(): Promise<AccountingPeriod | null> {
    const res = await api.get<any>('/accounting-periods/periods/current');
    return res.data || null;
  },

  async updatePeriodStatus(id: string, status: 'OPEN' | 'CLOSED' | 'LOCKED'): Promise<AccountingPeriod> {
    const res = await api.patch<any>(`/accounting-periods/periods/${id}/status`, { status });
    return res.data;
  },

  // --- Journal Entries ---
  async getJournals(params?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    reference_type?: string;
    search?: string;
  }): Promise<JournalEntry[]> {
    const res = await api.get<any>(`/journal-entries${toQuery(params)}`);
    return res.data || [];
  },

  async getJournalById(id: string): Promise<JournalEntry> {
    const res = await api.get<any>(`/journal-entries/${id}`);
    return res.data;
  },

  async createJournalDraft(data: {
    entry_date: string;
    description: string;
    reference_type?: string | null;
    reference_id?: string | null;
    lines: {
      account_id: string;
      description?: string | null;
      debit_amount: number;
      credit_amount: number;
      subledger_type?: string | null;
      subledger_id?: string | null;
    }[];
  }): Promise<JournalEntry> {
    const res = await api.post<any>('/journal-entries', data);
    return res.data;
  },

  async updateJournalDraft(
    id: string,
    data: {
      entry_date?: string;
      description?: string;
      lines?: any[];
    }
  ): Promise<JournalEntry> {
    const res = await api.patch<any>(`/journal-entries/${id}`, data);
    return res.data;
  },

  async deleteJournalDraft(id: string): Promise<void> {
    await api.delete(`/journal-entries/${id}`);
  },

  async submitJournal(id: string): Promise<JournalEntry> {
    const res = await api.post<any>(`/journal-entries/${id}/submit`, {});
    return res.data;
  },

  async approveJournal(id: string): Promise<JournalEntry> {
    const res = await api.post<any>(`/journal-entries/${id}/approve`, {});
    return res.data;
  },

  async postJournal(id: string): Promise<any> {
    const res = await api.post<any>(`/journal-entries/${id}/post`, {});
    return res.data;
  },

  async reverseJournal(id: string, reason: string): Promise<any> {
    const res = await api.post<any>(`/journal-entries/${id}/reverse`, { reason });
    return res.data;
  },

  // --- Vouchers ---
  async getVouchers(params?: {
    voucher_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<Voucher[]> {
    const res = await api.get<any>(`/vouchers${toQuery(params)}`);
    return res.data || [];
  },

  async getVoucherById(id: string): Promise<Voucher> {
    const res = await api.get<any>(`/vouchers/${id}`);
    return res.data;
  },

  // --- Reports & Statements ---
  async getTrialBalance(params?: { start_date?: string; end_date?: string }): Promise<TrialBalanceReport> {
    const res = await api.get<any>(`/accounting/trial-balance${toQuery(params)}`);
    return res.data;
  },

  async getDashboardSummary(): Promise<AccountingDashboardSummary> {
    const res = await api.get<any>('/accounting/dashboard');
    return res.data;
  },

  async getGeneralLedger(params: {
    account_id: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AccountLedgerStatement> {
    const res = await api.get<any>(`/accounting/general-ledger${toQuery(params)}`);
    return res.data;
  },

  async getSubsidiaryLedger(type: 'MEMBER' | 'SPONSOR' | 'EVENT'): Promise<SubsidiaryLedgerItem[]> {
    const res = await api.get<any>(`/accounting/subsidiary-ledger?type=${type}`);
    return res.data || [];
  },

  async getMappings(): Promise<AccountingMapping[]> {
    const res = await api.get<any>('/accounting/mappings');
    return res.data || [];
  },

  async syncHistorical(): Promise<any> {
    const res = await api.post<any>('/accounting/sync-historical', {});
    return res.data;
  },
};
