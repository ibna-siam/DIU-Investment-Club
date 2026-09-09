'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { FinancialTransaction } from '../../../../types/financial';
import { formatBDT, formatDateTime, formatAccountType } from '../../../../lib/formatters';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import {
  ArrowLeft,
  History,
  ShieldCheck,
  Wallet,
  Calendar,
  Lock,
  FileText,
  Building,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function TransactionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: response, isLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['transaction-detail', id],
    queryFn: () => api.get(`/transactions/${id}`),
    enabled: !!id,
  });

  const txn = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl max-w-xl mx-auto">
        <h3 className="text-lg font-semibold text-white">Transaction Not Found</h3>
        <p className="text-sm text-slate-400 mt-1">The requested transaction record does not exist in the ledger.</p>
        <Link
          href="/transactions"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Ledger
        </Link>
      </div>
    );
  }

  const isCredit = txn.direction === 'CREDIT' || ['CREDIT', 'INCOME', 'OPENING_BALANCE'].includes(txn.transaction_type);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/transactions"
          className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white font-mono">{txn.transaction_number}</h1>
            <StatusBadge status={txn.transaction_type} type="transaction" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Recorded on {formatDateTime(txn.transaction_date || txn.created_at)}
          </p>
        </div>
      </div>

      {/* Tamper-Resistant Security Notice */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 text-xs text-slate-300">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 flex-shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <strong className="text-white block font-medium">Immutable Double-Entry Ledger Entry</strong>
          Financial transactions cannot be altered or deleted. Running balances are verified against database constraints and row-level locks.
        </div>
      </div>

      {/* Main Details */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-6">
        <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction Amount</span>
            <div className={`text-3xl font-extrabold font-mono mt-1 ${
              isCredit ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isCredit ? '+' : '-'} {formatBDT(txn.amount)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Account Balance After</span>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {formatBDT(txn.balance_after)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Associated Financial Account</span>
            <div className="font-semibold text-white text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-400" />
              {txn.account_name}
            </div>
            {txn.account_details && (
              <span className="text-xs text-slate-400 block">
                {formatAccountType(txn.account_details.account_type)}
                {txn.account_details.account_number ? ` • A/C ${txn.account_details.account_number}` : ''}
              </span>
            )}
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Category</span>
            <div className="font-semibold text-white text-base">{txn.category}</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Reference Type</span>
            <div className="font-mono text-slate-200">{txn.reference_type || 'DIRECT'}</div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Reference Number</span>
            <div className="font-mono text-slate-200">{txn.reference_number || 'N/A'}</div>
          </div>
        </div>

        {txn.description && (
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Ledger Description / Memo</span>
            <p className="text-sm text-slate-300 leading-relaxed">{txn.description}</p>
          </div>
        )}

        {/* Linked Reference Details */}
        {txn.reference_details && (
          <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-2">
              Underlying {txn.reference_type} Source
            </span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-white text-sm font-semibold">
                  {txn.reference_details.income_number || txn.reference_details.expense_number}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  {txn.reference_details.received_from ? `From: ${txn.reference_details.received_from}` : `Paid to: ${txn.reference_details.paid_to}`}
                </span>
              </div>
              <Link
                href={txn.reference_type === 'INCOME' ? `/income/${txn.reference_id}` : `/expenses/${txn.reference_id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                View Record <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
