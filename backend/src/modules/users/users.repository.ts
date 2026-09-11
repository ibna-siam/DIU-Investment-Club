import { store, queryDatabase } from '../../database/db';
import { UserProfile, Role, UserStatus, PaginatedResponse } from '../../types';
import { rolesRepository } from '../roles/roles.repository';
import { supabaseClient, supabaseAdmin, isSupabaseConfigured, getDbAdmin } from '../../config/supabase';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { invalidateAuthCache } from '../../middleware/auth.middleware';

export class UsersRepository {
  async findAll(params: {
    search?: string;
    status?: string;
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<UserProfile>> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const offset = (page - 1) * limit;

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('get_all_users', {
          p_search: params.search || null,
          p_status: params.status || null,
          p_role: params.role || null,
        });
        if (!error && Array.isArray(data)) {
          const total = data.length;
          const paged = data.slice(offset, offset + limit);
          return {
            data: paged,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          };
        }
      } catch (e) {}
    }

    let users: UserProfile[] = [];

    try {
      let sql = `
        SELECT p.*, 
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', r.id, 
                'name', r.name, 
                'slug', r.slug, 
                'description', r.description,
                'is_system', r.is_system
              )
            ) FILTER (WHERE r.id IS NOT NULL), '[]'
          ) as roles
        FROM public.profiles p
        LEFT JOIN public.user_roles ur ON p.id = ur.user_id
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.search) {
        sql += ` AND (p.full_name ILIKE $${paramIndex} OR p.email ILIKE $${paramIndex} OR p.student_id ILIKE $${paramIndex})`;
        queryParams.push(`%${params.search}%`);
        paramIndex++;
      }
      if (params.status) {
        sql += ` AND p.status = $${paramIndex}`;
        queryParams.push(params.status);
        paramIndex++;
      }

      sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;

      const res = await queryDatabase(sql, queryParams);
      if (res && res.rows.length > 0) {
        let rows = res.rows;
        if (params.role) {
          rows = rows.filter((u: any) =>
            u.roles.some((r: any) => r.slug === params.role || r.id === params.role)
          );
        }
        const total = rows.length;
        const paged = rows.slice(offset, offset + limit);
        return {
          data: paged,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    } catch (e) {}

    // Fallback to store
    let list = Array.from(store.profiles.values());

    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.student_id && u.student_id.toLowerCase().includes(q))
      );
    }

    if (params.status) {
      list = list.filter((u) => u.status === params.status);
    }

    // Populate roles for each user
    const hydratedList: UserProfile[] = [];
    for (const u of list) {
      const userRoles = await this.getUserRoles(u.id);
      hydratedList.push({
        ...u,
        roles: userRoles,
      });
    }

    let filtered = hydratedList;
    if (params.role) {
      filtered = hydratedList.filter((u) =>
        u.roles?.some((r) => r.slug === params.role || r.id === params.role)
      );
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return {
      data: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('get_user_by_id', {
          p_user_id: id,
        });
        if (!error && data) {
          return data as UserProfile;
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase('SELECT * FROM public.profiles WHERE id = $1', [id]);
      if (res && res.rows.length > 0) {
        const profile = res.rows[0];
        profile.roles = await this.getUserRoles(id);
        profile.permissions = await this.getUserPermissions(id);
        return profile;
      }
    } catch (e) {}

    const profile = store.profiles.get(id);
    if (!profile) return null;

    const roles = await this.getUserRoles(id);
    const permissions = await this.getUserPermissions(id);
    return {
      ...profile,
      roles,
      permissions,
    };
  }

  async findByEmail(email: string): Promise<(UserProfile & { password_hash?: string }) | null> {
    const normalized = email.toLowerCase().trim();
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('get_user_by_email', {
          p_email: normalized,
        });
        if (!error && data) {
          return data as UserProfile;
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase(
        `SELECT p.*, u.encrypted_password as password_hash 
         FROM public.profiles p
         LEFT JOIN auth.users u ON p.id = u.id
         WHERE LOWER(p.email) = $1`,
        [normalized]
      );
      if (res && res.rows.length > 0) {
        const profile = res.rows[0];
        profile.roles = await this.getUserRoles(profile.id);
        profile.permissions = await this.getUserPermissions(profile.id);
        return profile;
      }
    } catch (e) {}

    for (const u of store.profiles.values()) {
      if (u.email.toLowerCase().trim() === normalized) {
        const roles = await this.getUserRoles(u.id);
        const permissions = await this.getUserPermissions(u.id);
        return {
          ...u,
          roles,
          permissions,
        };
      }
    }
    return null;
  }

  async createUser(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string | null;
    student_id?: string | null;
    role_id?: string | null;
    status?: string;
    created_by?: string | null;
  }): Promise<UserProfile> {
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: res, error } = await supabaseClient.rpc('admin_create_user', {
        p_email: data.email,
        p_password: data.password,
        p_full_name: data.full_name,
        p_phone: data.phone || null,
        p_student_id: data.student_id || null,
        p_role_id: data.role_id || null,
        p_status: data.status || 'active',
        p_created_by: data.created_by || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (res) {
        const createdUser = res as UserProfile;
        store.profiles.set(createdUser.id, createdUser);
        if (data.role_id) {
          store.userRoles.add(`${createdUser.id}:${data.role_id}`);
        }
        return createdUser;
      }
    }

    // Fallback for non-Supabase environments
    const id = randomUUID();
    const hash = await bcrypt.hash(data.password, 10);
    const profile = await this.createProfile({
      id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      student_id: data.student_id,
      status: (data.status as any) || 'active',
      password_hash: hash,
    });

    if (data.role_id) {
      await this.assignRole(id, data.role_id);
    }

    const hydrated = await this.findById(id);
    return hydrated || profile;
  }

  async createProfile(data: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    student_id?: string | null;
    profile_image?: string | null;
    status?: UserStatus;
    password_hash?: string;
  }): Promise<UserProfile> {
    const profile: UserProfile & { password_hash?: string } = {
      id: data.id,
      full_name: data.full_name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone || null,
      student_id: data.student_id || null,
      profile_image: data.profile_image || null,
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      password_hash: data.password_hash,
    };

    try {
      await queryDatabase(
        `INSERT INTO public.profiles (id, full_name, email, phone, student_id, profile_image, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           student_id = EXCLUDED.student_id,
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [
          profile.id,
          profile.full_name,
          profile.email,
          profile.phone,
          profile.student_id,
          profile.profile_image,
          profile.status,
          profile.created_at,
          profile.updated_at,
        ]
      );
    } catch (e) {}

