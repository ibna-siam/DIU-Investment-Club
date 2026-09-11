import { api } from '../lib/api';
import {
  ClubCommittee,
  CommitteePosition,
  CommitteeMember,
  GovernanceDocument,
  DocumentVersionItem,
  Meeting,
  MeetingAgenda,
  MeetingAttendance,
  MeetingMinutes,
  ClubDecision,
  ClubTask,
  TaskComment,
  ClubAsset,
  AssetAssignmentItem,
  AssetMaintenanceItem,
  NotificationItem,
  NotificationPreference,
  OperationsSummary,
} from '../types/governance';

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

export const governanceService = {
  // --- 1. Committees & Positions ---
  async getCommittees(params?: { status?: string; committee_type?: string }): Promise<ClubCommittee[]> {
    const res = await api.get<any>(`/committees${toQuery(params)}`);
    return res.data || [];
  },

  async getCommitteeById(id: string): Promise<ClubCommittee> {
    const res = await api.get<any>(`/committees/${id}`);
    return res.data;
  },

  async createCommittee(data: {
    committee_name: string;
    committee_type?: string;
    description?: string;
    start_date: string;
    end_date: string;
    status?: string;
  }): Promise<ClubCommittee> {
    const res = await api.post<any>('/committees', data);
    return res.data;
  },

  async updateCommittee(id: string, data: Partial<ClubCommittee>): Promise<ClubCommittee> {
    const res = await api.put<any>(`/committees/${id}`, data);
    return res.data;
  },

  async getPositions(params?: { include_inactive?: boolean }): Promise<CommitteePosition[]> {
    const res = await api.get<any>(`/committees/positions${toQuery(params)}`);
    return res.data || [];
  },

  async createPosition(data: {
    position_name: string;
    description?: string;
    hierarchy_level?: number;
  }): Promise<CommitteePosition> {
    const res = await api.post<any>('/committees/positions', data);
    return res.data;
  },

  async updatePosition(id: string, data: Partial<CommitteePosition>): Promise<CommitteePosition> {
    const res = await api.put<any>(`/committees/positions/${id}`, data);
    return res.data;
  },

  async togglePositionStatus(id: string, is_active: boolean): Promise<CommitteePosition> {
    const res = await api.patch<any>(`/committees/positions/${id}/status`, { is_active });
    return res.data;
  },

  async deletePosition(id: string): Promise<void> {
    await api.delete<any>(`/committees/positions/${id}`);
  },

  async assignMember(
    committeeId: string,
    data: {
      member_id: string;
      position_id: string;
      start_date: string;
      end_date?: string;
    }
  ): Promise<CommitteeMember> {
    const res = await api.post<any>(`/committees/${committeeId}/members`, data);
    return res.data;
  },

  async removeMemberAssignment(memberAssignmentId: string, permanent: boolean = false): Promise<void> {
    await api.delete<any>(`/committees/members/${memberAssignmentId}?permanent=${permanent}`);
  },

  // --- 2. Documents Management ---
  async getDocuments(params?: {
    category?: string;
    visibility?: string;
    status?: string;
    search?: string;
    include_deleted?: boolean;
    only_deleted?: boolean;
  }): Promise<GovernanceDocument[]> {
    const res = await api.get<any>(`/documents${toQuery(params)}`);
    return res.data || [];
  },

  async getDocumentById(id: string): Promise<GovernanceDocument> {
    const res = await api.get<any>(`/documents/${id}`);
    return res.data;
  },

  async createDocument(data: {
    title: string;
    description?: string;
    category: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    visibility?: string;
  }): Promise<GovernanceDocument> {
    const res = await api.post<any>('/documents', data);
    return res.data;
  },

  async uploadDocument(formData: FormData): Promise<GovernanceDocument> {
    const res = await api.post<any>('/documents/upload', formData);
    return res.data;
  },

  async replaceDocument(documentId: string, formData: FormData): Promise<DocumentVersionItem> {
    const res = await api.post<any>(`/documents/${documentId}/replace`, formData);
    return res.data;
  },

  async getDownloadUrl(documentId: string): Promise<{
    download_url: string;
    file_name: string;
    file_type: string;
    title: string;
  }> {
    const res = await api.get<any>(`/documents/${documentId}/download`);
    return res.data;
  },

  async updateDocument(id: string, data: Partial<GovernanceDocument>): Promise<GovernanceDocument> {
    const res = await api.put<any>(`/documents/${id}`, data);
    return res.data;
  },

  async archiveDocument(documentId: string): Promise<void> {
    await api.post<any>(`/documents/${documentId}/archive`, {});
  },

  async restoreDocument(documentId: string): Promise<void> {
    await api.post<any>(`/documents/${documentId}/restore`, {});
  },

  async deleteDocument(documentId: string, permanent: boolean = false): Promise<void> {
    await api.delete<any>(`/documents/${documentId}?permanent=${permanent}`);
  },

  async addDocumentVersion(
    documentId: string,
    data: {
      file_name: string;
      file_path: string;
      file_type: string;
      file_size: number;
      changelog?: string;
    }
  ): Promise<DocumentVersionItem> {
    const res = await api.post<any>(`/documents/${documentId}/versions`, data);
    return res.data;
  },

  // --- 3. Meetings ---
  async getMeetings(params?: {
    status?: string;
    meeting_type?: string;
    committee_id?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<Meeting[]> {
    const res = await api.get<any>(`/meetings${toQuery(params)}`);
    return res.data || [];
  },

  async getMeetingById(id: string): Promise<Meeting> {
    const res = await api.get<any>(`/meetings/${id}`);
    return res.data;
  },

  async createMeeting(data: {
    title: string;
    meeting_type: string;
    description?: string;
    meeting_date: string;
    start_time: string;
    end_time?: string;
    location?: string;
    meeting_link?: string;
    committee_id?: string;
    participant_ids?: string[];
    participant_emails?: string[];
    reminder_settings?: {
      immediate?: boolean;
      before24h?: boolean;
      before1h?: boolean;
    };
  }): Promise<Meeting> {
    const res = await api.post<any>('/meetings', data);
    return res.data;
  },

  async updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting> {
    const res = await api.put<any>(`/meetings/${id}`, data);
    return res.data;
  },

  async getMeetingImpact(id: string): Promise<any> {
    const res = await api.get<any>(`/meetings/${id}/impact`);
    return res.data;
  },

  async deleteMeeting(
    id: string,
    action: 'CANCEL' | 'HARD_DELETE' = 'CANCEL',
    reason?: string
  ): Promise<any> {
    const res = await api.delete<any>(`/meetings/${id}`, {
      body: { action, reason },
    });
    return res;
  },

  async addAgenda(
    meetingId: string,
    data: {
      agenda_number: number;
      title: string;
      description?: string;
      allocated_minutes?: number;
      presenter_id?: string;
      priority?: string;
    }
  ): Promise<MeetingAgenda> {
    const res = await api.post<any>(`/meetings/${meetingId}/agendas`, data);
    return res.data;
  },

  async recordAttendance(
    meetingId: string,
    attendees: {
      member_id: string;
      attendance_status: string;
      arrival_time?: string;
      notes?: string;
    }[]
  ): Promise<void> {
    await api.post<any>(`/meetings/${meetingId}/attendance`, { attendees });
  },

  async saveMinutes(
    meetingId: string,
    data: {
      summary: string;
      discussion_notes?: string;
    }
  ): Promise<MeetingMinutes> {
    const res = await api.post<any>(`/meetings/${meetingId}/minutes`, data);
    return res.data;
  },

  async approveMinutes(minutesId: string): Promise<MeetingMinutes> {
    const res = await api.patch<any>(`/meetings/minutes/${minutesId}/approve`, {});
    return res.data;
  },

  // --- 4. Decisions & Action Items ---
  async getDecisions(params?: {
    status?: string;
    decision_type?: string;
    meeting_id?: string;
  }): Promise<ClubDecision[]> {
    const res = await api.get<any>(`/decisions${toQuery(params)}`);
    return res.data || [];
  },

  async getDecisionById(id: string): Promise<ClubDecision> {
    const res = await api.get<any>(`/decisions/${id}`);
    return res.data;
  },

  async createDecision(data: {
    title: string;
    description: string;
    decision_type: string;
    meeting_id?: string;
    responsible_person_id?: string;
    decision_date?: string;
    effective_date?: string;
    status?: string;
  }): Promise<ClubDecision> {
    const res = await api.post<any>('/decisions', data);
    return res.data;
  },

  async updateDecision(id: string, data: Partial<ClubDecision>): Promise<ClubDecision> {
    const res = await api.patch<any>(`/decisions/${id}`, data);
    return res.data;
  },

  async createActionItem(
    decisionId: string,
    data: {
      title: string;
      description?: string;
      assigned_to?: string;
      due_date?: string;
      priority?: string;
    }
  ): Promise<ClubTask> {
    const res = await api.post<any>(`/decisions/${decisionId}/create-action-item`, data);
    return res.data;
  },

  // --- 5. Tasks & Collaboration ---
  async getTasks(params?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    search?: string;
  }): Promise<ClubTask[]> {
    const res = await api.get<any>(`/tasks${toQuery(params)}`);
    return res.data || [];
  },

  async getTaskById(id: string): Promise<ClubTask> {
    const res = await api.get<any>(`/tasks/${id}`);
    return res.data;
  },

  async createTask(data: {
    title: string;
    description?: string;
    priority?: string;
    assigned_to?: string;
    due_date?: string;
    related_decision_id?: string;
    related_meeting_id?: string;
    related_event_id?: string;
  }): Promise<ClubTask> {
    const res = await api.post<any>('/tasks', data);
    return res.data;
  },

  async updateTask(id: string, data: Partial<ClubTask>): Promise<ClubTask> {
    const res = await api.patch<any>(`/tasks/${id}`, data);
    return res.data;
  },

  async addTaskComment(taskId: string, comment: string): Promise<TaskComment> {
    const res = await api.post<any>(`/tasks/${taskId}/comments`, { comment });
    return res.data;
  },

  async deleteTask(
    id: string,
    action: 'CANCEL' | 'HARD_DELETE' = 'CANCEL',
    reason?: string
  ): Promise<any> {
    const res = await api.delete<any>(`/tasks/${id}`, {
      body: { action, reason },
    });
    return res;
  },

  // --- 6. Assets & Maintenance ---
  async getAssets(params?: {
    category?: string;
    status?: string;
    condition?: string;
    search?: string;
  }): Promise<ClubAsset[]> {
    const res = await api.get<any>(`/assets${toQuery(params)}`);
    return res.data || [];
  },

  async getAssetById(id: string): Promise<ClubAsset> {
    const res = await api.get<any>(`/assets/${id}`);
    return res.data;
  },

  async createAsset(data: {
    asset_name: string;
    asset_code: string;
    category: string;
    description?: string;
    purchase_date?: string;
    purchase_cost?: number;
    current_condition?: string;
    location?: string;
    status?: string;
  }): Promise<ClubAsset> {
    const res = await api.post<any>('/assets', data);
    return res.data;
  },

  async updateAsset(id: string, data: Partial<ClubAsset>): Promise<ClubAsset> {
    const res = await api.patch<any>(`/assets/${id}`, data);
    return res.data;
  },

  async assignAsset(
    assetId: string,
    data: {
      assigned_to: string;
      assignment_date?: string;
      expected_return_date?: string;
      condition_on_assignment?: string;
      notes?: string;
    }
  ): Promise<AssetAssignmentItem> {
    const res = await api.post<any>(`/assets/${assetId}/assign`, data);
    return res.data;
  },

  async returnAsset(
    assignmentId: string,
    data: {
      condition_on_return: string;
      notes?: string;
    }
  ): Promise<void> {
    await api.post<any>(`/assets/assignments/${assignmentId}/return`, data);
  },

  async addMaintenance(
    assetId: string,
    data: {
      maintenance_date?: string;
      description: string;
      cost?: number;
      vendor?: string;
      status?: string;
      next_maintenance_date?: string;
    }
  ): Promise<AssetMaintenanceItem> {
    const res = await api.post<any>(`/assets/${assetId}/maintenance`, data);
    return res.data;
  },

  // --- 7. Notifications ---
  async getNotifications(params?: { category?: string; status?: string; limit?: number; offset?: number }): Promise<NotificationItem[]> {
    const res = await api.get<any>(`/notifications${toQuery(params)}`);
    return res.data || [];
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get<any>('/notifications/unread-count');
    return res.data?.unreadCount || 0;
  },

  async markNotificationRead(id: string): Promise<void> {
    await api.patch<any>(`/notifications/${id}/read`, {});
  },

  async markAllNotificationsRead(): Promise<void> {
    await api.patch<any>('/notifications/mark-all-read', {});
  },

  async archiveNotification(id: string): Promise<void> {
    await api.patch<any>(`/notifications/${id}/archive`, {});
  },

  async archiveAllRead(): Promise<void> {
    await api.patch<any>('/notifications/archive-read', {});
  },

  async getNotificationPreferences(): Promise<NotificationPreference> {
    const res = await api.get<any>('/notifications/preferences');
    return res.data;
  },

  async updateNotificationPreferences(data: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const res = await api.put<any>('/notifications/preferences', data);
    return res.data;
  },

  // --- 8. Central Operations Executive Summary ---
  async getOperationsSummary(): Promise<OperationsSummary> {
    const res = await api.get<any>('/operations/summary');
    return res.data;
  },
};
