'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { Expense } from '../../../../types/financial';
import { formatBDT, formatDate } from '../../../../lib/formatters';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { ConfirmationModal } from '../../../../components/ui/ConfirmationModal';
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  CheckCircle2,
  Ban,
  FileText,
  ExternalLink,
  ShieldAlert,
  Send,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function ExpenseDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params?.id as string;

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: response, isLoading } = useQuery<{ success: boolean; data: Expense }>({
    queryKey: ['expense-detail', id],
    queryFn: () => api.get(`/expenses/${id}`),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => api.post(`/expenses/${id}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSubmitModalOpen(false);
    },
    onError: (err: any) => setErrorMessage(err.message),
  });

  const payMutation = useMutation({
    mutationFn: async () => api.post(`/expenses/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      setPayModalOpen(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Payment execution failed.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => api.post(`/expenses/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setCancelModalOpen(false);
    },
    onError: (err: any) => setErrorMessage(err.message),
  });

  const expense = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl max-w-xl mx-auto">
        <h3 className="text-lg font-semibold text-white">Expense Record Not Found</h3>
        <p className="text-sm text-slate-400 mt-1">The requested expense record does not exist or has been removed.</p>
        <Link
          href="/expenses"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Expenses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/expenses"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white font-mono">{expense.expense_number}</h1>
              <StatusBadge status={expense.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Recorded for {formatDate(expense.expense_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {expense.status === 'DRAFT' && (
            <button
              onClick={() => setSubmitModalOpen(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Submit for Approval
            </button>
          )}

          {expense.status === 'CHANGES_REQUESTED' && (
            <button
              onClick={() => setSubmitModalOpen(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Resubmit for Approval
            </button>
          )}

          {(expense.status === 'PENDING_APPROVAL' || expense.status === 'UNDER_REVIEW') && (
            <Link
              href="/approvals"
              className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" />
              View in Approval Pipeline
            </Link>
          )}

          {expense.status === 'APPROVED' && (
            <button
              onClick={() => setPayModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Execute Payment
            </button>
          )}

          {(expense.status === 'DRAFT' || expense.status === 'CHANGES_REQUESTED') && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
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

      {/* Main Expense Details Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-6">
        <div className="p-5 bg-slate-800/80 border border-rose-500/30 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">Total Disbursed</span>
            <div className="text-3xl font-extrabold text-rose-400 font-mono mt-1">
              -{formatBDT(expense.amount)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Paying Financial Account</span>
            <div className="text-base font-semibold text-white mt-0.5 flex items-center justify-end gap-1.5">
              <Wallet className="w-4 h-4 text-indigo-400" />
              {expense.account_name}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Paid To (Payee)</span>
            <div className="font-semibold text-white text-base">{expense.paid_to}</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Category</span>
            <div className="font-semibold text-white text-base">{expense.category_name}</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Payment Method</span>
            <div className="font-medium text-slate-200">{expense.payment_method || 'Unspecified'}</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Invoice / Voucher #</span>
            <div className="font-mono text-slate-200">{expense.invoice_number || 'None'}</div>
          </div>
        </div>

        {expense.receipt_url && (
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Attached Voucher / Receipt Document</span>
            </div>
            <a
              href={expense.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              View Document <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {expense.description && (
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Description / Justification</span>
            <p className="text-sm text-slate-300 leading-relaxed">{expense.description}</p>
          </div>
        )}

        {/* Linked Transaction Info if paid */}
        {expense.transaction_number && (
          <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-indigo-300 font-semibold uppercase">Linked Central Ledger Transaction</span>
                <div className="font-mono text-sm font-bold text-white mt-0.5">
                  {expense.transaction_number}
                </div>
              </div>
            </div>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              View in Ledger <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={() => submitMutation.mutate()}
        title="Submit Expense for Payment?"
        message={`Submit ${expense.expense_number} (${formatBDT(expense.amount)}) for authorized disbursement?`}
        confirmLabel="Submit"
        variant="primary"
        isLoading={submitMutation.isPending}
      />

      <ConfirmationModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onConfirm={() => payMutation.mutate()}
        title="Disburse Payment?"
        message={`Paying ${expense.expense_number} will immediately debit ${formatBDT(expense.amount)} from "${expense.account_name}". If balance is less than ${formatBDT(expense.amount)}, payment will be automatically rejected.`}
        confirmLabel="Execute Payment"
        variant="warning"
        isLoading={payMutation.isPending}
      />

      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Expense?"
        message="Are you sure you want to cancel this expense?"
        confirmLabel="Cancel Expense"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
