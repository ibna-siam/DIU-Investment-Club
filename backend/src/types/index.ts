export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  student_id?: string | null;
  profile_image?: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  roles?: Role[];
  permissions?: string[]; // e.g. ['users.read', 'expenses.create']
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  name: string;
  description: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// -------------------------------------------------------------
// PHASE 2: FINANCIAL MANAGEMENT TYPES
// -------------------------------------------------------------

export type AccountType = 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'OTHER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';

export interface FinancialAccount {
  id: string;
  name: string;
  account_type: AccountType;
  account_number?: string | null;
  provider_name?: string | null;
  opening_balance: number;
  current_balance: number;
  currency: string;
  status: AccountStatus;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface IncomeCategory {
  id: string;
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | 'OPENING_BALANCE'
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'MEMBER_PAYMENT'
  | 'ADJUSTMENT'
  | 'OTHER';

export type TransactionDirection = 'CREDIT' | 'DEBIT';

export interface FinancialTransaction {
  id: string;
  transaction_number: string;
  transaction_type: TransactionType;
  transaction_date: string;
  amount: number;
  direction: TransactionDirection;
  financial_account_id: string;
  account_name?: string;
  account_type?: AccountType;
  source_type?: string | null;
  source_id?: string | null;
  description?: string | null;
  reference_number?: string | null;
  balance_before: number;
  balance_after: number;
  created_by?: string | null;
  created_at: string;
}

export type IncomeStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

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
  transaction_id?: string | null;
  transaction_number?: string | null;
  event_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'PAID'
  | 'CANCELLED'
  | 'PENDING';

export interface Expense {
  id: string;
  expense_number: string;
  expense_date: string;
  category_id: string;
  category_name?: string;
  amount: number;
  vendor_name: string;
  financial_account_id: string;
  account_name?: string;
  payment_method?: string | null;
  reference_number?: string | null;
  description?: string | null;
  status: ExpenseStatus;
  transaction_id?: string | null;
  transaction_number?: string | null;
  event_id?: string | null;
  event_budget_item_id?: string | null;
  requested_by?: string | null;
  requested_by_name?: string | null;
  paid_by?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  module: string;
  record_id?: string | null;
  old_data?: any;
  new_data?: any;
  ip_address?: string | null;
  created_at: string;
}

// ==========================================
// Phase 3: Approval Workflow Types
// ==========================================
export type ApprovalRequestType = 'EXPENSE' | 'EVENT_BUDGET' | 'FUND_TRANSFER' | 'REIMBURSEMENT';
export type ApprovalStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'CANCELLED';
export type ApprovalActionType = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ApprovalAction {
  id: string;
  approval_request_id: string;
  approval_step_id: string;
  action: ApprovalActionType;
  comment?: string | null;
  acted_by: string;
  acted_by_name?: string | null;
  created_at: string;
}

export interface ApprovalStep {
  id: string;
  approval_request_id: string;
  step_number: number;
  required_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SKIPPED';
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  request_type: ApprovalRequestType;
  reference_id: string;
  title: string;
  description?: string | null;
  requested_by: string;
  requested_by_name?: string | null;
  requested_by_email?: string | null;
  status: ApprovalStatus;
  current_step: number;
  total_steps: number;
  steps?: ApprovalStep[];
  actions?: ApprovalAction[];
  reference_data?: any;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Phase 3: Fund Transfer Types
// ==========================================
export type TransferStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

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
  status: TransferStatus;
  out_transaction_id?: string | null;
  in_transaction_id?: string | null;
  created_by: string;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ==========================================
// Phase 3: Cash Flow Types
// ==========================================
export interface CashFlowSummary {
  start_date: string;
  end_date: string;
  opening_balance: number;
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  closing_balance: number;
}

export interface CashFlowTimelineItem {
  id: string;
  date: string;
  transaction_number: string;
  description: string;
  category: string;
  transaction_type: TransactionType;
  direction: TransactionDirection;
  account_name: string;
  account_type: AccountType;
  inflow: number;
  outflow: number;
  running_balance: number;
}

export interface CashFlowTrendPoint {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
}

// ==========================================
// Notifications Foundation
// ==========================================
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  link?: string | null;
  is_read: boolean;
  created_at: string;
}


export interface FinancialDashboardMetrics {
  total_available_balance: number;
  cash_balance: number;
  bank_balance: number;
  mobile_balance: number;
  total_income: number;
  total_expenses: number;
  current_month_income: number;
  current_month_expenses: number;
  recent_transactions: any[];
}

// ==========================================
// Phase 4: Event & Budget Management Types
// ==========================================

export type EventType =
  | 'SEMINAR'
  | 'WORKSHOP'
  | 'CONFERENCE'
  | 'INVESTMENT_COMPETITION'
  | 'CASE_COMPETITION'
  | 'NETWORKING_EVENT'
  | 'TRAINING'
  | 'CLUB_PROGRAM'
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
  | 'ARCHIVED';

export interface Event {
  id: string;
  event_code: string;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  event_type: EventType;
  status: EventStatus;
  start_date: string;
  end_date: string;
  venue: string;
  location?: string | null;
  organizer?: string | null;
  expected_participants: number;
  actual_participants: number;
  cover_image?: string | null;
  created_by?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  deleted_at?: string | null;
}

export type EventRole =
  | 'EVENT_DIRECTOR'
  | 'EVENT_COORDINATOR'
  | 'FINANCE_COORDINATOR'
  | 'SPONSORSHIP_COORDINATOR'
  | 'MARKETING_COORDINATOR'
  | 'VOLUNTEER_COORDINATOR'
  | 'TEAM_MEMBER';

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  event_role: EventRole;
  responsibility?: string | null;
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
  receipt_token?: string | null;
  member_id: string;
  member?: Member;
  due_id?: string | null;
  due?: MemberDue;
  amount: number;
  payment_method: PaymentMethodType;
  financial_account_id: string;
  account_name?: string;
  payment_date: string;
  reference_number?: string | null;
  transaction_reference?: string | null;
  status: PaymentVerificationStatus;
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
  receipt_number?: string | null;
  donor_name: string;
  donor_type: DonorType;
  email?: string | null;
  phone?: string | null;
  organization_name?: string | null;
  amount: number;
  financial_account_id: string;
  account_name?: string;
  payment_method: PaymentMethodType;
  reference_number?: string | null;
  donation_date: string;
  purpose?: string | null;
  event_id?: string | null;
  event_title?: string | null;
  status: DonationStatus;
  income_id?: string | null;
  transaction_id?: string | null;
  verified_by?: string | null;
  verifier_name?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  id: string;
  sponsor_code: string;
  name: string;
  organization_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
  status: SponsorStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sponsorship {
  id: string;
  sponsorship_number: string;
  sponsor_id: string;
  sponsor?: Sponsor;
  event_id?: string | null;
  event_title?: string | null;
  title: string;
  description?: string | null;
  agreed_amount: number;
  received_amount: number;
  remaining_amount: number;
  status: SponsorshipStatus;
  agreement_date: string;
  due_date?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SponsorshipPayment {
  id: string;
  payment_number: string;
  receipt_number?: string | null;
  sponsorship_id: string;
  sponsorship?: Sponsorship;
  amount: number;
  payment_method: PaymentMethodType;
  financial_account_id: string;
  account_name?: string;
  payment_date: string;
  reference_number?: string | null;
  status: PaymentVerificationStatus;
  income_id?: string | null;
  transaction_id?: string | null;
  verified_by?: string | null;
  verifier_name?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
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




export * from './accounting.types';
export * from './financial-reports.types';
export * from './governance.types';
export * from './automation.types';
export * from './audit-compliance.types';

