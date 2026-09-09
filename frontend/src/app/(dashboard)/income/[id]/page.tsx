'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { Income } from '../../../../types/financial';
import { formatBDT, formatDate, formatDateTime } from '../../../../lib/formatters';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { ConfirmationModal } from '../../../../components/ui/ConfirmationModal';
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Wallet,
  Building,
  CheckCircle2,
  Ban,
  FileText,
  CreditCard,
  Hash,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function IncomeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const { data: response, isLoading } = useQuery<{ success: boolean; data: Income }>({
    queryKey: ['income-detail', id],
    queryFn: () => api.get(`/income/${id}`),
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: async () => api.post(`/income/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      setCompleteModalOpen(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => api.post(`/income/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      setCancelModalOpen(false);
    },
  });

  const income = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!income) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl max-w-xl mx-auto">
        <h3 className="text-lg font-semibold text-white">Income Record Not Found</h3>
        <p className="text-sm text-slate-400 mt-1">The requested income record does not exist or has been removed.</p>
        <Link
          href="/income"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incomes
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
            href="/income"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white font-mono">{income.income_number}</h1>
              <StatusBadge status={income.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Received on {formatDate(income.transaction_date)}
            </p>
          </div>
        </div>

        {income.status === 'DRAFT' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompleteModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete & Deposit
            </button>
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Main Income Details Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-6">
        <div className="p-5 bg-slate-800/80 border border-emerald-500/30 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Total Received</span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">
              +{formatBDT(income.amount)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Target Financial Account</span>
            <div className="text-base font-semibold text-white mt-0.5 flex items-center justify-end gap-1.5">
              <Wallet className="w-4 h-4 text-indigo-400" />
              {income.account_name}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Received From</span>
            <div className="font-semibold text-white text-base">{income.received_from}</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Category</span>
            <div className="font-semibold text-white text-base">{income.category_name}</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Payment Method</span>
            <div className="font-medium text-slate-200">{income.payment_method || 'Unspecified'}</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Reference / TrxID</span>
            <div className="font-mono text-slate-200">{income.reference_number || 'None'}</div>
          </div>
        </div>

        {income.description && (
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Description / Notes</span>
            <p className="text-sm text-slate-300 leading-relaxed">{income.description}</p>
          </div>
        )}

        {/* Linked Transaction Info if completed */}
        {income.transaction_number && (
          <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-indigo-300 font-semibold uppercase">Linked Central Ledger Transaction</span>
                <div className="font-mono text-sm font-bold text-white mt-0.5">
                  {income.transaction_number}
                </div>
              </div>
            </div>
            <Link
              href={`/transactions`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              View in Ledger <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        onConfirm={() => completeMutation.mutate()}
        title="Complete Income Record?"
        message={`Completing will credit ${formatBDT(income.amount)} into "${income.account_name}" and generate an immutable ledger transaction.`}
        confirmLabel="Complete and Credit"
        variant="success"
        isLoading={completeMutation.isPending}
      />

      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Income Draft?"
        message="Are you sure you want to cancel this draft income?"
        confirmLabel="Cancel Income"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
