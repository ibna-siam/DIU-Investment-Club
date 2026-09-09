'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { FinancialAccount } from '../../../../types/financial';
import { formatBDT } from '../../../../lib/formatters';
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Wallet,
  AlertCircle,
  Building,
  Calendar,
  FileText,
  Hash,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function CreateFundTransferPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Accounts
  const { data: accountsResponse, isLoading: accountsLoading } = useQuery<{
    success: boolean;
    data: FinancialAccount[];
  }>({
    queryKey: ['financial-accounts-list'],
    queryFn: () => api.get('/accounts'),
  });

  const accounts = (accountsResponse?.data || []).filter(
    (a) => a.status === 'ACTIVE'
  );

  const sourceAccount = accounts.find((a) => a.id === fromAccountId);
  const destAccount = accounts.find((a) => a.id === toAccountId);

  const numAmount = parseFloat(amount) || 0;
  const isInsufficient = sourceAccount ? numAmount > sourceAccount.current_balance : false;
  const isSameAccount = fromAccountId && toAccountId && fromAccountId === toAccountId;

  const createMutation = useMutation({
    mutationFn: async (payload: {
      from_account_id: string;
      to_account_id: string;
      amount: number;
      transfer_date: string;
      description?: string;
      reference_number?: string;
    }) => {
      return api.post<{ success: boolean; data: any }>('/fund-transfers', payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['fund-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-summary'] });
      const transferId = res?.data?.id || res?.data?.transfer_id;
      if (transferId) {
        router.push(`/fund-transfers/${transferId}`);
      } else {
        router.push('/fund-transfers');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to complete fund transfer');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fromAccountId) {
      setErrorMsg('Please select a source financial account');
      return;
    }
    if (!toAccountId) {
      setErrorMsg('Please select a destination financial account');
      return;
    }
    if (fromAccountId === toAccountId) {
      setErrorMsg('Source and destination financial accounts cannot be identical');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('Transfer amount must be greater than zero');
      return;
    }
    if (isInsufficient) {
      setErrorMsg(
        `Insufficient funds in ${sourceAccount?.name}. Available balance: ${formatBDT(
          sourceAccount?.current_balance || 0
        )}`
      );
      return;
    }

    createMutation.mutate({
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount: numAmount,
      transfer_date: transferDate,
      description: description || undefined,
      reference_number: referenceNumber || undefined,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/fund-transfers"
          className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Execute Fund Transfer
          </h1>
          <p className="text-sm text-slate-400">
            Transfer money between club accounts with atomic two-legged ledger entries
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <h4 className="text-sm font-semibold text-rose-200">Transfer Error</h4>
            <p className="text-xs text-rose-300/90 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Account Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Source Account (Outflow)
              </span>
              <Building className="w-4 h-4 text-slate-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Transfer From *
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select source account...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_type}) — Available: {formatBDT(acc.current_balance)}
                  </option>
                ))}
              </select>
            </div>

            {sourceAccount && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Available Balance:</span>
                  <span className="font-semibold font-mono text-emerald-400">
                    {formatBDT(sourceAccount.current_balance)}
                  </span>
                </div>
                {numAmount > 0 && (
                  <div className="flex justify-between text-xs border-t border-slate-800/60 pt-2">
                    <span className="text-slate-400">Balance After Transfer:</span>
                    <span
                      className={`font-semibold font-mono ${
                        isInsufficient ? 'text-rose-400' : 'text-slate-200'
                      }`}
                    >
                      {formatBDT(sourceAccount.current_balance - numAmount)}
                    </span>
                  </div>
                )}
                {isInsufficient && (
                  <p className="text-[11px] text-rose-400 font-medium">
                    ⚠️ Transfer amount exceeds available account balance!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Destination Account Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Destination Account (Inflow)
              </span>
              <Building className="w-4 h-4 text-slate-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Transfer To *
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select destination account...</option>
                {accounts.map((acc) => (
                  <option
                    key={acc.id}
                    value={acc.id}
                    disabled={acc.id === fromAccountId}
                  >
                    {acc.name} ({acc.account_type}) — Balance: {formatBDT(acc.current_balance)}
                    {acc.id === fromAccountId ? ' (Source)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {destAccount && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Current Balance:</span>
                  <span className="font-semibold font-mono text-slate-300">
                    {formatBDT(destAccount.current_balance)}
                  </span>
                </div>
                {numAmount > 0 && (
                  <div className="flex justify-between text-xs border-t border-slate-800/60 pt-2">
                    <span className="text-slate-400">Balance After Transfer:</span>
                    <span className="font-semibold font-mono text-emerald-400">
                      {formatBDT(destAccount.current_balance + numAmount)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Transfer Details Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-200">Transfer Specifics</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Transfer Amount (BDT) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  ৳
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-8 pr-4 py-2.5 text-sm font-mono font-semibold bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Transfer Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Reference / Cheque / Bank Txn No.
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. CHQ-88210, MFS-TXN-492"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Description / Purpose
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Funding cash drawer for seminar expenses"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Movement Preview */}
        {sourceAccount && destAccount && numAmount > 0 && !isSameAccount && (
          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              Double-Entry Transaction Flow Preview
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 gap-3 py-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[11px]">
                  DEBIT
                </span>
                <span>{sourceAccount.name}:</span>
                <span className="font-mono text-rose-400 font-semibold">
                  -{formatBDT(numAmount)}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                  CREDIT
                </span>
                <span>{destAccount.name}:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  +{formatBDT(numAmount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/fund-transfers"
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || isInsufficient || isSameAccount || numAmount <= 0}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/30 rounded-xl shadow-lg shadow-purple-950/50 transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            {createMutation.isPending ? 'Executing Transfer...' : 'Confirm & Execute Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
}
