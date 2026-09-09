import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { Sponsorship, SponsorshipPayment, PaymentMethodType, SponsorshipStatus } from '../../types';

export class SponsorshipsRepository {
  async findAll(options: {
    sponsor_id?: string;
    event_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Sponsorship[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      let query = supabaseClient
        .from('sponsorships')
        .select(`
          *,
          sponsor:sponsors(id, sponsor_code, name, organization_name),
          event:events(id, event_code, title)
        `, { count: 'exact' });

      if (options.sponsor_id) {
        query = query.eq('sponsor_id', options.sponsor_id);
      }
      if (options.event_id) {
        query = query.eq('event_id', options.event_id);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,sponsorship_number.ilike.%${options.search}%`);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(error.message);

      const formatted = (data || []).map((s: any) => ({
        ...s,
        event_title: s.event?.title,
      })) as Sponsorship[];

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

  async findById(id: string): Promise<Sponsorship | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('sponsorships')
        .select(`
          *,
          sponsor:sponsors(id, sponsor_code, name, organization_name, contact_person, email, phone),
          event:events(id, event_code, title)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        ...data,
        event_title: data.event?.title,
      } as Sponsorship;
    }
    return null;
  }

  async findPayments(sponsorshipId: string): Promise<SponsorshipPayment[]> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('sponsorship_payments')
        .select(`
          *,
          account:financial_accounts(name),
          verifier:profiles!sponsorship_payments_verified_by_fkey(full_name)
        `)
        .eq('sponsorship_id', sponsorshipId)
        .order('payment_date', { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []).map((p: any) => ({
        ...p,
        account_name: p.account?.name,
        verifier_name: p.verifier?.full_name,
      })) as SponsorshipPayment[];
    }
    return [];
  }

  async create(data: {
    sponsor_id: string;
    event_id?: string | null;
    title: string;
    description?: string;
    agreed_amount: number;
    agreement_date?: string;
    due_date?: string;
    created_by?: string;
  }): Promise<Sponsorship> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: codeData, error: codeErr } = await supabaseClient.rpc('generate_sponsorship_number');
      if (codeErr) throw new Error(codeErr.message);
      const sponsorshipNumber = codeData as string;

      const { data: created, error } = await supabaseClient
        .from('sponsorships')
        .insert({
          sponsorship_number: sponsorshipNumber,
          sponsor_id: data.sponsor_id,
          event_id: data.event_id || null,
          title: data.title,
          description: data.description || null,
          agreed_amount: data.agreed_amount,
          received_amount: 0.00,
          remaining_amount: data.agreed_amount,
          status: 'AGREED',
          agreement_date: data.agreement_date || new Date().toISOString().split('T')[0],
          due_date: data.due_date || null,
          created_by: data.created_by || null,
        })
        .select(`
          *,
          sponsor:sponsors(name, organization_name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return created as Sponsorship;
    }
    throw new Error('Database connection required');
  }

  async createPayment(data: {
    sponsorship_id: string;
    amount: number;
    payment_method: PaymentMethodType;
    financial_account_id: string;
    payment_date?: string;
    reference_number?: string;
    created_by?: string;
  }): Promise<SponsorshipPayment> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: sp } = await supabaseClient
        .from('sponsorships')
        .select('remaining_amount, status')
        .eq('id', data.sponsorship_id)
        .single();

      if (sp && sp.status === 'RECEIVED') {
        throw new Error('This sponsorship contract has already been fulfilled in full');
      }

      const { data: codeData, error: codeErr } = await supabaseClient.rpc('generate_sponsorship_payment_number');
      if (codeErr) throw new Error(codeErr.message);
      const paymentNumber = codeData as string;

      const { data: created, error } = await supabaseClient
        .from('sponsorship_payments')
        .insert({
          payment_number: paymentNumber,
          sponsorship_id: data.sponsorship_id,
          amount: data.amount,
          payment_method: data.payment_method,
          financial_account_id: data.financial_account_id,
          payment_date: data.payment_date || new Date().toISOString().split('T')[0],
          reference_number: data.reference_number || null,
          status: 'PENDING',
          created_by: data.created_by || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return created as SponsorshipPayment;
    }
    throw new Error('Database connection required');
  }

  async verifyPayment(paymentId: string, userId: string): Promise<any> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('verify_sponsorship_payment', {
        p_payment_id: paymentId,
        p_user_id: userId,
      });

      if (error) throw new Error(error.message);

      // Automatically post double-entry journal and voucher
      try {
        const { accountingEngine } = await import('../accounting/accounting.engine');
        await accountingEngine.postOperationalEvent('SPONSORSHIP_PAYMENT', paymentId, userId);
      } catch (postErr) {
        console.warn('Accounting auto-posting deferred:', postErr);
      }

      return data;
    }
    throw new Error('Database connection required');
  }
}

export const sponsorshipsRepository = new SponsorshipsRepository();
