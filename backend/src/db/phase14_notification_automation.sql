-- ====================================================================
-- DIU Investment Club ERP - Phase 14 Database Migration
-- Notification Read State Fix, Notification Rules & 17 Email Automation Rules
-- ====================================================================

-- 1. Ensure columns exist on public.notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UNREAD';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Backfill any existing notifications status
UPDATE public.notifications
SET status = CASE WHEN is_read = true THEN 'READ' ELSE 'UNREAD' END
WHERE status IS NULL;

-- 2. Optimize indexes for fast querying and unread counting
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_active ON public.notifications (user_id, status) WHERE status != 'ARCHIVED';

-- 3. Create public.email_automation_rules table for 17 standard rules
CREATE TABLE IF NOT EXISTS public.email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  recipient_logic TEXT NOT NULL,
  template_key TEXT NOT NULL,
  category TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  is_protected BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Enable RLS on email_automation_rules
ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_automation_rules' AND policyname = 'email_automation_rules_read_all'
  ) THEN
    CREATE POLICY email_automation_rules_read_all ON public.email_automation_rules
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_automation_rules' AND policyname = 'email_automation_rules_write_service'
  ) THEN
    CREATE POLICY email_automation_rules_write_service ON public.email_automation_rules
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Seed the 17 Standard Email Automation Rules
INSERT INTO public.email_automation_rules (rule_key, name, description, trigger_event, recipient_logic, template_key, category, enabled, is_protected)
VALUES
  ('new_member_welcome', 'New Member Welcome Email', 'Sent when a new club membership application is registered and approved', 'MEMBER_CREATED', 'Newly registered club member', 'member_welcome', 'MEMBERSHIP', true, false),
  ('system_user_welcome', 'System User Welcome Email', 'Sent when a new administrative user account is created with login credentials', 'USER_CREATED', 'New system ERP user', 'user_welcome', 'MEMBERSHIP', true, false),
  ('account_invitation', 'Account Invitation Email', 'Sent when a user is invited to join the ERP portal with a secure onboarding link', 'USER_INVITED', 'Invited user email address', 'account_invitation', 'MEMBERSHIP', true, false),
  ('member_payment_confirmation', 'Member Payment Confirmation Email', 'Sent immediately upon payment submission acknowledging receipt pending verification', 'PAYMENT_SUBMITTED', 'Paying member email', 'payment_confirmation', 'FINANCIAL', true, false),
  ('payment_verification', 'Payment Verification Email', 'Sent when a payment is verified by the Treasurer, including the public digital receipt link', 'PAYMENT_CONFIRMED', 'Paying member with public digital receipt link', 'payment_verified', 'FINANCIAL', true, false),
  ('payment_rejection', 'Payment Rejection Email', 'Sent when a payment is rejected with a clear explanation', 'PAYMENT_REJECTED', 'Paying member with rejection reason', 'payment_rejected', 'FINANCIAL', true, false),
  ('expense_approval_request', 'Expense Approval Request Email', 'Sent to authorized financial approvers when an expense is submitted', 'EXPENSE_SUBMITTED', 'Assigned expense approvers (Treasurer & President)', 'expense_submitted', 'FINANCIAL', true, false),
  ('expense_approved', 'Expense Approved Email', 'Sent to the claimant once an expense voucher has been officially approved', 'EXPENSE_APPROVED', 'Claimant / expense creator', 'expense_approved', 'FINANCIAL', true, false),
  ('expense_rejected', 'Expense Rejected Email', 'Sent to the claimant if an expense voucher is rejected with the rejection reason', 'EXPENSE_REJECTED', 'Claimant / expense creator', 'expense_rejected', 'FINANCIAL', true, false),
  ('task_assignment', 'Task Assignment Email', 'Sent to the assigned user when an operational task is assigned to them', 'TASK_ASSIGNED', 'Assigned task owner', 'task_assigned', 'TASKS', true, false),
  ('task_reminder', 'Task Reminder Email', 'Sent to the task assignee as a reminder before the deadline', 'TASK_REMINDER', 'Assigned task owner before due date', 'task_reminder', 'TASKS', true, false),
  ('meeting_scheduled', 'Meeting Scheduled Email', 'Sent to invited participants when a meeting is scheduled', 'MEETING_SCHEDULED', 'Confirmed meeting participants', 'meeting_invitation', 'MEETINGS', true, false),
  ('meeting_reminder', 'Meeting Reminder Email', 'Sent to meeting participants before the meeting begins (24h and 1h prior)', 'MEETING_REMINDER', 'Confirmed meeting participants', 'meeting_reminder', 'MEETINGS', true, false),
  ('event_announcement', 'Event Announcement Email', 'Sent to targeted audience when a new club event is announced', 'EVENT_CREATED', 'Targeted members / committee / roles', 'event_notification', 'EVENTS', true, false),
  ('event_reminder', 'Event Reminder Email', 'Sent to registered participants before the event begins', 'EVENT_REMINDER', 'Registered event attendees', 'event_reminder', 'EVENTS', true, false),
  ('password_reset', 'Password Reset Email', 'Sent with a secure temporary token when a password reset is requested', 'PASSWORD_RESET_REQUESTED', 'Requesting user email', 'password_reset', 'SECURITY', true, true),
  ('security_alert', 'Security Alert Email', 'Sent upon suspicious security events, unauthorized role attempts, or critical alerts', 'SECURITY_ALERT', 'Super Admins & affected user', 'security_alert', 'SECURITY', true, true)
