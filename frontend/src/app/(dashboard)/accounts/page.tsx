'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { FinancialAccount } from '../../../types/financial';
import { formatBDT, formatAccountType } from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import {
  Wallet,
  Plus,
  Search,
  Building2,
  Smartphone,
  Coins,
  ArrowUpRight,
  Filter,
  Eye,
  CheckCircle2,
  Ban,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';

interface AccountsApiResponse {
  success: boolean;
  data: FinancialAccount[];
  summary: {
    totalAccounts: number;
    totalBalance: number;
    cashBalance: number;
    bankBalance: number;
    digitalBalance: number;
  };
}

export default function AccountsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Status Change Modal State
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'INACTIVE' | 'CLOSED'>('ACTIVE');
  const [modalOpen, setModalOpen] = useState(false);

  const { data: response, isLoading } = useQuery<AccountsApiResponse>({
    queryKey: ['financial-accounts', { search, typeFilter, statusFilter }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/accounts?${params.toString()}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/accounts/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      setModalOpen(false);
      setSelectedAccount(null);
    },
  });

  const accounts = response?.data || [];
  const summary = response?.summary || {
    totalAccounts: 0,
    totalBalance: 0,
    cashBalance: 0,
    bankBalance: 0,
    digitalBalance: 0,
  };

  const openStatusChange = (account: FinancialAccount, newStatus: 'ACTIVE' | 'INACTIVE' | 'CLOSED') => {
    setSelectedAccount(account);
    setTargetStatus(newStatus);
    setModalOpen(true);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CASH':
        return <Coins className="w-5 h-5 text-amber-400" />;
      case 'BANK':
        return <Building2 className="w-5 h-5 text-sky-400" />;
      case 'BKASH':
      case 'NAGAD':
      case 'ROCKET':
        return <Smartphone className="w-5 h-5 text-pink-400" />;
      default:
        return <Wallet className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wallet className="w-7 h-7 text-indigo-400" />
            Financial Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage club cash, bank deposits, and mobile financial accounts. Balance modifications occur strictly through verified transactions.
          </p>
        </div>
        {hasPermission('financial_accounts.create') && (
          <Link
            href="/accounts/create"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </Link>
        )}
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Club Balance</span>
            <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
            {formatBDT(summary.totalBalance)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Across {summary.totalAccounts} accounts
          </span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash in Hand</span>
            <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-amber-300 font-mono tracking-tight">
            {formatBDT(summary.cashBalance)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Physical club vault / petty cash</span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Accounts</span>
            <div className="p-2.5 bg-sky-500/15 text-sky-400 rounded-xl border border-sky-500/30">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-sky-300 font-mono tracking-tight">
            {formatBDT(summary.bankBalance)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Scheduled commercial banks</span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Wallets (MFS)</span>
            <div className="p-2.5 bg-pink-500/15 text-pink-400 rounded-xl border border-pink-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-pink-300 font-mono tracking-tight">
            {formatBDT(summary.digitalBalance)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">bKash, Nagad, Rocket</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts by name, number, or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Account Types</option>
            <option value="CASH">Cash in Hand</option>
            <option value="BANK">Bank Account</option>
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
            <option value="ROCKET">Rocket</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Account Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20">
          <Wallet className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No Financial Accounts Found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by registering your club's cash in hand, bank accounts, or official mobile wallets.
          </p>
          {hasPermission('financial_accounts.create') && (
            <Link
              href="/accounts/create"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              Create Account
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-xl shadow-black/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 border border-slate-700/80 rounded-xl">
                      {getAccountIcon(account.account_type)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white leading-snug">{account.name}</h3>
                      <span className="text-xs text-slate-400">
                        {formatAccountType(account.account_type)}
                        {account.provider_name ? ` • ${account.provider_name}` : ''}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={account.status} />
                </div>

                {account.account_number && (
                  <div className="mt-3 text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-700 inline-block">
                    A/C: {account.account_number}
                  </div>
                )}

                {account.description && (
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2">{account.description}</p>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-slate-400">Current Balance</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">
                    {formatBDT(account.current_balance)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link
                    href={`/accounts/${account.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Ledger
                  </Link>

                  {hasPermission('financial_accounts.update') && (
                    account.status === 'ACTIVE' ? (
                      <button
                        onClick={() => openStatusChange(account, 'INACTIVE')}
                        className="px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/10 rounded-xl border border-amber-500/20 transition-colors"
                        title="Deactivate account"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => openStatusChange(account, 'ACTIVE')}
                        className="px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/20 transition-colors"
                        title="Activate account"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => {
          if (selectedAccount) {
            updateStatusMutation.mutate({
              id: selectedAccount.id,
              status: targetStatus,
            });
          }
        }}
        title={`Set Account to ${targetStatus}?`}
        message={`Are you sure you want to mark "${selectedAccount?.name}" as ${targetStatus.toLowerCase()}? Active transactions will strictly require an active account.`}
        confirmLabel={`Set to ${targetStatus}`}
        variant={targetStatus === 'ACTIVE' ? 'success' : 'warning'}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
}
