import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  Users,
  BookOpen,
  CheckCircle2,
  BarChart3,
  FolderLock,
  Bell,
  UserCog,
  Gift,
  Briefcase,
  Zap,
  ShieldAlert,
  Webhook,
  CheckSquare,
} from 'lucide-react';

export interface NavChildItem {
  title: string;
  href: string;
  permission?: string;
  role?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  role?: string;
  /** If specified, this item will only show if the user does NOT have this permission. Useful for fallback items like My Tasks for general members. */
  hideIfPermission?: string;
  children?: NavChildItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.read',
  },
  // Dedicated "My Tasks" item visible for users who do NOT have executive governance access ('operations.read')
  {
    title: 'My Tasks',
    href: '/tasks',
    icon: CheckSquare,
    permission: 'tasks.read',
    hideIfPermission: 'operations.read',
  },
  {
    title: 'Financial Management',
    href: '/accounts',
    icon: Wallet,
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
    icon: Calendar,
    children: [
      { title: 'All Events', href: '/events', permission: 'events.read' },
      { title: 'Create Event', href: '/events/create', permission: 'events.create' },
    ],
  },
  {
    title: 'Members & Dues',
    href: '/members',
    icon: Users,
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
    icon: Gift,
    children: [
      { title: 'Donations', href: '/donations', permission: 'donations.read' },
      { title: 'Sponsors', href: '/sponsors', permission: 'sponsors.read' },
      { title: 'Sponsorship Agreements', href: '/sponsorships', permission: 'sponsorships.read' },
    ],
  },
  {
    title: 'Accounting',
    href: '/accounting',
    icon: BookOpen,
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
    icon: CheckCircle2,
    permission: 'approvals.read',
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
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
    icon: Briefcase,
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
    icon: Zap,
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
    icon: ShieldAlert,
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
    icon: Webhook,
    children: [
      { title: 'Templates', href: '/communication-templates', permission: 'communication_templates.read' },
      { title: 'Email Management', href: '/email-management', permission: 'settings.read' },
      { title: 'External Services', href: '/integrations', permission: 'integrations.manage' },
      { title: 'Webhooks Hub', href: '/webhooks', permission: 'integrations.manage' },
    ],
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FolderLock,
    permission: 'documents.read',
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    permission: 'notifications.read',
  },
  {
    title: 'Administration',
    href: '/users',
    icon: UserCog,
    children: [
      { title: 'Users', href: '/users', permission: 'users.read' },
      { title: 'Roles & Permissions', href: '/roles', permission: 'roles.read' },
      { title: 'Settings', href: '/settings', permission: 'settings.read' },
    ],
  },
];

/**
 * Filter navigation items dynamically based on user's effective permissions.
 * Parent groups are ONLY shown if at least ONE child page is permitted.
 */
export function getAuthorizedNavItems(
  hasPermission: (permission: string) => boolean,
  hasRole: (role: string | string[]) => boolean
): NavItem[] {
  return NAV_ITEMS.map((item) => {
    // Check if this item is restricted by role or explicit permission
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

    // Parent group visibility rule: completely hide parent if user has zero accessible children
    if (authorizedChildren.length === 0) return null;

    return {
      ...item,
      children: authorizedChildren,
    };
  }).filter(Boolean) as NavItem[];
}

/**
 * Single Source of Truth for Route -> Required Permission mappings.
 * Every registered dashboard route is protected here.
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  // Main Dashboard
  '/dashboard': 'dashboard.read',

  // Specific sub-routes first (checked before parent routes)
  '/events/create': 'events.create',
  '/income/create': 'income.create',
  '/expenses/create': 'expenses.create',
  '/accounts/create': 'financial_accounts.create',
  '/automation/rules': 'automation.read',
  '/automation/logs': 'automation.logs_read',
  '/audit/reports': 'audit.read',

  // Administration
  '/users': 'users.read',
  '/roles': 'roles.read',
  '/settings': 'settings.read',

  // Financial Management
  '/accounts': 'financial_accounts.read',
  '/transactions': 'transactions.read',
  '/income': 'income.read',
  '/expenses': 'expenses.read',
  '/cash-flow': 'cash_flow.read',
  '/fund-transfers': 'fund_transfers.read',

  // Events
  '/events': 'events.read',

  // Members
  '/members': 'members.read',
  '/membership-types': 'membership_types.manage',
  '/member-dues': 'dues.read',
  '/member-payments': 'member_payments.read',
  '/receipts': 'receipts.read',
  '/member-financials': 'member_financials.read',

  // Revenue & Partners
  '/donations': 'donations.read',
  '/sponsors': 'sponsors.read',
  '/sponsorships': 'sponsorships.read',

  // Accounting
  '/accounting': 'accounting.read',
  '/chart-of-accounts': 'chart_of_accounts.read',
  '/journal-entries': 'journal_entries.read',
  '/vouchers': 'vouchers.read',
  '/general-ledger': 'general_ledger.read',
  '/subsidiary-ledger': 'subsidiary_ledger.read',
  '/trial-balance': 'trial_balance.read',
  '/financial-years': 'financial_years.read',

  // Approvals
  '/approvals': 'approvals.read',

  // Reports
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

  // Operations & Governance
  '/operations': 'operations.read',
  '/committee': 'committee.read',
  '/meetings': 'meetings.read',
  '/decisions': 'decisions.read',
  '/tasks': 'tasks.read',
  '/assets': 'assets.read',

  // Automation & Workflows
  '/automation': 'automation.read',
  '/recurring-operations': 'automation.read',
  '/reminders': 'reminders.read',
  '/month-end': 'accounting.manage',

  // Audit & Compliance
  '/audit': 'audit.read',
  '/audit-logs': 'audit.read',
  '/reconciliation': 'reconciliation.read',
  '/bank-reconciliation': 'reconciliation.read',
  '/internal-controls': 'internal_controls.read',
  '/compliance': 'compliance.read',
  '/exceptions': 'exceptions.read',
  '/risk-flags': 'risk_flags.read',

  // Integrations & APIs
  '/integrations': 'integrations.manage',
  '/communication-templates': 'communication_templates.read',
  '/email-management': 'settings.read',
  '/webhooks': 'integrations.manage',

  // Other Core Modules
  '/documents': 'documents.read',
  '/notifications': 'notifications.read',
};
