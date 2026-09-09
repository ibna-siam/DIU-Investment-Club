import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { Donation, DonorType, PaymentMethodType } from '../../types';

export class DonationsRepository {
  async findAll(options: {
    donor_type?: string;
    status?: string;
    event_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Donation[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      let query = supabaseClient
        .from('donations')
        .select(`
          *,
          account:financial_accounts(id, name, account_type),
          event:events(id, title, event_code),
          verifier:profiles!donations_verified_by_fkey(full_name)
        `, { count: 'exact' });

      if (options.donor_type) {
        query = query.eq('donor_type', options.donor_type);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.event_id) {
        query = query.eq('event_id', options.event_id);
      }
      if (options.search) {
        query = query.or(`donor_name.ilike.%${options.search}%,organization_name.ilike.%${options.search}%,donation_number.ilike.%${options.search}%`);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(error.message);

      const formatted = (data || []).map((d: any) => ({
        ...d,
        account_name: d.account?.name,
        event_title: d.event?.title,
        verifier_name: d.verifier?.full_name,
      })) as Donation[];

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

  async findById(id: string): Promise<Donation | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('donations')
        .select(`
          *,
          account:financial_accounts(id, name, account_type),
          event:events(id, title, event_code),
          verifier:profiles!donations_verified_by_fkey(full_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        ...data,
        account_name: data.account?.name,
        event_title: data.event?.title,
        verifier_name: data.verifier?.full_name,
      } as Donation;
    }
    return null;
  }

  async create(data: {
    donor_name: string;
    donor_type: DonorType;
    email?: string;
    phone?: string;
    organization_name?: string;
    amount: number;
    financial_account_id: string;
    payment_method: PaymentMethodType;
    reference_number?: string;
    donation_date?: string;
    purpose?: string;
    event_id?: string | null;
    created_by?: string;
  }): Promise<Donation> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: codeData, error: codeErr } = await supabaseClient.rpc('generate_donation_number');
      if (codeErr) throw new Error(codeErr.message);
      const donationNumber = codeData as string;

      const { data: created, error } = await supabaseClient
        .from('donations')
        .insert({
          donation_number: donationNumber,
          donor_name: data.donor_name,
          donor_type: data.donor_type,
          email: data.email || null,
          phone: data.phone || null,
          organization_name: data.organization_name || null,
          amount: data.amount,
          financial_account_id: data.financial_account_id,
          payment_method: data.payment_method,
          reference_number: data.reference_number || null,
          donation_date: data.donation_date || new Date().toISOString().split('T')[0],
          purpose: data.purpose || null,
          event_id: data.event_id || null,
          status: 'PENDING',
          created_by: data.created_by || null,
        })
        .select(`
          *,
          account:financial_accounts(name)
        `)
        .single();

      if (error) throw new Error(error.message);
      return created as Donation;
    }
    throw new Error('Database connection required');
  }

  async verify(donationId: string, userId: string): Promise<any> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('verify_donation', {
        p_donation_id: donationId,
        p_user_id: userId,
      });

      if (error) throw new Error(error.message);

      // Automatically post double-entry journal and voucher
      try {
        const { accountingEngine } = await import('../accounting/accounting.engine');
        await accountingEngine.postOperationalEvent('DONATION', donationId, userId);
      } catch (postErr) {
        console.warn('Accounting auto-posting deferred:', postErr);
      }

      return data;
    }
    throw new Error('Database connection required');
  }

  async reject(donationId: string, userId: string, reason: string): Promise<any> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.rpc('reject_donation', {
        p_donation_id: donationId,
        p_user_id: userId,
        p_reason: reason,
      });

      if (error) throw new Error(error.message);
      return data;
    }
    throw new Error('Database connection required');
  }
}

export const donationsRepository = new DonationsRepository();
