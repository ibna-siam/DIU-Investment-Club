export type AutomationRuleStatus = 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'ARCHIVED';

export type AutomationTriggerType =
  | 'PAYMENT_DUE'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'TASK_CREATED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_COMPLETED'
  | 'MEETING_CREATED'
  | 'MEETING_REMINDER'
  | 'EVENT_CREATED'
  | 'EVENT_STARTING'
  | 'EVENT_BUDGET_LIMIT'
  | 'EVENT_COMPLETED'
  | 'EXPENSE_SUBMITTED'
  | 'APPROVAL_PENDING'
  | 'ACCOUNTING_PERIOD_ENDING'
  | 'FINANCIAL_YEAR_ENDING';

export type AutomationConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'CONTAINS';

export interface AutomationCondition {
  field: string;
  operator: AutomationConditionOperator;
  value: any;
}

export type AutomationActionType =
  | 'CREATE_NOTIFICATION'
  | 'SEND_EMAIL'
  | 'CREATE_TASK'
  | 'UPDATE_STATUS'
  | 'CREATE_REMINDER'
  | 'CREATE_APPROVAL_REQUEST';

export interface AutomationAction {
  type: AutomationActionType;
  target?: string;
  message?: string;
  payload?: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string | null;
  trigger_type: AutomationTriggerType;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  status: AutomationRuleStatus;
  last_triggered_at?: string | null;
  execution_count: number;
  created_by?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
}

export type AutomationLogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PENDING';

export interface AutomationLog {
  id: string;
  rule_id?: string | null;
  rule_name?: string | null;
  trigger_type: string;
  execution_time: string;
  action_type: string;
  result: Record<string, any>;
  status: AutomationLogStatus;
  error_message?: string | null;
  record_id?: string | null;
  created_at: string;
}

export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type RecurringTransactionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface RecurringTransaction {
  id: string;
  name: string;
  transaction_type: 'INCOME' | 'EXPENSE' | 'FUND_TRANSFER';
  amount: number;
  category_id?: string | null;
  category_name?: string | null;
  source_account_id: string;
  source_account_name?: string | null;
  destination_account_id?: string | null;
  destination_account_name?: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  next_execution_date: string;
  last_execution_date?: string | null;
  auto_submit_for_approval: boolean;
  description?: string | null;
  status: RecurringTransactionStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurringTaskStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface RecurringTask {
  id: string;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  frequency: RecurringFrequency;
  assignee_id?: string | null;
  assignee_name?: string | null;
  due_date_days_offset: number;
  start_date: string;
  end_date?: string | null;
  next_execution_date: string;
  last_generated_at?: string | null;
  status: RecurringTaskStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReminderType =
  | 'MEMBER_DUES'
  | 'PAYMENT_DUE'
  | 'TASK_DEADLINE'
  | 'MEETING_DATE'
  | 'EVENT_DATE'
  | 'APPROVAL_DEADLINE'
  | 'ASSET_RETURN'
  | 'PERIOD_CLOSING'
  | 'YEAR_END'
  | 'CUSTOM_ADMIN'
  | 'GENERAL';

export type ReminderStatus = 'PENDING' | 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type ReminderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface Reminder {
  id: string;
  title: string;
  reminder_type: ReminderType;
  target_date: string;
  schedule_offset_days: number;
  schedule_point?: string;
  idempotency_key?: string;
  priority?: ReminderPriority;
  scheduled_at: string;
  is_sent: boolean;
  sent_at?: string | null;
  recipient_user_id?: string | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_role?: string | null;
  related_record_id?: string | null;
  related_module?: string | null;
  message: string;
  status: ReminderStatus;
  attempt_count?: number;
  error_message?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type MonthEndChecklistStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export interface MonthEndChecklist {
  id: string;
  accounting_period_id?: string | null;
  financial_year_id?: string | null;
  month_year: string;
  status: MonthEndChecklistStatus;
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  notes?: string | null;
  items_count?: number;
  completed_items_count?: number;
  created_at: string;
  updated_at: string;
  items?: MonthEndChecklistItem[];
}

export type MonthEndItemVerificationStatus = 'VERIFIED' | 'FAILED' | 'PENDING' | 'MANUAL';

export interface MonthEndChecklistItem {
  id: string;
  checklist_id: string;
  item_key: string;
  title: string;
  description?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  auto_verification_status: MonthEndItemVerificationStatus;
  auto_verification_details?: Record<string, any> | null;
  order_index: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationDashboardMetrics {
  active_rules_count: number;
  total_rules_count: number;
  executions_today: number;
  successful_executions: number;
  failed_executions: number;
  pending_reminders_count: number;
  active_recurring_transactions: number;
  active_recurring_tasks: number;
  overdue_tasks_count: number;
  overdue_dues_count: number;
  pending_escalations_count: number;
}