ON CONFLICT (rule_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_event = EXCLUDED.trigger_event,
  recipient_logic = EXCLUDED.recipient_logic,
  template_key = EXCLUDED.template_key,
  category = EXCLUDED.category,
  updated_at = now();

-- 5. Create public.notification_rules table
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  enabled BOOLEAN DEFAULT true,
  delivery_channels JSONB DEFAULT '["IN_APP", "EMAIL"]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Enable RLS on notification_rules
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_rules' AND policyname = 'notification_rules_read_all'
  ) THEN
    CREATE POLICY notification_rules_read_all ON public.notification_rules
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_rules' AND policyname = 'notification_rules_write_service'
  ) THEN
    CREATE POLICY notification_rules_write_service ON public.notification_rules
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Seed default Notification Rules
INSERT INTO public.notification_rules (rule_key, name, trigger_event, notification_type, recipient_type, recipient_role, priority, enabled, delivery_channels)
VALUES
  ('notif_task_assigned', 'Task Assigned Notification', 'TASK_ASSIGNED', 'TASK', 'ASSIGNED_USER', 'ANY', 'NORMAL', true, '["IN_APP", "EMAIL"]'::jsonb),
  ('notif_expense_submitted', 'Expense Approval Required', 'EXPENSE_SUBMITTED', 'APPROVAL', 'APPROVER_ROLES', 'TREASURER,PRESIDENT', 'HIGH', true, '["IN_APP", "EMAIL"]'::jsonb),
  ('notif_expense_approved', 'Expense Approved Notification', 'EXPENSE_APPROVED', 'FINANCIAL', 'CLAIMANT', 'ANY', 'NORMAL', true, '["IN_APP", "EMAIL"]'::jsonb),
  ('notif_expense_rejected', 'Expense Rejected Notification', 'EXPENSE_REJECTED', 'FINANCIAL', 'CLAIMANT', 'ANY', 'HIGH', true, '["IN_APP", "EMAIL"]'::jsonb),
  ('notif_meeting_scheduled', 'Meeting Invitation Notification', 'MEETING_SCHEDULED', 'MEETING', 'PARTICIPANTS', 'ANY', 'NORMAL', true, '["IN_APP", "EMAIL"]'::jsonb),
  ('notif_event_created', 'Event Announcement Notification', 'EVENT_CREATED', 'EVENT', 'TARGET_AUDIENCE', 'ALL', 'NORMAL', true, '["IN_APP", "EMAIL"]'::jsonb),
  ('notif_payment_submitted', 'Payment Review Required', 'PAYMENT_SUBMITTED', 'FINANCIAL', 'FINANCIAL_REVIEWER', 'TREASURER', 'HIGH', true, '["IN_APP"]'::jsonb),
  ('notif_payment_confirmed', 'Payment Verified Notification', 'PAYMENT_CONFIRMED', 'FINANCIAL', 'PAYING_MEMBER', 'MEMBER', 'NORMAL', true, '["IN_APP", "EMAIL"]'::jsonb),
  ('notif_security_alert', 'Security Incident Alert', 'SECURITY_ALERT', 'SECURITY', 'ADMINS_AND_AFFECTED', 'SUPER_ADMIN', 'URGENT', true, '["IN_APP", "EMAIL"]'::jsonb)
ON CONFLICT (rule_key) DO UPDATE SET
  name = EXCLUDED.name,
  trigger_event = EXCLUDED.trigger_event,
  notification_type = EXCLUDED.notification_type,
  recipient_type = EXCLUDED.recipient_type,
  recipient_role = EXCLUDED.recipient_role,
  priority = EXCLUDED.priority,
  delivery_channels = EXCLUDED.delivery_channels,
  updated_at = now();
