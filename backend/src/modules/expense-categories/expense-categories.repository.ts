import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { ExpenseCategory } from '../../types';

export class ExpenseCategoriesRepository {
  async findAll(): Promise<ExpenseCategory[]> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('expense_categories')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) {
        return data as ExpenseCategory[];
      }
    }
    return [];
  }

  async findById(id: string): Promise<ExpenseCategory | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('expense_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) {
        return data as ExpenseCategory;
      }
    }
    return null;
  }

  async create(data: { name: string; description?: string; created_by?: string }): Promise<ExpenseCategory> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: created, error } = await supabaseClient
        .from('expense_categories')
        .insert({
          name: data.name,
          description: data.description || null,
          created_by: data.created_by || null,
          status: 'ACTIVE',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return created as ExpenseCategory;
    }
    throw new Error('Database connection required');
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<ExpenseCategory | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: updated, error } = await supabaseClient
        .from('expense_categories')
        .update({
          ...(data.name ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (!error && updated) return updated as ExpenseCategory;
    }
    return null;
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ExpenseCategory | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: updated, error } = await supabaseClient
        .from('expense_categories')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && updated) return updated as ExpenseCategory;
    }
    return null;
  }

  async delete(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { count } = await supabaseClient
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

      if (count && count > 0) {
        throw new Error('Cannot delete category because it is assigned to existing expense transactions. Deactivate the category instead.');
      }

      const { error } = await supabaseClient
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return true;
    }
    return false;
  }
}

export const expenseCategoriesRepository = new ExpenseCategoriesRepository();
