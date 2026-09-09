'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { FundTransfer, FinancialAccount } from '../../../types/financial';
import { formatBDT, formatDate } from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  ArrowLeftRight,
  Plus,
  Search,
  ArrowRight,
  Eye,
  Filter,
  RefreshCw,
  Wallet,
  Building,
} from 'lucide-react';
import Link from 'next/link';

interface TransfersApiResponse {
  success: boolean;
  data: FundTransfer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function FundTransfersPage() {
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch Accounts for filter
  const { data: accountsResponse } = useQuery<{ success: boolean; data: FinancialAccount[] }>({
    queryKey: ['financial-accounts-list'],
    queryFn: () => api.get('/accounts'),
  });

  // Fetch Transfers
  const { data, isLoading, isError, refetch } = useQuery<TransfersApiResponse>({
    queryKey: ['fund-transfers', page, accountFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (accountFilter) params.append('account_id', accountFilter);
      return api.get(`/fund-transfers?${params.toString()}`);
    },
  });

  const transfers = data?.data || [];
  const accounts = accountsResponse?.data || [];

  // Filter transfers client-side by search
  const filteredTransfers = transfers.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.transfer_number.toLowerCase().includes(q) ||
      (t.from_account_name && t.from_account_name.toLowerCase().includes(q)) ||
      (t.to_account_name && t.to_account_name.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.reference_number && t.reference_number.toLowerCase().includes(q))
    );
  });

  const totalTransferredVolume = transfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">Fund Transfers</h1>
              <p className="text-sm text-slate-400">
                Inter-account transfers with atomic double-entry balance reconciliation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:text-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link
            href="/fund-transfers/create"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 border border-purple-500/30 rounded-xl shadow-lg shadow-purple-950/40 transition-all hover:shadow-purple-900/50"
          >
            <Plus className="w-4 h-4" />
            New Transfer
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Transfers</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{data?.total ?? transfers.length}</p>
          <p className="text-xs text-slate-400 mt-1">Recorded inter-account movements</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transferred Volume</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{formatBDT(totalTransferredVolume)}</p>
          <p className="text-xs text-slate-400 mt-1">Total value balanced across accounts</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Accounts</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-sky-400 mt-2">{accounts.length}</p>
          <p className="text-xs text-slate-400 mt-1">Available for internal transfers</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer #, accounts, reference..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter className="w-4 h-4" />
            <span>Account:</span>
          </div>
          <select
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500/60"
          >
            <option value="">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({formatBDT(acc.current_balance)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Transfer Number</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold">Source Account</th>
                <th className="py-3.5 px-4 font-semibold text-center">Route</th>
                <th className="py-3.5 px-4 font-semibold">Destination Account</th>
                <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                      <span>Loading fund transfers...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-rose-400">
                    Failed to load fund transfers. Please try again.
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ArrowLeftRight className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-300">No Fund Transfers Found</p>
                      <p className="text-xs text-slate-500">
                        Transfer money seamlessly between club bank accounts, mobile financial services, or cash drawers.
                      </p>
                      <div className="pt-2">
                        <Link
                          href="/fund-transfers/create"
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Transfer
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      <Link
                        href={`/fund-transfers/${t.id}`}
                        className="hover:text-purple-400 transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>{t.transfer_number}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(t.transfer_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{t.from_account_name || 'Source Account'}</div>
                      {t.description && (
                        <div className="text-xs text-slate-400 line-clamp-1">{t.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex p-1.5 rounded-lg bg-slate-800/80 text-purple-400 border border-slate-700/60">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {t.to_account_name || 'Destination Account'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold font-mono text-purple-400">
                      {formatBDT(t.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/fund-transfers/${t.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
            <div>
              Showing page <span className="font-semibold text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-200">{data.totalPages}</span>
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
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
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
