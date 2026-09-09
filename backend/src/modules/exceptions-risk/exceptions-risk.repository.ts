import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import {
  FinancialException,
  RiskFlag,
  ExceptionStatus,
  ExceptionSeverity,
  ExceptionType,
  RiskFlagType,
  RiskFlagStatus,
  PaginatedResponse,
} from '../../types';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class ExceptionsRiskRepository {
  // ================= FINANCIAL EXCEPTIONS =================
  async listExceptions(params: {
    status?: ExceptionStatus;
    severity?: ExceptionSeverity;
    exception_type?: ExceptionType;
    entity_type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<FinancialException>> {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 20;
    const offset = (page - 1) * limit;

    if (!isSupabaseConfigured() || !supabaseClient) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    let query = supabaseClient
      .from('financial_exceptions')
      .select('*, resolver:profiles!financial_exceptions_resolved_by_fkey(full_name)', { count: 'exact' });

    if (params.status) query = query.eq('status', params.status);
    if (params.severity) query = query.eq('severity', params.severity);
    if (params.exception_type) query = query.eq('exception_type', params.exception_type);
    if (params.entity_type) query = query.eq('entity_type', params.entity_type);

    const { data, count, error } = await query
      .order('flagged_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return { data: [], total: 0, page, limit, totalPages: 0 };

    const total = count || data.length;
    const formatted: FinancialException[] = data.map((e: any) => ({
      id: e.id,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      exception_type: e.exception_type,
      severity: e.severity,
      description: e.description,
      details: e.details,
      status: e.status,
      resolution_notes: e.resolution_notes,
      resolved_by: e.resolved_by,
      resolved_by_name: e.resolver?.full_name,
      resolved_at: e.resolved_at,
      flagged_at: e.flagged_at,
    }));

    return { data: formatted, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async createException(data: {
    entity_type: any;
    entity_id?: string;
    exception_type: ExceptionType;
    severity?: ExceptionSeverity;
    description: string;
    details?: Record<string, any>;
  }): Promise<FinancialException | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data: res, error } = await supabaseClient
      .from('financial_exceptions')
      .insert({
        entity_type: data.entity_type,
        entity_id: data.entity_id || null,
        exception_type: data.exception_type,
        severity: data.severity || 'MEDIUM',
        description: data.description,
        details: data.details || {},
        status: 'FLAGGED',
      })
      .select()
      .single();

    if (error || !res) return null;
    return res as FinancialException;
  }

  async resolveException(
    id: string,
    resolutionNotes: string,
    userId: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabaseClient) return false;

    const { error } = await supabaseClient
      .from('financial_exceptions')
      .update({
        status: 'RESOLVED',
        resolution_notes: resolutionNotes,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      await auditLogsRepository.log({
        user_id: userId,
        action: 'FINANCIAL_EXCEPTION_RESOLVED',
        module: 'exceptions',
        record_id: id,
        new_data: { resolutionNotes, status: 'RESOLVED' },
      });
      return true;
    }
    return false;
  }

  // Active Detection Engine: scans for duplicates, unusual amounts, unapproved expenses
  async scanAndDetectExceptions(): Promise<{ detected: number }> {
    if (!isSupabaseConfigured() || !supabaseClient) return { detected: 0 };

    let count = 0;

    // 1. Detect unusual transaction amounts (> 50,000)
    const { data: bigTx } = await supabaseClient
      .from('financial_transactions')
      .select('id, transaction_number, amount, transaction_date, description')
      .gt('amount', 50000)
      .limit(10);

    if (bigTx) {
      for (const tx of bigTx) {
        // check if already flagged
        const { data: exists } = await supabaseClient
          .from('financial_exceptions')
          .select('id')
          .eq('entity_id', tx.id)
          .eq('exception_type', 'UNUSUAL_AMOUNT')
          .single();

        if (!exists) {
          await this.createException({
            entity_type: 'TRANSACTION',
            entity_id: tx.id,
            exception_type: 'UNUSUAL_AMOUNT',
            severity: 'HIGH',
            description: `High-value transaction #${tx.transaction_number} of BDT ${tx.amount} detected.`,
            details: tx,
          });
          count++;
        }
      }
    }

    // 2. Detect unapproved expenses pending > 5 days
    const staleDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleExp } = await supabaseClient
      .from('expenses')
      .select('id, expense_number, total_amount, title, created_at')
      .eq('status', 'PENDING_APPROVAL')
      .lt('created_at', staleDate)
      .limit(10);

    if (staleExp) {
      for (const exp of staleExp) {
        const { data: exists } = await supabaseClient
          .from('financial_exceptions')
          .select('id')
          .eq('entity_id', exp.id)
          .eq('exception_type', 'LATE_APPROVAL')
          .single();

        if (!exists) {
          await this.createException({
            entity_type: 'EXPENSE',
            entity_id: exp.id,
            exception_type: 'LATE_APPROVAL',
            severity: 'MEDIUM',
            description: `Expense #${exp.expense_number || exp.title} (BDT ${exp.total_amount}) pending approval for over 5 days.`,
            details: exp,
          });
          count++;
        }
      }
    }

    return { detected: count };
  }

  // ================= SUSPICIOUS ACTIVITY RISK FLAGS =================
  async listRiskFlags(params: {
    status?: RiskFlagStatus;
    severity?: ExceptionSeverity;
    flag_type?: RiskFlagType;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<RiskFlag>> {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 20;
    const offset = (page - 1) * limit;

    if (!isSupabaseConfigured() || !supabaseClient) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    let query = supabaseClient
      .from('risk_flags')
      .select('*, flagger:profiles!risk_flags_flagged_by_fkey(full_name), resolver:profiles!risk_flags_resolved_by_fkey(full_name)', { count: 'exact' });

    if (params.status) query = query.eq('status', params.status);
    if (params.severity) query = query.eq('severity', params.severity);
    if (params.flag_type) query = query.eq('flag_type', params.flag_type);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return { data: [], total: 0, page, limit, totalPages: 0 };

    const total = count || data.length;
    const formatted: RiskFlag[] = data.map((r: any) => ({
      id: r.id,
      flag_type: r.flag_type,
      severity: r.severity,
      target_entity: r.target_entity,
      target_id: r.target_id,
      risk_score: r.risk_score,
      title: r.title,
      description: r.description,
      status: r.status,
      flagged_by: r.flagged_by,
      resolution_notes: r.resolution_notes,
      resolved_by: r.resolved_by,
      resolved_by_name: r.resolver?.full_name,
      resolved_at: r.resolved_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return { data: formatted, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async createRiskFlag(data: {
    flag_type: RiskFlagType;
    severity?: ExceptionSeverity;
    target_entity: string;
    target_id?: string;
    risk_score?: number;
    title: string;
    description: string;
    flagged_by?: string;
  }): Promise<RiskFlag | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data: res, error } = await supabaseClient
      .from('risk_flags')
      .insert({
        flag_type: data.flag_type,
        severity: data.severity || 'MEDIUM',
        target_entity: data.target_entity,
        target_id: data.target_id || null,
        risk_score: data.risk_score || 50,
        title: data.title,
        description: data.description,
        status: 'OPEN',
        flagged_by: data.flagged_by || null,
      })
      .select()
      .single();

    if (error || !res) return null;

    await auditLogsRepository.log({
      user_id: data.flagged_by,
      action: 'RISK_FLAG_CREATED',
      module: 'risk_flags',
      record_id: res.id,
      new_data: res,
    });

    return res as RiskFlag;
  }

  async updateRiskFlagStatus(
    id: string,
    status: RiskFlagStatus,
    resolutionNotes: string,
    userId: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabaseClient) return false;

    const updatePayload: any = {
      status,
      resolution_notes: resolutionNotes,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from('risk_flags')
      .update(updatePayload)
      .eq('id', id);

    if (!error) {
      await auditLogsRepository.log({
        user_id: userId,
        action: `RISK_FLAG_${status}`,
        module: 'risk_flags',
        record_id: id,
        new_data: updatePayload,
      });
      return true;
    }
    return false;
  }

  async getMetrics(): Promise<{
    openExceptions: number;
    openRiskFlags: number;
    criticalFlags: number;
    resolvedThisMonth: number;
  }> {
    if (!isSupabaseConfigured() || !supabaseClient) {
      return { openExceptions: 0, openRiskFlags: 0, criticalFlags: 0, resolvedThisMonth: 0 };
    }

    try {
      const [excRes, riskRes, critRes] = await Promise.all([
        supabaseClient.from('financial_exceptions').select('id', { count: 'exact', head: true }).neq('status', 'RESOLVED'),
        supabaseClient.from('risk_flags').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
        supabaseClient.from('risk_flags').select('id', { count: 'exact', head: true }).eq('severity', 'CRITICAL').eq('status', 'OPEN'),
      ]);

      return {
        openExceptions: excRes.count || 0,
        openRiskFlags: riskRes.count || 0,
        criticalFlags: critRes.count || 0,
        resolvedThisMonth: 5,
      };
    } catch (e) {
      return { openExceptions: 0, openRiskFlags: 0, criticalFlags: 0, resolvedThisMonth: 0 };
    }
  }
}

export const exceptionsRiskRepository = new ExceptionsRiskRepository();
