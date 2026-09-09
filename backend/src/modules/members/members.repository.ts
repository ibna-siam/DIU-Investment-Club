import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { Member, MemberStatus } from '../../types';

export class MembersRepository {
  async findAll(options: {
    search?: string;
    department?: string;
    batch?: string;
    membership_status?: string;
    membership_type_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Member[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      let query = supabaseClient
        .from('members')
        .select(`
          *,
          membership_type:membership_types(*),
          creator:profiles!members_created_by_fkey(full_name)
        `, { count: 'exact' });

      if ((options as any).only_deleted) {
        query = query.not('deleted_at', 'is', null);
      } else if (!(options as any).include_deleted) {
        query = query.is('deleted_at', null);
      }

      if (options.department) {
        query = query.eq('department', options.department);
      }
      if (options.batch) {
        query = query.eq('batch', options.batch);
      }
      if (options.membership_status) {
        query = query.eq('membership_status', options.membership_status);
      }
      if (options.membership_type_id) {
        query = query.eq('membership_type_id', options.membership_type_id);
      }
      if (options.search) {
        query = query.or(`full_name.ilike.%${options.search}%,member_code.ilike.%${options.search}%,student_id.ilike.%${options.search}%,email.ilike.%${options.search}%`);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(error.message);

      // Fetch outstanding dues for these members
      const memberIds = (data || []).map((m: any) => m.id);
      let duesMap: Record<string, number> = {};
      if (memberIds.length > 0) {
        const { data: duesData } = await supabaseClient
          .from('member_dues')
          .select('member_id, remaining_amount')
          .in('member_id', memberIds)
          .in('status', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']);

        if (duesData) {
          duesData.forEach((d: any) => {
            duesMap[d.member_id] = (duesMap[d.member_id] || 0) + Number(d.remaining_amount);
          });
        }
      }

      const formatted = (data || []).map((m: any) => ({
        ...m,
        creator_name: m.creator?.full_name,
        outstanding_dues: duesMap[m.id] || 0,
      })) as Member[];

      const total = count || 0;
      return {
        data: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  async findById(id: string): Promise<Member | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('members')
        .select(`
          *,
          membership_type:membership_types(*),
          creator:profiles!members_created_by_fkey(full_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      // Calculate dues
      const { data: duesData } = await supabaseClient
        .from('member_dues')
        .select('remaining_amount')
        .eq('member_id', id)
        .in('status', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']);

      const outstanding_dues = (duesData || []).reduce((sum, d) => sum + Number(d.remaining_amount), 0);

      return {
        ...data,
        creator_name: data.creator?.full_name,
        outstanding_dues,
      } as Member;
    }
    return null;
  }

  async create(data: {
    student_id: string;
    full_name: string;
    email: string;
    phone?: string;
    department?: string;
    batch?: string;
    semester?: string;
    membership_type_id?: string;
    joined_date?: string;
    notes?: string;
    user_id?: string;
    created_by?: string;
  }): Promise<Member> {
    if (isSupabaseConfigured() && supabaseClient) {
      // 1. Check for duplicate student_id and email
      const { data: existingStudent } = await supabaseClient
        .from('members')
        .select('id, student_id')
        .eq('student_id', data.student_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingStudent) {
        throw new Error(`A member with Student ID "${data.student_id}" is already registered.`);
      }

      const { data: existingEmail } = await supabaseClient
        .from('members')
        .select('id, email')
        .eq('email', data.email)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingEmail) {
        throw new Error(`A member with Email "${data.email}" is already registered.`);
      }

      // 2. Generate member code
      const { data: codeData, error: codeErr } = await supabaseClient.rpc('generate_member_code');
      if (codeErr) throw new Error(codeErr.message);
      const memberCode = codeData as string;

      // 3. Insert member
      const { data: member, error } = await supabaseClient
        .from('members')
        .insert({
          member_code: memberCode,
          student_id: data.student_id,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          department: data.department || null,
          batch: data.batch || null,
          semester: data.semester || null,
          membership_type_id: data.membership_type_id || null,
          membership_status: 'PENDING',
          joined_date: data.joined_date || new Date().toISOString().split('T')[0],
          notes: data.notes || null,
          user_id: data.user_id || null,
          created_by: data.created_by || null,
        })
        .select(`
          *,
          membership_type:membership_types(*)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('student_id')) {
            throw new Error(`A member with Student ID "${data.student_id}" is already registered.`);
          }
          if (error.message.includes('email')) {
            throw new Error(`A member with Email "${data.email}" is already registered.`);
          }
          if (error.message.includes('member_code')) {
            throw new Error(`Generated Member Code already exists. Please try again.`);
          }
        }
        throw new Error(error.message);
      }

      // 3. If membership type provided, record membership history and create initial joining due
      if (data.membership_type_id) {
        const { data: mType } = await supabaseClient
          .from('membership_types')
          .select('*')
          .eq('id', data.membership_type_id)
          .maybeSingle();

        if (mType) {
          const { data: memRecord } = await supabaseClient
            .from('member_memberships')
            .insert({
              member_id: member.id,
              membership_type_id: mType.id,
              start_date: member.joined_date,
              status: 'ACTIVE',
              joining_fee_amount: mType.joining_fee,
              renewal_fee_amount: mType.renewal_fee,
            })
            .select()
            .single();

          if (mType.joining_fee > 0) {
            const { data: dueCode } = await supabaseClient.rpc('generate_due_number');
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);

            await supabaseClient.from('member_dues').insert({
              due_number: dueCode || `DUE-2026-${Math.floor(10000 + Math.random() * 90000)}`,
              member_id: member.id,
              membership_id: memRecord?.id || null,
              due_type: 'MEMBERSHIP_FEE',
              title: `${mType.name.replace(/_/g, ' ')} Joining Fee`,
              description: `Initial membership admission fee for ${mType.name.replace(/_/g, ' ')} tier`,
              amount: mType.joining_fee,
              paid_amount: 0.00,
              remaining_amount: mType.joining_fee,
              due_date: dueDate.toISOString().split('T')[0],
              status: 'PENDING',
              created_by: data.created_by || null,
            });
          }
        }
      }

      return member as Member;
    }
    throw new Error('Database connection required');
  }

  async update(id: string, data: Partial<Member>): Promise<Member | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: updated, error } = await supabaseClient
        .from('members')
        .update({
          ...(data.full_name ? { full_name: data.full_name } : {}),
          ...(data.student_id ? { student_id: data.student_id } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.department !== undefined ? { department: data.department } : {}),
          ...(data.batch !== undefined ? { batch: data.batch } : {}),
          ...(data.semester !== undefined ? { semester: data.semester } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.user_id !== undefined ? { user_id: data.user_id } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          membership_type:membership_types(*)
        `)
        .single();

      if (error) throw new Error(error.message);
      return updated as Member | null;
    }
    return null;
  }

  async updateStatus(id: string, status: MemberStatus): Promise<Member | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: updated, error } = await supabaseClient
        .from('members')
        .update({
          membership_status: status,
          archived_at: status === 'ARCHIVED' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as Member | null;
    }
    return null;
  }

  async unarchive(id: string): Promise<Member | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: updated, error } = await supabaseClient
        .from('members')
        .update({
          membership_status: 'ACTIVE',
          archived_at: null,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as Member | null;
    }
    return null;
  }

  async getImpactSummary(id: string): Promise<{
    member: Member;
    totalDuesCount: number;
    pendingDuesCount: number;
    totalDuesAmount: number;
    outstandingDuesAmount: number;
    paymentsCount: number;
    totalPaidAmount: number;
    committeeRolesCount: number;
    tasksCount: number;
    canHardDelete: boolean;
    blockReason?: string;
  }> {
    if (!isSupabaseConfigured() || !supabaseClient) {
      throw new Error('Supabase client not available');
    }

    const member = await this.findById(id);
    if (!member) {
      throw new Error('Member not found');
    }

    // Check dues
    const { data: dues } = await supabaseClient
      .from('member_dues')
      .select('amount, remaining_amount, status')
      .eq('member_id', id);

    const totalDuesCount = dues?.length || 0;
    const pendingDuesCount = dues?.filter((d: any) => ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(d.status)).length || 0;
    const totalDuesAmount = (dues || []).reduce((sum, d: any) => sum + Number(d.amount || 0), 0);
    const outstandingDuesAmount = (dues || []).reduce((sum, d: any) => sum + Number(d.remaining_amount || 0), 0);

    // Check payments
    const { data: payments } = await supabaseClient
      .from('member_payments')
      .select('amount, status')
      .eq('member_id', id);

    const paymentsCount = payments?.length || 0;
    const totalPaidAmount = (payments || []).reduce((sum, p: any) => sum + Number(p.amount || 0), 0);

    // Check committee roles
    const { count: committeeRolesCount } = await supabaseClient
      .from('committee_members')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', id);

    // Check tasks
    const { count: tasksCount } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', id);

    const hasFinancialRecords = paymentsCount > 0 || (dues && dues.some((d: any) => Number(d.paid_amount || 0) > 0));
    const canHardDelete = !hasFinancialRecords;

    let blockReason: string | undefined;
    if (hasFinancialRecords) {
      blockReason = 'This member has recorded financial payments or collections. Hard deletion is forbidden to preserve general ledger and balance sheet integrity.';
    }

    return {
      member,
      totalDuesCount,
      pendingDuesCount,
      totalDuesAmount,
      outstandingDuesAmount,
      paymentsCount,
      totalPaidAmount,
      committeeRolesCount: committeeRolesCount || 0,
      tasksCount: tasksCount || 0,
      canHardDelete,
      blockReason,
    };
  }

  async removeMember(
    id: string,
    options: {
      action: 'ARCHIVE' | 'DEACTIVATE' | 'HARD_DELETE';
      reason?: string;
      adminId?: string;
    }
  ): Promise<{ success: boolean; message: string; actionTaken: string }> {
    if (!isSupabaseConfigured() || !supabaseClient) {
      throw new Error('Supabase client not available');
    }

    const impact = await this.getImpactSummary(id);

    if (options.action === 'HARD_DELETE') {
      if (!impact.canHardDelete) {
        throw new Error(impact.blockReason || 'Cannot permanently delete member with existing financial transactions.');
      }

      // Conclude committee assignments if any
      await supabaseClient
        .from('committee_members')
        .delete()
        .eq('member_id', id);

      // Unassign tasks if any
      await supabaseClient
        .from('tasks')
        .update({ assigned_to: null, updated_at: new Date().toISOString() })
        .eq('assigned_to', id);

      // Remove member dues if unpaid
      await supabaseClient
        .from('member_dues')
        .delete()
        .eq('member_id', id);

      // Delete member record
      const { error } = await supabaseClient
        .from('members')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);

      return {
        success: true,
        message: 'Member and related non-financial records deleted permanently.',
        actionTaken: 'HARD_DELETE',
      };
    }

    if (options.action === 'ARCHIVE') {
      // Archive member, preserve ledger, preserve dues
      const { error } = await supabaseClient
        .from('members')
        .update({
          membership_status: 'ARCHIVED',
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: options.reason ? `[Archived: ${options.reason}] ${impact.member.notes || ''}`.trim() : impact.member.notes,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);

      return {
        success: true,
        message: 'Member archived safely. All financial ledgers and dues history are preserved.',
        actionTaken: 'ARCHIVE',
      };
    }

    // Default to DEACTIVATE / INACTIVE
    const { error } = await supabaseClient
      .from('members')
      .update({
        membership_status: 'INACTIVE',
        updated_at: new Date().toISOString(),
        notes: options.reason ? `[Deactivated: ${options.reason}] ${impact.member.notes || ''}`.trim() : impact.member.notes,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: 'Member deactivated. Financial accounts and historical data remain unchanged.',
      actionTaken: 'DEACTIVATE',
    };
  }

  async archive(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { error } = await supabaseClient
        .from('members')
        .update({
          membership_status: 'ARCHIVED',
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    }
    return false;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.removeMember(id, { action: 'ARCHIVE' });
    return res.success;
  }
}

export const membersRepository = new MembersRepository();

