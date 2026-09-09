-- ====================================================================
-- DIU INVESTMENT CLUB FINANCIAL MANAGEMENT SYSTEM
-- DATABASE SEED DATA: PHASE 1 (Roles, Permissions, and Default RBAC)
-- ====================================================================

-- 1. INSERT DEFAULT ROLES
INSERT INTO public.roles (name, slug, description, is_system) VALUES
('Super Admin', 'SUPER_ADMIN', 'Full system access and administration authority', TRUE),
('Treasurer', 'TREASURER', 'Primary financial manager with access to accounts, income, expenses, and ledgers', TRUE),
('President', 'PRESIDENT', 'Club president with approval authority for budgets, expenses, and financial visibility', TRUE),
('General Secretary', 'GENERAL_SECRETARY', 'Executive officer who creates events, submits budget and expense requests', TRUE),
('Event Manager', 'EVENT_MANAGER', 'Manages assigned events, budgets, expenses, and bills', TRUE),
('Executive Member', 'EXECUTIVE_MEMBER', 'Club executive who can submit personal expense reimbursement requests', TRUE),
('Auditor', 'AUDITOR', 'Independent finance advisor with read-only access to financial accounts, reports, and logs', TRUE)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description, is_system = EXCLUDED.is_system;

-- 2. INSERT DEFAULT PERMISSIONS ACROSS ALL MODULES
DO $$
DECLARE
    modules TEXT[] := ARRAY[
        'dashboard', 'users', 'roles', 'financial_accounts', 'income', 
        'expenses', 'transactions', 'events', 'budgets', 'members', 
        'member_payments', 'approvals', 'accounting', 'reports', 
        'documents', 'notifications', 'audit_logs', 'settings'
    ];
    actions TEXT[] := ARRAY['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];
    m TEXT;
    a TEXT;
    perm_name TEXT;
    perm_desc TEXT;
BEGIN
    FOREACH m IN ARRAY modules LOOP
        FOREACH a IN ARRAY actions LOOP
            perm_name := INITCAP(REPLACE(m, '_', ' ')) || ' ' || INITCAP(a);
            perm_desc := 'Allows user to ' || a || ' in the ' || REPLACE(m, '_', ' ') || ' module';
            
            INSERT INTO public.permissions (module, action, name, description)
            VALUES (m, a, perm_name, perm_desc)
            ON CONFLICT (module, action) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 3. ASSIGN DEFAULT PERMISSIONS TO ROLES
DO $$
DECLARE
    role_super_admin UUID;
    role_treasurer UUID;
    role_president UUID;
    role_sec_gen UUID;
    role_event_mgr UUID;
    role_exec_mem UUID;
    role_auditor UUID;
BEGIN
    SELECT id INTO role_super_admin FROM public.roles WHERE slug = 'SUPER_ADMIN';
    SELECT id INTO role_treasurer FROM public.roles WHERE slug = 'TREASURER';
    SELECT id INTO role_president FROM public.roles WHERE slug = 'PRESIDENT';
    SELECT id INTO role_sec_gen FROM public.roles WHERE slug = 'GENERAL_SECRETARY';
    SELECT id INTO role_event_mgr FROM public.roles WHERE slug = 'EVENT_MANAGER';
    SELECT id INTO role_exec_mem FROM public.roles WHERE slug = 'EXECUTIVE_MEMBER';
    SELECT id INTO role_auditor FROM public.roles WHERE slug = 'AUDITOR';

    -- SUPER_ADMIN: Receives ALL permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT role_super_admin, p.id
    FROM public.permissions p
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- TREASURER: dashboard, financial_accounts, income, expenses, transactions, budgets, member_payments, reports, documents
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT role_treasurer, p.id
    FROM public.permissions p
    WHERE p.module IN (
        'dashboard', 'financial_accounts', 'income', 'expenses', 
        'transactions', 'budgets', 'member_payments', 'reports', 'documents', 'accounting'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- PRESIDENT: dashboard, reports, approvals, events
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT role_president, p.id
    FROM public.permissions p
    WHERE p.module IN ('dashboard', 'reports', 'approvals', 'events')
       OR (p.module = 'expenses' AND p.action IN ('read', 'approve'))
       OR (p.module = 'budgets' AND p.action IN ('read', 'approve'))
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- GENERAL_SECRETARY: dashboard, events, budgets, expenses
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT role_sec_gen, p.id
    FROM public.permissions p
    WHERE p.module IN ('dashboard', 'events', 'budgets')
       OR (p.module = 'expenses' AND p.action IN ('create', 'read', 'update'))
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- EVENT_MANAGER: dashboard, events, expenses
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT role_event_mgr, p.id
    FROM public.permissions p
    WHERE p.module IN ('dashboard', 'events')
       OR (p.module = 'expenses' AND p.action IN ('create', 'read', 'update'))
       OR (p.module = 'documents' AND p.action IN ('create', 'read'))
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- EXECUTIVE_MEMBER: dashboard, personal requests
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT role_exec_mem, p.id
    FROM public.permissions p
    WHERE p.module = 'dashboard'
       OR (p.module = 'expenses' AND p.action IN ('create', 'read'))
       OR (p.module = 'documents' AND p.action IN ('create', 'read'))
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- AUDITOR: read-only access to accounts, income, expenses, transactions, accounting, reports, audit_logs
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT role_auditor, p.id
    FROM public.permissions p
    WHERE p.action IN ('read', 'export')
      AND p.module IN (
        'dashboard', 'financial_accounts', 'income', 'expenses', 
        'transactions', 'accounting', 'reports', 'audit_logs'
      )
    ON CONFLICT (role_id, permission_id) DO NOTHING;

END $$;
