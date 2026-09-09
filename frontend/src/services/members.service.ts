import { api } from '../lib/api';
import {
  Member,
  MembershipType,
  MemberDue,
  MemberPayment,
  Donation,
  Sponsor,
  Sponsorship,
  SponsorshipPayment,
  MemberFinancialMetrics,
  ClubRevenueOverview,
} from '../types/financial';

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

export const membersService = {
  // --- Members ---
  async getMembers(params?: {
    search?: string;
    department?: string;
    batch?: string;
    membership_status?: string;
    membership_type_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Member[]; total: number; page: number; limit: number; totalPages: number }> {
    const res = await api.get<any>(`/members${toQuery(params)}`);
    return {
      data: res.data || [],
      total: res.total || 0,
      page: res.page || 1,
      limit: res.limit || 15,
      totalPages: res.totalPages || 1,
    };
  },

  async getMemberById(id: string): Promise<Member> {
    const res = await api.get<any>(`/members/${id}`);
    return res.data;
  },

  async createMember(data: any): Promise<Member> {
    const res = await api.post<any>('/members', data);
    return res.data;
  },

  async updateMember(id: string, data: any): Promise<Member> {
    const res = await api.put<any>(`/members/${id}`, data);
    return res.data;
  },

  async updateStatus(id: string, status: string, reason?: string): Promise<Member> {
    const res = await api.post<any>(`/members/${id}/status`, { status, reason });
    return res.data;
  },

  async archiveMember(id: string): Promise<void> {
    await api.post(`/members/${id}/archive`);
  },

  async reactivateMember(id: string): Promise<void> {
    await api.post(`/members/${id}/reactivate`);
  },

  async getImpactSummary(id: string): Promise<any> {
    const res = await api.get<any>(`/members/${id}/impact-summary`);
    return res.data;
  },

  async removeMember(id: string, options: { action: 'ARCHIVE' | 'DEACTIVATE' | 'HARD_DELETE'; reason?: string }): Promise<any> {
    const res = await api.post<any>(`/members/${id}/remove`, options);
    return res;
  },

  async deleteMember(id: string): Promise<void> {
    await api.delete(`/members/${id}`);
  },

  // --- Membership Types ---
  async getMembershipTypes(): Promise<MembershipType[]> {
    const res = await api.get<any>('/membership-types');
    return res.data || [];
  },

  async createMembershipType(data: any): Promise<MembershipType> {
    const res = await api.post<any>('/membership-types', data);
    return res.data;
  },

  async updateMembershipType(id: string, data: any): Promise<MembershipType> {
    const res = await api.put<any>(`/membership-types/${id}`, data);
    return res.data;
  },

  async deleteMembershipType(id: string): Promise<void> {
    await api.delete(`/membership-types/${id}`);
  },

  // --- Member Dues ---
  async getDues(params?: {
    member_id?: string;
    status?: string;
    due_type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MemberDue[]; total: number; page: number; limit: number; totalPages: number }> {
    const res = await api.get<any>(`/member-dues${toQuery(params)}`);
    return {
      data: res.data || [],
      total: res.total || 0,
      page: res.page || 1,
      limit: res.limit || 15,
      totalPages: res.totalPages || 1,
    };
  },

  async getDueById(id: string): Promise<MemberDue> {
    const res = await api.get<any>(`/member-dues/${id}`);
    return res.data;
  },

  async createDue(data: any): Promise<MemberDue> {
    const res = await api.post<any>('/member-dues', data);
    return res.data;
  },

  async waiveDue(id: string, reason: string): Promise<MemberDue> {
    const res = await api.post<any>(`/member-dues/${id}/waive`, { reason });
    return res.data;
  },

  // --- Member Payments & Receipts ---
  async getPayments(params?: {
    member_id?: string;
    due_id?: string;
    status?: string;
    financial_account_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MemberPayment[]; total: number; page: number; limit: number; totalPages: number }> {
    const res = await api.get<any>(`/member-payments${toQuery(params)}`);
    return {
      data: res.data || [],
      total: res.total || 0,
      page: res.page || 1,
      limit: res.limit || 15,
      totalPages: res.totalPages || 1,
    };
  },

  async getPaymentById(id: string): Promise<MemberPayment> {
    const res = await api.get<any>(`/member-payments/${id}`);
    return res.data;
  },

  async getReceipt(receiptNumber: string): Promise<MemberPayment> {
    const res = await api.get<any>(`/member-payments/receipt/${receiptNumber}`);
    return res.data;
  },

  async createPayment(data: any): Promise<MemberPayment> {
    const res = await api.post<any>('/member-payments', data);
    return res.data;
  },

  async verifyPayment(id: string, notes?: string): Promise<any> {
    const res = await api.post<any>(`/member-payments/${id}/verify`, { notes });
    return res.data;
  },

  async rejectPayment(id: string, reason: string): Promise<any> {
    const res = await api.post<any>(`/member-payments/${id}/reject`, { reason });
    return res.data;
  },

  // --- Donations ---
  async getDonations(params?: {
    donor_type?: string;
    status?: string;
    event_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Donation[]; total: number; page: number; limit: number; totalPages: number }> {
    const res = await api.get<any>(`/donations${toQuery(params)}`);
    return {
      data: res.data || [],
      total: res.total || 0,
      page: res.page || 1,
      limit: res.limit || 15,
      totalPages: res.totalPages || 1,
    };
  },

  async getDonationById(id: string): Promise<Donation> {
    const res = await api.get<any>(`/donations/${id}`);
    return res.data;
  },

  async createDonation(data: any): Promise<Donation> {
    const res = await api.post<any>('/donations', data);
    return res.data;
  },

  async verifyDonation(id: string): Promise<any> {
    const res = await api.post<any>(`/donations/${id}/verify`);
    return res.data;
  },

  async rejectDonation(id: string, reason: string): Promise<any> {
    const res = await api.post<any>(`/donations/${id}/reject`, { reason });
    return res.data;
  },

  // --- Sponsors ---
  async getSponsors(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Sponsor[]; total: number; page: number; limit: number; totalPages: number }> {
    const res = await api.get<any>(`/sponsors${toQuery(params)}`);
    return {
      data: res.data || [],
      total: res.total || 0,
      page: res.page || 1,
      limit: res.limit || 15,
      totalPages: res.totalPages || 1,
    };
  },

  async getSponsorById(id: string): Promise<Sponsor> {
    const res = await api.get<any>(`/sponsors/${id}`);
    return res.data;
  },

  async createSponsor(data: any): Promise<Sponsor> {
    const res = await api.post<any>('/sponsors', data);
    return res.data;
  },

  async updateSponsor(id: string, data: any): Promise<Sponsor> {
    const res = await api.put<any>(`/sponsors/${id}`, data);
    return res.data;
  },

  // --- Sponsorships ---
  async getSponsorships(params?: {
    sponsor_id?: string;
    event_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Sponsorship[]; total: number; page: number; limit: number; totalPages: number }> {
    const res = await api.get<any>(`/sponsorships${toQuery(params)}`);
    return {
      data: res.data || [],
      total: res.total || 0,
      page: res.page || 1,
      limit: res.limit || 15,
      totalPages: res.totalPages || 1,
    };
  },

  async getSponsorshipById(id: string): Promise<Sponsorship & { payments: SponsorshipPayment[] }> {
    const res = await api.get<any>(`/sponsorships/${id}`);
    return res.data;
  },

  async createSponsorship(data: any): Promise<Sponsorship> {
    const res = await api.post<any>('/sponsorships', data);
    return res.data;
  },

  async recordSponsorshipPayment(sponsorshipId: string, data: any): Promise<SponsorshipPayment> {
    const res = await api.post<any>(`/sponsorships/${sponsorshipId}/payments`, data);
    return res.data;
  },

  async verifySponsorshipPayment(paymentId: string): Promise<any> {
    const res = await api.post<any>(`/sponsorships/payments/${paymentId}/verify`);
    return res.data;
  },

  // --- Analytics ---
  async getMemberFinancialMetrics(): Promise<MemberFinancialMetrics> {
    const res = await api.get<any>('/member-financials/metrics');
    return res.data;
  },

  async getClubRevenueOverview(): Promise<ClubRevenueOverview> {
    const res = await api.get<any>('/member-financials/revenue-overview');
    return res.data;
  },
};