    store.profiles.set(profile.id, profile);
    return profile;
  }

  async updateProfile(id: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const updated: UserProfile = {
      ...current,
      full_name: data.full_name ?? current.full_name,
      phone: data.phone !== undefined ? data.phone : current.phone,
      student_id: data.student_id !== undefined ? data.student_id : current.student_id,
      profile_image: data.profile_image !== undefined ? data.profile_image : current.profile_image,
      status: data.status ?? current.status,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (data.full_name !== undefined) updatePayload.full_name = data.full_name;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        if (data.student_id !== undefined) updatePayload.student_id = data.student_id;
        if (data.profile_image !== undefined) updatePayload.profile_image = data.profile_image;
        if (data.status !== undefined) updatePayload.status = data.status;

        await getDbAdmin().from('profiles').update(updatePayload).eq('id', id);
      } catch (err: any) {
        console.warn('⚠️ [UsersRepository] Supabase updateProfile failed:', err.message);
      }
    }

    try {
      await queryDatabase(
        `UPDATE public.profiles
         SET full_name = COALESCE($2, full_name),
             phone = COALESCE($3, phone),
             student_id = COALESCE($4, student_id),
             profile_image = COALESCE($5, profile_image),
             status = COALESCE($6, status),
             updated_at = NOW()
         WHERE id = $1`,
        [id, data.full_name, data.phone, data.student_id, data.profile_image, data.status]
      );
    } catch (e) {}

    const stored = store.profiles.get(id);
    if (stored) {
      store.profiles.set(id, { ...stored, ...updated });
    }

    invalidateAuthCache(id);
    return this.findById(id);
  }

  async updateStatus(id: string, status: UserStatus): Promise<UserProfile | null> {
    invalidateAuthCache(id);
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('update_user_status', {
          p_user_id: id,
          p_status: status,
        });
        if (!error && data) {
          return data as UserProfile;
        }
      } catch (e) {}
    }
    return this.updateProfile(id, { status });
  }

  async assignRole(userId: string, roleId: string): Promise<boolean> {
    invalidateAuthCache(userId);
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        await supabaseClient.rpc('assign_role_to_user', {
          p_user_id: userId,
          p_role_id: roleId,
        });
        return true;
      } catch (e) {}
    }

    try {
      await queryDatabase(
        'INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleId]
      );
    } catch (e) {}

    store.userRoles.add(`${userId}:${roleId}`);
    return true;
  }

  async removeRole(userId: string, roleId: string): Promise<boolean> {
    invalidateAuthCache(userId);
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        await supabaseClient.rpc('remove_role_from_user', {
          p_user_id: userId,
          p_role_id: roleId,
        });
        return true;
      } catch (e) {}
    }

    try {
      await queryDatabase('DELETE FROM public.user_roles WHERE user_id = $1 AND role_id = $2', [
        userId,
        roleId,
      ]);
    } catch (e) {}

    store.userRoles.delete(`${userId}:${roleId}`);
    return true;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const res = await queryDatabase(
        `SELECT r.* 
         FROM public.roles r
         JOIN public.user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );
      if (res && res.rows.length > 0) {
        return res.rows;
      }
    } catch (e) {}

    const userRoles: Role[] = [];
    for (const urKey of store.userRoles) {
      const [uId, rId] = urKey.split(':');
      if (uId === userId) {
        let r = store.roles.get(rId);
        if (!r) {
          try {
            const found = await rolesRepository.findById(rId);
            if (found) r = found;
          } catch {}
        }
        if (r) userRoles.push(r);
      }
    }
    return userRoles;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const roles = await this.getUserRoles(userId);
    const permSet = new Set<string>();

    for (const r of roles) {
      if (r.slug === 'SUPER_ADMIN') {
        return ['*'];
      }
      const rolePerms = await rolesRepository.getPermissionsForRole(r.id);
      for (const p of rolePerms) {
        permSet.add(`${p.module}.${p.action}`);
      }
    }

    // Include user-specific direct permission overrides
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('user_permissions')
          .select('permission:permissions(module, action)')
          .eq('user_id', userId);

        if (data && data.length > 0) {
          for (const item of data as any[]) {
            if (item.permission) {
              permSet.add(`${item.permission.module}.${item.permission.action}`);
            }
          }
        }
      } catch (e) {}
    }

    try {
      const userDirect = await queryDatabase(
        `SELECT p.module, p.action 
         FROM public.user_permissions up
         JOIN public.permissions p ON up.permission_id = p.id
         WHERE up.user_id = $1`,
        [userId]
      );
      if (userDirect && userDirect.rows && userDirect.rows.length > 0) {
        for (const row of userDirect.rows) {
          permSet.add(`${row.module}.${row.action}`);
        }
      }
    } catch (e) {}

    // In-memory fallback
    for (const entry of store.userPermissions) {
      const [uId, pId] = entry.split(':');
      if (uId === userId) {
        const perm = store.permissions.get(pId);
        if (perm) {
          permSet.add(`${perm.module}.${perm.action}`);
        }
      }
    }

    return Array.from(permSet);
  }

  async getUserDirectPermissions(userId: string): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('user_permissions')
          .select('permission_id, created_at, granted_by, permission:permissions(id, module, action, name, description)')
          .eq('user_id', userId);

        if (!error && data && data.length > 0) {
          return (data as any[]).map((row) => ({
            id: row.permission?.id || row.permission_id,
            module: row.permission?.module,
            action: row.permission?.action,
            name: row.permission?.name,
            description: row.permission?.description,
            created_at: row.created_at,
            granted_by: row.granted_by,
          }));
        }
      } catch (e) {}
    }

    try {
      const res = await queryDatabase(
        `SELECT p.id, p.module, p.action, p.name, p.description, up.created_at, up.granted_by
         FROM public.user_permissions up
         JOIN public.permissions p ON up.permission_id = p.id
         WHERE up.user_id = $1
         ORDER BY p.module, p.action`,
        [userId]
      );
      if (res && res.rows && res.rows.length > 0) {
        return res.rows;
      }
    } catch (e) {}

    // In-memory fallback
    const result: any[] = [];
    for (const entry of store.userPermissions) {
      const [uId, pId] = entry.split(':');
      if (uId === userId) {
        const perm = store.permissions.get(pId);
        if (perm) {
          result.push({
            id: perm.id,
            module: perm.module,
            action: perm.action,
            name: perm.name,
            description: perm.description,
            created_at: new Date().toISOString(),
            granted_by: null,
          });
        }
      }
    }
    return result;
  }

  async assignUserPermission(userId: string, permissionId: string, grantedBy?: string): Promise<boolean> {
    store.userPermissions.add(`${userId}:${permissionId}`);
    invalidateAuthCache(userId);

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const payload: any = { user_id: userId, permission_id: permissionId };
        if (grantedBy) payload.granted_by = grantedBy;
        const { error } = await supabaseClient
          .from('user_permissions')
          .insert(payload);

        if (error) {
          await supabaseClient
            .from('user_permissions')
            .insert({ user_id: userId, permission_id: permissionId });
        }
      } catch (e) {}
    }

    try {
      await queryDatabase(
        `INSERT INTO public.user_permissions (user_id, permission_id, granted_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, permission_id) DO NOTHING`,
        [userId, permissionId, grantedBy || null]
      );
    } catch (e) {}

    return true;
  }

  async removeUserPermission(userId: string, permissionId: string): Promise<boolean> {
    store.userPermissions.delete(`${userId}:${permissionId}`);
    invalidateAuthCache(userId);

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        await supabaseClient
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_id', permissionId);
      } catch (e) {}
    }

    try {
      await queryDatabase(
        `DELETE FROM public.user_permissions 
         WHERE user_id = $1 AND permission_id = $2`,
        [userId, permissionId]
      );
    } catch (e) {}

    return true;
  }

  async getStats(): Promise<{
    activeUsers: number;
    totalUsers: number;
    totalRoles: number;
    systemStatus: 'Operational' | 'Maintenance' | 'Degraded';
    roleDistribution: Record<string, number>;
  }> {
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('get_dashboard_stats');
        const roles = await rolesRepository.findAll();
        if (!error && data) {
          return {
            activeUsers: data.active_users || 0,
            totalUsers: data.total_users || 0,
            totalRoles: data.total_roles || roles.length,
            systemStatus: 'Operational',
            roleDistribution: {},
          };
        }
      } catch (e) {}
    }

    const allUsers = Array.from(store.profiles.values());
    const activeCount = allUsers.filter((u) => u.status === 'active').length;
    const roles = await rolesRepository.findAll();

    const roleDist: Record<string, number> = {};
    for (const r of roles) {
      roleDist[r.name] = 0;
    }

    for (const urKey of store.userRoles) {
      const [, rId] = urKey.split(':');
      const r = store.roles.get(rId);
      if (r && roleDist[r.name] !== undefined) {
        roleDist[r.name]++;
      }
    }

    return {
      activeUsers: activeCount,
      totalUsers: allUsers.length,
      totalRoles: roles.length,
      systemStatus: 'Operational',
      roleDistribution: roleDist,
    };
  }

  /**
   * Inspect all foreign key and audit/financial dependencies for a user.
   */
  async inspectUserDependencies(userId: string): Promise<{
    hasFinancialHistory: boolean;
    hasAuditLogs: boolean;
    hasMemberRecord: boolean;
    hasOtherDependencies: boolean;
    details: {
      dependencyCount: number;
      tablesWithData: string[];
      transactionsCount: number;
      expensesCount: number;
      incomesCount: number;
      journalEntriesCount: number;
      vouchersCount: number;
      financialAccountsCount: number;
      bankReconciliationsCount: number;
      auditLogsCount: number;
      approvalRequestsCount: number;
      eventsCount: number;
      isMemberLinked: boolean;
    };
  }> {
    const details = {
      dependencyCount: 0,
      tablesWithData: [] as string[],
      transactionsCount: 0,
      expensesCount: 0,
      incomesCount: 0,
      journalEntriesCount: 0,
      vouchersCount: 0,
      financialAccountsCount: 0,
      bankReconciliationsCount: 0,
      auditLogsCount: 0,
      approvalRequestsCount: 0,
      eventsCount: 0,
      isMemberLinked: false,
    };

    if (isSupabaseConfigured() && supabaseClient) {
      try {
        const [
          txRes,
          expRes,
          incRes,
          jRes,
          vRes,
          faRes,
          bankRes,
          auditRes,
          appRes,
          evRes,
          memRes,
        ] = await Promise.all([
          supabaseClient.from('financial_transactions').select('id', { count: 'exact', head: true }).eq('created_by', userId),
          supabaseClient.from('expenses').select('id', { count: 'exact', head: true }).or(`requested_by.eq.${userId},paid_by.eq.${userId}`),
          supabaseClient.from('incomes').select('id', { count: 'exact', head: true }).eq('created_by', userId),
          supabaseClient.from('journal_entries').select('id', { count: 'exact', head: true }).or(`created_by.eq.${userId},posted_by.eq.${userId},reversed_by.eq.${userId}`),
          supabaseClient.from('vouchers').select('id', { count: 'exact', head: true }).or(`prepared_by.eq.${userId},approved_by.eq.${userId}`),
          supabaseClient.from('financial_accounts').select('id', { count: 'exact', head: true }).eq('created_by', userId),
          supabaseClient.from('bank_reconciliations').select('id', { count: 'exact', head: true }).or(`created_by.eq.${userId},verified_by.eq.${userId},approved_by.eq.${userId}`),
          supabaseClient.from('audit_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabaseClient.from('approval_requests').select('id', { count: 'exact', head: true }).eq('requested_by', userId),
          supabaseClient.from('events').select('id', { count: 'exact', head: true }).eq('created_by', userId),
          supabaseClient.from('members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        ]);

        details.transactionsCount = txRes.count || 0;
        details.expensesCount = expRes.count || 0;
        details.incomesCount = incRes.count || 0;
        details.journalEntriesCount = jRes.count || 0;
        details.vouchersCount = vRes.count || 0;
        details.financialAccountsCount = faRes.count || 0;
        details.bankReconciliationsCount = bankRes.count || 0;
        details.auditLogsCount = auditRes.count || 0;
        details.approvalRequestsCount = appRes.count || 0;
        details.eventsCount = evRes.count || 0;
        details.isMemberLinked = (memRes.count || 0) > 0;
      } catch (e) {}
    }

    try {
      const dbRes = await queryDatabase(
        `SELECT 
          (SELECT COUNT(*) FROM public.financial_transactions WHERE created_by = $1) as tx_cnt,
          (SELECT COUNT(*) FROM public.expenses WHERE requested_by = $1 OR paid_by = $1) as exp_cnt,
          (SELECT COUNT(*) FROM public.incomes WHERE created_by = $1) as inc_cnt,
          (SELECT COUNT(*) FROM public.journal_entries WHERE created_by = $1 OR posted_by = $1 OR reversed_by = $1) as j_cnt,
          (SELECT COUNT(*) FROM public.vouchers WHERE prepared_by = $1 OR approved_by = $1) as v_cnt,
          (SELECT COUNT(*) FROM public.financial_accounts WHERE created_by = $1) as fa_cnt,
          (SELECT COUNT(*) FROM public.bank_reconciliations WHERE created_by = $1 OR verified_by = $1 OR approved_by = $1) as bank_cnt,
          (SELECT COUNT(*) FROM public.audit_logs WHERE user_id = $1) as audit_cnt,
          (SELECT COUNT(*) FROM public.approval_requests WHERE requested_by = $1) as app_cnt,
          (SELECT COUNT(*) FROM public.events WHERE created_by = $1) as ev_cnt,
          (SELECT COUNT(*) FROM public.members WHERE user_id = $1) as mem_cnt`,
        [userId]
      );
      if (dbRes && dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        details.transactionsCount = Math.max(details.transactionsCount, parseInt(row.tx_cnt || '0', 10));
        details.expensesCount = Math.max(details.expensesCount, parseInt(row.exp_cnt || '0', 10));
        details.incomesCount = Math.max(details.incomesCount, parseInt(row.inc_cnt || '0', 10));
        details.journalEntriesCount = Math.max(details.journalEntriesCount, parseInt(row.j_cnt || '0', 10));
        details.vouchersCount = Math.max(details.vouchersCount, parseInt(row.v_cnt || '0', 10));
        details.financialAccountsCount = Math.max(details.financialAccountsCount, parseInt(row.fa_cnt || '0', 10));
        details.bankReconciliationsCount = Math.max(details.bankReconciliationsCount, parseInt(row.bank_cnt || '0', 10));
        details.auditLogsCount = Math.max(details.auditLogsCount, parseInt(row.audit_cnt || '0', 10));
        details.approvalRequestsCount = Math.max(details.approvalRequestsCount, parseInt(row.app_cnt || '0', 10));
        details.eventsCount = Math.max(details.eventsCount, parseInt(row.ev_cnt || '0', 10));
        details.isMemberLinked = details.isMemberLinked || parseInt(row.mem_cnt || '0', 10) > 0;
      }
    } catch (e) {}

    const tables: string[] = [];
    if (details.transactionsCount > 0) tables.push('financial_transactions');
    if (details.expensesCount > 0) tables.push('expenses');
    if (details.incomesCount > 0) tables.push('incomes');
    if (details.journalEntriesCount > 0) tables.push('journal_entries');
    if (details.vouchersCount > 0) tables.push('vouchers');
    if (details.financialAccountsCount > 0) tables.push('financial_accounts');
    if (details.bankReconciliationsCount > 0) tables.push('bank_reconciliations');
    if (details.auditLogsCount > 0) tables.push('audit_logs');
    if (details.approvalRequestsCount > 0) tables.push('approval_requests');
    if (details.eventsCount > 0) tables.push('events');
    if (details.isMemberLinked) tables.push('members');

    details.tablesWithData = tables;
    details.dependencyCount =
      details.transactionsCount +
      details.expensesCount +
      details.incomesCount +
      details.journalEntriesCount +
      details.vouchersCount +
      details.financialAccountsCount +
      details.bankReconciliationsCount +
      details.auditLogsCount +
      details.approvalRequestsCount +
      details.eventsCount +
      (details.isMemberLinked ? 1 : 0);

    const hasFinancialHistory =
      details.transactionsCount > 0 ||
      details.expensesCount > 0 ||
      details.incomesCount > 0 ||
      details.journalEntriesCount > 0 ||
      details.vouchersCount > 0 ||
      details.financialAccountsCount > 0 ||
      details.bankReconciliationsCount > 0;

    const hasAuditLogs = details.auditLogsCount > 0;
    const hasMemberRecord = details.isMemberLinked;
    const hasOtherDependencies = details.approvalRequestsCount > 0 || details.eventsCount > 0;

    return {
      hasFinancialHistory,
      hasAuditLogs,
      hasMemberRecord,
      hasOtherDependencies,
      details,
    };
  }

  /**
   * Safe user deletion / deactivation workflow with strict financial integrity protection.
   */
  async deleteUser(
    userId: string,
    requestingUser?: UserProfile,
    options?: { forceDeactivate?: boolean }
  ): Promise<{
    action: 'deleted' | 'deactivated';
    message: string;
    details: { dependencyCount: number; tablesWithData: string[] };
    dependencies: any;
    user?: UserProfile | null;
  }> {
    // 1. Guard against deleting self
    if (requestingUser && requestingUser.id === userId) {
      throw new Error('You cannot delete your own user account. Please contact another Super Administrator.');
    }

    // 2. Guard against deleting the only active Super Admin
    const targetUser = await this.findById(userId);
    if (!targetUser) {
      throw new Error('User does not exist.');
    }

    const isTargetSuperAdmin = targetUser.roles?.some((r) => r.slug === 'SUPER_ADMIN');
    if (isTargetSuperAdmin) {
      const allAdmins = await this.findAll({ role: 'SUPER_ADMIN', status: 'active', limit: 5 });
      if (allAdmins.total <= 1) {
        throw new Error('Security Guard: Cannot delete the only remaining active Super Administrator in the system.');
      }
    }

    // 3. Inspect dependencies
    const deps = await this.inspectUserDependencies(userId);
    const hasDependencies =
      deps.hasFinancialHistory ||
      deps.hasAuditLogs ||
      deps.hasMemberRecord ||
      deps.hasOtherDependencies ||
      deps.details.dependencyCount > 0;

    // 4. If user has dependencies or forceDeactivate requested: Safely deactivate to maintain data integrity
    if (hasDependencies || options?.forceDeactivate) {
      await this.updateStatus(userId, 'inactive');

      // Strip sensitive user roles to revoke privileges
      if (isSupabaseConfigured() && supabaseClient) {
        try {
          await supabaseClient.from('user_roles').delete().eq('user_id', userId);
        } catch (e) {}
      }
      for (const ur of Array.from(store.userRoles)) {
        if (ur.startsWith(`${userId}:`)) {
          store.userRoles.delete(ur);
        }
      }

      // Invalidate session cache
      invalidateAuthCache(userId);

      // Disable Supabase Auth login if configured
      if (isSupabaseConfigured() && supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
        } catch (e) {}
      }

      const updated = await this.findById(userId);

      return {
        action: 'deactivated',
        user: updated,
        message: 'Account safely deactivated. Financial history and audit records have been preserved for accounting integrity.',
        details: {
          dependencyCount: deps.details.dependencyCount,
          tablesWithData: deps.details.tablesWithData,
        },
        dependencies: deps.details,
      };
    }

    // 5. User has NO financial history or audit logs: Proceed with clean permanent deletion
    try {
      if (isSupabaseConfigured() && supabaseClient) {
        try {
          const { error: rpcErr } = await supabaseClient.rpc('admin_delete_user', { p_user_id: userId });
          if (rpcErr) {
            await supabaseClient.from('user_roles').delete().eq('user_id', userId);
            await supabaseClient.from('user_permissions').delete().eq('user_id', userId);
            await supabaseClient.from('notifications').delete().eq('user_id', userId);
            await supabaseClient.from('members').update({ user_id: null }).eq('user_id', userId);
            await supabaseClient.from('profiles').delete().eq('id', userId);
          }
        } catch (e) {}
      }

      await queryDatabase('DELETE FROM public.user_roles WHERE user_id = $1', [userId]);
      await queryDatabase('DELETE FROM public.user_permissions WHERE user_id = $1', [userId]);
      await queryDatabase('DELETE FROM public.notifications WHERE user_id = $1', [userId]);
      await queryDatabase('UPDATE public.members SET user_id = NULL WHERE user_id = $1', [userId]);
      await queryDatabase('DELETE FROM public.profiles WHERE id = $1', [userId]);

      // Store cleanup
      store.profiles.delete(userId);
      for (const ur of Array.from(store.userRoles)) {
        if (ur.startsWith(`${userId}:`)) store.userRoles.delete(ur);
      }
      for (const up of Array.from(store.userPermissions)) {
        if (up.startsWith(`${userId}:`)) store.userPermissions.delete(up);
      }

      // Supabase Auth deletion
      if (isSupabaseConfigured() && supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (e) {}
      }

      invalidateAuthCache(userId);

      return {
        action: 'deleted',
        message: 'User permanently deleted successfully.',
        details: {
          dependencyCount: 0,
          tablesWithData: [],
        },
        dependencies: deps.details,
      };
    } catch (err: any) {
      // Graceful fallback: If an unexpected foreign key constraint is encountered, safely deactivate
      console.warn(`[UsersRepository] Hard delete encountered constraint error for user ${userId}, falling back to safe deactivation:`, err?.message || err);
      await this.updateStatus(userId, 'inactive');
      invalidateAuthCache(userId);

      if (isSupabaseConfigured() && supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
        } catch (e) {}
      }

      const updated = await this.findById(userId);

      return {
        action: 'deactivated',
        user: updated,
        message: 'Account safely deactivated. System records linked to this account were preserved to prevent ledger and database corruption.',
        details: {
          dependencyCount: deps.details.dependencyCount || 1,
          tablesWithData: deps.details.tablesWithData.length > 0 ? deps.details.tablesWithData : ['system_history'],
        },
        dependencies: deps.details,
      };
    }
  }
}

export const usersRepository = new UsersRepository();
