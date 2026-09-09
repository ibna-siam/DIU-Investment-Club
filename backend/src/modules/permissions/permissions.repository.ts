import { store, queryDatabase } from '../../database/db';
import { Permission } from '../../types';
import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';

export class PermissionsRepository {
  async findAll(): Promise<Permission[]> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('permissions')
          .select('*')
          .order('module', { ascending: true })
          .order('action', { ascending: true });
        if (!error && data && data.length > 0) {
          return data as Permission[];
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase('SELECT * FROM public.permissions ORDER BY module ASC, action ASC');
      if (res && res.rows.length > 0) {
        return res.rows;
      }
    } catch (e) {}
    return Array.from(store.permissions.values());
  }

  async findModules(): Promise<Record<string, Permission[]>> {
    const all = await this.findAll();
    const grouped: Record<string, Permission[]> = {};

    for (const perm of all) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    }
    return grouped;
  }
}

export const permissionsRepository = new PermissionsRepository();
