import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { InternalControlRule, SodCheckResult, RequiredAction } from '../../types';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class SodService {
  async checkApprovalConflict(params: {
    requesterId: string;
    actorId: string;
    amount?: number;
    module?: string;
    recordId?: string;
  }): Promise<SodCheckResult> {
    // 1. Fundamental SOD check: Creator cannot approve own submission
    const isCreator = params.requesterId && params.actorId && params.requesterId === params.actorId;

    if (isCreator) {
      // Look up active rule configuration for SOD
      let requiredAction: RequiredAction = 'BLOCK';
      if (isSupabaseConfigured() && supabaseClient) {
        const { data: rule } = await supabaseClient
          .from('internal_control_rules')
          .select('*')
          .eq('code', 'SOD_CREATOR_APPROVER')
          .eq('is_active', true)
          .single();
        if (rule) {
          requiredAction = rule.required_action as RequiredAction;
        }
      }

      // Log risk flag
      if (isSupabaseConfigured() && supabaseClient) {
        await supabaseClient.from('risk_flags').insert({
          flag_type: 'SOD_VIOLATION',
          severity: requiredAction === 'BLOCK' ? 'HIGH' : 'MEDIUM',
          target_entity: params.module || 'EXPENSE',
          target_id: params.recordId || null,
          risk_score: 85,
          title: 'Segregation of Duties Conflict Detected',
          description: `User attempted to approve their own ${params.module || 'voucher'}. Requester: ${params.requesterId}, Approver: ${params.actorId}.`,
          status: 'OPEN',
        });
      }

      return {
        hasConflict: true,
        conflictType: 'CREATOR_IS_APPROVER',
        requiredAction,
        message: 'Segregation of Duties Violation: You cannot approve a request or voucher that you created.',
        details: { requesterId: params.requesterId, actorId: params.actorId },
      };
    }

    // 2. High threshold check
    if (params.amount && params.amount > 0) {
      if (isSupabaseConfigured() && supabaseClient) {
        const { data: rule } = await supabaseClient
          .from('internal_control_rules')
          .select('*')
          .eq('code', 'THRESHOLD_EXPENSE_DUAL')
          .eq('is_active', true)
          .single();

        if (rule && rule.conditions) {
          const threshold = Number(rule.conditions.threshold_amount || 25000);
          if (params.amount >= threshold) {
            return {
              hasConflict: true,
              conflictType: 'HIGH_THRESHOLD_DUAL_REQUIRED',
              requiredAction: rule.required_action as RequiredAction,
              message: `Dual Approval Policy: Amount (BDT ${params.amount}) exceeds the dual-approval threshold of BDT ${threshold}.`,
              details: { amount: params.amount, threshold },
            };
          }
        }
      }
    }

    return {
      hasConflict: false,
      requiredAction: 'WARNING',
      message: 'Segregation of duties validation passed.',
    };
  }

  async recordOverride(params: {
    ruleCode: string;
    userId: string;
    recordId?: string;
    reason: string;
  }): Promise<void> {
    await auditLogsRepository.log({
      user_id: params.userId,
      action: 'INTERNAL_CONTROL_OVERRIDE',
      module: 'internal_controls',
      record_id: params.recordId,
      new_data: { ruleCode: params.ruleCode, reason: params.reason },
    });
  }
}

export const sodService = new SodService();
