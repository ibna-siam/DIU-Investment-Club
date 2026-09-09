import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { InternalControlRule, PaginatedResponse } from '../../types';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class InternalControlsRepository {
  async listRules(): Promise<InternalControlRule[]> {
    if (!isSupabaseConfigured() || !supabaseClient) return [];
    const { data } = await supabaseClient
      .from('internal_control_rules')
      .select('*')
      .order('created_at', { ascending: false });
    return (data as InternalControlRule[]) || [];
  }

  async getRuleByCode(code: string): Promise<InternalControlRule | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;
    const { data } = await supabaseClient
      .from('internal_control_rules')
      .select('*')
      .eq('code', code)
      .single();
    return (data as InternalControlRule) || null;
  }

  async createRule(data: {
    name: string;
    code: string;
    description?: string;
    control_type: string;
    conditions: Record<string, any>;
    required_action: 'WARNING' | 'BLOCK' | 'REQUIRE_OVERRIDE';
    is_active?: boolean;
    created_by?: string;
  }): Promise<InternalControlRule | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data: res, error } = await supabaseClient
      .from('internal_control_rules')
      .insert({
        name: data.name,
        code: data.code,
        description: data.description || null,
        control_type: data.control_type,
        conditions: data.conditions,
        required_action: data.required_action,
        is_active: data.is_active !== undefined ? data.is_active : true,
        created_by: data.created_by || null,
      })
      .select()
      .single();

    if (error || !res) {
      console.error('Create internal control rule error:', error);
      return null;
    }

    await auditLogsRepository.log({
      user_id: data.created_by,
      action: 'INTERNAL_CONTROL_RULE_CREATED',
      module: 'internal_controls',
      record_id: res.id,
      new_data: res,
    });

    return res as InternalControlRule;
  }

  async updateRule(id: string, data: Partial<InternalControlRule>, userId?: string): Promise<InternalControlRule | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data: res, error } = await supabaseClient
      .from('internal_control_rules')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !res) return null;

    await auditLogsRepository.log({
      user_id: userId,
      action: 'INTERNAL_CONTROL_RULE_UPDATED',
      module: 'internal_controls',
      record_id: id,
      new_data: res,
    });

    return res as InternalControlRule;
  }

  async toggleRule(id: string, userId?: string): Promise<InternalControlRule | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data: current } = await supabaseClient
      .from('internal_control_rules')
      .select('is_active')
      .eq('id', id)
      .single();

    if (!current) return null;

    return this.updateRule(id, { is_active: !current.is_active }, userId);
  }

  async deleteRule(id: string, userId?: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabaseClient) return false;

    const { error } = await supabaseClient
      .from('internal_control_rules')
      .delete()
      .eq('id', id);

    if (!error) {
      await auditLogsRepository.log({
        user_id: userId,
        action: 'INTERNAL_CONTROL_RULE_DELETED',
        module: 'internal_controls',
        record_id: id,
      });
      return true;
    }
    return false;
  }
}

export const internalControlsRepository = new InternalControlsRepository();
