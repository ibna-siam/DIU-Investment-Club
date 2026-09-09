'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowRight,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { accountingService } from '../../../services/accounting.service';
import { JournalEntry } from '../../../types/accounting';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { useAuth } from '../../../hooks/useAuth';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-800/60 border-gray-700' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-800/50' },
  APPROVED: { label: 'Approved', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/50' },
  POSTED: { label: 'Posted', color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-800/50' },
  REVERSED: { label: 'Reversed', color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-800/50' },
  VOIDED: { label: 'Voided', color: 'text-rose-400', bg: 'bg-rose-900/30 border-rose-800/50' },
};

export default function JournalEntriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refTypeFilter, setRefTypeFilter] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadJournals = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (refTypeFilter !== 'ALL') params.reference_type = refTypeFilter;
      const data = await accountingService.getJournals(params);
      setJournals(data);
    } catch (err: any) {
      console.error('Failed to load journals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
  }, [statusFilter, refTypeFilter]);

  const handleQuickPost = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Post this journal entry to the General Ledger? This action cannot be undone.')) return;
    try {
      setActionLoading(id);
      await accountingService.postJournal(id);
      await loadJournals();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to post entry');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredJournals = journals.filter((j) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      j.journal_number?.toLowerCase().includes(term) ||
      j.description?.toLowerCase().includes(term) ||
      j.reference_type?.toLowerCase().includes(term)
    );
  });

  const counts = {
    all: journals.length,
    draft: journals.filter((j) => j.status === 'DRAFT').length,
    pending: journals.filter((j) => j.status === 'PENDING_APPROVAL').length,
    approved: journals.filter((j) => j.status === 'APPROVED').length,
    posted: journals.filter((j) => j.status === 'POSTED').length,
    reversed: journals.filter((j) => j.status === 'REVERSED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Journal Entries</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-800/60">
              Double-Entry Engine
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            General journal records, manual double-entry transactions, and automated operational audit logs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadJournals}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/journal-entries/create"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-900/30 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Journal Entry</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { id: 'ALL', label: 'All Entries', count: counts.all, color: 'text-gray-300' },
          { id: 'DRAFT', label: 'Drafts', count: counts.draft, color: 'text-gray-400' },
          { id: 'PENDING_APPROVAL', label: 'Pending', count: counts.pending, color: 'text-amber-400' },
          { id: 'APPROVED', label: 'Approved', count: counts.approved, color: 'text-blue-400' },
          { id: 'POSTED', label: 'Posted', count: counts.posted, color: 'text-emerald-400' },
          { id: 'REVERSED', label: 'Reversed', count: counts.reversed, color: 'text-purple-400' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === tab.id
                ? 'bg-gray-800/90 border-cyan-500/50 shadow-md shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                : 'bg-gray-900/40 border-gray-800 hover:bg-gray-800/40'
            }`}
          >
            <div className="text-xs text-gray-400 font-medium">{tab.label}</div>
            <div className={`text-xl font-bold mt-1 ${tab.color}`}>{tab.count}</div>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by journal # or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-gray-400 font-medium">Source:</span>
          <select
            value={refTypeFilter}
            onChange={(e) => setRefTypeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Sources</option>
            <option value="MANUAL">Manual Entry</option>
            <option value="INCOME">Income Receipt</option>
            <option value="EXPENSE">Expense Payment</option>
            <option value="MEMBER_PAYMENT">Member Dues</option>
            <option value="DONATION">Donation</option>
            <option value="SPONSORSHIP_PAYMENT">Sponsorship</option>
            <option value="TRANSFER">Fund Transfer</option>
            <option value="REVERSAL">System Reversal</option>
          </select>
        </div>
      </div>

      {/* Journal Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Journal #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Source / Ref</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit (BDT)</th>
                <th className="px-4 py-3 text-right">Credit (BDT)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                    Loading journal records...
                  </td>
                </tr>
              ) : filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    No journal entries found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredJournals.map((entry) => {
                  const cfg = STATUS_CONFIG[entry.status] || {
                    label: entry.status,
                    color: 'text-gray-400',
                    bg: 'bg-gray-800',
                  };
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => router.push(`/journal-entries/${entry.id}`)}
                      className="hover:bg-gray-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-cyan-400">
                        {entry.journal_number}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(entry.entry_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs rounded font-medium bg-gray-800 text-gray-300 border border-gray-700">
                          {entry.reference_type || 'MANUAL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-200" title={entry.description}>
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                        {formatCurrency(entry.total_debit || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-blue-400">
                        {formatCurrency(entry.total_credit || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {entry.status === 'APPROVED' && (
                            <button
                              onClick={(e) => handleQuickPost(entry.id, e)}
                              disabled={actionLoading === entry.id}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            >
                              {actionLoading === entry.id ? 'Posting...' : 'Post'}
                            </button>
                          )}
                          <Link
                            href={`/journal-entries/${entry.id}`}
                            className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded transition-colors"
                            title="View details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
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
