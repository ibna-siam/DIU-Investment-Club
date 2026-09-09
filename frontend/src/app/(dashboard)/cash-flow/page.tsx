'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import {
  CashFlowSummary,
  CashFlowTimelineItem,
  CashFlowTrendPoint,
  FinancialAccount,
} from '../../../types/financial';
import { formatBDT, formatDate } from '../../../lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Scale,
  Calendar,
  Filter,
  RefreshCw,
  CheckCircle2,
  Building,
  BarChart3,
  Layers,
} from 'lucide-react';

export default function CashFlowPage() {
  const [datePreset, setDatePreset] = useState<'MONTH' | '30DAYS' | 'YTD' | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Handle Preset Changes
  const handlePresetChange = (preset: 'MONTH' | '30DAYS' | 'YTD' | 'ALL') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === '30DAYS') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'YTD') {
      const firstJan = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      setStartDate(firstJan);
      setEndDate(now.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
    setPage(1);
  };

  // Fetch Accounts
  const { data: accountsResponse } = useQuery<{ success: boolean; data: FinancialAccount[] }>({
    queryKey: ['financial-accounts-list'],
    queryFn: () => api.get('/accounts'),
  });

  const accounts = accountsResponse?.data || [];

  // Fetch Summary
  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<{
    success: boolean;
    data: CashFlowSummary;
  }>({
    queryKey: ['cash-flow-summary', startDate, endDate, selectedAccountId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedAccountId) params.append('accountId', selectedAccountId);
      return api.get(`/cash-flow/summary?${params.toString()}`);
    },
  });

  // Fetch Timeline Ledger
  const { data: timelineData, isLoading: timelineLoading, refetch: refetchTimeline } = useQuery<{
    success: boolean;
    data: CashFlowTimelineItem[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ['cash-flow-timeline', startDate, endDate, selectedAccountId, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedAccountId) params.append('accountId', selectedAccountId);
      return api.get(`/cash-flow?${params.toString()}`);
    },
  });

  // Fetch Trend Points
  const { data: trendData } = useQuery<{
    success: boolean;
    data: CashFlowTrendPoint[];
  }>({
    queryKey: ['cash-flow-trend', selectedAccountId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedAccountId) params.append('accountId', selectedAccountId);
      return api.get(`/cash-flow/trend?${params.toString()}`);
    },
  });

  const summary = summaryData?.data || {
    opening_balance: 0,
    total_inflow: 0,
    total_outflow: 0,
    net_cash_flow: 0,
    closing_balance: 0,
  };

  const timelineItems = timelineData?.data || [];
  const trends = trendData?.data || [];

  // Check mathematical reconciliation: Opening + Inflow - Outflow === Closing
  const mathFormulaExpected = summary.opening_balance + summary.total_inflow - summary.total_outflow;
  const isReconciled = Math.abs(mathFormulaExpected - summary.closing_balance) < 0.05;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Cash Flow Management
              </h1>
              <p className="text-sm text-slate-400">
                Continuous liquidity and running ledger reconciliation derived from double-entry records
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            refetchSummary();
            refetchTimeline();
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:text-slate-100 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Flow
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-4 md:items-center justify-between">
        {/* Presets */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'MONTH', label: 'This Month' },
            { id: '30DAYS', label: 'Last 30 Days' },
            { id: 'YTD', label: 'Year-to-Date' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id as any)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                datePreset === p.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range & Account Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('ALL');
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('ALL');
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Accounts Combined</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.account_type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mathematical Reconciliation Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Mathematical Cash Flow Formula Verification
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {isReconciled ? 'Reconciled 100%' : 'Audit Warning'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono mt-1 text-slate-300">
              <span className="text-slate-400">Opening (৳{summary.opening_balance})</span>
              <span className="text-emerald-400 font-bold">+ Inflow (৳{summary.total_inflow})</span>
              <span className="text-rose-400 font-bold">- Outflow (৳{summary.total_outflow})</span>
              <span className="text-slate-400">=</span>
              <span className="text-sky-400 font-bold">Closing (৳{summary.closing_balance})</span>
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-slate-400 font-mono hidden md:block">
          Net Period Shift: <span className="text-emerald-400 font-bold">{formatBDT(summary.net_cash_flow)}</span>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Opening Balance */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Opening Balance
          </span>
          <p className="text-xl font-bold font-mono text-slate-200 mt-2">
            {formatBDT(summary.opening_balance)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Prior to period start</span>
        </div>

        {/* Total Inflow */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Total Inflow (+)
            </span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-2">
            {formatBDT(summary.total_inflow)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Credits & Deposits</span>
        </div>

        {/* Total Outflow */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
              Total Outflow (-)
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-400 mt-2">
            {formatBDT(summary.total_outflow)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Debits & Payments</span>
        </div>

        {/* Net Flow */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
              Net Cash Flow
            </span>
            {summary.net_cash_flow >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <p
            className={`text-xl font-bold font-mono mt-2 ${
              summary.net_cash_flow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summary.net_cash_flow >= 0 ? '+' : ''}
            {formatBDT(summary.net_cash_flow)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Inflow minus Outflow</span>
        </div>

        {/* Closing Balance */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg sm:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
            Closing Balance
          </span>
          <p className="text-xl font-bold font-mono text-sky-400 mt-2">
            {formatBDT(summary.closing_balance)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Reconciled Total</span>
        </div>
      </div>

      {/* Visual Monthly Trend Section */}
      {trends.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Period Cash Flow Trends
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Inflows
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Outflows
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {trends.map((t) => {
              const maxVal = Math.max(...trends.map((x) => Math.max(x.inflow, x.outflow, 1)));
              const inflowHeight = Math.min(100, Math.round((t.inflow / maxVal) * 100));
              const outflowHeight = Math.min(100, Math.round((t.outflow / maxVal) * 100));

              return (
                <div
                  key={t.period}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-center"
                >
                  <span className="text-[11px] font-semibold text-slate-400 font-mono">
                    {t.period}
                  </span>

                  {/* Bars Container */}
                  <div className="h-20 flex items-end justify-center gap-2 pt-2 border-b border-slate-800/60">
                    <div
                      style={{ height: `${Math.max(8, inflowHeight)}%` }}
                      className="w-3 rounded-t-sm bg-emerald-500/80 hover:bg-emerald-400 transition-all"
                      title={`Inflow: ৳${t.inflow}`}
                    />
                    <div
                      style={{ height: `${Math.max(8, outflowHeight)}%` }}
                      className="w-3 rounded-t-sm bg-rose-500/80 hover:bg-rose-400 transition-all"
                      title={`Outflow: ৳${t.outflow}`}
                    />
                  </div>

                  <div className="text-[10px] font-mono text-slate-400">
                    Net:{' '}
                    <span
                      className={
                        t.net_flow >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                      }
                    >
                      {t.net_flow >= 0 ? '+' : ''}
                      {formatBDT(t.net_flow)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chronological Running Ledger Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Chronological Cash Flow Ledger
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {timelineData?.total || timelineItems.length} total entries recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Txn Number</th>
                <th className="py-3 px-4 font-semibold">Account</th>
                <th className="py-3 px-4 font-semibold">Activity & Details</th>
                <th className="py-3 px-4 font-semibold text-right">Inflow (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Outflow (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Running Balance (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {timelineLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                      <span>Reconciling cash flow ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : timelineItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                timelineItems.map((item) => {
                  const isInflow = item.direction === 'CREDIT';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                        {formatDate(item.transaction_date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {item.transaction_number}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans">
                        <div>{item.account_name}</div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.account_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="text-slate-200 text-xs font-medium">
                          {item.description || item.source_type}
                        </div>
                        {item.reference_number && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Ref: {item.reference_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {isInflow ? formatBDT(item.amount) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-400">
                        {!isInflow ? formatBDT(item.amount) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100 bg-slate-950/30">
                        {formatBDT(item.running_balance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {timelineData && timelineData.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
            <div>
              Showing page <span className="font-semibold text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-200">{timelineData.totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= timelineData.totalPages}
                onClick={() => setPage((p) => Math.min(timelineData.totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
