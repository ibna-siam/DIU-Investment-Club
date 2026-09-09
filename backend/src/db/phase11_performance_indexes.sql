-- ====================================================================
-- DIU INVESTMENT CLUB FINANCIAL MANAGEMENT SYSTEM
-- PHASE 11: DATABASE PERFORMANCE INDEXING MIGRATION
-- ====================================================================

-- 1. Financial Transactions & Accounts Indexes
CREATE INDEX IF NOT EXISTS idx_fin_txns_account_id ON public.financial_transactions(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_fin_txns_created_by ON public.financial_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_fin_txns_txn_date ON public.financial_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_fin_txns_type_direction ON public.financial_transactions(transaction_type, direction);

-- 2. Incomes Indexes
CREATE INDEX IF NOT EXISTS idx_incomes_category_id ON public.incomes(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_account_id ON public.incomes(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_incomes_transaction_id ON public.incomes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_incomes_created_by ON public.incomes(created_by);
CREATE INDEX IF NOT EXISTS idx_incomes_status_date ON public.incomes(status, transaction_date DESC);

-- 3. Expenses Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON public.expenses(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_id ON public.expenses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_requested_by ON public.expenses(requested_by);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_status_date ON public.expenses(status, expense_date DESC);

-- 4. Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action ON public.audit_logs(module, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);

-- 5. Members, Dues & Payments Indexes
CREATE INDEX IF NOT EXISTS idx_members_created_by ON public.members(created_by);
CREATE INDEX IF NOT EXISTS idx_members_membership_type_id ON public.members(membership_type_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(membership_status);

CREATE INDEX IF NOT EXISTS idx_member_dues_member_id ON public.member_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_membership_id ON public.member_dues(membership_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_created_by ON public.member_dues(created_by);
CREATE INDEX IF NOT EXISTS idx_member_dues_status ON public.member_dues(status);

CREATE INDEX IF NOT EXISTS idx_member_payments_member_id ON public.member_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_account_id ON public.member_payments(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_income_id ON public.member_payments(income_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_created_by ON public.member_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_member_payments_verified_by ON public.member_payments(verified_by);
CREATE INDEX IF NOT EXISTS idx_member_payments_status ON public.member_payments(status);

-- 6. Documents & Versions Indexes
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status_cat ON public.documents(status, category);
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_uploaded_by ON public.document_versions(uploaded_by);

-- 7. Notifications & Communication Preferences Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON public.notifications(user_id, related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON public.notification_preferences(user_id);

-- 8. Smart Reminders, Email Delivery & Automation Logs Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_status_scheduled ON public.reminders(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status_recipient ON public.email_logs(status, recipient, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_status ON public.automation_logs(rule_id, status, executed_at DESC);

-- 9. Events, Meetings, Tasks & Operations Indexes
CREATE INDEX IF NOT EXISTS idx_events_status_date ON public.events(status, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status_date ON public.meetings(status, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks(assigned_to, status, due_date);

-- 10. Approvals & Reconciliations Indexes
CREATE INDEX IF NOT EXISTS idx_approval_actions_acted_by ON public.approval_actions(acted_by);
CREATE INDEX IF NOT EXISTS idx_approval_steps_assigned_to ON public.approval_steps(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bank_rec_items_txn_id ON public.bank_reconciliation_items(financial_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_rec_created_by ON public.bank_reconciliations(created_by);
CREATE INDEX IF NOT EXISTS idx_cash_rec_created_by ON public.cash_reconciliations(created_by);

-- 9. Function Search Path Security (Immutable search path prevents search-path hijacking)
DO $$
DECLARE
    f record;
BEGIN
    FOR f IN (
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND prokind = 'f'
          AND prosecdef = true
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', f.proname, f.argtypes);
    END LOOP;
END $$;
