import { Pool } from 'pg';
import { env } from '../config/env';
import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase';
import { UserProfile, Role, Permission } from '../types';

let pgPool: Pool | null = null;
let isPgConnected = false;

if (env.DATABASE_URL && env.DATABASE_URL !== 'postgresql://postgres:postgres@localhost:5432/diu_investment_club') {
  try {
    pgPool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    pgPool.on('error', (err: Error) => {
      console.error('PostgreSQL Pool Error:', err);
    });
  } catch (err) {
    console.warn('Could not initialize PG Pool with provided DATABASE_URL:', err);
  }
}

// In-process memory store synchronized with DB to provide high-performance caching & fallback
class InMemoryStore {
  public roles: Map<string, Role> = new Map();
  public permissions: Map<string, Permission> = new Map();
  public rolePermissions: Set<string> = new Set(); // "role_id:permission_id"
  public profiles: Map<string, UserProfile & { password_hash?: string }> = new Map();
  public userRoles: Set<string> = new Set(); // "user_id:role_id"
  public userPermissions: Set<string> = new Set(); // "user_id:permission_id"

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    // 7 Default Roles
    const defaultRoles: Role[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Super Admin',
        slug: 'SUPER_ADMIN',
        description: 'Full system access and administration authority',
        is_system: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Treasurer',
        slug: 'TREASURER',
        description: 'Primary financial manager with access to accounts, income, expenses, and ledgers',
        is_system: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'President',
        slug: 'PRESIDENT',
        description: 'Club president with approval authority for budgets, expenses, and financial visibility',
        is_system: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'General Secretary',
        slug: 'GENERAL_SECRETARY',
        description: 'Executive officer who creates events, submits budget and expense requests',
        is_system: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Event Manager',
        slug: 'EVENT_MANAGER',
        description: 'Manages assigned events, budgets, expenses, and bills',
        is_system: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '66666666-6666-6666-6666-666666666666',
        name: 'Executive Member',
        slug: 'EXECUTIVE_MEMBER',
        description: 'Club executive who can submit personal expense reimbursement requests',
        is_system: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '77777777-7777-7777-7777-777777777777',
        name: 'Auditor',
        slug: 'AUDITOR',
        description: 'Independent finance advisor with read-only access to financial accounts, reports, and logs',
        is_system: true,
        created_at: new Date().toISOString(),
      },
    ];

    for (const r of defaultRoles) {
      this.roles.set(r.id, r);
    }

    // Default permissions
    const modules = [
      'dashboard', 'users', 'roles', 'financial_accounts', 'income',
      'expenses', 'transactions', 'events', 'budgets', 'members',
      'member_payments', 'approvals', 'accounting', 'reports',
      'documents', 'notifications', 'audit_logs', 'settings',
    ];
    const actions = ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];

    let permIndex = 100;
    for (const m of modules) {
      for (const a of actions) {
        permIndex++;
        const pId = `00000000-0000-0000-0000-${permIndex.toString(16).padStart(12, '0')}`;
        const perm: Permission = {
          id: pId,
          module: m,
          action: a,
          name: `${m.replace(/_/g, ' ')} ${a}`.replace(/\b\w/g, (c) => c.toUpperCase()),
          description: `Permission to ${a} in ${m.replace(/_/g, ' ')} module`,
          created_at: new Date().toISOString(),
        };
        this.permissions.set(perm.id, perm);

        // SUPER_ADMIN gets all permissions
        this.rolePermissions.add(`${defaultRoles[0].id}:${perm.id}`);

        // TREASURER
        if (
          ['dashboard', 'financial_accounts', 'income', 'expenses', 'transactions', 'budgets', 'member_payments', 'reports', 'documents', 'accounting'].includes(m)
        ) {
          this.rolePermissions.add(`${defaultRoles[1].id}:${perm.id}`);
        }

        // PRESIDENT
        if (
          ['dashboard', 'reports', 'approvals', 'events'].includes(m) ||
          (['expenses', 'budgets'].includes(m) && ['read', 'approve'].includes(a))
        ) {
          this.rolePermissions.add(`${defaultRoles[2].id}:${perm.id}`);
        }

        // GENERAL SECRETARY
        if (
          ['dashboard', 'events', 'budgets'].includes(m) ||
          (m === 'expenses' && ['create', 'read', 'update'].includes(a))
        ) {
          this.rolePermissions.add(`${defaultRoles[3].id}:${perm.id}`);
        }

        // EVENT MANAGER
        if (
          ['dashboard', 'events'].includes(m) ||
          (m === 'expenses' && ['create', 'read', 'update'].includes(a)) ||
          (m === 'documents' && ['create', 'read'].includes(a))
        ) {
          this.rolePermissions.add(`${defaultRoles[4].id}:${perm.id}`);
        }

        // EXECUTIVE MEMBER
        if (
          m === 'dashboard' ||
          (m === 'expenses' && ['create', 'read'].includes(a)) ||
          (m === 'documents' && ['create', 'read'].includes(a))
        ) {
          this.rolePermissions.add(`${defaultRoles[5].id}:${perm.id}`);
        }

        // AUDITOR (Read-only + export)
        if (
          ['read', 'export'].includes(a) &&
          ['dashboard', 'financial_accounts', 'income', 'expenses', 'transactions', 'accounting', 'reports', 'audit_logs'].includes(m)
        ) {
          this.rolePermissions.add(`${defaultRoles[6].id}:${perm.id}`);
        }
      }
    }
  }
}

export const store = new InMemoryStore();

export const queryDatabase = async (text: string, params: any[] = []) => {
  if (pgPool) {
    const client = await pgPool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }
  return null;
};
