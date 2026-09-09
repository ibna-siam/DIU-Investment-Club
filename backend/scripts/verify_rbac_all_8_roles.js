const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mirror NAV_ITEMS from frontend/src/config/navigation.ts
const NAV_ITEMS = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    permission: 'dashboard.read',
  },
  {
    title: 'My Tasks',
    href: '/tasks',
    permission: 'tasks.read',
    hideIfPermission: 'operations.read',
  },
  {
    title: 'Financial Management',
    href: '/accounts',
    children: [
      { title: 'Financial Accounts', href: '/accounts', permission: 'financial_accounts.read' },
      { title: 'Transactions Ledger', href: '/transactions', permission: 'transactions.read' },
      { title: 'Income Records', href: '/income', permission: 'income.read' },
      { title: 'Expense Records', href: '/expenses', permission: 'expenses.read' },
      { title: 'Cash Flow', href: '/cash-flow', permission: 'cash_flow.read' },
      { title: 'Fund Transfers', href: '/fund-transfers', permission: 'fund_transfers.read' },
    ],
  },
  {
    title: 'Club Events',
    href: '/events',
    children: [
      { title: 'All Events', href: '/events', permission: 'events.read' },
      { title: 'Create Event', href: '/events/create', permission: 'events.create' },
    ],
  },
  {
    title: 'Members & Dues',
    href: '/members',
    children: [
      { title: 'Member Directory', href: '/members', permission: 'members.read' },
      { title: 'Membership Tiers', href: '/membership-types', permission: 'membership_types.manage' },
      { title: 'Member Dues', href: '/member-dues', permission: 'dues.read' },
      { title: 'Payment Collection', href: '/member-payments', permission: 'member_payments.read' },
      { title: 'Official Receipts', href: '/receipts', permission: 'receipts.read' },
      { title: 'Member Financials', href: '/member-financials', permission: 'member_financials.read' },
    ],
  },
  {
    title: 'Revenue & Partners',
    href: '/donations',
    children: [
      { title: 'Donations', href: '/donations', permission: 'donations.read' },
      { title: 'Sponsors', href: '/sponsors', permission: 'sponsors.read' },
      { title: 'Sponsorship Agreements', href: '/sponsorships', permission: 'sponsorships.read' },
    ],
  },
  {
    title: 'Accounting',
    href: '/accounting',
    children: [
      { title: 'Accounting Dashboard', href: '/accounting', permission: 'accounting.read' },
      { title: 'Chart of Accounts', href: '/chart-of-accounts', permission: 'chart_of_accounts.read' },
      { title: 'Journal Entries', href: '/journal-entries', permission: 'journal_entries.read' },
      { title: 'Vouchers', href: '/vouchers', permission: 'vouchers.read' },
      { title: 'General Ledger', href: '/general-ledger', permission: 'general_ledger.read' },
      { title: 'Subsidiary Ledger', href: '/subsidiary-ledger', permission: 'subsidiary_ledger.read' },
      { title: 'Trial Balance', href: '/trial-balance', permission: 'trial_balance.read' },
      { title: 'Financial Periods', href: '/financial-years', permission: 'financial_years.read' },
    ],
  },
  {
    title: 'Approvals',
    href: '/approvals',
    permission: 'approvals.read',
  },
  {
    title: 'Reports',
    href: '/reports',
    children: [
      { title: 'Reporting Center', href: '/reports', permission: 'reports.read' },
      { title: 'Income Statement', href: '/income-statement', permission: 'reports.read' },
      { title: 'Balance Sheet', href: '/balance-sheet', permission: 'reports.read' },
      { title: 'Cash Flow Statement', href: '/cash-flow-statement', permission: 'reports.read' },
      { title: 'Budget vs Actual', href: '/budget-vs-actual', permission: 'budgets.read' },
      { title: 'Event Financials', href: '/event-financial-reports', permission: 'reports.read' },
      { title: 'Member Revenue', href: '/member-revenue-reports', permission: 'reports.read' },
      { title: 'Donation Reports', href: '/donation-reports', permission: 'reports.read' },
      { title: 'Sponsorship Reports', href: '/sponsorship-reports', permission: 'reports.read' },
      { title: 'Financial Analytics', href: '/financial-analytics', permission: 'reports.read' },
    ],
  },
  {
    title: 'Operations & Governance',
    href: '/operations',
    children: [
      { title: 'Executive Overview', href: '/operations', permission: 'operations.read' },
      { title: 'Executive Committee', href: '/committee', permission: 'committee.read' },
      { title: 'Meeting Management', href: '/meetings', permission: 'meetings.read' },
      { title: 'Decisions & Resolutions', href: '/decisions', permission: 'decisions.read' },
      { title: 'Action Items & Tasks', href: '/tasks', permission: 'operations.read' },
      { title: 'Club Assets & Inventory', href: '/assets', permission: 'assets.read' },
    ],
  },
  {
    title: 'Automation & Workflows',
    href: '/automation',
    children: [
      { title: 'Command Center', href: '/automation', permission: 'automation.read' },
      { title: 'Automation Rules', href: '/automation/rules', permission: 'automation.read' },
      { title: 'Execution Logs', href: '/automation/logs', permission: 'automation.logs_read' },
      { title: 'Recurring Operations', href: '/recurring-operations', permission: 'automation.read' },
      { title: 'Smart Reminders', href: '/reminders', permission: 'reminders.read' },
      { title: 'Month-End Closing', href: '/month-end', permission: 'accounting.manage' },
    ],
  },
  {
    title: 'Audit & Compliance',
    href: '/audit',
    children: [
      { title: 'Audit Trail', href: '/audit', permission: 'audit.read' },
      { title: 'Audit Reports', href: '/audit/reports', permission: 'audit.read' },
      { title: 'Cash Reconciliation', href: '/reconciliation', permission: 'reconciliation.read' },
      { title: 'Bank Reconciliation', href: '/bank-reconciliation', permission: 'reconciliation.read' },
      { title: 'Internal Controls', href: '/internal-controls', permission: 'internal_controls.read' },
      { title: 'Compliance Center', href: '/compliance', permission: 'compliance.read' },
      { title: 'Financial Exceptions', href: '/exceptions', permission: 'exceptions.read' },
      { title: 'Suspicious Risk Flags', href: '/risk-flags', permission: 'risk_flags.read' },
    ],
  },
  {
    title: 'Integrations & APIs',
    href: '/integrations',
    children: [
      { title: 'Templates', href: '/communication-templates', permission: 'communication_templates.read' },
      { title: 'External Services', href: '/integrations', permission: 'integrations.manage' },
      { title: 'Webhooks Hub', href: '/webhooks', permission: 'integrations.manage' },
    ],
  },
  {
    title: 'Documents',
    href: '/documents',
    permission: 'documents.read',
  },
  {
    title: 'Notifications',
    href: '/notifications',
    permission: 'notifications.read',
  },
  {
    title: 'Administration',
    href: '/users',
    children: [
      { title: 'Users', href: '/users', permission: 'users.read' },
      { title: 'Roles & Permissions', href: '/roles', permission: 'roles.read' },
      { title: 'Settings', href: '/settings', permission: 'settings.read' },
    ],
  },
];

