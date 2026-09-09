export type AccountCategoryType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalanceType = 'DEBIT' | 'CREDIT';
export type AccountSubtype = 
  | 'CASH' | 'BANK' | 'MFS' | 'RECEIVABLE' | 'PAYABLE' | 'ACCRUED' 
  | 'DEFERRED' | 'RESERVE' | 'OPENING' | 'MEMBERSHIP' | 'DONATION' 
  | 'SPONSORSHIP' | 'EVENT' | 'ADMIN' | 'MARKETING' | 'LOGISTICS' 
  | 'FINANCIAL' | 'OTHER';

export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: AccountCategoryType;
  account_subtype?: AccountSubtype | null;
  parent_account_id?: string | null;
  normal_balance: NormalBalanceType;
  is_system_account: boolean;
  is_active: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
  parent_account?: ChartOfAccount;
  children?: ChartOfAccount[];
  current_balance?: number;
}

export type FinancialYearStatus = 'ACTIVE' | 'CLOSED' | 'LOCKED';

export interface FinancialYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: FinancialYearStatus;
  created_at: string;
  updated_at: string;
  periods?: AccountingPeriod[];
}

export type AccountingPeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED';

export interface AccountingPeriod {
  id: string;
  financial_year_id: string;
  name: string;
  period_number: number;
  start_date: string;
  end_date: string;
  status: AccountingPeriodStatus;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
  updated_at: string;
  financial_year?: FinancialYear;
}

export type JournalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SUBMITTED' | 'APPROVED' | 'POSTED' | 'REJECTED' | 'REVERSED' | 'VOIDED';

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description?: string | null;
  debit_amount: number;
  credit_amount: number;
  subledger_type?: 'MEMBER' | 'SPONSOR' | 'EVENT' | 'OTHER' | null;
  subledger_id?: string | null;
  created_at: string;
  account?: ChartOfAccount;
}

export interface JournalEntry {
  id: string;
  journal_number: string;
  entry_date: string;
  accounting_period_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  description: string;
  status: JournalStatus;
  total_debit: number;
  total_credit: number;
  reversal_journal_id?: string | null;
  created_by?: string | null;
  creator_name?: string;
  posted_by?: string | null;
  poster_name?: string;
  posted_at?: string | null;
  reversed_by?: string | null;
  reverser_name?: string;
  reversed_at?: string | null;
  created_at: string;
  updated_at: string;
  lines?: JournalEntryLine[];
  voucher?: Voucher;
}

export type VoucherType = 'PAYMENT_VOUCHER' | 'RECEIPT_VOUCHER' | 'JOURNAL_VOUCHER' | 'CONTRA_VOUCHER';
export type VoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface Voucher {
  id: string;
  voucher_number: string;
  voucher_type: VoucherType;
  journal_entry_id: string;
  transaction_date: string;
  description?: string | null;
  status: VoucherStatus;
  prepared_by?: string | null;
  preparer_name?: string;
  approved_by?: string | null;
  approver_name?: string;
  created_at: string;
  updated_at: string;
  journal_entry?: JournalEntry;
}

export interface AccountingMapping {
  id: string;
  transaction_type: string;
  debit_account_id: string;
  credit_account_id: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  debit_account?: ChartOfAccount;
  credit_account?: ChartOfAccount;
}

export interface TrialBalanceItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountCategoryType;
  normal_balance: NormalBalanceType;
  total_debit: number;
  total_credit: number;
  debit_balance: number;
  credit_balance: number;
}

export interface TrialBalanceReport {
  accounts: TrialBalanceItem[];
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
}

export interface GeneralLedgerFilter {
  account_id?: string;
  start_date?: string;
  end_date?: string;
  accounting_period_id?: string;
}

export interface GeneralLedgerLine {
  id: string;
  entry_date: string;
  journal_number: string;
  reference_type?: string | null;
  description?: string | null;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  journal_entry_id: string;
}

export interface AccountLedgerStatement {
  account: ChartOfAccount;
  opening_balance: number;
  lines: GeneralLedgerLine[];
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

export interface SubsidiaryLedgerItem {
  subledger_type: string;
  subledger_id: string;
  name: string;
  code?: string;
  total_debit: number;
  total_credit: number;
  balance: number;
  last_transaction_date?: string;
}

export interface AccountingDashboardSummary {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  total_revenue: number;
  total_expenses: number;
  net_surplus: number;
  open_periods_count: number;
  posted_journals_count: number;
  draft_journals_count: number;
  is_trial_balance_equal: boolean;
  trial_balance_difference: number;
}
