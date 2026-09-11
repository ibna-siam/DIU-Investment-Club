require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getDbAdmin } = require('../dist/config/supabase');

async function run() {
  const client = getDbAdmin();
  const tables = [
    'profiles', 'roles', 'permissions', 'role_permissions', 'user_roles', 'user_permissions', 'account_setup_tokens',
    'members', 'membership_types', 'member_dues', 'member_payments',
    'financial_accounts', 'financial_years', 'accounting_periods', 'chart_of_accounts', 'journal_entries', 'journal_lines',
    'vouchers', 'voucher_items', 'incomes', 'income_categories', 'expenses', 'expense_categories', 'transactions',
    'fund_transfers', 'donations', 'sponsors', 'sponsorships', 'sponsorship_payments', 'assets',
    'events', 'event_budgets', 'event_budget_items', 'event_attendees',
    'tasks', 'task_comments', 'meetings', 'meeting_attendees', 'meeting_minutes', 'decisions',
    'committees', 'committee_members', 'documents',
    'automation_rules', 'automation_logs', 'reminders', 'recurring_operations', 'notifications',
    'email_logs', 'audit_logs', 'system_settings'
  ];

  console.log('TABLE COUNTS IN SUPABASE POSTGRESQL:\n');
  const results = {};
  for (const t of tables) {
    try {
      const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
      results[t] = error ? `ERROR: ${error.message}` : count;
      console.log(`${t.padEnd(25)}: ${results[t]}`);
    } catch (err) {
      console.log(`${t.padEnd(25)}: EXCEPTION: ${err.message}`);
    }
  }
}

run().catch(console.error);