// Mirror ROUTE_PERMISSIONS from frontend/src/config/navigation.ts
const ROUTE_PERMISSIONS = {
  '/events/create': 'events.create',
  '/income/create': 'income.create',
  '/expenses/create': 'expenses.create',
  '/accounts/create': 'financial_accounts.create',
  '/automation/rules': 'automation.read',
  '/automation/logs': 'automation.logs_read',
  '/audit/reports': 'audit.read',
  '/users': 'users.read',
  '/roles': 'roles.read',
  '/settings': 'settings.read',
  '/accounts': 'financial_accounts.read',
  '/transactions': 'transactions.read',
  '/income': 'income.read',
  '/expenses': 'expenses.read',
  '/cash-flow': 'cash_flow.read',
  '/fund-transfers': 'fund_transfers.read',
  '/events': 'events.read',
  '/members': 'members.read',
  '/membership-types': 'membership_types.manage',
  '/member-dues': 'dues.read',
  '/member-payments': 'member_payments.read',
  '/receipts': 'receipts.read',
  '/member-financials': 'member_financials.read',
  '/donations': 'donations.read',
  '/sponsors': 'sponsors.read',
  '/sponsorships': 'sponsorships.read',
  '/accounting': 'accounting.read',
  '/chart-of-accounts': 'chart_of_accounts.read',
  '/journal-entries': 'journal_entries.read',
  '/vouchers': 'vouchers.read',
  '/general-ledger': 'general_ledger.read',
  '/subsidiary-ledger': 'subsidiary_ledger.read',
  '/trial-balance': 'trial_balance.read',
  '/financial-years': 'financial_years.read',
  '/approvals': 'approvals.read',
  '/reports': 'reports.read',
  '/income-statement': 'reports.read',
  '/balance-sheet': 'reports.read',
  '/cash-flow-statement': 'reports.read',
  '/budget-vs-actual': 'budgets.read',
  '/event-financial-reports': 'reports.read',
  '/member-revenue-reports': 'reports.read',
  '/donation-reports': 'reports.read',
  '/sponsorship-reports': 'reports.read',
  '/financial-analytics': 'reports.read',
  '/operations': 'operations.read',
  '/committee': 'committee.read',
  '/meetings': 'meetings.read',
  '/decisions': 'decisions.read',
  '/tasks': 'tasks.read',
  '/assets': 'assets.read',
  '/automation': 'automation.read',
  '/recurring-operations': 'automation.read',
  '/reminders': 'reminders.read',
  '/month-end': 'accounting.manage',
  '/audit': 'audit.read',
  '/audit-logs': 'audit.read',
  '/reconciliation': 'reconciliation.read',
  '/bank-reconciliation': 'reconciliation.read',
  '/internal-controls': 'internal_controls.read',
  '/compliance': 'compliance.read',
  '/exceptions': 'exceptions.read',
  '/risk-flags': 'risk_flags.read',
  '/integrations': 'integrations.manage',
  '/communication-templates': 'communication_templates.read',
  '/webhooks': 'integrations.manage',
  '/documents': 'documents.read',
  '/notifications': 'notifications.read',
};

