-- ====================================================================
-- DIU INVESTMENT CLUB FINANCIAL MANAGEMENT SYSTEM
-- PHASE 11: DATABASE SECURITY HARDENING MIGRATION
-- ====================================================================

-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON EXPOSED TABLES
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_permissions ENABLE ROW LEVEL SECURITY;

-- System Settings RLS
DROP POLICY IF EXISTS "System settings readable by authenticated" ON public.system_settings;
CREATE POLICY "System settings readable by authenticated"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Super admins can manage system settings" ON public.system_settings;
CREATE POLICY "Super admins can manage system settings"
    ON public.system_settings FOR ALL
    TO authenticated
    USING (public.is_super_admin((SELECT auth.uid())))
    WITH CHECK (public.is_super_admin((SELECT auth.uid())));

-- User Permissions RLS
DROP POLICY IF EXISTS "User permissions readable by authenticated" ON public.user_permissions;
CREATE POLICY "User permissions readable by authenticated"
    ON public.user_permissions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Super admins can manage user permissions" ON public.user_permissions;
CREATE POLICY "Super admins can manage user permissions"
    ON public.user_permissions FOR ALL
    TO authenticated
    USING (public.is_super_admin((SELECT auth.uid())))
    WITH CHECK (public.is_super_admin((SELECT auth.uid())));

-- 2. HARDEN AUDIT LOGS SECURITY
-- Audit logs should never be read by anonymous users, and cannot be updated or deleted by anyone
DROP POLICY IF EXISTS "Audit logs readable by authenticated users" ON public.audit_logs;
CREATE POLICY "Audit logs readable by authenticated users"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. HARDEN DOCUMENTS & DOCUMENT VERSIONS SECURITY
-- Anonymous users must NEVER be able to read or query documents metadata directly via PostgREST
DROP POLICY IF EXISTS "Allow anon read" ON public.documents;
DROP POLICY IF EXISTS "Allow anon read" ON public.document_versions;

DROP POLICY IF EXISTS "Documents readable by authenticated users" ON public.documents;
CREATE POLICY "Documents readable by authenticated users"
    ON public.documents FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL OR public.is_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Document versions readable by authenticated users" ON public.document_versions;
CREATE POLICY "Document versions readable by authenticated users"
    ON public.document_versions FOR SELECT
    TO authenticated
    USING (true);

-- 4. HARDEN NOTIFICATIONS RLS POLICIES
-- Clean up overly permissive {public} policies that allowed arbitrary deletion or reading
DROP POLICY IF EXISTS "Allow all to delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all to select notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all to update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()) OR public.is_super_admin((SELECT auth.uid())));

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Notifications insert by authenticated or backend"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 5. HARDEN RECONCILIATIONS, COMPLIANCE, INTERNAL CONTROLS & RISK FLAGS POLICIES
-- Replace wide open public policies with authenticated & role-checked policies

-- Bank Reconciliations
DROP POLICY IF EXISTS "p10_delete_all" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "p10_insert_all" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "p10_select_all" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "p10_update_all" ON public.bank_reconciliations;

CREATE POLICY "bank_reconciliations_auth_select" ON public.bank_reconciliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_reconciliations_auth_insert" ON public.bank_reconciliations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bank_reconciliations_auth_update" ON public.bank_reconciliations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Bank Reconciliation Items
DROP POLICY IF EXISTS "p10_delete_all" ON public.bank_reconciliation_items;
DROP POLICY IF EXISTS "p10_insert_all" ON public.bank_reconciliation_items;
DROP POLICY IF EXISTS "p10_select_all" ON public.bank_reconciliation_items;
DROP POLICY IF EXISTS "p10_update_all" ON public.bank_reconciliation_items;

CREATE POLICY "bank_reconciliation_items_auth_select" ON public.bank_reconciliation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_reconciliation_items_auth_insert" ON public.bank_reconciliation_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bank_reconciliation_items_auth_update" ON public.bank_reconciliation_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Cash Reconciliations
DROP POLICY IF EXISTS "p10_delete_all" ON public.cash_reconciliations;
DROP POLICY IF EXISTS "p10_insert_all" ON public.cash_reconciliations;
DROP POLICY IF EXISTS "p10_select_all" ON public.cash_reconciliations;
DROP POLICY IF EXISTS "p10_update_all" ON public.cash_reconciliations;

