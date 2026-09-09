import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import {
  ComplianceChecklist,
  ComplianceRequirement,
  ComplianceStatus,
  ComplianceCategory,
} from '../../types';
import { auditLogsRepository } from '../audit-logs/audit-logs.repository';

export class ComplianceRepository {
  async listChecklists(params: {
    category?: ComplianceCategory;
    status?: ComplianceStatus;
  }): Promise<ComplianceChecklist[]> {
    if (!isSupabaseConfigured() || !supabaseClient) return [];

    try {
      let query = supabaseClient
        .from('compliance_checklists')
        .select('*');

      if (params.category) query = query.eq('category', params.category);
      if (params.status) query = query.eq('status', params.status);

      const { data: checklists, error } = await query.order('created_at', { ascending: false });

      if (error || !checklists) {
        console.error('Error fetching compliance checklists:', error);
        return [];
      }

      // Fetch requirements for all these checklists
      const checklistIds = checklists.map(c => c.id);
      let requirements: any[] = [];
      if (checklistIds.length > 0) {
        const { data: reqData } = await supabaseClient
          .from('compliance_requirements')
          .select('*')
          .in('checklist_id', checklistIds)
          .order('created_at', { ascending: true });
        requirements = reqData || [];
      }

      return checklists.map((c: any) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        description: c.description,
        frequency: c.frequency,
        due_date: c.due_date,
        status: c.status,
        reviewed_by: c.reviewed_by,
        reviewed_by_name: null,
        reviewed_at: c.reviewed_at,
        created_by: c.created_by,
        created_at: c.created_at,
        updated_at: c.updated_at,
        requirements: requirements
          .filter(r => r.checklist_id === c.id)
          .map((r: any) => ({
            id: r.id,
            checklist_id: r.checklist_id,
            requirement: r.requirement,
            responsible_person_id: r.responsible_person_id,
            responsible_person_name: null,
            due_date: r.due_date,
            status: r.status,
            evidence_document_id: r.evidence_document_id,
            evidence_notes: r.evidence_notes,
            verified_by: r.verified_by,
            verified_at: r.verified_at,
            created_at: r.created_at,
            updated_at: r.updated_at,
          })),
      }));
    } catch (e) {
      console.error('Exception in listChecklists:', e);
      return [];
    }
  }

  async getChecklistById(id: string): Promise<ComplianceChecklist | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    try {
      const { data: c, error } = await supabaseClient
        .from('compliance_checklists')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !c) return null;

      const { data: reqs } = await supabaseClient
        .from('compliance_requirements')
        .select('*')
        .eq('checklist_id', id)
        .order('created_at', { ascending: true });

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        description: c.description,
        frequency: c.frequency,
        due_date: c.due_date,
        status: c.status,
        reviewed_by: c.reviewed_by,
        reviewed_by_name: null,
        reviewed_at: c.reviewed_at,
        created_by: c.created_by,
        created_at: c.created_at,
        updated_at: c.updated_at,
        requirements: (reqs || []).map((r: any) => ({
          id: r.id,
          checklist_id: r.checklist_id,
          requirement: r.requirement,
          responsible_person_id: r.responsible_person_id,
          responsible_person_name: null,
          due_date: r.due_date,
          status: r.status,
          evidence_document_id: r.evidence_document_id,
          evidence_notes: r.evidence_notes,
          verified_by: r.verified_by,
          verified_at: r.verified_at,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })),
      };
    } catch (e) {
      return null;
    }
  }

  async createChecklist(data: {
    title: string;
    category: ComplianceCategory;
    description?: string;
    frequency?: string;
    due_date?: string;
    created_by?: string;
  }): Promise<ComplianceChecklist | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data: res, error } = await supabaseClient
      .from('compliance_checklists')
      .insert({
        title: data.title,
        category: data.category,
        description: data.description || null,
        frequency: data.frequency || 'ANNUAL',
        due_date: data.due_date || null,
        status: 'NOT_STARTED',
        created_by: data.created_by || null,
      })
      .select()
      .single();

    if (error || !res) return null;

    await auditLogsRepository.log({
      user_id: data.created_by,
      action: 'COMPLIANCE_CHECKLIST_CREATED',
      module: 'compliance',
      record_id: res.id,
      new_data: res,
    });

    return this.getChecklistById(res.id);
  }

  async addRequirement(data: {
    checklist_id: string;
    requirement: string;
    responsible_person_id?: string;
    due_date?: string;
    evidence_notes?: string;
    evidence_document_id?: string;
  }): Promise<ComplianceRequirement | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const { data: res, error } = await supabaseClient
      .from('compliance_requirements')
      .insert({
        checklist_id: data.checklist_id,
        requirement: data.requirement,
        responsible_person_id: data.responsible_person_id || null,
        due_date: data.due_date || null,
        status: 'NOT_STARTED',
        evidence_notes: data.evidence_notes || null,
        evidence_document_id: data.evidence_document_id || null,
      })
      .select()
      .single();

    if (error || !res) return null;
    return res as ComplianceRequirement;
  }

  async updateRequirement(
    id: string,
    data: {
      status?: ComplianceStatus;
      evidence_notes?: string;
      evidence_document_id?: string;
      verified_by?: string;
    }
  ): Promise<ComplianceRequirement | null> {
    if (!isSupabaseConfigured() || !supabaseClient) return null;

    const payload: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.status === 'COMPLIANT' && data.verified_by) {
      payload.verified_at = new Date().toISOString();
    }

    const { data: res, error } = await supabaseClient
      .from('compliance_requirements')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !res) return null;

    // Check if all requirements in checklist are compliant
    await this.refreshChecklistStatus(res.checklist_id);

    return res as ComplianceRequirement;
  }

  private async refreshChecklistStatus(checklistId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabaseClient) return;

    const { data: reqs } = await supabaseClient
      .from('compliance_requirements')
      .select('status')
      .eq('checklist_id', checklistId);

    if (!reqs || reqs.length === 0) return;

    const allCompliant = reqs.every(r => r.status === 'COMPLIANT' || r.status === 'NOT_APPLICABLE');
    const anyNonCompliant = reqs.some(r => r.status === 'NON_COMPLIANT');
    const anyInProgress = reqs.some(r => r.status === 'IN_PROGRESS');

    let nextStatus: ComplianceStatus = 'NOT_STARTED';
    if (allCompliant) nextStatus = 'COMPLIANT';
    else if (anyNonCompliant) nextStatus = 'NON_COMPLIANT';
    else if (anyInProgress) nextStatus = 'IN_PROGRESS';

    await supabaseClient
      .from('compliance_checklists')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', checklistId);
  }

  async deleteChecklist(id: string, userId?: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabaseClient) return false;

    const { error } = await supabaseClient.from('compliance_checklists').delete().eq('id', id);
    if (!error) {
      await auditLogsRepository.log({
        user_id: userId,
        action: 'COMPLIANCE_CHECKLIST_DELETED',
        module: 'compliance',
        record_id: id,
      });
      return true;
    }
    return false;
  }
}

export const complianceRepository = new ComplianceRepository();