function getAuthorizedNavItems(perms, roleName) {
  const isSuperAdmin = roleName.toUpperCase() === 'SUPER ADMIN' || perms.includes('*');
  const hasPermission = (p) => isSuperAdmin || perms.includes(p);
  const hasRole = (r) => isSuperAdmin || (Array.isArray(r) ? r.includes(roleName) : r === roleName);

  return NAV_ITEMS.map((item) => {
    if (item.hideIfPermission && hasPermission(item.hideIfPermission)) {
      return null;
    }
    if (!item.children) {
      if (item.permission && !hasPermission(item.permission)) return null;
      if (item.role && !hasRole(item.role)) return null;
      return item;
    }
    const authorizedChildren = item.children.filter((child) => {
      if (child.permission && !hasPermission(child.permission)) return false;
      if (child.role && !hasRole(child.role)) return false;
      return true;
    });
    if (authorizedChildren.length === 0) return null;
    return { ...item, children: authorizedChildren };
  }).filter(Boolean);
}

function checkRouteAccess(path, perms, roleName) {
  const isSuperAdmin = roleName.toUpperCase() === 'SUPER ADMIN' || perms.includes('*');
  if (isSuperAdmin) return true;
  if (path === '/dashboard') return perms.includes('dashboard.read');

  const sortedPrefixes = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      const required = ROUTE_PERMISSIONS[prefix];
      return perms.includes(required);
    }
  }
  return true;
}

