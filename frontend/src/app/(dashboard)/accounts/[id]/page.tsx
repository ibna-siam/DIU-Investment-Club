'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { FinancialAccount, FinancialTransaction } from '../../../../types/financial';
import { formatBDT, formatDate, formatDateTime, formatAccountType } from '../../../../lib/formatters';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import {
  ArrowLeft,
  Wallet,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  History,
} from 'lucide-react';
import Link from 'next/link';

export default function AccountDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: accountResponse, isLoading: accountLoading } = useQuery<{ success: boolean; data: FinancialAccount }>({
    queryKey: ['financial-account', id],
    queryFn: () => api.get(`/accounts/${id}`),
    enabled: !!id,
  });

  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery<{ success: boolean; data: FinancialTransaction[] }>({
    queryKey: ['financial-account-transactions', id],
    queryFn: () => api.get(`/accounts/${id}/transactions`),
    enabled: !!id,
  });

  const account = accountResponse?.data;
  const transactions = transactionsResponse?.data || [];

  if (accountLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-44 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="text-lg font-semibold text-white">Account Not Found</h3>
        <p className="text-sm text-slate-400 mt-1">The requested financial account does not exist or has been removed.</p>
        <Link
          href="/accounts"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/accounts"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white">{account.name}</h1>
              <StatusBadge status={account.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatAccountType(account.account_type)}
              {account.provider_name ? ` • ${account.provider_name}` : ''}
              {account.account_number ? ` • A/C ${account.account_number}` : ''}
            </p>
          </div>
        </div>

        <Link
          href="/transactions"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-xl border border-slate-700/60 transition-colors"
        >
          <History className="w-4 h-4" />
          All Transactions
        </Link>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-xl">
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Current Balance</span>
          <div className="mt-2 text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {formatBDT(account.current_balance)}
          </div>
          <span className="text-xs text-slate-400 mt-2 block">
            Updated strictly via verified ledger entries
          </span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opening Balance</span>
          <div className="mt-2 text-2xl font-bold text-white font-mono tracking-tight">
            {formatBDT(account.opening_balance)}
          </div>
          <span className="text-xs text-slate-400 mt-2 block">
            Initial recorded capital on creation
          </span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Information</span>
          <div className="mt-2 space-y-1 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Created:</span> {formatDate(account.created_at)}
            </div>
            <div>
              <span className="text-slate-400">Type:</span> {formatAccountType(account.account_type)}
            </div>
            {account.description && (
              <div className="text-slate-400 truncate mt-1">Note: {account.description}</div>
            )}
          </div>
        </div>
      </div>

      {/* Account Ledger Section */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Account Transaction Ledger
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {transactions.length} entries recorded
          </span>
        </div>

        {transactionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No transactions recorded yet for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-300 uppercase tracking-wider border-b border-slate-800 bg-slate-800/80">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Txn #</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Category / Note</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((txn) => {
                  const isCredit = txn.direction === 'CREDIT' || ['CREDIT', 'INCOME', 'OPENING_BALANCE'].includes(txn.transaction_type);
                  return (
                    <tr key={txn.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                        {formatDateTime(txn.transaction_date || txn.created_at)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-400 whitespace-nowrap">
                        {txn.transaction_number}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={txn.transaction_type} type="transaction" />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        <span className="font-medium text-white">{txn.category}</span>
                        {txn.description && (
                          <span className="text-slate-400 block text-[11px] truncate max-w-xs">{txn.description}</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-semibold text-sm whitespace-nowrap ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isCredit ? '+' : '-'} {formatBDT(txn.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-300 whitespace-nowrap">
                        {formatBDT(txn.balance_after)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
