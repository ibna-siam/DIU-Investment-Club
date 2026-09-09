'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Income, IncomeCategory, FinancialAccount } from '../../../types/financial';
import { formatBDT, formatDate } from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Wallet,
  Building,
  Check,
  Ban,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

interface IncomesApiResponse {
  success: boolean;
  data: Income[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function IncomePage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals state
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Fetch Categories for dropdown
  const { data: categoriesResponse } = useQuery<{ success: boolean; data: IncomeCategory[] }>({
    queryKey: ['income-categories'],
    queryFn: () => api.get('/income-categories'),
  });

  // Fetch Accounts for dropdown
  const { data: accountsResponse } = useQuery<{ success: boolean; data: FinancialAccount[] }>({
    queryKey: ['financial-accounts-list'],
    queryFn: () => api.get('/accounts'),
  });

  // Fetch Incomes
  const { data: response, isLoading } = useQuery<IncomesApiResponse>({
    queryKey: ['incomes', { search, categoryFilter, statusFilter, accountFilter, page, limit }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (accountFilter) params.set('financial_account_id', accountFilter);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      return api.get(`/income?${params.toString()}`);
    },
  });

  // Complete Income Mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/income/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      setCompleteModalOpen(false);
      setSelectedIncome(null);
    },
  });

  // Cancel Income Mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/income/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      setCancelModalOpen(false);
      setSelectedIncome(null);
    },
  });

  const incomes = response?.data || [];
  const categories = categoriesResponse?.data || [];
  const accounts = accountsResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-400" />
            Income Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track club revenues, member investment funds, event sponsorships, and grants.
          </p>
        </div>
        {hasPermission('income.create') && (
          <Link
            href="/income/create"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Income
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by income #, received from, or reference..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Incomes Table */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : incomes.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">No Income Records Found</h3>
            <p className="text-sm text-slate-400 mt-1">
              Record club income to keep accounts balanced with verified financial transactions.
            </p>
            <Link
              href="/income/create"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Record First Income
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-300 uppercase tracking-wider border-b border-slate-800 bg-slate-800/80">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Income #</th>
                  <th className="py-3 px-4 font-semibold">Received From</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Account</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                      {formatDate(inc.transaction_date)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-emerald-400 whitespace-nowrap">
                      {inc.income_number}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-white whitespace-nowrap">
                      {inc.received_from}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                      {inc.category_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {inc.account_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-400 whitespace-nowrap">
                      +{formatBDT(inc.amount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/income/${inc.id}`}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {hasPermission('income.update') && inc.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedIncome(inc);
                                setCompleteModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1"
                              title="Complete and deposit to account balance"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Complete
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIncome(inc);
                                setCancelModalOpen(true);
                              }}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Cancel draft"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Complete Income Modal */}
      <ConfirmationModal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        onConfirm={() => {
          if (selectedIncome) {
            completeMutation.mutate(selectedIncome.id);
          }
        }}
        title="Complete and Realize Income?"
        message={`Completing ${selectedIncome?.income_number} (${formatBDT(selectedIncome?.amount)}) will automatically generate a CREDIT transaction and increment the balance of "${selectedIncome?.account_name}". This operation is permanent.`}
        confirmLabel="Complete Income"
        variant="success"
        isLoading={completeMutation.isPending}
      />

      {/* Cancel Income Modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={() => {
          if (selectedIncome) {
            cancelMutation.mutate(selectedIncome.id);
          }
        }}
        title="Cancel Income Draft?"
        message={`Are you sure you want to cancel ${selectedIncome?.income_number}? It will be marked as CANCELLED.`}
        confirmLabel="Cancel Income"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
