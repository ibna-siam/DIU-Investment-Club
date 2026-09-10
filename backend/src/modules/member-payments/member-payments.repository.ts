import crypto from 'crypto';
import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { MemberPayment, PaymentMethodType } from '../../types';

export class MemberPaymentsRepository {
  async findAll(options: {
    member_id?: string;
    due_id?: string;
    status?: string;
    financial_account_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MemberPayment[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      let query = supabaseClient
        .from('member_payments')
        .select(`
          *,
          member:members(id, member_code, full_name, student_id, email, phone, department),
          due:member_dues(id, due_number, title, amount, remaining_amount, due_type),
          account:financial_accounts(id, name, account_type),
          verifier:profiles!member_payments_verified_by_fkey(full_name)
        `, { count: 'exact' });

      if (options.member_id) {
        query = query.eq('member_id', options.member_id);
      }
      if (options.due_id) {
        query = query.eq('due_id', options.due_id);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.financial_account_id) {
        query = query.eq('financial_account_id', options.financial_account_id);
      }
      if (options.search) {
        query = query.or(`payment_number.ilike.%${options.search}%,receipt_number.ilike.%${options.search}%,reference_number.ilike.%${options.search}%`);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(error.message);

      const formatted = (data || []).map((p: any) => ({
        ...p,
        account_name: p.account?.name,
        verifier_name: p.verifier?.full_name,
      })) as MemberPayment[];

      return {
        data: formatted,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    }

    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  async findById(id: string): Promise<MemberPayment | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('member_payments')
        .select(`
          *,
          member:members(id, member_code, full_name, student_id, email, phone, department),
          due:member_dues(id, due_number, title, amount, remaining_amount, due_type),
          account:financial_accounts(id, name, account_type),
          verifier:profiles!member_payments_verified_by_fkey(full_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        ...data,
        account_name: data.account?.name,
        verifier_name: data.verifier?.full_name,
      } as MemberPayment;
    }
    return null;
  }

  async findByReceiptNumber(receiptNumber: string): Promise<MemberPayment | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('member_payments')
        .select(`
          *,
          member:members(id, member_code, full_name, student_id, email, phone, department, batch),
          due:member_dues(id, due_number, title, amount, remaining_amount, due_type),
          account:financial_accounts(id, name, account_type),
          verifier:profiles!member_payments_verified_by_fkey(full_name)
        `)
        .eq('receipt_number', receiptNumber)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        ...data,
        account_name: data.account?.name,
        verifier_name: data.verifier?.full_name,
      } as MemberPayment;
    }
    return null;
  }

  async findByReceiptToken(receiptToken: string): Promise<MemberPayment | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('member_payments')
        .select(`
          *,
          member:members(id, member_code, full_name, student_id, email, phone, department, batch),
          due:member_dues(id, due_number, title, amount, remaining_amount, due_type),
          account:financial_accounts(id, name, account_type),
          verifier:profiles!member_payments_verified_by_fkey(full_name)
        `)
        .eq('receipt_token', receiptToken)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        ...data,
        account_name: data.account?.name,
        verifier_name: data.verifier?.full_name,
      } as MemberPayment;
    }
    return null;
  }

  async create(data: {
    member_id: string;
    due_id?: string;
    amount: number;
    payment_method: PaymentMethodType;
    financial_account_id: string;
    payment_date?: string;
    reference_number?: string;
    transaction_reference?: string;
    created_by?: string;
  }): Promise<MemberPayment> {
    if (isSupabaseConfigured() && supabaseClient) {
      // Validate due remaining amount if linked
      if (data.due_id) {
        const { data: due } = await supabaseClient
          .from('member_dues')
          .select('*')
          .eq('id', data.due_id)
          .single();

        if (due && due.status === 'PAID') {
          throw new Error('This due obligation is already paid in full');
        }
        if (due && data.amount > Number(due.remaining_amount)) {
          throw new Error(`Payment amount (৳${data.amount}) cannot exceed remaining due balance (৳${due.remaining_amount})`);
        }
      }

      const { data: codeData, error: codeErr } = await supabaseClient.rpc('generate_payment_number');
      if (codeErr) throw new Error(codeErr.message);
      const paymentNumber = codeData as string;

      const { data: created, error } = await supabaseClient
        .from('member_payments')
        .insert({
          payment_number: paymentNumber,
          member_id: data.member_id,
          due_id: data.due_id || null,
          amount: data.amount,
          payment_method: data.payment_method,
          financial_account_id: data.financial_account_id,
          payment_date: data.payment_date || new Date().toISOString().split('T')[0],
          reference_number: data.reference_number || null,
          transaction_reference: data.transaction_reference || null,
          receipt_token: crypto.randomBytes(32).toString('hex'),
          status: 'PENDING',
          created_by: data.created_by || null,
        })
        .select(`
          *,
          member:members(id, member_code, full_name, student_id)
        `)
        .single();

      if (error) throw new Error(error.message);
      return created as MemberPayment;
    }
    throw new Error('Database connection required');
  }

  async verify(paymentId: string, userId: string, notes?: string): Promise<any> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('verify_member_payment', {
        p_payment_id: paymentId,
        p_user_id: userId,
        p_notes: notes || null,
      });

      if (error) throw new Error(error.message);

      // Automatically post double-entry journal and voucher
      try {
        const { accountingEngine } = await import('../accounting/accounting.engine');
        await accountingEngine.postOperationalEvent('MEMBER_PAYMENT', paymentId, userId);
      } catch (postErr) {
        console.warn('Accounting auto-posting deferred:', postErr);
      }

      return data;
    }
    throw new Error('Database connection required');
  }

  async reject(paymentId: string, userId: string, reason: string): Promise<any> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('reject_member_payment', {
        p_payment_id: paymentId,
        p_user_id: userId,
        p_reason: reason,
      });

      if (error) throw new Error(error.message);
      return data;
    }
    throw new Error('Database connection required');
  }
}

export const memberPaymentsRepository = new MemberPaymentsRepository();
