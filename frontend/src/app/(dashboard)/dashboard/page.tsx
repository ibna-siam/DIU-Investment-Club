'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { formatBDT, formatDateTime } from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  History,
  Building2,
  Smartphone,
  Coins,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckSquare,
  Calendar,
  FileCheck,
  Bell,
  Inbox,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, hasPermission, hasRole } = useAuth();

  const canReadFinance =
    hasPermission('financial_accounts.read') ||
    hasPermission('income.read') ||
    hasPermission('expenses.read') ||
    hasPermission('cash_flow.read');

  // Primary Financial Stats Query (only enabled if authorized)
  const { data: statsData, isLoading: statsLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats'),
    enabled: canReadFinance,
  });

  // Operational Stats Queries (Real data, conditioned on permission)
  const { data: approvalsData, isLoading: approvalsLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['dashboard-pending-approvals'],
    queryFn: () => api.get('/approvals?status=PENDING'),
    enabled: hasPermission('approvals.read'),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['dashboard-active-tasks'],
    queryFn: () => api.get('/tasks?status=IN_PROGRESS'),
    enabled: hasPermission('tasks.read'),
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['dashboard-upcoming-events'],
    queryFn: () => api.get('/events?status=PUBLISHED'),
    enabled: hasPermission('events.read'),
  });

  const { data: notificationsData, isLoading: notificationsLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['dashboard-recent-notifications'],
    queryFn: () => api.get('/notifications'),
    enabled: hasPermission('notifications.read'),
  });

  const dashboardData = statsData?.data;
  const financial = dashboardData?.financial || {
    total_available_balance: 0,
    cash_balance: 0,
    bank_balance: 0,
    mobile_balance: 0,
    total_income: 0,
    total_expenses: 0,
    current_month_income: 0,
    current_month_expenses: 0,
    recent_transactions: [],
  };

  const netMonthly = (financial.current_month_income || 0) - (financial.current_month_expenses || 0);
  const recentTransactions = financial.recent_transactions || [];
  const pendingApprovalsCount = approvalsData?.data?.length || 0;
  const activeTasksCount = tasksData?.data?.length || 0;
  const upcomingEventsCount = eventsData?.data?.length || 0;
  const recentNotifications = notificationsData?.data?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* 1. Executive Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-black/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>DIU Investment Club ERP • System Operational</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.full_name || 'Executive'}!
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Enterprise financial management, automated double-entry ledger oversight, and club operational governance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            {hasPermission('income.create') && (
              <Link href="/income/create">
                <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-lg shadow-emerald-950/60 font-semibold">
                  <Plus className="h-4 w-4" />
                  <span>Record Income</span>
                </Button>
              </Link>
            )}
            {hasPermission('expenses.create') && (
              <Link href="/expenses/create">
                <Button variant="secondary" size="sm" className="bg-rose-600 hover:bg-rose-500 text-white gap-1.5 shadow-lg shadow-rose-950/60 font-semibold">
                  <Plus className="h-4 w-4" />
                  <span>Record Expense</span>
                </Button>
              </Link>
            )}
            {(hasPermission('financial_accounts.read') || hasPermission('accounts.read')) && (
              <Link href="/accounts">
                <Button variant="outline" size="sm" className="gap-1.5 border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white font-medium">
                  <Wallet className="h-4 w-4 text-indigo-400" />
                  <span>Accounts</span>
                </Button>
              </Link>
            )}
            {hasPermission('transactions.read') && (
              <Link href="/transactions">
                <Button variant="outline" size="sm" className="gap-1.5 border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white font-medium">
                  <History className="h-4 w-4 text-emerald-400" />
                  <span>Transactions</span>
                </Button>
              </Link>
            )}
            {hasPermission('fund_transfers.create') && (
              <Link href="/fund-transfers">
                <Button variant="outline" size="sm" className="gap-1.5 border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white font-medium">
                  <ArrowDownRight className="h-4 w-4 text-amber-400" />
                  <span>Transfer Funds</span>
                </Button>
              </Link>
            )}
            {hasPermission('approvals.read') && (
              <Link href="/approvals">
                <Button variant="outline" size="sm" className="gap-1.5 border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white font-medium">
                  <FileCheck className="h-4 w-4 text-cyan-400" />
                  <span>Approvals</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Non-financial member workspace banner */}
      {!canReadFinance && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Member Workspace</h2>
              <p className="text-xs text-slate-400">Welcome to your DIU Investment Club portal. View your assigned tasks, events, and club notifications.</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Core Financial Metric Cards (Only shown if user has financial read permissions) */}
      {canReadFinance && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Club Balance */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Club Balance</span>
              <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                {statsLoading ? <Skeleton className="h-8 w-32 bg-slate-800" /> : formatBDT(financial.total_available_balance)}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                Across all verified accounts
              </span>
            </div>
          </div>

          {/* Month Inflow (Income) */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Month Inflow (Income)</span>
              <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight">
                {statsLoading ? <Skeleton className="h-8 w-28 bg-slate-800" /> : formatBDT(financial.current_month_income)}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                Realized completed income
              </span>
            </div>
          </div>

          {/* Month Outflow (Expenses) */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Month Outflow (Expenses)</span>
              <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/30">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-bold text-rose-400 font-mono tracking-tight">
                {statsLoading ? <Skeleton className="h-8 w-28 bg-slate-800" /> : formatBDT(financial.current_month_expenses)}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                Disbursed and approved expenses
              </span>
            </div>
          </div>

          {/* Net Monthly Cash Flow */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Monthly Cash Flow</span>
              <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                netMonthly >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {statsLoading ? <Skeleton className="h-8 w-28 bg-slate-800" /> : `${netMonthly >= 0 ? '+' : ''}${formatBDT(netMonthly)}`}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                {netMonthly >= 0 ? 'Net positive surplus' : 'Net deficit balance'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Account Type Distribution Cards (Only shown if authorized) */}
      {(hasPermission('financial_accounts.read') || hasPermission('accounts.read')) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/accounts"
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-md flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Cash in Hand</span>
                <span className="text-lg font-bold text-amber-300 font-mono">{formatBDT(financial.cash_balance)}</span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 transition-colors" />
          </Link>

          <Link
            href="/accounts"
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-md flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-500/15 text-sky-400 rounded-xl border border-sky-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Bank Accounts</span>
                <span className="text-lg font-bold text-sky-300 font-mono">{formatBDT(financial.bank_balance)}</span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-sky-300 transition-colors" />
          </Link>

          <Link
            href="/accounts"
            className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-md flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-500/15 text-pink-400 rounded-xl border border-pink-500/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Digital Wallets (MFS)</span>
                <span className="text-lg font-bold text-pink-300 font-mono">{formatBDT(financial.mobile_balance)}</span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-pink-300 transition-colors" />
          </Link>
        </div>
      )}

      {/* 4. Operational Summary (Approvals, Tasks, Events) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Pending Approvals */}
        <Link
          href="/approvals"
          className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Pending Approvals</h3>
                <p className="text-[11px] text-slate-400">Vouchers & disbursements</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 transition-colors" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {approvalsLoading ? <Skeleton className="h-7 w-12 bg-slate-800" /> : pendingApprovalsCount}
            </span>
            <span className="text-xs font-semibold text-amber-400">
              {pendingApprovalsCount > 0 ? 'Requires action' : 'All clear'}
            </span>
          </div>
        </Link>

        {/* Active Tasks */}
        <Link
          href="/tasks"
          className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Active Club Tasks</h3>
                <p className="text-[11px] text-slate-400">Operational responsibilities</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-300 transition-colors" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {tasksLoading ? <Skeleton className="h-7 w-12 bg-slate-800" /> : activeTasksCount}
            </span>
            <span className="text-xs font-semibold text-purple-400">
              {activeTasksCount > 0 ? 'In progress' : 'No active tasks'}
            </span>
          </div>
        </Link>

        {/* Upcoming Events */}
        <Link
          href="/events"
          className="p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">Upcoming Events</h3>
                <p className="text-[11px] text-slate-400">Workshops & competitions</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-sky-300 transition-colors" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {eventsLoading ? <Skeleton className="h-7 w-12 bg-slate-800" /> : upcomingEventsCount}
            </span>
            <span className="text-xs font-semibold text-sky-400">
              {upcomingEventsCount > 0 ? 'Scheduled' : 'None scheduled'}
            </span>
          </div>
        </Link>
      </div>

      {/* 5. Real-time Central Ledger Transactions Feed (Only shown if authorized) */}
      {hasPermission('transactions.read') && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Recent Financial Transactions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live double-entry activity feed from the central financial ledger.
              </p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60"
            >
              Full Ledger <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {statsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center text-slate-400 text-sm">
              <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">No financial transactions recorded yet.</p>
              <p className="text-xs text-slate-500 mt-1">Transactions recorded in accounts or income/expenses appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-300 uppercase tracking-wider bg-slate-800/80 border-b border-slate-700/80">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Txn #</th>
                    <th className="py-3 px-4 font-semibold">Account</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 font-semibold">Category / Memo</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentTransactions.map((txn: any) => {
                    const isCredit = txn.direction === 'CREDIT' || txn.type === 'INCOME' || txn.type === 'OPENING_BALANCE';
                    return (
                      <tr key={txn.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                          {formatDateTime(txn.date || txn.created_at)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-400 whitespace-nowrap">
                          {txn.transaction_number}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-200 whitespace-nowrap font-medium">
                          {txn.account_name}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={txn.type || (isCredit ? 'CREDIT' : 'DEBIT')} type="transaction" />
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300 max-w-xs truncate">
                          {txn.description || txn.category || 'General Transaction'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold text-sm whitespace-nowrap ${
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isCredit ? '+' : '-'} {formatBDT(txn.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-300 whitespace-nowrap">
                          {formatBDT(txn.balance_after)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Recent Operational Activity & Notifications Feed */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-400" />
              Operational Activity Feed
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live updates on member payments, approvals, and executive alerts.
            </p>
          </div>
          <Link
            href="/notifications"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60"
          >
            All Activity <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {notificationsLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-slate-400">
            <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">No recent operational activity</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Club notifications and events will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentNotifications.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-850/60 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-200 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.message}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 shrink-0 ml-4">
                  <span className="text-[10px] font-mono text-slate-500">
                    {formatDateTime(item.created_at)}
                  </span>
                  {item.link && (
                    <Link
                      href={item.link}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
