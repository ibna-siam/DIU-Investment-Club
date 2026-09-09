'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Expense, ExpenseCategory, FinancialAccount } from '../../../types/financial';
import { formatBDT, formatDate } from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Wallet,
  Send,
  Check,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

interface ExpensesApiResponse {
  success: boolean;
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ExpensesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals state
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Categories
  const { data: categoriesResponse } = useQuery<{ success: boolean; data: ExpenseCategory[] }>({
    queryKey: ['expense-categories'],
    queryFn: () => api.get('/expense-categories'),
  });

  // Fetch Accounts
  const { data: accountsResponse } = useQuery<{ success: boolean; data: FinancialAccount[] }>({
    queryKey: ['financial-accounts-list'],
    queryFn: () => api.get('/accounts'),
  });

  // Fetch Expenses
  const { data: response, isLoading } = useQuery<ExpensesApiResponse>({
    queryKey: ['expenses', { search, categoryFilter, statusFilter, accountFilter, page, limit }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (accountFilter) params.set('financial_account_id', accountFilter);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      return api.get(`/expenses?${params.toString()}`);
    },
  });

  // Submit Expense Mutation
  const submitMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/expenses/${id}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSubmitModalOpen(false);
      setSelectedExpense(null);
    },
    onError: (err: any) => setErrorMessage(err.message),
  });

  // Pay Expense Mutation
  const payMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/expenses/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      setPayModalOpen(false);
      setSelectedExpense(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Payment failed. Please verify account balance.');
    },
  });

  // Cancel Expense Mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/expenses/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setCancelModalOpen(false);
      setSelectedExpense(null);
    },
    onError: (err: any) => setErrorMessage(err.message),
  });

  const expenses = response?.data || [];
  const categories = categoriesResponse?.data || [];
  const accounts = accountsResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-rose-400" />
            Expense Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage club disbursements, workshop expenses, event logistics, and vendor payments.
          </p>
        </div>
        {hasPermission('expenses.create') && (
          <Link
            href="/expenses/create"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-rose-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Expense
          </Link>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by expense #, paid to, or invoice #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
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
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
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
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">No Expense Records Found</h3>
            <p className="text-sm text-slate-400 mt-1">
              Record club expenses to keep financial disbursements strictly audited.
            </p>
            <Link
              href="/expenses/create"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Record First Expense
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-300 uppercase tracking-wider border-b border-slate-800 bg-slate-800/80">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Expense #</th>
                  <th className="py-3 px-4 font-semibold">Paid To</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Paying Account</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-rose-400 whitespace-nowrap">
                      {exp.expense_number}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-white whitespace-nowrap">
                      {exp.paid_to}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                      {exp.category_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {exp.account_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sm text-rose-400 whitespace-nowrap">
                      -{formatBDT(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={exp.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/expenses/${exp.id}`}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {hasPermission('expenses.update') && exp.status === 'DRAFT' && (
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              setSubmitModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg transition-colors flex items-center gap-1"
                            title="Submit for payment approval"
                          >
                            <Send className="w-3 h-3" />
                            Submit
                          </button>
                        )}

                        {hasPermission('expenses.update') && exp.status === 'CHANGES_REQUESTED' && (
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              setSubmitModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg transition-colors flex items-center gap-1"
                            title="Resubmit with updated details"
                          >
                            <Send className="w-3 h-3" />
                            Resubmit
                          </button>
                        )}

                        {(exp.status === 'PENDING_APPROVAL' || exp.status === 'UNDER_REVIEW') && (
                          <Link
                            href="/approvals"
                            className="px-2.5 py-1 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1"
                            title="Track approval pipeline progress"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            Pipeline
                          </Link>
                        )}

                        {(hasPermission('expenses.pay') || hasPermission('expenses.approve')) && exp.status === 'APPROVED' && (
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              setPayModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-emerald-950"
                            title="Disburse payment and debit account"
                          >
                            <Check className="w-3 h-3" />
                            Pay
                          </button>
                        )}

                        {hasPermission('expenses.delete') && (exp.status === 'DRAFT' || exp.status === 'CHANGES_REQUESTED') && (
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              setCancelModalOpen(true);
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Cancel expense"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
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

      {/* Submit Modal */}
      <ConfirmationModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={() => {
          if (selectedExpense) {
            submitMutation.mutate(selectedExpense.id);
          }
        }}
        title="Submit Expense for Payment?"
        message={`Submitting ${selectedExpense?.expense_number} (${formatBDT(selectedExpense?.amount)}) will move it to SUBMITTED status ready for authorized disbursement.`}
        confirmLabel="Submit Expense"
        variant="primary"
        isLoading={submitMutation.isPending}
      />

      {/* Pay Modal with Insufficient Balance Warning */}
      <ConfirmationModal
        isOpen={payModalOpen}
        onClose={() => {
          setPayModalOpen(false);
          setErrorMessage(null);
        }}
        onConfirm={() => {
          if (selectedExpense) {
            payMutation.mutate(selectedExpense.id);
          }
        }}
        title="Confirm Payment & Balance Debit?"
        message={`Paying ${selectedExpense?.expense_number} (${formatBDT(selectedExpense?.amount)}) will immediately debit the balance of "${selectedExpense?.account_name}" and log an immutable DEBIT transaction. Payment will be rejected if account balance is insufficient.`}
        confirmLabel="Execute Payment"
        variant="warning"
        isLoading={payMutation.isPending}
      />

      {/* Cancel Modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={() => {
          if (selectedExpense) {
            cancelMutation.mutate(selectedExpense.id);
          }
        }}
        title="Cancel Expense Record?"
        message={`Are you sure you want to cancel ${selectedExpense?.expense_number}?`}
        confirmLabel="Cancel Expense"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
