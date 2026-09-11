export interface ClubCommittee {
  id: string;
  committee_name: string;
  committee_type: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
  members_count?: number;
  members?: CommitteeMemberWithDetails[];
}

export interface CommitteePosition {
  id: string;
  position_name: string;
  description?: string;
  hierarchy_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommitteeMemberWithDetails {
  id: string;
  committee_id: string;
  member_id: string;
  position_id: string;
  start_date: string;
  end_date?: string;
  status: 'ACTIVE' | 'RESIGNED' | 'TRANSFERRED' | 'COMPLETED';
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    membership_number: string;
    student_id: string;
    user?: {
      full_name: string;
      email: string;
      phone?: string;
    };
  };
  position?: CommitteePosition;
}

export interface GovernanceDocument {
  id: string;
  title: string;
  description?: string;
  category:
    | 'CONSTITUTION'
    | 'MEETING_DOCUMENT'
    | 'FINANCIAL_DOCUMENT'
    | 'EVENT_DOCUMENT'
    | 'SPONSORSHIP_DOCUMENT'
    | 'POLICY_DOCUMENT'
    | 'REPORT'
    | 'CERTIFICATE'
    | 'OTHER';
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by?: string;
  uploader?: {
    id: string;
    full_name: string;
    email: string;
  };
  visibility: 'PUBLIC_TO_MEMBERS' | 'EXECUTIVE_ONLY' | 'TREASURER_ONLY' | 'ADMIN_ONLY' | 'PRIVATE';
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  version_number: number;
  original_size?: number;
  optimized_size?: number;
  original_file_name?: string;
  deleted_at?: string;
  deleted_by?: string;
  archived_at?: string;
  archived_by?: string;
  created_at: string;
  updated_at: string;
  versions?: DocumentVersionItem[];
}

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
  uploader?: {
    full_name: string;
    email: string;
  };
  changelog?: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_type:
    | 'EXECUTIVE_MEETING'
    | 'GENERAL_MEETING'
    | 'FINANCIAL_MEETING'
    | 'EVENT_PLANNING_MEETING'
    | 'EMERGENCY_MEETING'
    | 'OTHER';
  description?: string;
  meeting_date: string;
  start_time: string;
  end_time?: string;
  location: string;
  meeting_link?: string;
  committee_id?: string;
  committee?: {
    id: string;
    committee_name: string;
  };
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  created_by?: string;
  created_at: string;
  updated_at: string;
  agendas?: MeetingAgenda[];
  attendance?: MeetingAttendanceItem[];
  minutes?: MeetingMinutes;
  decisions?: ClubDecision[];
  tasks?: ClubTask[];
  attendance_stats?: {
    total_invited: number;
    present: number;
    absent: number;
    late: number;
    attendance_rate: number;
  };
}

export interface MeetingAgenda {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  agenda_order: number;
  status: 'PENDING' | 'DISCUSSED' | 'DEFERRED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendanceItem {
  id: string;
  meeting_id: string;
  member_id: string;
  attendance_status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  arrival_time?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  member?: {
    id: string;
    membership_number: string;
    student_id: string;
    user?: {
      full_name: string;
      email: string;
    };
  };
}

export interface MeetingMinutes {
  id: string;
  meeting_id: string;
  summary: string;
  discussion_notes?: string;
  prepared_by?: string;
  preparer?: {
    full_name: string;
    email: string;
  };
  approved_by?: string;
  approver?: {
    full_name: string;
    email: string;
  };
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'PUBLISHED';
  created_at: string;
  updated_at: string;
}

export interface ClubDecision {
  id: string;
  meeting_id?: string;
  meeting?: {
    id: string;
    title: string;
    meeting_date: string;
  };
  title: string;
  description: string;
  decision_date: string;
  decision_type: 'GOVERNANCE' | 'FINANCIAL' | 'EVENT' | 'POLICY' | 'OPERATIONAL';
  status: 'PROPOSED' | 'APPROVED' | 'IMPLEMENTED' | 'DEFERRED' | 'CANCELLED';
  effective_date?: string;
  responsible_person_id?: string;
  responsible_person?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
  tasks_count?: number;
  tasks?: ClubTask[];
}

export interface ClubTask {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED';
  assigned_to?: string;
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_by?: string;
  creator?: {
    id: string;
    full_name: string;
  };
  due_date?: string;
  completed_at?: string;
  related_event_id?: string;
  related_event?: {
    id: string;
    title: string;
  };
  related_meeting_id?: string;
  related_meeting?: {
    id: string;
    title: string;
  };
  related_decision_id?: string;
  related_decision?: {
    id: string;
    title: string;
  };
  created_at: string;
  updated_at: string;
  comments?: TaskCommentItem[];
  is_overdue?: boolean;
}

export interface TaskCommentItem {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface ClubAsset {
  id: string;
  asset_name: string;
  asset_code: string;
  category:
    | 'ELECTRONICS'
    | 'AUDIO_VISUAL'
    | 'FURNITURE'
    | 'BANNER_BRANDING'
    | 'STATIONERY'
    | 'EQUIPMENT'
    | 'OTHER';
  description?: string;
  purchase_date?: string;
  purchase_cost: number;
  current_condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  location: string;
  status:
    | 'AVAILABLE'
    | 'ASSIGNED'
    | 'IN_USE'
    | 'UNDER_MAINTENANCE'
    | 'DAMAGED'
    | 'LOST'
    | 'DISPOSED';
  assigned_to?: string;
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  assignments?: AssetAssignmentItem[];
  maintenance_logs?: AssetMaintenanceItem[];
}

export interface AssetAssignmentItem {
  id: string;
  asset_id: string;
  assigned_to: string;
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
  assignment_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  condition_on_assignment: string;
  condition_on_return?: string;
  notes?: string;
  assigned_by?: string;
  created_at: string;
}

export interface AssetMaintenanceItem {
  id: string;
  asset_id: string;
  maintenance_date: string;
  description: string;
  cost: number;
  vendor?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  next_maintenance_date?: string;
  recorded_by?: string;
  created_at: string;
}

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'BOTH';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: 'FINANCIAL' | 'APPROVAL' | 'MEETING' | 'TASK' | 'EVENT' | 'DOCUMENT' | 'SYSTEM' | 'SECURITY' | 'REMINDERS' | 'GENERAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
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

export interface NotificationPreference {
  id?: string;
  user_id: string;
  // Global channel toggles
  in_app_enabled: boolean;
  email_enabled: boolean;
  // Phase 9 category matrix: In-App & Email
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
  // Immutable Critical Alerts (Section 5)
  readonly security_alerts?: true;
  // Legacy aliases for backward compatibility
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
  recent_tasks: ClubTask[];
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
