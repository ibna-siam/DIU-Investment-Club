import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { AuditLog, PaginatedResponse } from '../../types';

export class AuditLogsRepository {
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const clean = Array.isArray(data) ? [...data] : { ...data };
    const sensitiveKeys = ['password', 'token', 'secret', 'jwt', 'authorization', 'apiKey', 'access_token'];
    
    for (const key of Object.keys(clean)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        clean[key] = '***REDACTED***';
      } else if (clean[key] && typeof clean[key] === 'object') {
        clean[key] = this.sanitizeData(clean[key]);
      }
    }
    return clean;
  }

  async log(data: {
    user_id?: string;
    action: string;
    module: string;
    record_id?: string;
    old_data?: any;
    new_data?: any;
    ip_address?: string;
  }): Promise<AuditLog | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data: res, error } = await supabaseClient
          .from('audit_logs')
          .insert({
            user_id: data.user_id || null,
            action: data.action,
            module: data.module,
            record_id: data.record_id || null,
            old_data: this.sanitizeData(data.old_data),
            new_data: this.sanitizeData(data.new_data),
            ip_address: data.ip_address || null,
          })
          .select()
          .single();
        if (!error && res) return res as AuditLog;
      } catch (e) {
        console.error('AuditLog insert error:', e);
      }
    }
    return null;
  }

  async findAll(params: {
    module?: string;
    action?: string;
    user_id?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AuditLog>> {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 20;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        let query = supabaseClient
          .from('audit_logs')
          .select('*, user:profiles(full_name, email)', { count: 'exact' });

        if (params.module) {
          query = query.eq('module', params.module);
        }

        if (params.action) {
          query = query.eq('action', params.action);
        }

        if (params.user_id) {
          query = query.eq('user_id', params.user_id);
        }

        if (params.startDate) {
          query = query.gte('created_at', params.startDate);
        }

        if (params.endDate) {
          query = query.lte('created_at', `${params.endDate}T23:59:59.999Z`);
        }

        if (params.category) {
          if (params.category === 'FINANCIAL') {
            query = query.in('module', ['expenses', 'income', 'transactions', 'financial_accounts', 'journal_entries', 'vouchers', 'fund_transfers']);
          } else if (params.category === 'APPROVAL') {
            query = query.in('module', ['approvals', 'approval_requests', 'vouchers']);
          } else if (params.category === 'USER') {
            query = query.in('module', ['users', 'roles', 'permissions', 'auth']);
          } else if (params.category === 'GOVERNANCE') {
            query = query.in('module', ['meetings', 'decisions', 'tasks', 'documents', 'committee']);
          } else if (params.category === 'SYSTEM') {
            query = query.in('module', ['automation', 'integrations', 'webhooks', 'settings']);
          }
        }

        if (params.search) {
          query = query.or(`action.ilike.%${params.search}%,module.ilike.%${params.search}%`);
        }

        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!error && data) {
          const total = count || data.length;
          return {
            data: data as AuditLog[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          };
        }
      } catch (e) {
        console.error('AuditLog findAll error:', e);
      }
    }

    return { data: [], total: 0, page, limit, totalPages: 1 };
  }

  async getStats(): Promise<{
    total_logs: number;
    financial_logs: number;
    approval_logs: number;
    user_logs: number;
    suspicious_activities: number;
  }> {
    if (!isSupabaseConfigured() || !supabaseClient) {
      return { total_logs: 0, financial_logs: 0, approval_logs: 0, user_logs: 0, suspicious_activities: 0 };
    }

    try {
      const [allRes, finRes, appRes, usrRes, riskRes] = await Promise.all([
        supabaseClient.from('audit_logs').select('id', { count: 'exact', head: true }),
        supabaseClient.from('audit_logs').select('id', { count: 'exact', head: true }).in('module', ['expenses', 'income', 'transactions', 'financial_accounts', 'journal_entries', 'vouchers']),
        supabaseClient.from('audit_logs').select('id', { count: 'exact', head: true }).in('module', ['approvals', 'approval_requests']),
        supabaseClient.from('audit_logs').select('id', { count: 'exact', head: true }).in('module', ['users', 'roles', 'permissions', 'auth']),
        supabaseClient.from('risk_flags').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
      ]);

      return {
        total_logs: allRes.count || 0,
        financial_logs: finRes.count || 0,
        approval_logs: appRes.count || 0,
        user_logs: usrRes.count || 0,
        suspicious_activities: riskRes.count || 0,
      };
    } catch (e) {
      return { total_logs: 0, financial_logs: 0, approval_logs: 0, user_logs: 0, suspicious_activities: 0 };
    }
  }

  async getReports(reportType: 'USER_ACTIVITY' | 'FINANCIAL_CHANGES' | 'APPROVAL_HISTORY' | 'SYSTEM_EVENTS', params: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    limit?: number;
  }): Promise<any[]> {
    if (!isSupabaseConfigured() || !supabaseClient) return [];

    let query = supabaseClient.from('audit_logs').select('*, user:profiles(full_name, email)');

    if (params.startDate) query = query.gte('created_at', params.startDate);
    if (params.endDate) query = query.lte('created_at', `${params.endDate}T23:59:59.999Z`);
    if (params.userId) query = query.eq('user_id', params.userId);

    if (reportType === 'FINANCIAL_CHANGES') {
      query = query.in('module', ['expenses', 'income', 'transactions', 'financial_accounts', 'journal_entries', 'vouchers']);
    } else if (reportType === 'APPROVAL_HISTORY') {
      query = query.in('module', ['approvals', 'approval_requests']);
    } else if (reportType === 'USER_ACTIVITY') {
      query = query.in('module', ['auth', 'users', 'roles', 'permissions']);
    } else if (reportType === 'SYSTEM_EVENTS') {
      query = query.in('module', ['automation', 'integrations', 'webhooks', 'settings']);
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(params.limit || 500);
    return data || [];
  }
}

export const auditLogsRepository = new AuditLogsRepository();
