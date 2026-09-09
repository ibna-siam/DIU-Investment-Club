'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { FinancialTransaction, FinancialAccount } from '../../../types/financial';
import { formatBDT, formatDateTime, formatAccountType } from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  History,
  Search,
  Filter,
  Eye,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

interface TransactionsApiResponse {
  success: boolean;
  data: FinancialTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Fetch Accounts for dropdown
  const { data: accountsResponse } = useQuery<{ success: boolean; data: FinancialAccount[] }>({
    queryKey: ['financial-accounts-list'],
    queryFn: () => api.get('/accounts'),
  });

  // Fetch Transactions
  const { data: response, isLoading } = useQuery<TransactionsApiResponse>({
    queryKey: ['financial-transactions', { search, typeFilter, accountFilter, startDate, endDate, page, limit }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('transaction_type', typeFilter);
      if (accountFilter) params.set('account_id', accountFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      return api.get(`/transactions?${params.toString()}`);
    },
  });

  const transactions = response?.data || [];
  const accounts = accountsResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-7 h-7 text-indigo-400" />
            Central Financial Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable audit record of all debits, credits, opening balances, and disbursements.
          </p>
        </div>
        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Tamper-Resistant Double-Entry Log</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by transaction #, reference, or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Types (Credit & Debit)</option>
            <option value="CREDIT">Credits (+ Inflow)</option>
            <option value="DEBIT">Debits (- Outflow)</option>
          </select>

          <select
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            title="Start date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            title="End date"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <History className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">No Transactions Recorded</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Transactions are recorded automatically upon opening account balances, completing incomes, or paying expenses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-300 uppercase tracking-wider border-b border-slate-700/80 bg-slate-800/80">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Transaction #</th>
                  <th className="py-3 px-4 font-semibold">Account</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Category / Reference</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.map((txn) => {
                  const isCredit = (txn as any).direction === 'CREDIT' || txn.transaction_type === 'CREDIT' || txn.transaction_type === 'INCOME' || txn.transaction_type === 'OPENING_BALANCE';
                  return (
                    <tr key={txn.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {formatDateTime(txn.transaction_date || txn.created_at)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-400 whitespace-nowrap">
                        {txn.transaction_number}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-200 whitespace-nowrap font-medium">
                        {txn.account_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={txn.transaction_type} type="transaction" />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        <span className="font-medium text-white">{txn.category || txn.transaction_type}</span>
                        {txn.reference_number && (
                          <span className="text-slate-400 block text-[11px] font-mono">{txn.reference_number}</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold text-sm whitespace-nowrap ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isCredit ? '+' : '-'} {formatBDT(txn.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-300 whitespace-nowrap">
                        {formatBDT(txn.balance_after)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/transactions/${txn.id}`}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors inline-block"
                          title="View Audit Record"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {response && response.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
            <span>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, response.total)} of {response.total} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-white"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-white">
                Page {page} of {response.totalPages}
              </span>
              <button
                disabled={page >= response.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-white"
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
