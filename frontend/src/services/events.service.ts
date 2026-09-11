import { api } from '../lib/api';
import {
  Event,
  EventMember,
  EventBudget,
  EventFinancialSummary,
  EventStatus,
  EventRole,
} from '../types/financial';

export interface PaginatedEventsResponse {
  success: boolean;
  data: Event[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const eventsService = {
  async getEvents(params?: {
    search?: string;
    event_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedEventsResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.event_type) query.append('event_type', params.event_type);
    if (params?.status) query.append('status', params.status);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return api.get<PaginatedEventsResponse>(`/events?${query.toString()}`);
  },

  async getEventById(id: string): Promise<{ success: boolean; data: Event }> {
    return api.get<{ success: boolean; data: Event }>(`/events/${id}`);
  },

  async createEvent(data: {
    title: string;
    event_type: string;
    description?: string;
    start_date: string;
    end_date: string;
    venue?: string;
    expected_participants?: number;
    proposed_budget: number;
    banner_url?: string;
    target_audience?: string;
    target_emails?: string[];
    target_roles?: string[];
    notify_members?: boolean;
  }): Promise<{ success: boolean; data: Event }> {
    return api.post<{ success: boolean; data: Event }>('/events', data);
  },

  async updateEvent(id: string, data: Partial<Event>): Promise<{ success: boolean; data: Event }> {
    return api.patch<{ success: boolean; data: Event }>(`/events/${id}`, data);
  },

  async updateStatus(id: string, status: EventStatus): Promise<{ success: boolean; data: Event }> {
    return api.post<{ success: boolean; data: Event }>(`/events/${id}/status`, { status });
  },

  async closeEvent(id: string): Promise<{ success: boolean; data: Event }> {
    return api.post<{ success: boolean; data: Event }>(`/events/${id}/close`, {});
  },

  async reopenEvent(id: string, reason: string): Promise<{ success: boolean; data: Event }> {
    return api.post<{ success: boolean; data: Event }>(`/events/${id}/reopen`, { reason });
  },

  async deleteEvent(id: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/events/${id}`);
  },

  // Event Team
  async getMembers(eventId: string, includeRemoved?: boolean): Promise<{ success: boolean; data: EventMember[] }> {
    const q = includeRemoved ? '?includeRemoved=true' : '';
    return api.get<{ success: boolean; data: EventMember[] }>(`/events/${eventId}/members${q}`);
  },

  async addMember(
    eventId: string,
    data: { user_id: string; role: EventRole; responsibility?: string }
  ): Promise<{ success: boolean; data: EventMember }> {
    return api.post<{ success: boolean; data: EventMember }>(`/events/${eventId}/members`, data);
  },

  async updateMember(
    eventId: string,
    memberId: string,
    data: { role?: EventRole; responsibility?: string }
  ): Promise<{ success: boolean; data: EventMember }> {
    return api.patch<{ success: boolean; data: EventMember }>(`/events/${eventId}/members/${memberId}`, data);
  },

  async removeMember(eventId: string, memberId: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/events/${eventId}/members/${memberId}`);
  },

  // Event Budget
  async getBudget(eventId: string): Promise<{ success: boolean; data: EventBudget | null }> {
    return api.get<{ success: boolean; data: EventBudget | null }>(`/events/${eventId}/budget`);
  },

  async createBudget(
    eventId: string,
    data: {
      title?: string;
      description?: string;
      proposed_amount: number;
      items: {
        expense_category_id: string;
        title: string;
        description?: string;
        allocated_amount: number;
      }[];
    }
  ): Promise<{ success: boolean; data: EventBudget }> {
    return api.post<{ success: boolean; data: EventBudget }>(`/events/${eventId}/budget`, data);
  },

  async updateBudget(
    budgetId: string,
    data: {
      title?: string;
      description?: string;
      proposed_amount?: number;
      items?: {
        expense_category_id: string;
        title: string;
        description?: string;
        allocated_amount: number;
      }[];
    }
  ): Promise<{ success: boolean; data: EventBudget }> {
    return api.patch<{ success: boolean; data: EventBudget }>(`/event-budgets/${budgetId}`, data);
  },

  async submitBudget(budgetId: string): Promise<{ success: boolean; data: any }> {
    return api.post<{ success: boolean; data: any }>(`/event-budgets/${budgetId}/submit`, {});
  },

  // Event Financials
  async getFinancialSummary(eventId: string): Promise<{ success: boolean; data: EventFinancialSummary }> {
    return api.get<{ success: boolean; data: EventFinancialSummary }>(`/events/${eventId}/financials/summary`);
  },

  async getBudgetVsActual(eventId: string): Promise<{ success: boolean; data: any }> {
    return api.get<{ success: boolean; data: any }>(`/events/${eventId}/financials/budget-vs-actual`);
  },

  async getLedger(eventId: string): Promise<{ success: boolean; data: any }> {
    return api.get<{ success: boolean; data: any }>(`/events/${eventId}/financials/ledger`);
  },
};
