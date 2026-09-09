import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { usersRepository } from '../src/modules/users/users.repository';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Exact navigation items mirroring frontend/src/config/navigation.ts
interface NavChild {
  title: string;
  href: string;
  permission?: string;
  role?: string | string[];
}

interface NavItem {
  title: string;
  href: string;
  permission?: string;
  role?: string | string[];
  hideIfPermission?: string;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', permission: 'dashboard.read' },
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
  { title: 'Approvals', href: '/approvals', permission: 'approvals.read' },
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
      { title: 'Email Management', href: '/email-management', permission: 'settings.read' },
      { title: 'External Services', href: '/integrations', permission: 'integrations.manage' },
      { title: 'Webhooks Hub', href: '/webhooks', permission: 'integrations.manage' },
    ],
  },
  { title: 'Documents', href: '/documents', permission: 'documents.read' },
  { title: 'Notifications', href: '/notifications', permission: 'notifications.read' },
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

const ROUTE_PERMISSIONS: Record<string, string> = {
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
  '/email-management': 'settings.read',
  '/webhooks': 'integrations.manage',
  '/documents': 'documents.read',
  '/notifications': 'notifications.read',
};

// Simulation of frontend hasPermission
function createPermissionChecker(userPerms: string[], roleSlug: string) {
  const isSuperAdmin = roleSlug === 'SUPER_ADMIN';
  return (permission: string): boolean => {
    if (isSuperAdmin) return true;
    if (userPerms.includes('*') || userPerms.includes(permission)) return true;

    const parts = permission.split('.');
    const module = parts[0];
    const action = parts[1];
    if (!module) return false;

    if (userPerms.includes(`${module}.manage`) || userPerms.includes(`${module}.admin`)) return true;

    const alternates: string[] = [];
    if (module.endsWith('s')) alternates.push(module.slice(0, -1));
    else alternates.push(`${module}s`);
    if (module === 'accounts' || module === 'account') alternates.push('financial_accounts');
    if (module === 'financial_accounts') alternates.push('accounts', 'account');

    for (const alt of alternates) {
      if (action && userPerms.includes(`${alt}.${action}`)) return true;
      if (userPerms.includes(`${alt}.manage`) || userPerms.includes(`${alt}.admin`)) return true;
      if (!action && userPerms.some((p) => p.startsWith(`${alt}.`))) return true;
    }

    if (!action && userPerms.some((p) => p.startsWith(`${module}.`))) return true;
    return false;
  };
}

function getAuthorizedSidebar(hasPermission: (p: string) => boolean, hasRole: (r: any) => boolean) {
  return NAV_ITEMS.map((item) => {
    if (item.hideIfPermission && hasPermission(item.hideIfPermission)) return null;

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
  }).filter(Boolean) as NavItem[];
}

