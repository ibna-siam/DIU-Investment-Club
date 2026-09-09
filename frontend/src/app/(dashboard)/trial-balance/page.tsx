'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Printer,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Layers,
  FileCheck,
} from 'lucide-react';
import { accountingService } from '../../../services/accounting.service';
import { TrialBalanceReport, TrialBalanceItem } from '../../../types/accounting';
import { formatCurrency, formatDate } from '../../../lib/utils';

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ASSET: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/50' },
  LIABILITY: { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800/50' },
  EQUITY: { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/50' },
  REVENUE: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/50' },
  EXPENSE: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/50' },
};

export default function TrialBalancePage() {
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const data = await accountingService.getTrialBalance(params);
      setReport(data);
    } catch (err) {
      console.error('Failed to load trial balance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrialBalance();
  }, []);

  const rows: TrialBalanceItem[] = report?.accounts || (report as any)?.rows || [];
  const filteredRows: TrialBalanceItem[] = rows.filter((row: TrialBalanceItem) => {
    const matchesSearch =
      !searchTerm ||
      row.account_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.account_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || row.account_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Trial Balance</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-800/60">
              Double-Entry Proof
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Summary statement of all ledger debit and credit balances verifying fundamental mathematical equilibrium
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={loadTrialBalance}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Equilibrium Status Banner */}
      {report && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            report.is_balanced
              ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/20 border-rose-800/60 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {report.is_balanced ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {report.is_balanced
                  ? 'General Ledger is in Perfect Equilibrium'
                  : 'Trial Balance Imbalance Detected!'}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {report.is_balanced
                  ? `Total Debits equal Total Credits (Difference: ${formatCurrency(report.difference || 0)}). All double-entry postings are mathematically sound.`
                  : `Discrepancy of ${formatCurrency(report.difference || 0)} detected between debits and credits.`}
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right font-mono text-sm font-bold">
            <div>Eq Status: {report.is_balanced ? 'VERIFIED' : 'FAILED'}</div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
          <div className="text-xs text-gray-400 font-medium">Total Debits</div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            {formatCurrency(report?.total_debit || 0)}
          </div>
        </div>

        <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
          <div className="text-xs text-gray-400 font-medium">Total Credits</div>
          <div className="text-xl font-mono font-bold text-blue-400 mt-1">
            {formatCurrency(report?.total_credit || 0)}
          </div>
        </div>

        <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
          <div className="text-xs text-gray-400 font-medium">Difference</div>
          <div
            className={`text-xl font-mono font-bold mt-1 ${
              report?.is_balanced ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(report?.difference || 0)}
          </div>
        </div>

        <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl">
          <div className="text-xs text-gray-400 font-medium">Active Accounts</div>
          <div className="text-xl font-bold text-white mt-1">
            {rows.length}
          </div>
        </div>
      </div>

      {/* Date & Filter Controls */}
      <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search account code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Categories</option>
            <option value="ASSET">Assets</option>
            <option value="LIABILITY">Liabilities</option>
            <option value="EQUITY">Equity</option>
            <option value="REVENUE">Revenue</option>
            <option value="EXPENSE">Expenses</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />

          <button
            onClick={loadTrialBalance}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden shadow-xl" id="printable-tb">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Account Code</th>
                <th className="px-4 py-3">Account Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Debit Balance (BDT)</th>
                <th className="px-4 py-3 text-right">Credit Balance (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                    Calculating Trial Balance statement...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <Scale className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    No accounts found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row: TrialBalanceItem) => {
                  const cfg = TYPE_COLORS[row.account_type] || {
                    bg: 'bg-gray-800',
                    text: 'text-gray-300',
                    border: 'border-gray-700',
                  };
                  return (
                    <tr key={row.account_id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-cyan-400">
                        {row.account_code}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        <Link
                          href={`/general-ledger`}
                          className="hover:text-cyan-300 transition-colors"
                        >
                          {row.account_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded border ${cfg.bg} ${cfg.border} ${cfg.text}`}
                        >
                          {row.account_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                        {row.debit_balance > 0 ? formatCurrency(row.debit_balance) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-blue-400">
                        {row.credit_balance > 0 ? formatCurrency(row.credit_balance) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Grand Totals */}
            <tfoot className="border-t-2 border-gray-700 bg-gray-800/70 font-medium">
              <tr>
                <td colSpan={3} className="px-4 py-4 text-right text-xs uppercase font-bold text-gray-200">
                  Grand Total Balance:
                </td>
                <td className="px-4 py-4 text-right font-mono font-black text-base text-emerald-400">
                  {formatCurrency(report?.total_debit || 0)}
                </td>
                <td className="px-4 py-4 text-right font-mono font-black text-base text-blue-400">
                  {formatCurrency(report?.total_credit || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
