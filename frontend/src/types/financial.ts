export type AccountType = 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'OTHER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';
export type IncomeStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';
export type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'PAID'
  | 'CANCELLED';
export type TransactionType = 'CREDIT' | 'DEBIT';

export interface FinancialAccount {
  id: string;
  name: string;
  account_name?: string;
  account_type: AccountType;
  account_number?: string | null;
  provider_name?: string | null;
  bank_name?: string | null;
  opening_balance: number;
  current_balance: number;
  balance?: number;
  status: AccountStatus;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
}

export interface Income {
  id: string;
  income_number: string;
  transaction_date: string;
  category_id: string;
  category_name?: string;
  amount: number;
  received_from: string;
  financial_account_id: string;
  account_name?: string;
  payment_method?: string | null;
  reference_number?: string | null;
  description?: string | null;
  status: IncomeStatus;
  event_id?: string | null;
  event_title?: string | null;
  financial_transaction_id?: string | null;
  transaction_number?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  expense_date: string;
  category_id: string;
  category_name?: string;
  amount: number;
  paid_to: string;
  financial_account_id: string;
  account_name?: string;
  payment_method?: string | null;
  invoice_number?: string | null;
  receipt_url?: string | null;
  description?: string | null;
  event_id?: string | null;
  event_title?: string | null;
  event_budget_item_id?: string | null;
  status: ExpenseStatus;
  financial_transaction_id?: string | null;
  transaction_number?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: TransactionType | string;
  direction?: string;
  category: string;
  amount: number;
  financial_account_id: string;
  account_name?: string;
  balance_after: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reference_number?: string | null;
  description?: string | null;
  created_at: string;
  created_by?: string;
}

export interface FinancialDashboardMetrics {
  total_balance: number;
  cash_balance: number;
  bank_balance: number;
  digital_balance: number;
  monthly_income: number;
  monthly_expense: number;
  net_monthly: number;
  total_transactions_count: number;
  active_accounts_count: number;
  recent_transactions: FinancialTransaction[];
}

export type ApprovalStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED';

export type ApprovalActionType = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ApprovalStep {
  id: string;
  approval_request_id: string;
  step_number: number;
  step_name: string;
  required_role: string;
  assigned_to?: string | null;
  assignee_name?: string;
  status: string;
  completed_at?: string | null;
}

export interface ApprovalAction {
  id: string;
  approval_request_id: string;
  approval_step_id: string;
  action: ApprovalActionType;
  comment?: string | null;
  acted_by: string;
  actor_name?: string;
  actor_email?: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  request_type: 'EXPENSE' | 'BUDGET' | 'OTHER';
  reference_id: string;
  title: string;
  description?: string | null;
  amount?: number | null;
  current_step: number;
  total_steps: number;
  status: ApprovalStatus;
  requested_by: string;
  requester_name?: string;
  requester_email?: string;
  created_at: string;
  updated_at: string;
  steps?: ApprovalStep[];
  actions?: ApprovalAction[];
  expense?: Expense;
}

export interface FundTransfer {
  id: string;
  transfer_number: string;
  from_account_id: string;
  from_account_name?: string;
  to_account_id: string;
  to_account_name?: string;
  amount: number;
  transfer_date: string;
  description?: string | null;
  reference_number?: string | null;
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING';
  out_transaction_id?: string | null;
  in_transaction_id?: string | null;
  out_transaction_number?: string | null;
  in_transaction_number?: string | null;
  created_by?: string;
  creator_name?: string;
  created_at: string;
}

export interface CashFlowSummary {
  opening_balance: number;
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  closing_balance: number;
  start_date?: string;
  end_date?: string;
  account_id?: string;
  account_type?: string;
}

export interface CashFlowTimelineItem {
  id: string;
  transaction_number: string;
  transaction_date: string;
  transaction_type: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  financial_account_id: string;
  account_name: string;
  account_type: string;
  source_type: string;
  source_id?: string;
  description?: string;
  reference_number?: string;
  running_balance: number;
  created_at: string;
}