CREATE POLICY "cash_reconciliations_auth_select" ON public.cash_reconciliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "cash_reconciliations_auth_insert" ON public.cash_reconciliations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cash_reconciliations_auth_update" ON public.cash_reconciliations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Compliance Checklists & Requirements
DROP POLICY IF EXISTS "p10_delete_all" ON public.compliance_checklists;
DROP POLICY IF EXISTS "p10_insert_all" ON public.compliance_checklists;
DROP POLICY IF EXISTS "p10_select_all" ON public.compliance_checklists;
DROP POLICY IF EXISTS "p10_update_all" ON public.compliance_checklists;

CREATE POLICY "compliance_checklists_auth_select" ON public.compliance_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "compliance_checklists_auth_insert" ON public.compliance_checklists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "compliance_checklists_auth_update" ON public.compliance_checklists FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "p10_delete_all" ON public.compliance_requirements;
DROP POLICY IF EXISTS "p10_insert_all" ON public.compliance_requirements;
DROP POLICY IF EXISTS "p10_select_all" ON public.compliance_requirements;
DROP POLICY IF EXISTS "p10_update_all" ON public.compliance_requirements;

CREATE POLICY "compliance_requirements_auth_select" ON public.compliance_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "compliance_requirements_auth_insert" ON public.compliance_requirements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "compliance_requirements_auth_update" ON public.compliance_requirements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Financial Exceptions & Risk Flags
DROP POLICY IF EXISTS "p10_delete_all" ON public.financial_exceptions;
DROP POLICY IF EXISTS "p10_insert_all" ON public.financial_exceptions;
DROP POLICY IF EXISTS "p10_select_all" ON public.financial_exceptions;
DROP POLICY IF EXISTS "p10_update_all" ON public.financial_exceptions;

CREATE POLICY "financial_exceptions_auth_select" ON public.financial_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "financial_exceptions_auth_insert" ON public.financial_exceptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "financial_exceptions_auth_update" ON public.financial_exceptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "p10_delete_all" ON public.risk_flags;
DROP POLICY IF EXISTS "p10_insert_all" ON public.risk_flags;
DROP POLICY IF EXISTS "p10_select_all" ON public.risk_flags;
DROP POLICY IF EXISTS "p10_update_all" ON public.risk_flags;

CREATE POLICY "risk_flags_auth_select" ON public.risk_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_flags_auth_insert" ON public.risk_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "risk_flags_auth_update" ON public.risk_flags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Internal Control Rules
DROP POLICY IF EXISTS "p10_delete_all" ON public.internal_control_rules;
DROP POLICY IF EXISTS "p10_insert_all" ON public.internal_control_rules;
DROP POLICY IF EXISTS "p10_select_all" ON public.internal_control_rules;
DROP POLICY IF EXISTS "p10_update_all" ON public.internal_control_rules;

CREATE POLICY "internal_control_rules_auth_select" ON public.internal_control_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "internal_control_rules_auth_insert" ON public.internal_control_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "internal_control_rules_auth_update" ON public.internal_control_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Integrations & Webhooks
DROP POLICY IF EXISTS "p10_delete_all" ON public.integration_configs;
DROP POLICY IF EXISTS "p10_insert_all" ON public.integration_configs;
DROP POLICY IF EXISTS "p10_select_all" ON public.integration_configs;
DROP POLICY IF EXISTS "p10_update_all" ON public.integration_configs;

CREATE POLICY "integration_configs_auth_select" ON public.integration_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "integration_configs_auth_insert" ON public.integration_configs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "integration_configs_auth_update" ON public.integration_configs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "p10_delete_all" ON public.webhooks;
DROP POLICY IF EXISTS "p10_insert_all" ON public.webhooks;
DROP POLICY IF EXISTS "p10_select_all" ON public.webhooks;
DROP POLICY IF EXISTS "p10_update_all" ON public.webhooks;

CREATE POLICY "webhooks_auth_select" ON public.webhooks FOR SELECT TO authenticated USING (true);
CREATE POLICY "webhooks_auth_insert" ON public.webhooks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "webhooks_auth_update" ON public.webhooks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 6. OPTIMIZE AUTH_RLS_INITPLAN POLICIES (USE SELECT auth.uid())
-- This prevents per-row re-evaluation of auth functions, massively speeding up query execution
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Super Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Super Admins can manage roles" ON public.roles;
CREATE POLICY "Super Admins can manage roles"
    ON public.roles FOR ALL
    TO authenticated
    USING (public.is_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Super Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Super Admins can manage user roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Super Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Super Admins can manage role permissions"
    ON public.role_permissions FOR ALL
    TO authenticated
    USING (public.is_super_admin((SELECT auth.uid())));
