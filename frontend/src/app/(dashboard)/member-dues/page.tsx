'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Eye,
  CreditCard,
  Filter,
} from 'lucide-react';
import { membersService } from '../../../services/members.service';
import { MemberDue } from '../../../types/financial';
import { StatusBadge } from '../../../components/ui/StatusBadge';

export default function MemberDuesPage() {
  const [dues, setDues] = useState<MemberDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dueType, setDueType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDues = async () => {
    setLoading(true);
    try {
      const res = await membersService.getDues({
        search: search || undefined,
        status: status || undefined,
        due_type: dueType || undefined,
        page,
        limit: 10,
      });
      setDues(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load dues', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, [page, status, dueType]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setPage(1);
      fetchDues();
    }, 400);
    return () => clearTimeout(delay);
  }, [search]);

  // Statistics
  const totalPending = dues.reduce((sum, d) => sum + Number(d.remaining_amount), 0);
  const overdueCount = dues.filter((d) => d.status === 'OVERDUE').length;
  const paidCount = dues.filter((d) => d.status === 'PAID').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-400" />
            Member Dues Central
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track membership fees, recurring subscriptions, special assessments, and outstanding balances
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Page Outstanding Dues</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-400">৳{totalPending.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Unsettled receivable balance</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Overdue Dues</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-400">{overdueCount}</div>
          <div className="text-xs text-slate-500 mt-1">Past due date obligations</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Paid Obligations</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-400">{paidCount}</div>
          <div className="text-xs text-slate-500 mt-1">Fully settled dues on current page</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between backdrop-blur-xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by due number, title, or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="WAIVED">WAIVED</option>
          </select>

          <select
            value={dueType}
            onChange={(e) => {
              setDueType(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Due Types</option>
            <option value="MEMBERSHIP_FEE">MEMBERSHIP_FEE</option>
            <option value="RENEWAL_FEE">RENEWAL_FEE</option>
            <option value="MONTHLY_DUE">MONTHLY_DUE</option>
            <option value="SPECIAL_DUE">SPECIAL_DUE</option>
            <option value="EVENT_FEE">EVENT_FEE</option>
          </select>

          <button
            onClick={fetchDues}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dues Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Due #</th>
                <th className="px-6 py-4 font-semibold">Member</th>
                <th className="px-6 py-4 font-semibold">Title / Type</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Paid</th>
                <th className="px-6 py-4 font-semibold">Remaining</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading dues...
                  </td>
                </tr>
              ) : dues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No dues found matching criteria.
                  </td>
                </tr>
              ) : (
                dues.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-emerald-400">
                      {d.due_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{d.member?.full_name || 'Member'}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {d.member?.member_code} • {d.member?.student_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{d.title}</div>
                      <div className="text-xs text-slate-500">{d.due_type.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">৳{d.amount}</td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">৳{d.paid_amount}</td>
                    <td className="px-6 py-4 font-bold text-rose-400">৳{d.remaining_amount}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{d.due_date}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/members/${d.member_id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Member
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-sm">
            <span className="text-xs text-slate-400">
              Showing page {page} of {totalPages} ({totalCount} dues)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