export interface CashFlowTrendPoint {
  period: string;
  inflow: number;
  outflow: number;
  net_flow: number;
}

// ==========================================
// Phase 4: Event & Budget Management Types
// ==========================================
export type EventType =
  | 'INVESTMENT_SUMMIT'
  | 'WORKSHOP'
  | 'NETWORKING'
  | 'ANNUAL_CONFERENCE'
  | 'STOCK_PITCH'
  | 'PANEL_DISCUSSION'
  | 'GUEST_LECTURE'
  | 'INTERNAL_MEETING'
  | 'OTHER';

export type EventStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'FINANCIAL_REVIEW'
  | 'CLOSED'
  | 'CANCELLED'
  | 'POSTPONED';

export type EventRole =
  | 'EVENT_DIRECTOR'
  | 'EVENT_COORDINATOR'
  | 'FINANCE_COORDINATOR'
  | 'MARKETING_LEAD'
  | 'LOGISTICS_LEAD'
  | 'VOLUNTEER'
  | 'TEAM_MEMBER';

export interface Event {
  id: string;
  event_code: string;
  title: string;
  slug: string;
  description?: string | null;
  event_type: EventType;
  status: EventStatus;
  start_date: string;
  end_date: string;
  venue?: string | null;
  expected_participants?: number;
  actual_participants?: number;
  banner_url?: string | null;
  proposed_budget: number;
  created_by?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  archived_at?: string | null;
}

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  event_role: EventRole;
  role?: EventRole;
  responsibility?: string | null;
  responsibilities?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  assigned_by?: string | null;
  assigned_by_name?: string | null;
  assigned_at: string;
  removed_at?: string | null;
}

export type EventBudgetStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'ACTIVE'
  | 'EXCEEDED'
  | 'CLOSED';

export interface EventBudgetItem {
  id: string;
  event_budget_id: string;
  expense_category_id: string;
  category_name?: string | null;
  title: string;
  description?: string | null;
  allocated_amount: number;
  actual_spent?: number;
  remaining_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface EventBudget {
  id: string;
  event_id: string;
  budget_number: string;
  title: string;
  description?: string | null;
  proposed_amount: number;
  approved_amount: number;
  spent_amount?: number;
  remaining_amount?: number;
  status: EventBudgetStatus;
  created_by?: string | null;
  creator_name?: string | null;
  approved_by?: string | null;
  approver_name?: string | null;
  created_at: string;
  updated_at: string;
  items?: EventBudgetItem[];
}

export interface EventFinancialSummary {
  event_id: string;
  event_code: string;
  event_title: string;
  event_status: EventStatus;
  proposed_budget: number;
  approved_budget: number;
  total_income: number;
  total_incomes?: number;
  total_expenses: number;
  pending_expenses: number;
  remaining_budget: number;
  net_financial_result: number;
  net_profit_loss?: number;
  budget_utilization: number;
  budget_utilization_percentage?: number;
  utilization_status: 'NORMAL' | 'MONITOR' | 'WARNING' | 'EXCEEDED';
}

// ==========================================
// Phase 5: Member & Revenue Management Types
// ==========================================

export type MembershipBillingCycle = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type MemberStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'GRADUATED'
  | 'LEFT'
  | 'ARCHIVED';

export type DueType =
  | 'MEMBERSHIP_FEE'
  | 'RENEWAL_FEE'
  | 'MONTHLY_DUE'
  | 'SPECIAL_DUE'
  | 'EVENT_FEE'
  | 'OTHER';

export type DueStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'WAIVED'
  | 'CANCELLED';

export type PaymentMethodType =
  | 'CASH'
  | 'BKASH'
  | 'NAGAD'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'OTHER';

export type PaymentVerificationStatus =
  | 'PENDING'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'CANCELLED';

export type DonorType = 'INDIVIDUAL' | 'ORGANIZATION' | 'ANONYMOUS';

export type DonationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CANCELLED';

export type SponsorStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type SponsorshipStatus =
  | 'PROSPECT'
  | 'NEGOTIATION'
  | 'AGREED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface MembershipType {
  id: string;
  name: string;
  description?: string | null;
  joining_fee: number;
  renewal_fee: number;
  billing_cycle: MembershipBillingCycle;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  member_code: string;
  user_id?: string | null;
  student_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  batch?: string | null;
  semester?: string | null;
  membership_type_id?: string | null;
  membership_type?: MembershipType | null;
  membership_status: MemberStatus;
  joined_date: string;
  profile_image?: string | null;
  notes?: string | null;
  created_by?: string | null;
  creator_name?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  outstanding_dues?: number;
}

