export type CommitteeType = 'EXECUTIVE' | 'ADVISORY' | 'SUB_COMMITTEE' | 'ORGANIZING';
export type CommitteeStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface CommitteePosition {
  id: string;
  position_name: string;
  hierarchy_level: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  member_id: string;
  position_id: string;
  start_date: string;
  end_date?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'RESIGNED';
  position?: CommitteePosition;
  member?: {
    id: string;
    member_code: string;
    student_id?: string;
    full_name: string;
    email: string;
    phone?: string;
  };
}

export interface ClubCommittee {
  id: string;
  committee_name: string;
  committee_type: CommitteeType;
  description?: string;
  start_date: string;
  end_date: string;
  status: CommitteeStatus;
  created_at: string;
  updated_at?: string;
  members?: CommitteeMember[];
  members_count?: number;
}

export type DocumentCategory =
  | 'CONSTITUTION'
  | 'MEETING_DOCUMENT'
  | 'FINANCIAL_DOCUMENT'
  | 'EVENT_DOCUMENT'
  | 'SPONSORSHIP_DOCUMENT'
  | 'POLICY_DOCUMENT'
  | 'REPORT'
  | 'CERTIFICATE'
  | 'OTHER';

export type DocumentVisibility =
  | 'PUBLIC_TO_MEMBERS'
  | 'EXECUTIVE_ONLY'
  | 'TREASURER_ONLY'
  | 'ADMIN_ONLY'
  | 'PRIVATE';

export interface DocumentVersionItem {
  id: string;
  document_id: string;
  version_number: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  original_size?: number;
  optimized_size?: number;
  uploaded_by?: string;
  changelog?: string;
  created_at: string;
  uploader?: { full_name: string; email: string };
}

export interface GovernanceDocument {
  id: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  original_size?: number;
  optimized_size?: number;
  original_file_name?: string;
  uploaded_by?: string;
  visibility: DocumentVisibility;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  version_number: number;
  deleted_at?: string;
  deleted_by?: string;
  archived_at?: string;
  archived_by?: string;
  created_at: string;
  updated_at?: string;
  uploader?: { id: string; full_name: string; email: string };
  versions?: DocumentVersionItem[];
}

export type MeetingType =
  | 'EXECUTIVE_MEETING'
  | 'GENERAL_MEETING'
  | 'FINANCIAL_MEETING'
  | 'EVENT_PLANNING_MEETING'
  | 'EMERGENCY_MEETING'
  | 'OTHER';

export type MeetingStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface MeetingAgenda {
  id: string;
  meeting_id: string;
  agenda_number: number;
  title: string;
  description?: string;
  allocated_minutes?: number;
  presenter_id?: string;
  status: 'PENDING' | 'DISCUSSED' | 'DEFERRED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  presenter?: { full_name: string; email: string };
}

export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  attendance_status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  arrival_time?: string | null;
  notes?: string | null;
  member?: {
    id: string;
    member_code: string;
    full_name: string;
    email: string;
  };
}

export interface MeetingMinutes {
  id: string;
  meeting_id: string;
  summary: string;
  discussion_notes?: string;
  prepared_by?: string;
  approved_by?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PUBLISHED';
  created_at: string;
  updated_at?: string;
  preparer?: { full_name: string; email: string };
  approver?: { full_name: string; email: string };
}

export interface Meeting {
  id: string;
  committee_id?: string | null;
  title: string;
  meeting_type: MeetingType;
  description?: string;
  meeting_date: string;
  start_time: string;
  end_time?: string;
  location?: string;
  meeting_link?: string;
  status: MeetingStatus;
  created_by?: string;
  created_at: string;
  committee?: { committee_name: string };
  agendas?: MeetingAgenda[];
  attendance?: MeetingAttendance[];
  minutes?: MeetingMinutes[];
  decisions?: ClubDecision[];
  tasks?: ClubTask[];
}

export type DecisionType = 'GOVERNANCE' | 'FINANCIAL' | 'EVENT' | 'POLICY' | 'OPERATIONAL';
export type DecisionStatus = 'PROPOSED' | 'APPROVED' | 'IMPLEMENTED' | 'DEFERRED' | 'CANCELLED';

