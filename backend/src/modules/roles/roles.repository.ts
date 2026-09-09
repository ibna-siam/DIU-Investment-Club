import { store, queryDatabase } from '../../database/db';
import { Role, Permission } from '../../types';
import { randomUUID } from 'crypto';
import { supabaseClient, isSupabaseConfigured } from '../../config/supabase';

let cachedRoles: Role[] | null = null;
let rolesCachedAt = 0;
const ROLES_CACHE_TTL_MS = 60 * 1000;

export const invalidateRolesCache = () => {
  cachedRoles = null;
  rolesCachedAt = 0;
};

export class RolesRepository {
  async findAll(): Promise<Role[]> {
    if (cachedRoles && Date.now() - rolesCachedAt < ROLES_CACHE_TTL_MS) {
      return cachedRoles;
    }

    let result: Role[] = [];

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('roles')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          result = data as Role[];
          cachedRoles = result;
          rolesCachedAt = Date.now();
          return result;
        }
      } catch (e) {}
    }

    // Attempt DB query if active
    try {
      const res = await queryDatabase('SELECT * FROM public.roles ORDER BY created_at ASC');
      if (res && res.rows.length > 0) {
        result = res.rows;
        cachedRoles = result;
        rolesCachedAt = Date.now();
        return result;
      }
    } catch (e) {
      // Fallback to store
    }

    result = Array.from(store.roles.values());
    cachedRoles = result;
    rolesCachedAt = Date.now();
    return result;
  }

  async findById(id: string): Promise<Role | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('roles')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) {
          return data as Role;
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase('SELECT * FROM public.roles WHERE id = $1', [id]);
      if (res && res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (e) {}
    return store.roles.get(id) || null;
  }

  async findBySlug(slug: string): Promise<Role | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('roles')
          .select('*')
          .ilike('slug', slug)
          .maybeSingle();
        if (!error && data) {
          return data as Role;
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase('SELECT * FROM public.roles WHERE slug = $1', [slug]);
      if (res && res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (e) {}
    for (const role of store.roles.values()) {
      if (role.slug.toUpperCase() === slug.toUpperCase()) {
        return role;
      }
    }
    return null;
  }

  async create(data: { name: string; slug: string; description: string }): Promise<Role> {
    const id = randomUUID();
    const newRole: Role = {
      id,
      name: data.name,
      slug: data.slug.toUpperCase().replace(/\s+/g, '_'),
      description: data.description,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data: created, error } = await supabaseClient
          .from('roles')
          .insert(newRole)
          .select()
          .single();
        if (!error && created) {
          store.roles.set(id, created as Role);
          invalidateRolesCache();
          return created as Role;
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase(
        'INSERT INTO public.roles (id, name, slug, description, is_system) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [newRole.id, newRole.name, newRole.slug, newRole.description, newRole.is_system]
      );
      if (res && res.rows.length > 0) {
        store.roles.set(id, res.rows[0]);
        invalidateRolesCache();
        return res.rows[0];
      }
    } catch (e) {}

    store.roles.set(id, newRole);
    invalidateRolesCache();
    return newRole;
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Role | null> {
    const role = await this.findById(id);
    if (!role) return null;

    const updated: Role = {
      ...role,
      name: data.name ?? role.name,
      description: data.description ?? role.description,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data: updatedSupabase, error } = await supabaseClient
          .from('roles')
          .update({
            name: data.name ?? role.name,
            description: data.description ?? role.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
        if (!error && updatedSupabase) {
          store.roles.set(id, updatedSupabase as Role);
          invalidateRolesCache();
          return updatedSupabase as Role;
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase(
        'UPDATE public.roles SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = NOW() WHERE id = $1 RETURNING *',
        [id, data.name, data.description]
      );
      if (res && res.rows.length > 0) {
        store.roles.set(id, res.rows[0]);
        invalidateRolesCache();
        return res.rows[0];
      }
    } catch (e) {}

    store.roles.set(id, updated);
    invalidateRolesCache();
    return updated;
  }

  async delete(id: string): Promise<{ success: boolean; message?: string }> {
    const role = await this.findById(id);
    if (!role) {
      return { success: false, message: 'Role not found' };
    }
    if (role.is_system) {
      return { success: false, message: 'System roles cannot be deleted' };
    }

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        await supabaseClient.from('role_permissions').delete().eq('role_id', id);
        await supabaseClient.from('user_roles').delete().eq('role_id', id);
        await supabaseClient.from('roles').delete().eq('id', id).eq('is_system', false);
      } catch (e) {}
    }

    try {
      await queryDatabase('DELETE FROM public.roles WHERE id = $1 AND is_system = FALSE', [id]);
    } catch (e) {}

    store.roles.delete(id);
    invalidateRolesCache();
    // remove junction associations
    for (const key of Array.from(store.rolePermissions)) {
      if (key.startsWith(`${id}:`)) {
        store.rolePermissions.delete(key);
      }
    }
    for (const key of Array.from(store.userRoles)) {
      if (key.endsWith(`:${id}`)) {
        store.userRoles.delete(key);
      }
    }

    return { success: true };
  }

  async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('role_permissions')
          .select('permission_id, permissions(*)')
          .eq('role_id', roleId);
        if (!error && data && data.length > 0) {
          const perms: Permission[] = [];
          for (const item of data as any[]) {
            if (item.permissions) {
              perms.push(item.permissions as Permission);
            }
          }
          return perms;
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase(
        `SELECT p.* 
         FROM public.permissions p
         JOIN public.role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [roleId]
      );
      if (res && res.rows.length > 0) {
        return res.rows;
      }
    } catch (e) {}

    const permissions: Permission[] = [];
    for (const rpKey of store.rolePermissions) {
      const [rId, pId] = rpKey.split(':');
      if (rId === roleId) {
        const p = store.permissions.get(pId);
        if (p) permissions.push(p);
      }
    }
    return permissions;
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<Permission[]> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { error } = await supabaseClient.rpc('update_role_permissions', {
          p_role_id: roleId,
          p_permission_ids: permissionIds,
        });
        if (!error) {
          invalidateRolesCache();
          return this.getPermissionsForRole(roleId);
        }
      } catch (e) {}

      try {
        await supabaseClient.from('role_permissions').delete().eq('role_id', roleId);
        if (permissionIds.length > 0) {
          const rows = permissionIds.map((pId) => ({
            role_id: roleId,
            permission_id: pId,
          }));
          await supabaseClient.from('role_permissions').insert(rows);
        }
        invalidateRolesCache();
        return this.getPermissionsForRole(roleId);
      } catch (e) {}
    }

    try {
      await queryDatabase('DELETE FROM public.role_permissions WHERE role_id = $1', [roleId]);
      for (const pId of permissionIds) {
        await queryDatabase(
          'INSERT INTO public.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roleId, pId]
        );
      }
    } catch (e) {}

    // Clean store
    for (const rpKey of Array.from(store.rolePermissions)) {
      if (rpKey.startsWith(`${roleId}:`)) {
        store.rolePermissions.delete(rpKey);
      }
    }
    // Re-insert
    for (const pId of permissionIds) {
      if (store.permissions.has(pId)) {
        store.rolePermissions.add(`${roleId}:${pId}`);
      }
    }

    invalidateRolesCache();
    return this.getPermissionsForRole(roleId);
  }
}

export const rolesRepository = new RolesRepository();