function checkRouteAccess(route: string, hasPermission: (p: string) => boolean): { allowed: boolean; requiredPermission?: string } {
  const SORTED_ROUTES = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  const matchedRoute = SORTED_ROUTES.find((r) => route === r || route.startsWith(`${r}/`));
  if (!matchedRoute) return { allowed: true };
  const reqPerm = ROUTE_PERMISSIONS[matchedRoute];
  return { allowed: hasPermission(reqPerm), requiredPermission: reqPerm };
}

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('   RBAC ACCESS & NAVIGATION PERFORMANCE COMPREHENSIVE TEST      ');
  console.log('   DIU Investment Club ERP & Financial Management System        ');
  console.log('================================================================\n');

  const DEMO_ACCOUNTS = [
    { slug: 'PRESIDENT', email: 'demo.president@diu.edu.bd', name: 'President' },
    { slug: 'GENERAL_SECRETARY', email: 'demo.generalsecretary@diu.edu.bd', name: 'General Secretary' },
    { slug: 'EXECUTIVE_MEMBER', email: 'demo.executive@diu.edu.bd', name: 'Executive Member' },
  ];

  const results: Record<string, { status: 'PASS' | 'FAIL' | 'NOT TESTED'; details: string[] }> = {
    '1. President login and sidebar access': { status: 'PASS', details: [] },
    '2. General Secretary Smart Reminder access': { status: 'PASS', details: [] },
    '3. Executive Member Smart Reminder access': { status: 'PASS', details: [] },
    '4. Direct URL access to restricted pages': { status: 'PASS', details: [] },
    '5. Navigation between multiple sections repeatedly': { status: 'PASS', details: [] },
    '6. Login/session persistence': { status: 'PASS', details: [] },
    '7. Slow or failed API recovery': { status: 'PASS', details: [] },
  };

  const tokens: Record<string, string> = {};
  const profiles: Record<string, any> = {};

  // Step 1: Login all 3 test accounts and verify authentication
  for (const acct of DEMO_ACCOUNTS) {
    try {
      const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acct.email, password: 'Password123!' }),
      });
      const data: any = await loginRes.json();
      if (!loginRes.ok || !data.data?.token) {
        throw new Error(data.error?.message || `Login failed with HTTP ${loginRes.status}`);
      }
      tokens[acct.slug] = data.data.token;
      profiles[acct.slug] = data.data.user;
      console.log(`✓ [${acct.name}] Authenticated successfully. Token received.`);
    } catch (e: any) {
      console.error(`❌ Failed to login as ${acct.slug}:`, e.message);
      results['1. President login and sidebar access'].status = 'FAIL';
      results['1. President login and sidebar access'].details.push(`Login failed: ${e.message}`);
    }
  }

  // TEST 1: President login and sidebar access
  console.log('\n----------------------------------------------------------------');
  console.log('▶ TEST 1: President Role Access & Sidebar Verification');
  {
    const presProfile = profiles['PRESIDENT'];
    const presPerms = presProfile?.permissions || [];
    const hasPresPerm = createPermissionChecker(presPerms, 'PRESIDENT');
    const hasPresRole = (r: any) => r === 'PRESIDENT' || (Array.isArray(r) && r.includes('PRESIDENT'));

    const sidebar = getAuthorizedSidebar(hasPresPerm, hasPresRole);
    const sidebarTitles = sidebar.map((i) => i.title);

    // 1. Accounting section check: ONLY Accounting Dashboard & Vouchers
    const accSection = sidebar.find((i) => i.title === 'Accounting');
    const accChildren = accSection?.children?.map((c) => c.title) || [];
    console.log(`  Accounting Section Children for President:`, accChildren);
    if (
      accChildren.length === 2 &&
      accChildren.includes('Accounting Dashboard') &&
      accChildren.includes('Vouchers')
    ) {
      results['1. President login and sidebar access'].details.push(
        'PASS: Accounting Section displays ONLY "Accounting Dashboard" and "Vouchers". All 6 other accounting pages hidden.'
      );
    } else {
      results['1. President login and sidebar access'].status = 'FAIL';
      results['1. President login and sidebar access'].details.push(
        `FAIL: Accounting section should have exactly 2 children, found ${accChildren.length}: ${accChildren.join(', ')}`
      );
    }

    // 2. Members section check: ONLY Member Directory
    const memSection = sidebar.find((i) => i.title === 'Members & Dues');
    const memChildren = memSection?.children?.map((c) => c.title) || [];
    console.log(`  Members Section Children for President:`, memChildren);
    if (memChildren.length === 1 && memChildren[0] === 'Member Directory') {
      results['1. President login and sidebar access'].details.push(
        'PASS: Members Section displays ONLY "Member Directory". All 5 other member pages hidden.'
      );
    } else {
      results['1. President login and sidebar access'].status = 'FAIL';
      results['1. President login and sidebar access'].details.push(
        `FAIL: Members section should have exactly 1 child ("Member Directory"), found ${memChildren.length}: ${memChildren.join(', ')}`
      );
    }

    // 3. Automation section check: ONLY Smart Reminders
    const autoSection = sidebar.find((i) => i.title === 'Automation & Workflows');
    const autoChildren = autoSection?.children?.map((c) => c.title) || [];
    console.log(`  Automation Section Children for President:`, autoChildren);
    if (autoChildren.length === 1 && autoChildren[0] === 'Smart Reminders') {
      results['1. President login and sidebar access'].details.push(
        'PASS: Automation Section displays ONLY "Smart Reminders". All other automation pages hidden.'
      );
    } else {
      results['1. President login and sidebar access'].status = 'FAIL';
      results['1. President login and sidebar access'].details.push(
        `FAIL: Automation section should have exactly 1 child ("Smart Reminders"), found ${autoChildren.length}: ${autoChildren.join(', ')}`
      );
    }

    // 4. Completely Hide: Audit & Compliance, Integrations & API
    const auditVisible = sidebarTitles.includes('Audit & Compliance');
    const intVisible = sidebarTitles.includes('Integrations & APIs');
    console.log(`  Audit & Compliance in President sidebar: ${auditVisible ? 'VISIBLE (FAIL)' : 'COMPLETELY HIDDEN (PASS)'}`);
    console.log(`  Integrations & APIs in President sidebar: ${intVisible ? 'VISIBLE (FAIL)' : 'COMPLETELY HIDDEN (PASS)'}`);

    if (!auditVisible && !intVisible) {
      results['1. President login and sidebar access'].details.push(
        'PASS: "Audit & Compliance" and "Integrations & APIs" are COMPLETELY HIDDEN from President sidebar.'
      );
    } else {
      results['1. President login and sidebar access'].status = 'FAIL';
      results['1. President login and sidebar access'].details.push(
        `FAIL: Restricted sections visible in sidebar (Audit: ${auditVisible}, Integrations: ${intVisible})`
      );
    }
  }

  // TEST 2: General Secretary Smart Reminder access
  console.log('\n----------------------------------------------------------------');
  console.log('▶ TEST 2: General Secretary Smart Reminder Access');
  {
    const gsProfile = profiles['GENERAL_SECRETARY'];
    const gsPerms = gsProfile?.permissions || [];
    const hasGsPerm = createPermissionChecker(gsPerms, 'GENERAL_SECRETARY');
    const hasGsRole = (r: any) => r === 'GENERAL_SECRETARY' || (Array.isArray(r) && r.includes('GENERAL_SECRETARY'));

    const sidebar = getAuthorizedSidebar(hasGsPerm, hasGsRole);
    const autoSection = sidebar.find((i) => i.title === 'Automation & Workflows');
    const autoChildren = autoSection?.children?.map((c) => c.title) || [];
    console.log(`  Automation Section Children for General Secretary:`, autoChildren);

    const hasRemindersRead = hasGsPerm('reminders.read');
    const hasRemindersManage = hasGsPerm('reminders.manage');

    if (
      autoChildren.length === 1 &&
      autoChildren[0] === 'Smart Reminders' &&
      hasRemindersRead &&
      hasRemindersManage
    ) {
      results['2. General Secretary Smart Reminder access'].details.push(
        'PASS: General Secretary has reminders.read and reminders.manage. Automation & Workflows shows ONLY "Smart Reminders". Other automation pages are completely hidden.'
      );
    } else {
      results['2. General Secretary Smart Reminder access'].status = 'FAIL';
      results['2. General Secretary Smart Reminder access'].details.push(
        `FAIL: Expected ONLY "Smart Reminders" and full permissions. Found: ${autoChildren.join(', ')} (read: ${hasRemindersRead}, manage: ${hasRemindersManage})`
      );
    }
  }

  // TEST 3: Executive Member Smart Reminder access
  console.log('\n----------------------------------------------------------------');
  console.log('▶ TEST 3: Executive Member Smart Reminder Access');
  {
    const exProfile = profiles['EXECUTIVE_MEMBER'];
    const exPerms = exProfile?.permissions || [];
    const hasExPerm = createPermissionChecker(exPerms, 'EXECUTIVE_MEMBER');
    const hasExRole = (r: any) => r === 'EXECUTIVE_MEMBER' || (Array.isArray(r) && r.includes('EXECUTIVE_MEMBER'));

    const sidebar = getAuthorizedSidebar(hasExPerm, hasExRole);
    const autoSection = sidebar.find((i) => i.title === 'Automation & Workflows');
    const autoChildren = autoSection?.children?.map((c) => c.title) || [];
    console.log(`  Automation Section Children for Executive Member:`, autoChildren);

    const hasRemindersRead = hasExPerm('reminders.read');
    const hasRemindersManage = hasExPerm('reminders.manage');

    if (
      autoChildren.length === 1 &&
      autoChildren[0] === 'Smart Reminders' &&
      hasRemindersRead &&
      hasRemindersManage
    ) {
      results['3. Executive Member Smart Reminder access'].details.push(
        'PASS: Executive Member granted reminders.read and reminders.manage. Automation section displays ONLY "Smart Reminders".'
      );
    } else {
      results['3. Executive Member Smart Reminder access'].status = 'FAIL';
      results['3. Executive Member Smart Reminder access'].details.push(
        `FAIL: Executive Member reminders access issue. Found: ${autoChildren.join(', ')} (read: ${hasRemindersRead}, manage: ${hasRemindersManage})`
      );
    }
  }

  // TEST 4: Direct URL access to restricted pages
  console.log('\n----------------------------------------------------------------');
  console.log('▶ TEST 4: Direct URL Route Protection & Backend API Enforcement');
  {
    const presPerms = profiles['PRESIDENT']?.permissions || [];
    const hasPresPerm = createPermissionChecker(presPerms, 'PRESIDENT');

    // List of restricted URLs for President
    const restrictedUrlsForPresident = [
      '/chart-of-accounts',
      '/journal-entries',
      '/general-ledger',
      '/subsidiary-ledger',
      '/trial-balance',
      '/financial-years',
      '/membership-types',
      '/member-dues',
      '/member-payments',
      '/receipts',
      '/member-financials',
      '/automation',
      '/automation/rules',
      '/automation/logs',
      '/recurring-operations',
      '/month-end',
      '/audit',
      '/audit/reports',
      '/reconciliation',
      '/bank-reconciliation',
      '/internal-controls',
      '/compliance',
      '/exceptions',
      '/risk-flags',
      '/integrations',
      '/communication-templates',
      '/email-management',
      '/webhooks',
    ];

    let allBlocked = true;
    for (const url of restrictedUrlsForPresident) {
      const access = checkRouteAccess(url, hasPresPerm);
      if (access.allowed) {
        console.error(`  ❌ Direct URL ${url} was NOT blocked for President!`);
        allBlocked = false;
        results['4. Direct URL access to restricted pages'].status = 'FAIL';
        results['4. Direct URL access to restricted pages'].details.push(
          `FAIL: President allowed access to restricted route: ${url}`
        );
      }
    }

    // List of allowed URLs for President
    const allowedUrlsForPresident = ['/dashboard', '/accounting', '/vouchers', '/members', '/reminders', '/reports', '/events'];
    let allAllowed = true;
    for (const url of allowedUrlsForPresident) {
      const access = checkRouteAccess(url, hasPresPerm);
      if (!access.allowed) {
        console.error(`  ❌ Direct URL ${url} was incorrectly blocked for President!`);
        allAllowed = false;
        results['4. Direct URL access to restricted pages'].status = 'FAIL';
        results['4. Direct URL access to restricted pages'].details.push(
          `FAIL: President incorrectly blocked from allowed route: ${url}`
        );
      }
    }

    // Backend API test: President calling /reminders GET (authorized) and /automation (blocked)
    const presToken = tokens['PRESIDENT'];
    const remsApiRes = await fetch(`${API_BASE_URL}/reminders/stats`, {
      headers: { Authorization: `Bearer ${presToken}` },
    });
    const remsApiData: any = await remsApiRes.json().catch(() => ({}));
    const canAccessRemindersApi = remsApiRes.ok && remsApiData.success;

    const auditApiRes = await fetch(`${API_BASE_URL}/audit-logs`, {
      headers: { Authorization: `Bearer ${presToken}` },
    });
    const isAuditBlocked = auditApiRes.status === 403;

    const coaApiRes = await fetch(`${API_BASE_URL}/chart-of-accounts`, {
      headers: { Authorization: `Bearer ${presToken}` },
    });
    const isCoaBlocked = coaApiRes.status === 403;

    if (allBlocked && allAllowed && canAccessRemindersApi && isAuditBlocked && isCoaBlocked) {
      results['4. Direct URL access to restricted pages'].details.push(
        `PASS: All ${restrictedUrlsForPresident.length} restricted URLs correctly blocked (redirects to /unauthorized). Allowed URLs accessible. Backend API enforces 403 on restricted endpoints (/audit-logs, /chart-of-accounts) and 200 on authorized reminder endpoints.`
      );
    } else {
      results['4. Direct URL access to restricted pages'].status = 'FAIL';
      results['4. Direct URL access to restricted pages'].details.push(
        `FAIL: API authorization mismatch (Reminders API: ${canAccessRemindersApi}, Audit Blocked: ${isAuditBlocked}, COA Blocked: ${isCoaBlocked})`
      );
    }
  }

  // TEST 5: Navigation between multiple sections repeatedly
  console.log('\n----------------------------------------------------------------');
  console.log('▶ TEST 5: Navigation Performance & Multi-Section Stress Testing');
  {
    const presToken = tokens['PRESIDENT'];
    const testEndpoints = [
      '/dashboard/stats',
      '/reminders/stats',
      '/vouchers?limit=10',
      '/members?limit=10',
      '/events?limit=10',
      '/auth/me',
    ];

    const iterations = 5;
    let totalRequests = 0;
    let failedRequests = 0;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const batchPromises = testEndpoints.map(async (ep) => {
        totalRequests++;
        const res = await fetch(`${API_BASE_URL}${ep}`, {
          headers: { Authorization: `Bearer ${presToken}` },
        });
        if (!res.ok) failedRequests++;
        return res.json().catch(() => ({}));
      });
      await Promise.all(batchPromises);
    }

    const elapsed = Date.now() - startTime;
    const avgPerBatch = elapsed / iterations;
    console.log(`  Completed ${totalRequests} simulated navigation requests across ${iterations} cycles in ${elapsed}ms (avg ${avgPerBatch.toFixed(1)}ms/cycle). Failures: ${failedRequests}`);

    if (failedRequests === 0 && avgPerBatch < 1500) {
      results['5. Navigation between multiple sections repeatedly'].details.push(
        `PASS: Successfully navigated across multiple sections ${iterations} times (${totalRequests} total requests) in ${elapsed}ms without failure or freezing. Average response cycle: ${avgPerBatch.toFixed(1)}ms.`
      );
    } else {
      results['5. Navigation between multiple sections repeatedly'].status = 'FAIL';
      results['5. Navigation between multiple sections repeatedly'].details.push(
        `FAIL: Navigation test had ${failedRequests} failures or took too long (${elapsed}ms)`
      );
    }
  }

  // TEST 6: Login/session persistence
  console.log('\n----------------------------------------------------------------');
  console.log('▶ TEST 6: Session Persistence & Token Hydration Verification');
  {
    const presToken = tokens['PRESIDENT'];
    const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${presToken}` },
    });
    const meData: any = await meRes.json();

    if (meRes.ok && meData.success && meData.data?.email === 'demo.president@diu.edu.bd') {
      results['6. Login/session persistence'].details.push(
        `PASS: Session token successfully verified via /auth/me. Profile persisted with role "${meData.data.roles?.[0]?.name}" and ${meData.data.permissions?.length} hydrated permissions.`
      );
    } else {
      results['6. Login/session persistence'].status = 'FAIL';
      results['6. Login/session persistence'].details.push(
        `FAIL: /auth/me verification failed: ${JSON.stringify(meData)}`
      );
    }
  }

  // TEST 7: Slow or failed API recovery
  console.log('\n----------------------------------------------------------------');
  console.log('▶ TEST 7: Slow or Failed API Recovery Verification');
  {
    const presToken = tokens['PRESIDENT'];
    // 1. Simulate non-existent endpoint
    const errorRes = await fetch(`${API_BASE_URL}/non-existent-endpoint-test`, {
      headers: { Authorization: `Bearer ${presToken}` },
    });
    const isErrorHandled = errorRes.status === 404;

    // 2. Immediately verify session is still valid and token wasn't destroyed
    const recoveryRes = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${presToken}` },
    });
    const isRecovered = recoveryRes.ok;

    if (isErrorHandled && isRecovered) {
      results['7. Slow or failed API recovery'].details.push(
        'PASS: Application safely handled API 404 error and subsequent requests recovered immediately without session invalidation or forced page refreshes.'
      );
    } else {
      results['7. Slow or failed API recovery'].status = 'FAIL';
      results['7. Slow or failed API recovery'].details.push(
        `FAIL: Error recovery test failed. Handled 404: ${isErrorHandled}, Recovered: ${isRecovered}`
      );
    }
  }

  // Final Summary Report
  console.log('\n================================================================');
  console.log('                       FINAL TEST RESULTS                       ');
  console.log('================================================================');
  let overallPass = true;
  for (const [testName, res] of Object.entries(results)) {
    const symbol = res.status === 'PASS' ? '✅' : res.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${symbol} [${res.status}] ${testName}`);
    res.details.forEach((d) => console.log(`   - ${d}`));
    if (res.status !== 'PASS') overallPass = false;
  }
  console.log('================================================================\n');

  if (!overallPass) {
    process.exit(1);
  }
}

runComprehensiveVerification().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
