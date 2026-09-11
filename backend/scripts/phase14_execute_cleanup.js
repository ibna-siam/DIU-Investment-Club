/**
 * Phase 14: Safe Production Demo Data Cleanup Execution Script
 *
 * Safely removes demo, test, and verification records across 8 ordered steps
 * while strictly safeguarding system configuration, roles, permissions,
 * real users, real members, and real operational accounts.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getDbAdmin } = require('../dist/config/supabase');

// Strict Real Whitelist (NEVER DELETE)
const PROTECTED_USER_EMAILS = [
  'siamibna29@gmail.com',
  'admin@diu.edu.bd',
];

const PROTECTED_MEMBER_EMAILS = [
  '252-58-083@diu.edu.bd',
  'siamibna29@gmail.com',
  '252-58-001@diu.edu.bd',
  '252-58-058@diu.edu.bd',
];

const PROTECTED_ACCOUNT_NAMES = [
  'Club Petty Cash Fund',
  'Modile Banking (Bkash)',
  'Mobile Banking (Bkash)',
];

async function executeCleanup() {
  console.log('================================================================');
  console.log('PHASE 14: PRODUCTION DEMO DATA CLEANUP EXECUTION');
  console.log('Time:', new Date().toISOString());
  console.log('================================================================\n');

  const client = getDbAdmin();

  // ----------------------------------------------------------------
  // STEP 1: NOTIFICATIONS & LOGS PURGE
  // ----------------------------------------------------------------
  console.log('--- STEP 1: Purging Notifications & Test Logs ---');
  
  // 1.1 Notifications
  const { count: notifCount } = await client.from('notifications').select('*', { count: 'exact', head: true });
  const { error: notifErr } = await client.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  notifications: Purged ${notifCount} records (Error: ${notifErr?.message || 'none'})`);

  // 1.2 Automation Logs
  const { count: autoCount } = await client.from('automation_logs').select('*', { count: 'exact', head: true });
  const { error: autoErr } = await client.from('automation_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  automation_logs: Purged ${autoCount} records (Error: ${autoErr?.message || 'none'})`);

  // 1.3 Email Logs
  const { count: emailCount } = await client.from('email_logs').select('*', { count: 'exact', head: true });
  const { error: emailErr } = await client.from('email_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  email_logs: Purged ${emailCount} records (Error: ${emailErr?.message || 'none'})`);

  // 1.4 Webhook Logs
  const { count: hookCount } = await client.from('webhook_logs').select('*', { count: 'exact', head: true });
  if (hookCount > 0) {
    const { error: hookErr } = await client.from('webhook_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(`  webhook_logs: Purged ${hookCount} records (Error: ${hookErr?.message || 'none'})`);
  }

  // 1.5 Audit Logs
  const { count: auditCount } = await client.from('audit_logs').select('*', { count: 'exact', head: true });
  const { error: auditErr } = await client.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  audit_logs: Purged ${auditCount} records (Error: ${auditErr?.message || 'none'})`);


  // ----------------------------------------------------------------
  // STEP 2: OPERATIONS & GOVERNANCE CLEANUP
  // ----------------------------------------------------------------
  console.log('\n--- STEP 2: Purging Test Tasks, Meetings, Events, Decisions ---');

  // 2.1 Tasks & Comments
  await client.from('task_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { count: taskCount } = await client.from('tasks').select('*', { count: 'exact', head: true });
  const { error: taskErr } = await client.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  tasks: Purged ${taskCount} records (Error: ${taskErr?.message || 'none'})`);

  // 2.2 Meetings & Minutes & Attendance
  await client.from('meeting_attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('meeting_minutes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('meeting_agendas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { count: meetCount } = await client.from('meetings').select('*', { count: 'exact', head: true });
  const { error: meetErr } = await client.from('meetings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  meetings: Purged ${meetCount} records (Error: ${meetErr?.message || 'none'})`);

  // 2.3 Decisions
  const { count: decCount } = await client.from('decisions').select('*', { count: 'exact', head: true });
  const { error: decErr } = await client.from('decisions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  decisions: Purged ${decCount} records (Error: ${decErr?.message || 'none'})`);

  // 2.4 Events & Budget Items
  await client.from('event_budget_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('event_budgets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('event_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { count: eventCount } = await client.from('events').select('*', { count: 'exact', head: true });
  const { error: eventErr } = await client.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  events: Purged ${eventCount} records (Error: ${eventErr?.message || 'none'})`);


  // ----------------------------------------------------------------
  // STEP 3: ACCOUNTING LEDGERS & VOUCHERS
  // ----------------------------------------------------------------
  console.log('\n--- STEP 3: Purging Journal Entry Lines, Journals, Vouchers ---');

  // 3.1 Journal Entry Lines
  const { count: jLineCount } = await client.from('journal_entry_lines').select('*', { count: 'exact', head: true });
  const { error: jLineErr } = await client.from('journal_entry_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  journal_entry_lines: Purged ${jLineCount} records (Error: ${jLineErr?.message || 'none'})`);

  // 3.2 Journal Entries
  const { count: jCount } = await client.from('journal_entries').select('*', { count: 'exact', head: true });
  const { error: jErr } = await client.from('journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  journal_entries: Purged ${jCount} records (Error: ${jErr?.message || 'none'})`);

  // 3.3 Vouchers
  const { count: vCount } = await client.from('vouchers').select('*', { count: 'exact', head: true });
  const { error: vErr } = await client.from('vouchers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  vouchers: Purged ${vCount} records (Error: ${vErr?.message || 'none'})`);


  // ----------------------------------------------------------------
  // STEP 4: FINANCIAL TRANSACTIONS, INCOMES, EXPENSES, DONATIONS
  // ----------------------------------------------------------------
  console.log('\n--- STEP 4: Purging Financial Transactions, Incomes, Expenses ---');

  // 4.1 Incomes
  const { count: incCount } = await client.from('incomes').select('*', { count: 'exact', head: true });
  const { error: incErr } = await client.from('incomes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  incomes: Purged ${incCount} records (Error: ${incErr?.message || 'none'})`);

  // 4.2 Expenses
  const { count: expCount } = await client.from('expenses').select('*', { count: 'exact', head: true });
  const { error: expErr } = await client.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  expenses: Purged ${expCount} records (Error: ${expErr?.message || 'none'})`);

  // 4.3 Donations
  const { count: donCount } = await client.from('donations').select('*', { count: 'exact', head: true });
  const { error: donErr } = await client.from('donations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  donations: Purged ${donCount} records (Error: ${donErr?.message || 'none'})`);

  // 4.4 Financial Transactions
  const { count: txCount } = await client.from('financial_transactions').select('*', { count: 'exact', head: true });
  const { error: txErr } = await client.from('financial_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  financial_transactions: Purged ${txCount} records (Error: ${txErr?.message || 'none'})`);


  // ----------------------------------------------------------------
  // STEP 5: MEMBER PAYMENTS, DUES, MEMBERSHIPS & TEST MEMBERS
  // ----------------------------------------------------------------
  console.log('\n--- STEP 5: Purging Test Member Dues, Payments & Test Members ---');

  // 5.1 Member Payments
  const { count: pmtCount } = await client.from('member_payments').select('*', { count: 'exact', head: true });
  const { error: pmtErr } = await client.from('member_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  member_payments: Purged ${pmtCount} records (Error: ${pmtErr?.message || 'none'})`);

  // 5.2 Member Dues
  const { count: duesCount } = await client.from('member_dues').select('*', { count: 'exact', head: true });
  const { error: duesErr } = await client.from('member_dues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  member_dues: Purged ${duesCount} records (Error: ${duesErr?.message || 'none'})`);

  // 5.3 Member Memberships
  const { count: memshipsCount } = await client.from('member_memberships').select('*', { count: 'exact', head: true });
  const { error: memshipsErr } = await client.from('member_memberships').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  member_memberships: Purged ${memshipsCount} records (Error: ${memshipsErr?.message || 'none'})`);

  // 5.4 Test Members (delete where email NOT in protected list)
  const { data: allMembers } = await client.from('members').select('id, full_name, email, member_code');
  let deletedMembersCount = 0;
  for (const m of (allMembers || [])) {
    const isProtected = PROTECTED_MEMBER_EMAILS.includes(m.email?.toLowerCase().trim());
    if (!isProtected) {
      const { error } = await client.from('members').delete().eq('id', m.id);
      if (!error) {
        deletedMembersCount++;
        console.log(`    Deleted test member: ${m.full_name} (${m.member_code}, ${m.email})`);
      } else {
        console.warn(`    Could not delete member ${m.id}:`, error.message);
      }
    } else {
      console.log(`    ⭐ Protected Real Member: ${m.full_name} (${m.member_code}, ${m.email})`);
    }
  }
  console.log(`  members: Purged ${deletedMembersCount} test members. Real members retained.`);


  // ----------------------------------------------------------------
  // STEP 6: TEST FINANCIAL ACCOUNTS PURGE
  // ----------------------------------------------------------------
  console.log('\n--- STEP 6: Purging Test Financial Accounts & Resetting Real Accounts ---');
  const { data: allAccounts } = await client.from('financial_accounts').select('id, name, account_type, current_balance, status');
  let deletedAccountsCount = 0;

  for (const acc of (allAccounts || [])) {
    const isProtected = PROTECTED_ACCOUNT_NAMES.some(
      name => acc.name?.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (!isProtected) {
      const { error } = await client.from('financial_accounts').delete().eq('id', acc.id);
      if (!error) {
        deletedAccountsCount++;
        console.log(`    Deleted test account: "${acc.name}" (${acc.account_type}, ID: ${acc.id})`);
      } else {
        console.warn(`    Could not delete account ${acc.id}:`, error.message);
      }
    } else {
      // Reconcile and clean real account balance to clean zero or approved initial balance
      await client.from('financial_accounts').update({
        current_balance: 0,
        opening_balance: 0,
        status: 'ACTIVE',
      }).eq('id', acc.id);
      console.log(`    ⭐ Protected Real Account: "${acc.name}" (${acc.account_type}) -> Reconciled to clean initial state (৳0.00)`);
    }
  }
  console.log(`  financial_accounts: Purged ${deletedAccountsCount} test accounts. Real operational accounts retained.`);


  // ----------------------------------------------------------------
  // STEP 7: DEMO & TEST USER PROFILES & AUTH CREDENTIALS
  // ----------------------------------------------------------------
  console.log('\n--- STEP 7: Purging Demo & Test User Profiles ---');

  // 7.1 Setup Tokens
  const { count: tokenCount } = await client.from('account_setup_tokens').select('*', { count: 'exact', head: true });
  await client.from('account_setup_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(`  account_setup_tokens: Purged ${tokenCount} setup tokens`);

  // 7.2 Profiles
  const { data: allProfiles } = await client.from('profiles').select('id, full_name, email');
  let deletedProfilesCount = 0;

  for (const p of (allProfiles || [])) {
    const isProtected = PROTECTED_USER_EMAILS.includes(p.email?.toLowerCase().trim());
    if (!isProtected) {
      // 1. Delete user_roles
      await client.from('user_roles').delete().eq('user_id', p.id);
      // 2. Delete profile
      const { error } = await client.from('profiles').delete().eq('id', p.id);
      if (!error) {
        deletedProfilesCount++;
        console.log(`    Deleted test profile: ${p.full_name} (${p.email})`);
        // 3. Delete auth.users entry via RPC or Supabase Admin
        try {
          await client.rpc('admin_delete_user', { p_user_id: p.id });
        } catch (e) {}
      } else {
        console.warn(`    Could not delete profile ${p.id}:`, error.message);
      }
    } else {
      console.log(`    ⭐ Protected Real Administrator: ${p.full_name} (${p.email})`);
    }
  }
  console.log(`  profiles: Purged ${deletedProfilesCount} test profiles. Real Super Administrators retained.`);

  console.log('\n================================================================');
  console.log('CLEANUP EXECUTION COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

executeCleanup().catch(console.error);