async function runRbacVerification() {
  console.log('========================================================================');
  console.log('🔒 DIU INVESTMENT CLUB: 8-ROLE RBAC & NAVIGATION AUDIT SUITE');
  console.log('========================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, extraInfo = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
    }
  }

  // Fetch all roles and permissions
  const { data: roles, error: rolesErr } = await supabase.from('roles').select('*').order('name');
  if (rolesErr || !roles) {
    console.error('Failed to load roles from Supabase:', rolesErr);
    process.exit(1);
  }

  const { data: rolePerms, error: rpErr } = await supabase
    .from('role_permissions')
    .select('role_id, permission:permissions(module, action)');
  if (rpErr) {
    console.error('Failed to load role permissions:', rpErr);
    process.exit(1);
  }

  // Build role permission map
  const roleMap = {};
  for (const r of roles) {
    const pList = rolePerms
      .filter((rp) => rp.role_id === r.id && rp.permission)
      .map((rp) => `${rp.permission.module}.${rp.permission.action}`);
    roleMap[r.name] = pList;
  }

  console.log('📋 Loaded Roles & Permission Counts:');
  for (const [rName, perms] of Object.entries(roleMap)) {
    console.log(`  • ${rName.padEnd(20)}: ${perms.length} permissions`);
  }
  console.log('\n------------------------------------------------------------------------');

  // TEST 1: SUPER ADMIN
  console.log('\n👑 [ROLE 1: Super Admin]');
  const saPerms = roleMap['Super Admin'] || [];
  assert(saPerms.length > 250, 'Super Admin has master permission set (>250 perms)');
  const saNav = getAuthorizedNavItems(saPerms, 'Super Admin');
  assert(saNav.some((n) => n.title === 'Administration'), 'Super Admin sees Administration in navigation');
  assert(checkRouteAccess('/users', saPerms, 'Super Admin'), 'Super Admin can access /users');
  assert(checkRouteAccess('/roles', saPerms, 'Super Admin'), 'Super Admin can access /roles');

  // TEST 2: AUDITOR
  console.log('\n🔎 [ROLE 2: Auditor]');
  const audPerms = roleMap['Auditor'] || [];
  const writePerms = audPerms.filter((p) =>
    p.endsWith('.create') || p.endsWith('.update') || p.endsWith('.delete') ||
    p.endsWith('.approve') || p.endsWith('.manage') || p.endsWith('.pay')
  );
  assert(writePerms.length === 0, 'Auditor has ZERO write/approve/delete permissions', writePerms.join(', '));
  assert(audPerms.includes('audit_logs.read') && audPerms.includes('reports.read'), 'Auditor has audit_logs.read and reports.read');
  const audNav = getAuthorizedNavItems(audPerms, 'Auditor');
  assert(audNav.some((n) => n.title === 'Audit & Compliance'), 'Auditor sees Audit & Compliance menu');
  assert(audNav.some((n) => n.title === 'Reports'), 'Auditor sees Reports menu');
  assert(!audNav.some((n) => n.title === 'Administration'), 'Auditor CANNOT see Administration menu');
  assert(checkRouteAccess('/audit', audPerms, 'Auditor'), 'Auditor can access /audit');
  assert(checkRouteAccess('/reports', audPerms, 'Auditor'), 'Auditor can access /reports');
  assert(!checkRouteAccess('/income/create', audPerms, 'Auditor'), 'Auditor CANNOT access /income/create (Blocked)');
  assert(!checkRouteAccess('/expenses/create', audPerms, 'Auditor'), 'Auditor CANNOT access /expenses/create (Blocked)');
  assert(!checkRouteAccess('/accounts/create', audPerms, 'Auditor'), 'Auditor CANNOT access /accounts/create (Blocked)');
  assert(!checkRouteAccess('/roles', audPerms, 'Auditor'), 'Auditor CANNOT access /roles (Blocked)');

  // TEST 3: GENERAL MEMBER
  console.log('\n👤 [ROLE 3: General Member]');
  const gmPerms = roleMap['General Member'] || [];
  assert(gmPerms.length === 4, `General Member has exactly 4 scoped permissions (got ${gmPerms.length})`);
  assert(gmPerms.includes('dashboard.read') && gmPerms.includes('events.read') &&
         gmPerms.includes('tasks.read') && gmPerms.includes('notifications.read'),
         'General Member has exact allowed perms: dashboard, events, tasks, notifications');
  const gmNav = getAuthorizedNavItems(gmPerms, 'General Member');
  const gmTitles = gmNav.map((n) => n.title);
  assert(gmTitles.includes('Dashboard'), 'General Member sees Dashboard');
  assert(gmTitles.includes('My Tasks'), 'General Member sees My Tasks (top-level)');
  assert(gmTitles.includes('Club Events'), 'General Member sees Club Events');
  assert(gmTitles.includes('Notifications'), 'General Member sees Notifications');
  assert(!gmTitles.includes('Financial Management'), 'General Member CANNOT see Financial Management');
  assert(!gmTitles.includes('Accounting'), 'General Member CANNOT see Accounting');
  assert(!gmTitles.includes('Operations & Governance'), 'General Member CANNOT see Operations & Governance');
  assert(!gmTitles.includes('Administration'), 'General Member CANNOT see Administration');
  assert(!gmTitles.includes('Audit & Compliance'), 'General Member CANNOT see Audit & Compliance');
  assert(!checkRouteAccess('/accounts', gmPerms, 'General Member'), 'General Member blocked from /accounts');
  assert(!checkRouteAccess('/transactions', gmPerms, 'General Member'), 'General Member blocked from /transactions');
  assert(!checkRouteAccess('/members', gmPerms, 'General Member'), 'General Member blocked from /members');
  assert(!checkRouteAccess('/roles', gmPerms, 'General Member'), 'General Member blocked from /roles');
  assert(checkRouteAccess('/dashboard', gmPerms, 'General Member'), 'General Member allowed on /dashboard');
  assert(checkRouteAccess('/events', gmPerms, 'General Member'), 'General Member allowed on /events');
  assert(checkRouteAccess('/tasks', gmPerms, 'General Member'), 'General Member allowed on /tasks');

  // TEST 4: TREASURER
  console.log('\n💰 [ROLE 4: Treasurer]');
  const trPerms = roleMap['Treasurer'] || [];
  assert(trPerms.includes('financial_accounts.read') && trPerms.includes('expenses.approve'), 'Treasurer has finance read & expense approval');
  const trNav = getAuthorizedNavItems(trPerms, 'Treasurer');
  assert(trNav.some((n) => n.title === 'Financial Management'), 'Treasurer sees Financial Management');
  assert(trNav.some((n) => n.title === 'Accounting'), 'Treasurer sees Accounting');
  assert(!trNav.some((n) => n.title === 'Administration'), 'Treasurer CANNOT see Administration');
  assert(!checkRouteAccess('/roles', trPerms, 'Treasurer'), 'Treasurer blocked from /roles');

  // TEST 5: PRESIDENT
  console.log('\n🏛️ [ROLE 5: President]');
  const prPerms = roleMap['President'] || [];
  assert(prPerms.includes('approvals.read') && prPerms.includes('budgets.read'), 'President has approvals and budget visibility');
  const prNav = getAuthorizedNavItems(prPerms, 'President');
  assert(prNav.some((n) => n.title === 'Approvals'), 'President sees Approvals');
  assert(prNav.some((n) => n.title === 'Operations & Governance'), 'President sees Operations & Governance');
  assert(!prNav.some((n) => n.title === 'Administration'), 'President CANNOT see Administration');
  assert(!checkRouteAccess('/roles', prPerms, 'President'), 'President blocked from /roles (Super Admin only)');

  // TEST 6: GENERAL SECRETARY
  console.log('\n📜 [ROLE 6: General Secretary]');
  const gsPerms = roleMap['General Secretary'] || [];
  assert(gsPerms.includes('meetings.read') && gsPerms.includes('events.read'), 'General Secretary has meetings and events access');
  const gsNav = getAuthorizedNavItems(gsPerms, 'General Secretary');
  assert(gsNav.some((n) => n.title === 'Operations & Governance'), 'General Secretary sees Operations & Governance');
  assert(!gsNav.some((n) => n.title === 'Administration'), 'General Secretary CANNOT see Administration');

  // TEST 7: EVENT MANAGER
  console.log('\n🎪 [ROLE 7: Event Manager]');
  const emPerms = roleMap['Event Manager'] || [];
  assert(emPerms.includes('events.create') && emPerms.includes('events.read'), 'Event Manager can create and read events');
  assert(!emPerms.includes('financial_accounts.create'), 'Event Manager CANNOT create financial accounts');
  const emNav = getAuthorizedNavItems(emPerms, 'Event Manager');
  assert(emNav.some((n) => n.title === 'Club Events'), 'Event Manager sees Club Events');
  assert(!emNav.some((n) => n.title === 'Administration'), 'Event Manager CANNOT see Administration');

  // TEST 8: EXECUTIVE MEMBER
  console.log('\n🤝 [ROLE 8: Executive Member]');
  const execPerms = roleMap['Executive Member'] || [];
  assert(execPerms.includes('expenses.create') && !execPerms.includes('expenses.approve'), 'Executive Member can create expenses but CANNOT approve');
  const execNav = getAuthorizedNavItems(execPerms, 'Executive Member');
  assert(execNav.some((n) => n.title === 'Operations & Governance'), 'Executive Member sees Operations & Governance');
  assert(!execNav.some((n) => n.title === 'Administration'), 'Executive Member CANNOT see Administration');
  assert(!execNav.some((n) => n.title === 'Accounting'), 'Executive Member CANNOT see Accounting');

  console.log('\n========================================================================');
  console.log(`📊 FINAL RESULT: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 8 ROLES RBAC & NAVIGATION CHECKS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runRbacVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
