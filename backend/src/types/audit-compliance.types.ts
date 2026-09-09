export type CashReconciliationStatus = 'DRAFT' | 'COMPLETED' | 'DISCREPANCY_FLAGGED';

export interface CashReconciliation {
  id: string;
  account_id: string;
  account_name?: string;
  reconciliation_date: string;
  system_cash: number;
  physical_cash: number;
  difference: number;
  notes?: string | null;
  verified_by?: string | null;
  verified_by_name?: string | null;
  status: CashReconciliationStatus;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type BankReconciliationStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW_REQUIRED' | 'COMPLETED' | 'APPROVED';

export interface BankReconciliation {
  id: string;
  account_id: string;
  account_name?: string;
  account_number?: string;
  period_start: string;
  period_end: string;
  statement_ending_balance: number;
  system_ending_balance: number;
  reconciled_balance: number;
  difference: number;
  status: BankReconciliationStatus;
  notes?: string | null;
  verified_by?: string | null;
  verified_by_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: BankReconciliationItem[];
}

export type BankItemMatchStatus = 'MATCHED' | 'UNMATCHED' | 'ADJUSTMENT_REQUIRED' | 'DISPUTED';
export type BankItemMatchType = 'EXACT' | 'AUTO_SUGGESTED' | 'MANUAL' | 'SPLIT';

export interface BankReconciliationItem {
  id: string;
  bank_reconciliation_id: string;
  financial_transaction_id?: string | null;
  transaction_number?: string | null;
  statement_date: string;
  statement_description: string;
  statement_reference?: string | null;
  statement_amount: number;
  match_status: BankItemMatchStatus;
  match_type?: BankItemMatchType | null;
  confidence_score?: number;
  notes?: string | null;
  confirmed_by?: string | null;
  created_at?: string;
}

export type ControlType = 
  | 'APPROVAL_THRESHOLD' 
  | 'DUAL_APPROVAL' 
  | 'SEGREGATION_OF_DUTIES' 
  | 'LARGE_TRANSACTION' 
  | 'RESTRICTED_ACCESS' 
  | 'PERIOD_CLOSING';

export type RequiredAction = 'WARNING' | 'BLOCK' | 'REQUIRE_OVERRIDE';

export interface InternalControlRule {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  control_type: ControlType;
  conditions: Record<string, any>;
  required_action: RequiredAction;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SodCheckResult {
  hasConflict: boolean;
  conflictType?: string;
  requiredAction: RequiredAction;
  message: string;
  details?: Record<string, any>;
}

export type ComplianceCategory = 
  | 'FINANCIAL' 
  | 'GOVERNANCE' 
  | 'EVENT' 
  | 'DOCUMENTATION' 
  | 'INTERNAL_POLICY' 
  | 'OTHER';

export type ComplianceStatus = 
  | 'NOT_STARTED' 
  | 'IN_PROGRESS' 
  | 'COMPLIANT' 
  | 'NON_COMPLIANT' 
  | 'NOT_APPLICABLE';

export interface ComplianceChecklist {
  id: string;
  title: string;
  category: ComplianceCategory;
  description?: string | null;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'EVENT_BASED' | 'ON_DEMAND';
  due_date?: string | null;
  status: ComplianceStatus;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  requirements?: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  checklist_id: string;
  requirement: string;
  responsible_person_id?: string | null;
  responsible_person_name?: string | null;
  due_date?: string | null;
  status: ComplianceStatus;
  evidence_document_id?: string | null;
  evidence_document_title?: string | null;
  evidence_notes?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ExceptionType = 
  | 'DUPLICATE_TRANSACTION' 
  | 'UNUSUAL_AMOUNT' 
  | 'BUDGET_OVERRUN' 
  | 'UNAPPROVED_EXPENSE' 
  | 'LATE_APPROVAL' 
  | 'ACCOUNTING_IMBALANCE' 
  | 'MISSING_DOCUMENT';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExceptionStatus = 'FLAGGED' | 'REVIEW_REQUIRED' | 'RESOLVED';

export interface FinancialException {
  id: string;
  entity_type: 'TRANSACTION' | 'EXPENSE' | 'INCOME' | 'JOURNAL' | 'BUDGET' | 'RECONCILIATION';
  entity_id?: string | null;
  exception_type: ExceptionType;
  severity: ExceptionSeverity;
  description: string;
  details?: Record<string, any> | null;
  status: ExceptionStatus;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  flagged_at?: string;
}

export type RiskFlagType = 
  | 'THRESHOLD_BREACH' 
  | 'SIMILAR_TRANSACTIONS' 
  | 'MULTIPLE_FAILED_ACTIONS' 
  | 'UNUSUAL_APPROVAL' 
  | 'REPEATED_REVERSALS' 
  | 'SOD_VIOLATION';

export type RiskFlagStatus = 'OPEN' | 'INVESTIGATING' | 'DISMISSED' | 'RESOLVED';

export interface RiskFlag {
  id: string;
  flag_type: RiskFlagType;
  severity: ExceptionSeverity;
  target_entity: string;
  target_id?: string | null;
  risk_score: number;
  title: string;
  description: string;
  status: RiskFlagStatus;
  flagged_by?: string | null;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CommunicationTemplate {
  id: string;
  code: string;
  name: string;
  channel: 'EMAIL' | 'SMS' | 'NOTIFICATION';
  subject?: string | null;
  body_template: string;
  variables: string[];
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ProviderType = 'EMAIL' | 'SMS' | 'PAYMENT' | 'CALENDAR';
export type ProviderStatus = 'CONFIGURED' | 'CONNECTED' | 'ERROR' | 'DISABLED';

export interface IntegrationConfig {
  id: string;
  provider_type: ProviderType;
  provider_name: string;
  is_enabled: boolean;
  settings: Record<string, any>;
  last_tested_at?: string | null;
  status: ProviderStatus;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationLog {
  id: string;
  provider_type: string;
  provider_name: string;
  direction: 'OUTBOUND' | 'INBOUND';
  endpoint_or_action: string;
  status_code?: number | null;
  execution_time_ms?: number | null;
  retry_count?: number;
  payload_summary?: string | null;
  error_message?: string | null;
  created_at?: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  headers?: Record<string, any> | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  event_id: string;
  payload: Record<string, any>;
  response_code?: number | null;
  response_body?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  retry_count: number;
  created_at?: string;
}
