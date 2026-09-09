'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { accountingService } from '../../../services/accounting.service';
import { ChartOfAccount, AccountLedgerStatement } from '../../../types/accounting';
import { formatCurrency, formatDate } from '../../../lib/utils';

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statement, setStatement] = useState<AccountLedgerStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Load Accounts list
  useEffect(() => {
    async function loadAccounts() {
      try {
        setAccountsLoading(true);
        const data = await accountingService.getAccounts({ is_active: true });
        setAccounts(data);
        if (data.length > 0) {
          // Default to first Cash or Bank account if available
          const defaultAcc =
            data.find((a) => a.account_code === '1010' || a.account_code === '1020') || data[0];
          setSelectedAccountId(defaultAcc.id);
        }
      } catch (err) {
        console.error('Failed to load accounts', err);
      } finally {
        setAccountsLoading(false);
      }
    }
    loadAccounts();
  }, []);

  // Fetch Ledger Statement when account or dates change
  const fetchLedger = async (accId?: string) => {
    const id = accId || selectedAccountId;
    if (!id) return;
    try {
      setLoading(true);
      const params: any = { account_id: id };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const data = await accountingService.getGeneralLedger(params);
      setStatement(data);
    } catch (err) {
      console.error('Failed to load general ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger(selectedAccountId);
    }
  }, [selectedAccountId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">General Ledger</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-800/60">
              Account Statements
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Running debit/credit transaction ledger with cumulative balance per Chart of Accounts head
          </p>
        </div>
      </div>

      {/* Account & Date Controls */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:w-80">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Select Ledger Account
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            disabled={accountsLoading}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_code} - {acc.account_name} ({acc.account_type})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-44">
          <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="w-full md:w-44">
          <label className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="pt-5 flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => fetchLedger()}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-md shadow-cyan-950/40"
          >
            {loading ? 'Filtering...' : 'Apply Filters'}
          </button>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                fetchLedger();
              }}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Account Overview Card */}
      {statement?.account && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold text-cyan-400">
                  {statement.account.account_code}
                </span>
                <span className="text-xl font-bold text-white">
                  {statement.account.account_name}
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-800 text-gray-300 border border-gray-700">
                  {statement.account.account_type}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Normal Balance Rule:{' '}
                <span className="font-semibold text-gray-200">
                  {statement.account.normal_balance}
                </span>
              </p>
            </div>

            {/* Balances Summary Badges */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 text-right">
                <div className="text-[10px] uppercase font-bold text-gray-400">Total Debits</div>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {formatCurrency(statement.total_debit || 0)}
                </div>
              </div>
              <div className="p-3 bg-gray-800/80 rounded-xl border border-gray-700 text-right">
                <div className="text-[10px] uppercase font-bold text-gray-400">Total Credits</div>
                <div className="text-sm font-mono font-bold text-blue-400">
                  {formatCurrency(statement.total_credit || 0)}
                </div>
              </div>
              <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-800/60 text-right">
                <div className="text-[10px] uppercase font-bold text-cyan-400">Closing Balance</div>
                <div className="text-base font-mono font-black text-cyan-300">
                  {formatCurrency(statement.closing_balance || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800/40 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Journal #</th>
                  <th className="px-4 py-3">Ref Type</th>
                  <th className="px-4 py-3">Narration</th>
                  <th className="px-4 py-3 text-right">Debit (BDT)</th>
                  <th className="px-4 py-3 text-right">Credit (BDT)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-gray-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                      Loading ledger transactions...
                    </td>
                  </tr>
                ) : statement.lines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      No posted journal lines found for this account in the selected period.
                    </td>
                  </tr>
                ) : (
                  statement.lines.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(tx.entry_date)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-cyan-400">
                        {tx.journal_entry_id ? (
                          <Link
                            href={`/journal-entries/${tx.journal_entry_id}`}
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{tx.journal_number}</span>
                            <ChevronRight className="w-3 h-3 text-gray-500" />
                          </Link>
                        ) : (
                          tx.journal_number
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-800 border border-gray-700 text-gray-300 font-medium">
                          {tx.reference_type || 'MANUAL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300 max-w-xs truncate" title={tx.description || ''}>
                        {tx.description}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                        {tx.debit_amount > 0 ? formatCurrency(tx.debit_amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-blue-400">
                        {tx.credit_amount > 0 ? formatCurrency(tx.credit_amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {formatCurrency(tx.running_balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
