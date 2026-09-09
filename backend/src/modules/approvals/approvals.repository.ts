import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import {
  ApprovalRequest,
  ApprovalStep,
  ApprovalAction,
  ApprovalStatus,
  ApprovalRequestType,
  PaginatedResponse,
} from '../../types';

export class ApprovalsRepository {
  async findAll(params: {
    status?: ApprovalStatus;
    request_type?: ApprovalRequestType;
    user_id?: string;
    pending_for_role?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ApprovalRequest>> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    if (!isSupabaseConfigured() || !supabaseClient) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    try {
      let query = supabaseClient
        .from('approval_requests')
        .select(
          `
          *,
          requester:profiles!approval_requests_requested_by_fkey(full_name, email),
          steps:approval_steps(*, assigned_user:profiles!approval_steps_assigned_to_fkey(full_name))
        `,
          { count: 'exact' }
        );

      if (params.status) {
        query = query.eq('status', params.status);
      }

      if (params.request_type) {
        query = query.eq('request_type', params.request_type);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }

      const total = count || data.length;
      const formatted: ApprovalRequest[] = data.map((item: any) => ({
        id: item.id,
        request_type: item.request_type,
        reference_id: item.reference_id,
        title: item.title,
        description: item.description,
        requested_by: item.requested_by,
        requested_by_name: item.requester?.full_name || 'System User',
        requested_by_email: item.requester?.email || null,
        status: item.status,
        current_step: item.current_step,
        total_steps: item.total_steps,
        steps: (item.steps || []).sort((a: any, b: any) => a.step_number - b.step_number),
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      return {
        data: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (e) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  async findById(id: string): Promise<ApprovalRequest | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient
        .from('approval_requests')
        .select(
          `
          *,
          requester:profiles!approval_requests_requested_by_fkey(full_name, email),
          steps:approval_steps(
            *,
            assigned_user:profiles!approval_steps_assigned_to_fkey(full_name)
          ),
          actions:approval_actions(
            *,
            actor:profiles!approval_actions_acted_by_fkey(full_name, email)
          )
        `
        )
        .eq('id', id)
        .single();

      if (error || !data) return null;

      // Also fetch related record details if request_type is EXPENSE
      let referenceData = null;
      if (data.request_type === 'EXPENSE') {
        const { data: exp } = await supabaseClient
          .from('expenses')
          .select('*, account:financial_accounts(name), category:expense_categories(name)')
          .eq('id', data.reference_id)
          .single();
        referenceData = exp;
      }

      return {
        id: data.id,
        request_type: data.request_type,
        reference_id: data.reference_id,
        title: data.title,
        description: data.description,
        requested_by: data.requested_by,
        requested_by_name: data.requester?.full_name || 'System User',
        requested_by_email: data.requester?.email || null,
        status: data.status,
        current_step: data.current_step,
        total_steps: data.total_steps,
        steps: (data.steps || []).sort((a: any, b: any) => a.step_number - b.step_number),
        actions: (data.actions || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((act: any) => ({
            id: act.id,
            approval_request_id: act.approval_request_id,
            approval_step_id: act.approval_step_id,
            action: act.action,
            comment: act.comment,
            acted_by: act.acted_by,
            acted_by_name: act.actor?.full_name || 'System User',
            created_at: act.created_at,
          })),
        reference_data: referenceData,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (e) {
      return null;
    }
  }

  async processAction(params: {
    request_id: string;
    action: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
    comment?: string;
    user_id: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured() || !supabaseClient) {
      return { success: false, error: 'Database is not connected' };
    }

    try {
      const { data, error } = await supabaseClient.rpc('process_approval_action', {
        p_request_id: params.request_id,
        p_action: params.action,
        p_comment: params.comment || null,
        p_user_id: params.user_id,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to process approval action' };
    }
  }
}
