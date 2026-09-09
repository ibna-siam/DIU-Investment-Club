import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { MemberDue, DueType } from '../../types';

export class MemberDuesRepository {
  async findAll(options: {
    member_id?: string;
    status?: string;
    due_type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MemberDue[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      let query = supabaseClient
        .from('member_dues')
        .select(`
          *,
          member:members(id, member_code, full_name, student_id, email, phone, department)
        `, { count: 'exact' });

      if (options.member_id) {
        query = query.eq('member_id', options.member_id);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.due_type) {
        query = query.eq('due_type', options.due_type);
      }
      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,due_number.ilike.%${options.search}%`);
      }

      query = query.order('due_date', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(error.message);

      return {
        data: (data || []) as MemberDue[],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    }

    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  async findById(id: string): Promise<MemberDue | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('member_dues')
        .select(`
          *,
          member:members(id, member_code, full_name, student_id, email, phone, department)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as MemberDue | null;
    }
    return null;
  }

  async create(data: {
    member_id: string;
    due_type: DueType;
    title: string;
    description?: string;
    amount: number;
    due_date: string;
    membership_id?: string;
    created_by?: string;
  }): Promise<MemberDue> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: codeData, error: codeErr } = await supabaseClient.rpc('generate_due_number');
      if (codeErr) throw new Error(codeErr.message);
      const dueNumber = codeData as string;

      const { data: created, error } = await supabaseClient
        .from('member_dues')
        .insert({
          due_number: dueNumber,
          member_id: data.member_id,
          membership_id: data.membership_id || null,
          due_type: data.due_type,
          title: data.title,
          description: data.description || null,
          amount: data.amount,
          paid_amount: 0.00,
          remaining_amount: data.amount,
          due_date: data.due_date,
          status: 'PENDING',
          created_by: data.created_by || null,
        })
        .select(`
          *,
          member:members(id, member_code, full_name, student_id)
        `)
        .single();

      if (error) throw new Error(error.message);
      return created as MemberDue;
    }
    throw new Error('Database connection required');
  }

  async waive(id: string, userId: string, reason?: string): Promise<MemberDue | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const current = await this.findById(id);
      if (!current) return null;

      if (current.status === 'PAID') {
        throw new Error('Cannot waive an already paid due');
      }

      const { data: updated, error } = await supabaseClient
        .from('member_dues')
        .update({
          status: 'WAIVED',
          remaining_amount: 0.00,
          waived_by: userId,
          waived_at: new Date().toISOString(),
          waiver_reason: reason || 'Waived by administrative decision',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as MemberDue | null;
    }
    return null;
  }

  async cancel(id: string, userId: string, reason?: string): Promise<MemberDue | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const current = await this.findById(id);
      if (!current) throw new Error('Due record not found');
      if (current.status === 'PAID') {
        throw new Error('Cannot cancel an already paid due obligation');
      }

      const { count } = await supabaseClient
        .from('member_payments')
        .select('*', { count: 'exact', head: true })
        .eq('due_id', id);

      if (count && count > 0) {
        throw new Error('Cannot cancel due with recorded payments. Void or refund the payments first.');
      }

      const { data: updated, error } = await supabaseClient
        .from('member_dues')
        .update({
          status: 'CANCELLED',
          remaining_amount: 0.00,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as MemberDue | null;
    }
    return null;
  }
}

export const memberDuesRepository = new MemberDuesRepository();
