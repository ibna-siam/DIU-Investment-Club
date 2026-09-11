'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Scale,
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  Layers,
  RefreshCw,
  Plus,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { accountingService } from '../../../services/accounting.service';
import { AccountingDashboardSummary, JournalEntry } from '../../../types/accounting';
import { DataStateError } from '../../../components/ui/DataStateError';

export default function AccountingDashboardPage() {
  const [summary, setSummary] = useState<AccountingDashboardSummary | null>(null);
  const [recentJournals, setRecentJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [sumData, journalsData] = await Promise.all([
        accountingService.getDashboardSummary(),
        accountingService.getJournals({ limit: 5 } as any),
      ]);
      setSummary(sumData);
      setRecentJournals(journalsData.slice(0, 6));
    } catch (err) {
      console.error('Failed to load accounting dashboard data', err);
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncHistorical = async () => {
    try {
      setSyncing(true);
      setSyncSuccess(null);
      const res = await accountingService.syncHistorical();
      setSyncSuccess(`Historical synchronization successful! Processed transactions.`);
      await loadData();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-400">Loading General Ledger & Accounting Core...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-12">
        <DataStateError
          error={loadError}
          onRetry={loadData}
          moduleName="Accounting Dashboard"
        />
      </div>
    );
  }

  const formatTk = (val?: number) => {
    return `৳${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              Central Accounting Engine
            </span>
            <span className="text-xs font-medium text-slate-400">Double-Entry Ledger</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Executive Accounting Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time balance synchronization, verified journals, and audited financial statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncHistorical}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            {syncing ? 'Syncing...' : 'Sync Operations to Ledger'}
          </button>

          <Link
            href="/journal-entries/create"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 transition"
          >
            <Plus className="h-4 w-4" />
            New Journal Entry
          </Link>
        </div>
      </div>

      {syncSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300 backdrop-blur-md">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          <span>{syncSuccess}</span>
        </div>
      )}

      {/* Trial Balance Health Bar */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-xl ${
          summary?.is_trial_balance_equal
            ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-teal-950/30'
            : 'border-rose-500/30 bg-gradient-to-r from-rose-950/30 via-slate-900/60 to-amber-950/30'
        }`}
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${
                summary?.is_trial_balance_equal
                  ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 ring-rose-500/30'
              }`}
            >
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Trial Balance Mathematical Status</h2>
                {summary?.is_trial_balance_equal ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> PERFECTLY BALANCED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/20">
                    <AlertTriangle className="h-3 w-3" /> IMBALANCE DETECTED
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {summary?.is_trial_balance_equal
                  ? 'All posted journal lines satisfy Total Debits = Total Credits. No rounding discrepancy.'
                  : `Debit/Credit difference is ${formatTk(summary?.trial_balance_difference)}. Review draft or reversal entries.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/trial-balance"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-slate-700"
            >
              Inspect Trial Balance <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Assets */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Assets (1000)</span>
            <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-white">{formatTk(summary?.total_assets)}</div>
            <p className="mt-1 text-xs text-slate-400">Cash in Hand, Bank, MFS & Active Receivables</p>
          </div>
          <div className="mt-4 border-t border-slate-800/60 pt-3">
            <Link href="/chart-of-accounts?type=ASSET" className="text-xs text-blue-400 hover:text-blue-300">
              View Asset Accounts &rarr;
            </Link>
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Liabilities (2000)</span>
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-white">{formatTk(summary?.total_liabilities)}</div>
            <p className="mt-1 text-xs text-slate-400">Payables, Accrued Event Dues & Deferred Revenue</p>
          </div>
          <div className="mt-4 border-t border-slate-800/60 pt-3">
            <Link href="/chart-of-accounts?type=LIABILITY" className="text-xs text-amber-400 hover:text-amber-300">
              View Liability Accounts &rarr;
            </Link>
          </div>
        </div>

        {/* Club Equity / Accumulated Fund */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Accumulated Fund (3000)</span>
            <span className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <BookOpen className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-white">{formatTk(summary?.total_equity)}</div>
            <p className="mt-1 text-xs text-slate-400">Retained Surplus & Opening Balance Equity</p>
          </div>
          <div className="mt-4 border-t border-slate-800/60 pt-3">
            <Link href="/chart-of-accounts?type=EQUITY" className="text-xs text-purple-400 hover:text-purple-300">
              View Equity Heads &rarr;
            </Link>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Realized Revenue (4000)</span>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <ArrowDownRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-emerald-400">{formatTk(summary?.total_revenue)}</div>
            <p className="mt-1 text-xs text-slate-400">Dues, Donations, Sponsorships & Event Tickets</p>
          </div>
          <div className="mt-4 border-t border-slate-800/60 pt-3">
            <Link href="/chart-of-accounts?type=REVENUE" className="text-xs text-emerald-400 hover:text-emerald-300">
              View Revenue Streams &rarr;
            </Link>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Expenses (5000)</span>
            <span className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-rose-400">{formatTk(summary?.total_expenses)}</div>
            <p className="mt-1 text-xs text-slate-400">Event Costs, Admin, PR & Payment Processing</p>
          </div>
          <div className="mt-4 border-t border-slate-800/60 pt-3">
            <Link href="/chart-of-accounts?type=EXPENSE" className="text-xs text-rose-400 hover:text-rose-300">
              View Expense Heads &rarr;
            </Link>
          </div>
        </div>

        {/* Net Surplus / Deficit */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Surplus / (Deficit)</span>
            <span className="rounded-lg bg-teal-500/10 p-2 text-teal-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4">
            <div
              className={`text-2xl font-bold tracking-tight ${
                (summary?.net_surplus || 0) >= 0 ? 'text-teal-400' : 'text-rose-400'
              }`}
            >
              {formatTk(summary?.net_surplus)}
            </div>
            <p className="mt-1 text-xs text-slate-400">Revenue minus Expenses (Current Fiscal Position)</p>
          </div>
          <div className="mt-4 border-t border-slate-800/60 pt-3">
            <Link href="/general-ledger" className="text-xs text-teal-400 hover:text-teal-300">
              Open General Ledger &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Modules Quick Access & Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Navigation Cards */}
        <div className="space-y-3 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Accounting Navigation</h3>

          <Link
            href="/chart-of-accounts"
            className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition hover:border-emerald-500/40 hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Chart of Accounts</h4>
                <p className="text-xs text-slate-400">5-Head Hierarchical Structure</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Link>

          <Link
            href="/journal-entries"
            className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition hover:border-emerald-500/40 hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Journal Entries</h4>
                <p className="text-xs text-slate-400">Double-entry journals & reversals</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Link>

          <Link
            href="/vouchers"
            className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition hover:border-emerald-500/40 hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Vouchers System</h4>
                <p className="text-xs text-slate-400">Payment, Receipt, Contra, & Journal</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Link>

          <Link
            href="/general-ledger"
            className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition hover:border-emerald-500/40 hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">General Ledger</h4>
                <p className="text-xs text-slate-400">Account Statements & Running Balances</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Link>

          <Link
            href="/subsidiary-ledger"
            className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition hover:border-emerald-500/40 hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Subsidiary Ledger</h4>
                <p className="text-xs text-slate-400">Member, Sponsor, & Event Subledgers</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Link>

          <Link
            href="/financial-years"
            className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition hover:border-emerald-500/40 hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Accounting Periods</h4>
                <p className="text-xs text-slate-400">Period Locking & Fiscal Years</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Link>
        </div>

        {/* Recent Journal Entries Feed */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl lg:col-span-2 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Recent Journal Entries</h3>
              <p className="text-xs text-slate-400">Latest posted and draft double-entry postings</p>
            </div>
            <Link href="/journal-entries" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              View All &rarr;
            </Link>
          </div>

          <div className="mt-5 divide-y divide-slate-800/60">
            {recentJournals.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No journal entries found</p>
            ) : (
              recentJournals.map((je) => (
                <div key={je.id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                        je.status === 'POSTED'
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                          : je.status === 'REVERSED'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
                      }`}
                    >
                      {je.journal_number.split('-')[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{je.journal_number}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            je.status === 'POSTED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : je.status === 'REVERSED'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          }`}
                        >
                          {je.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-sm">{je.description}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{formatTk(je.total_debit)}</div>
                    <div className="text-[11px] text-slate-500">{je.entry_date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