export interface ClubDecision {
  id: string;
  meeting_id?: string | null;
  title: string;
  description: string;
  decision_date: string;
  decision_type: DecisionType;
  status: DecisionStatus;
  effective_date?: string | null;
  responsible_person_id?: string | null;
  created_by?: string;
  created_at: string;
  meeting?: { id: string; title: string; meeting_date: string; location?: string };
  responsible_person?: { id: string; full_name: string; email: string };
  tasks?: ClubTask[];
  tasks_count?: number;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  author?: { full_name: string; email: string };
}

export interface ClubTask {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string | null;
  created_by?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  related_decision_id?: string | null;
  related_meeting_id?: string | null;
  related_event_id?: string | null;
  created_at: string;
  updated_at?: string;
  assignee?: { id: string; full_name: string; email: string };
  creator?: { full_name: string; email: string };
  decision?: { title: string };
  comments?: TaskComment[];
}

export type AssetCategory =
  | 'ELECTRONICS'
  | 'AUDIO_VISUAL'
  | 'FURNITURE'
  | 'BANNER_BRANDING'
  | 'STATIONERY'
  | 'EQUIPMENT'
  | 'OTHER';

export type AssetStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'IN_USE'
  | 'UNDER_MAINTENANCE'
  | 'DAMAGED'
  | 'LOST'
  | 'DISPOSED';

export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface AssetAssignmentItem {
  id: string;
  asset_id: string;
  assigned_to: string;
  assigned_by?: string;
  assignment_date: string;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  condition_on_assignment: string;
  condition_on_return?: string | null;
  notes?: string | null;
  created_at: string;
  assignee?: { full_name: string; email: string };
}

export interface AssetMaintenanceItem {
  id: string;
  asset_id: string;
  maintenance_date: string;
  description: string;
  cost: number;
  vendor?: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  next_maintenance_date?: string | null;
  recorded_by?: string | null;
  created_at: string;
}

export interface ClubAsset {
  id: string;
  asset_name: string;
  asset_code: string;
  category: AssetCategory;
  description?: string;
  purchase_date?: string | null;
  purchase_cost: number;
  current_condition: AssetCondition;
  location: string;
  status: AssetStatus;
  assigned_to?: string | null;
  created_at: string;
  updated_at?: string;
  assignee?: { id: string; full_name: string; email: string };
  assignments?: AssetAssignmentItem[];
  maintenance_logs?: AssetMaintenanceItem[];
}

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'BOTH';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  status: NotificationStatus;
  channel?: NotificationChannel;
  idempotency_key?: string;
  link?: string;
  is_read: boolean;
  read_at?: string | null;
  archived_at?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface NotificationRuleItem {
  id: string;
  rule_key: string;
  name: string;
  trigger_event: string;
  notification_type: string;
  recipient_type: string;
  recipient_role: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  enabled: boolean;
  delivery_channels: ('IN_APP' | 'EMAIL' | 'SMS')[];
  updated_at: string;
  updated_by?: string;
}

export interface EmailAutomationRuleItem {
  id: string;
  rule_key: string;
  name: string;
  description: string;
  trigger_event: string;
  recipient_logic: string;
  template_key: string;
  category: 'MEMBERSHIP' | 'FINANCIAL' | 'TASKS' | 'MEETINGS' | 'EVENTS' | 'SECURITY';
  enabled: boolean;
  is_protected: boolean;
  updated_at: string;
  updated_by?: string;
}

export interface NotificationPreference {
  id?: string;
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  events_in_app: boolean;
  events_email: boolean;
  meetings_in_app: boolean;
  meetings_email: boolean;
  tasks_in_app: boolean;
  tasks_email: boolean;
  announcements_in_app: boolean;
  announcements_email: boolean;
  reminders_in_app: boolean;
  reminders_email: boolean;
  financial_in_app: boolean;
  financial_email: boolean;
  readonly security_alerts?: true;
  task_reminders_enabled?: boolean;
  meeting_reminders_enabled?: boolean;
  financial_alerts_enabled?: boolean;
  updated_at?: string;
}

export interface OperationsSummary {
  upcoming_meetings_count: number;
  pending_decisions_count: number;
  active_tasks_count: number;
  overdue_tasks_count: number;
  total_documents_count: number;
  total_assets_count: number;
  assets_in_use_count: number;
  active_committee_name?: string;
  active_committee_members_count: number;
  recent_meetings: Meeting[];
  recent_tasks: (ClubTask & { is_overdue?: boolean })[];
  recent_decisions: ClubDecision[];
  recent_documents: GovernanceDocument[];
  recent_activity: {
    id: string;
    action: string;
    module: string;
    user_name: string;
    created_at: string;
  }[];
}