export interface MemberMembership {
  id: string;
  member_id: string;
  membership_type_id: string;
  membership_type?: MembershipType;
  start_date: string;
  end_date?: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'UPGRADED';
  joining_fee_amount: number;
  renewal_fee_amount: number;
  created_at: string;
  updated_at: string;
}

export interface MemberDue {
  id: string;
  due_number: string;
  member_id: string;
  member?: Member;
  membership_id?: string | null;
  due_type: DueType;
  title: string;
  description?: string | null;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: DueStatus;
  waived_by?: string | null;
  waived_at?: string | null;
  waiver_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberPayment {
  id: string;
  payment_number: string;
  receipt_number?: string | null;
  member_id: string;
  member?: Member;
  due_id?: string | null;
  due?: MemberDue;
  amount_paid: number;
  amount: number;
  payment_method: PaymentMethodType | string;
  trx_id?: string | null;
  reference_number?: string | null;
  transaction_reference?: string | null;
  financial_account_id: string;
  financial_account?: FinancialAccount;
  account_name?: string;
  payment_date: string;
  verification_status: PaymentVerificationStatus | string;
  status?: PaymentVerificationStatus | string;
  income_id?: string | null;
  transaction_id?: string | null;
  verified_by?: string | null;
  verifier_name?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  donation_number: string;
  donor_name: string;
  donor_type: DonorType | string;
  email?: string | null;
  phone?: string | null;
  organization_name?: string | null;
  amount: number;
  financial_account_id: string;
  financial_account?: FinancialAccount;
  payment_method: PaymentMethodType | string;
  trx_id?: string | null;
  reference_number?: string | null;
  donation_date: string;
  purpose?: string | null;
  event_id?: string | null;
  event?: Event;
  anonymous?: boolean;
  status: DonationStatus | string;
  income_id?: string | null;
  transaction_id?: string | null;
  verified_by?: string | null;
  verifier_name?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  id: string;
  sponsor_code: string;
  company_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
  status: SponsorStatus | string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sponsorship {
  id: string;
  agreement_number: string;
  sponsor_id: string;
  sponsor?: Sponsor;
  event_id?: string | null;
  event?: Event;
  agreement_title: string;
  tier: string;
  agreed_amount: number;
  received_amount: number;
  remaining_amount?: number;
  status: SponsorshipStatus | string;
  agreement_date: string;
  deliverable_terms?: string | null;
  contract_url?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  payments?: SponsorshipPayment[];
}

export interface SponsorshipPayment {
  id: string;
  payment_number: string;
  sponsorship_id: string;
  sponsorship?: Sponsorship;
  installment_number: number;
  amount: number;
  payment_method: PaymentMethodType | string;
  trx_id?: string | null;
  reference_number?: string | null;
  financial_account_id: string;
  financial_account?: FinancialAccount;
  payment_date: string;
  verification_status: PaymentVerificationStatus | string;
  income_id?: string | null;
  transaction_id?: string | null;
  verified_by?: string | null;
  verifier_name?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface MemberFinancialMetrics {
  total_members: number;
  active_members: number;
  total_outstanding_dues: number;
  collected_this_month: number;
  total_membership_revenue: number;
  overdue_amount: number;
  overdue_dues_count: number;
  payment_methods: { method: string; total: number; count: number }[];
}

export interface ClubRevenueOverview {
  membership_revenue: number;
  donation_revenue: number;
  sponsorship_revenue: number;
  event_ticket_revenue: number;
  other_revenue: number;
  total_club_revenue: number;
}


export * from './accounting';

