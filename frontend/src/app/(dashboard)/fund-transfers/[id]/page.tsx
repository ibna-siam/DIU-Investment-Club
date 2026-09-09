'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { FundTransfer } from '../../../../types/financial';
import { formatBDT, formatDate, formatDateTime } from '../../../../lib/formatters';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Building,
  Calendar,
  Hash,
  FileText,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  User,
} from 'lucide-react';
import Link from 'next/link';

export default function FundTransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['fund-transfer', id],
    queryFn: () => api.get(`/fund-transfers/${id}`),
    enabled: !!id,
  });

  const transfer = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
          <span>Loading transfer details...</span>
        </div>
      </div>
    );
  }

  if (isError || !transfer) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 w-fit mx-auto">
          <ArrowLeftRight className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Transfer Record Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested transfer could not be found or you may not have permission to view it.
        </p>
        <Link
          href="/fund-transfers"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transfers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/fund-transfers"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100">
                {transfer.transfer_number}
              </h1>
              <StatusBadge status={transfer.status} />
            </div>
            <p className="text-sm text-slate-400">
              Inter-Account Fund Transfer Record
            </p>
          </div>
        </div>
      </div>

      {/* Amount and Core Stats Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/30 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Transfer Amount
          </span>
          <div className="text-3xl font-extrabold font-mono text-slate-100 mt-1">
            {formatBDT(transfer.amount)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Effective Date: {formatDate(transfer.transfer_date)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <p className="font-semibold text-emerald-400">Atomic Two-Legged Ledger</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Double-entry confirmed with immutable transaction IDs
            </p>
          </div>
        </div>
      </div>

      {/* Accounts Route Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Source Account Box */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-rose-400">
            <span>Source (Debit Outflow)</span>
            <Building className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-slate-100">
            {transfer.from_account_name || 'Source Account'}
          </p>
          {transfer.out_transaction ? (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Ledger Txn:</span>
                <span className="font-mono text-purple-400 font-medium">
                  {transfer.out_transaction.transaction_number}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Balance Before:</span>
                <span className="font-mono text-slate-300">
                  {formatBDT(transfer.out_transaction.balance_before)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800/60 pt-1.5">
                <span>Balance After:</span>
                <span className="font-mono text-rose-400 font-semibold">
                  {formatBDT(transfer.out_transaction.balance_after)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-mono">
              Txn ID: {transfer.out_transaction_id || 'Generated'}
            </p>
          )}
        </div>

        {/* Destination Account Box */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span>Destination (Credit Inflow)</span>
            <Building className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-slate-100">
            {transfer.to_account_name || 'Destination Account'}
          </p>
          {transfer.in_transaction ? (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Ledger Txn:</span>
                <span className="font-mono text-purple-400 font-medium">
                  {transfer.in_transaction.transaction_number}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Balance Before:</span>
                <span className="font-mono text-slate-300">
                  {formatBDT(transfer.in_transaction.balance_before)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800/60 pt-1.5">
                <span>Balance After:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {formatBDT(transfer.in_transaction.balance_after)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-mono">
              Txn ID: {transfer.in_transaction_id || 'Generated'}
            </p>
          )}
        </div>
      </div>

      {/* Transfer Information */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">Transfer Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400">Reference Number:</span>
            <p className="text-sm font-medium text-slate-200 font-mono">
              {transfer.reference_number || 'None provided'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400">Initiated By:</span>
            <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {transfer.creator_name || 'System Executive'}
            </p>
          </div>
          <div className="sm:col-span-2 space-y-1 border-t border-slate-800/80 pt-3">
            <span className="text-slate-400">Description / Purpose:</span>
            <p className="text-sm text-slate-300">
              {transfer.description || 'Internal balance re-allocation'}
            </p>
          </div>
          <div className="space-y-1 text-slate-500 pt-2">
            <span>Created Timestamp:</span>
            <p className="font-mono text-[11px]">{formatDateTime(transfer.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/fund-transfers"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transfers List
        </Link>
        <Link
          href="/transactions"
          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <span>View in Transactions Ledger</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
