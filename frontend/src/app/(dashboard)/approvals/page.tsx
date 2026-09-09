'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { ApprovalRequest } from '../../../types/financial';
import { formatBDT, formatDate } from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileCheck2,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface ApprovalsApiResponse {
  success: boolean;
  data: ApprovalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ApprovalsPage() {
  const [tab, setTab] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, refetch } = useQuery<ApprovalsApiResponse>({
    queryKey: ['approvals', tab, typeFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (tab !== 'ALL') params.append('status', tab);
      if (typeFilter) params.append('request_type', typeFilter);
      return api.get(`/approvals?${params.toString()}`);
    },
  });

  const requests = data?.data || [];

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.requester_name && r.requester_name.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  // Calculate counts
  const pendingCount = requests.filter((r) =>
    ['PENDING', 'PENDING_APPROVAL', 'UNDER_REVIEW'].includes(r.status)
  ).length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const changesRequestedCount = requests.filter(
    (r) => r.status === 'CHANGES_REQUESTED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Approvals Workflow
              </h1>
              <p className="text-sm text-slate-400">
                Multi-tier financial authorization pipeline with role-governed controls
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:text-slate-100 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setTab('PENDING_APPROVAL')}
          className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Pending Step 1
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            {requests.filter((r) => ['PENDING', 'PENDING_APPROVAL'].includes(r.status)).length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Awaiting Treasurer review</p>
        </div>

        <div
          onClick={() => setTab('UNDER_REVIEW')}
          className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Under Review
            </span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            {requests.filter((r) => r.status === 'UNDER_REVIEW').length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Awaiting President approval</p>
        </div>

        <div
          onClick={() => setTab('CHANGES_REQUESTED')}
          className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
              Changes Needed
            </span>
            <AlertCircle className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{changesRequestedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Sent back to requester</p>
        </div>

        <div
          onClick={() => setTab('APPROVED')}
          className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Fully Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100 mt-2">{approvedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Ready for disbursement / paid</p>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2 text-sm">
          {[
            { id: 'ALL', label: 'All Requests' },
            { id: 'PENDING_APPROVAL', label: 'Pending Review' },
            { id: 'UNDER_REVIEW', label: 'Under Review' },
            { id: 'CHANGES_REQUESTED', label: 'Changes Requested' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by request title, requester..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Filter className="w-4 h-4" />
              <span>Type:</span>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="">All Types</option>
              <option value="EXPENSE">Expense Disbursement</option>
              <option value="BUDGET">Event Budget</option>
            </select>
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Request Title & Type</th>
                <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Requester</th>
                <th className="py-3.5 px-4 font-semibold">Pipeline Step</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                      <span>Loading approval requests...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-rose-400">
                    Failed to load approval requests.
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-300">No Approvals In Queue</p>
                      <p className="text-xs text-slate-500">
                        When expenses are submitted by members or executives, they appear here for multi-tier verification.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const currentStepObj = r.steps?.find(
                    (s) => s.step_number === r.current_step
                  );
                  const stepLabel = currentStepObj
                    ? `Step ${r.current_step}/${r.total_steps}: ${currentStepObj.step_name}`
                    : `Step ${r.current_step} of ${r.total_steps}`;

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/approvals/${r.id}`}
                          className="font-medium text-slate-200 hover:text-amber-400 transition-colors block"
                        >
                          {r.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                            {r.request_type}
                          </span>
                          {r.description && (
                            <span className="text-xs text-slate-400 line-clamp-1">
                              {r.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                        {r.amount ? formatBDT(r.amount) : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium text-xs">
                          {r.requester_name || 'DIU Executive'}
                        </div>
                        {r.requester_email && (
                          <div className="text-[11px] text-slate-400">
                            {r.requester_email}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {stepLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/approvals/${r.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
