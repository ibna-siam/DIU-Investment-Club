export interface FinancialStatementItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_subtype: string;
  amount: number;
}

export interface IncomeStatementReport {
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_expenses: number;
  net_surplus: number;
  revenue_items: FinancialStatementItem[];
  expense_items: FinancialStatementItem[];
  comparison?: {
    start_date: string;
    end_date: string;
    total_revenue: number;
    total_expenses: number;
    net_surplus: number;
    revenue_change_percentage: number;
    expense_change_percentage: number;
    surplus_change_percentage: number;
  };
}

export interface BalanceSheetReport {
  as_of_date: string;
  total_assets: number;
  total_liabilities: number;
  accumulated_club_fund: number;
  current_year_surplus: number;
  total_club_fund: number;
  total_liabilities_and_fund: number;
  difference: number;
  is_balanced: boolean;
  assets: FinancialStatementItem[];
  liabilities: FinancialStatementItem[];
  equity_items: FinancialStatementItem[];
}

export interface CashFlowActivityItem {
  category: string;
  type: string;
  amount: number;
}

export interface CashFlowStatementReport {
  start_date: string;
  end_date: string;
  opening_cash_balance: number;
  operating_inflows: number;
  operating_outflows: number;
  net_operating_cash_flow: number;
  investing_inflows: number;
  investing_outflows: number;
  net_investing_cash_flow: number;
  financing_inflows: number;
  financing_outflows: number;
  net_financing_cash_flow: number;
  net_cash_flow: number;
  closing_cash_balance: number;
  operating_items: CashFlowActivityItem[];
}

export interface BudgetVsActualItem {
  event_id: string;
  event_title: string;
  budget_id: string;
  budget_number: string;
  budget_title: string;
  budget_amount: number;
  actual_expense: number;
  actual_income: number;
  variance: number;
  variance_percentage: number;
  utilization_percentage: number;
  status_alert: 'UNDER_BUDGET' | 'NEAR_BUDGET_LIMIT' | 'OVER_BUDGET';
}

export interface BudgetVsActualReport {
  total_budget: number;
  total_actual_expense: number;
  total_variance: number;
  overall_utilization_percentage: number;
  items: BudgetVsActualItem[];
}

export interface EventFinancialItem {
  event_id: string;
  event_code: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  budget_amount: number;
  total_income: number;
  total_expenses: number;
  net_surplus: number;
  budget_utilization: number;
}

export interface EventFinancialReportsData {
  total_income: number;
  total_expenses: number;
  net_surplus: number;
  events: EventFinancialItem[];
}

export interface MemberTierRevenueItem {
  tier_name: string;
  total_dues: number;
  collected: number;
  outstanding: number;
}

export interface MemberMonthlyTrendItem {
  month: string;
  amount: number;
}

export interface MemberRevenueReport {
  total_dues_amount: number;
  total_collected: number;
  total_outstanding: number;
  total_overdue: number;
  collection_rate: number;
  active_paying_members: number;
  tiers: MemberTierRevenueItem[];
  monthly_trend: MemberMonthlyTrendItem[];
}

export interface DonationPurposeItem {
  purpose: string;
  total_amount: number;
  count: number;
}

export interface DonationRecordItem {
  id: string;
  donation_number: string;
  donor_name: string;
  donor_type: string;
  amount: number;
  donation_date: string;
  purpose: string;
  status: string;
}

export interface DonationReport {
  total_amount: number;
  verified_amount: number;
  pending_amount: number;
  donor_count: number;
  purposes: DonationPurposeItem[];
  donations: DonationRecordItem[];
}

export interface SponsorshipRecordItem {
  id: string;
  sponsorship_number: string;
  sponsor_name: string;
  event_title?: string;
  title: string;
  agreed_amount: number;
  received_amount: number;
  remaining_amount: number;
  status: string;
  agreement_date: string;
  due_date: string;
}

export interface SponsorshipReport {
  total_agreed_amount: number;
  total_received_amount: number;
  total_outstanding_amount: number;
  collection_rate: number;
  sponsor_count: number;
  sponsorships: SponsorshipRecordItem[];
}

export interface FinancialAnalyticsSummary {
  total_revenue: number;
  total_expenses: number;
  net_surplus: number;
  total_assets: number;
  total_liabilities: number;
  club_fund: number;
  cash_position: number;
  outstanding_dues: number;
  monthly_trends: {
    month: string;
    revenue: number;
    expense: number;
    surplus: number;
  }[];
  revenue_breakdown: {
    name: string;
    code: string;
    amount: number;
  }[];
  expense_breakdown: {
    name: string;
    code: string;
    amount: number;
  }[];
}

export interface ReportSnapshot {
  id: string;
  report_type: string;
  title: string;
  parameters: Record<string, any>;
  data_summary: Record<string, any>;
  created_by?: string;
  creator_name?: string;
  created_at: string;
}
