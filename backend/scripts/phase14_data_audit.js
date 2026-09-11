require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getDbAdmin } = require('../dist/config/supabase');

async function auditDatabase() {
  console.log('================================================================');
  console.log('PHASE 14: COMPLETE DATABASE DATA AUDIT');
  console.log('================================================================\n');

  const client = getDbAdmin();

  const tables = [
    // Auth & Identity
    'profiles',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'user_permissions',
    'account_setup_tokens',
    // Members & Dues
    'members',
    'membership_types',
    'member_dues',
    'member_payments',
    // Financial & Accounting
    'financial_accounts',
    'financial_years',
    'accounting_periods',
    'chart_of_accounts',
    'journal_entries',
    'journal_lines',
    'vouchers',
    'voucher_items',
    'incomes',
    'income_categories',
    'expenses',
    'expense_categories',
    'transactions',
    'fund_transfers',
    'donations',
    'sponsors',
    'sponsorships',
    'sponsorship_payments',
    'assets',
    // Operations & Governance
    'events',
    'event_budgets',
    'event_budget_items',
    'event_attendees',
    'tasks',
    'task_comments',
    'meetings',
    'meeting_attendees',
    'meeting_minutes',
    'decisions',
    'committees',
    'committee_members',
    'documents',
    // Automation & Logs
    'automation_rules',
    'automation_logs',
    'reminders',
    'recurring_operations',
    'notifications',
    'email_logs',
    'audit_logs',
    'system_settings',
  ];

  const summary = [];

  for (const t of tables) {
    try {
      const { data, count, error } = await client
        .from(t)
        .select('*', { count: 'exact' });

      if (error) {
        summary.push({ table: t, count: 'ERROR', error: error.message, sample: [] });
      } else {
        summary.push({ table: t, count: count ?? (data?.length || 0), sample: data || [] });
      }
    } catch (e) {
      summary.push({ table: t, count: 'FAIL', error: e.message, sample: [] });
    }
  }

  console.log('Table'.padEnd(25) + 'Count'.padEnd(10));
  console.log('-----------------------------------');
  for (const s of summary) {
    console.log(s.table.padEnd(25) + String(s.count).padEnd(10));
  }

  // Deep dive into profiles to identify Real Super Admin vs Demo/Test users
  console.log('\n================================================================');
  console.log('PROFILES DEEP DIVE (Users Identification)');
  console.log('================================================================');
  const profilesTable = summary.find(s => s.table === 'profiles');
  if (profilesTable && Array.isArray(profilesTable.sample)) {
    for (const p of profilesTable.sample) {
      console.log(`ID: ${p.id} | Email: ${p.email} | Name: ${p.full_name} | Created: ${p.created_at}`);
    }
  }

  // Deep dive into members
  console.log('\n================================================================');
  console.log('MEMBERS DEEP DIVE');
  console.log('================================================================');
  const membersTable = summary.find(s => s.table === 'members');
  if (membersTable && Array.isArray(membersTable.sample)) {
    for (const m of membersTable.sample) {
      console.log(`ID: ${m.id} | Code: ${m.member_code} | Name: ${m.full_name} | Email: ${m.email} | Status: ${m.status}`);
    }
  }

  // Deep dive into Financial Accounts
  console.log('\n================================================================');
  console.log('FINANCIAL ACCOUNTS DEEP DIVE');
  console.log('================================================================');
  const accTable = summary.find(s => s.table === 'financial_accounts');
  if (accTable && Array.isArray(accTable.sample)) {
    for (const a of accTable.sample) {
      console.log(`ID: ${a.id} | Name: ${a.name} | Type: ${a.account_type} | Balance: ৳${a.current_balance} | Status: ${a.status}`);
    }
  }
}

auditDatabase().catch(console.error);
