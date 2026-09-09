import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { Sponsor } from '../../types';

export class SponsorsRepository {
  async findAll(options: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Sponsor[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      let query = supabaseClient
        .from('sponsors')
        .select('*', { count: 'exact' });

      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,organization_name.ilike.%${options.search}%,sponsor_code.ilike.%${options.search}%`);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw new Error(error.message);

      return {
        data: (data || []) as Sponsor[],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    }

    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  async findById(id: string): Promise<Sponsor | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('sponsors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as Sponsor | null;
    }
    return null;
  }

  async create(data: {
    name: string;
    organization_name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    notes?: string;
    created_by?: string;
  }): Promise<Sponsor> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: codeData, error: codeErr } = await supabaseClient.rpc('generate_sponsor_code');
      if (codeErr) throw new Error(codeErr.message);
      const sponsorCode = codeData as string;

      const { data: created, error } = await supabaseClient
        .from('sponsors')
        .insert({
          sponsor_code: sponsorCode,
          name: data.name,
          organization_name: data.organization_name,
          contact_person: data.contact_person || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          website: data.website || null,
          notes: data.notes || null,
          status: 'ACTIVE',
          created_by: data.created_by || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return created as Sponsor;
    }
    throw new Error('Database connection required');
  }

  async update(id: string, data: Partial<Sponsor>): Promise<Sponsor | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: updated, error } = await supabaseClient
        .from('sponsors')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as Sponsor | null;
    }
    return null;
  }
}

export const sponsorsRepository = new SponsorsRepository();
