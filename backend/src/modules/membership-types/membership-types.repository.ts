import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { MembershipType } from '../../types';

export class MembershipTypesRepository {
  async findAll(): Promise<MembershipType[]> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('membership_types')
        .select('*')
        .order('joining_fee', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as MembershipType[];
    }
    return [];
  }

  async findById(id: string): Promise<MembershipType | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('membership_types')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as MembershipType | null;
    }
    return null;
  }

  async create(data: {
    name: string;
    description?: string | null;
    joining_fee: number;
    renewal_fee: number;
    billing_cycle: string;
    is_active?: boolean;
  }): Promise<MembershipType> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: created, error } = await supabaseClient
        .from('membership_types')
        .insert({
          name: data.name,
          description: data.description || null,
          joining_fee: data.joining_fee,
          renewal_fee: data.renewal_fee,
          billing_cycle: data.billing_cycle,
          is_active: data.is_active !== undefined ? data.is_active : true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505' && error.message.includes('membership_types_name_key')) {
          throw new Error(`A membership tier named "${data.name}" already exists.`);
        }
        throw new Error(error.message);
      }
      return created as MembershipType;
    }
    throw new Error('Database connection required');
  }

  async update(id: string, data: Partial<MembershipType>): Promise<MembershipType | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: updated, error } = await supabaseClient
        .from('membership_types')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated as MembershipType | null;
    }
    return null;
  }

  async delete(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { count } = await supabaseClient
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_type_id', id);

      if (count && count > 0) {
        throw new Error('Cannot delete membership type because active or enrolled members exist under this tier. Deactivate the tier or reassign members.');
      }

      const { error } = await supabaseClient
        .from('membership_types')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    }
    return false;
  }
}

export const membershipTypesRepository = new MembershipTypesRepository();
