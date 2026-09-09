'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  Clock,
  RotateCcw,
  Send,
  Trash2,
  AlertCircle,
  FileCheck,
  Printer,
  ShieldCheck,
  FileText,
  User,
  Calendar,
  Layers,
} from 'lucide-react';
import { accountingService } from '../../../../services/accounting.service';
import { JournalEntry } from '../../../../types/accounting';
import { formatCurrency, formatDate } from '../../../../lib/utils';
import { useAuth } from '../../../../hooks/useAuth';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-800/60 border-gray-700' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-800/50' },
  APPROVED: { label: 'Approved', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/50' },
  POSTED: { label: 'Posted to Ledger', color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-800/50' },
  REVERSED: { label: 'Reversed', color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-800/50' },
  VOIDED: { label: 'Voided', color: 'text-rose-400', bg: 'bg-rose-900/30 border-rose-800/50' },
};

export default function JournalDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();

  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reversal Modal state
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState('');

  const loadJournal = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountingService.getJournalById(id);
      setJournal(data);
    } catch (err: any) {
      console.error('Failed to load journal', err);
      setError(err.response?.data?.message || err.message || 'Journal entry not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadJournal();
  }, [id]);

  const handleSubmit = async () => {
    try {
      setActionLoading(true);
      await accountingService.submitJournal(id);
      await loadJournal();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to submit entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await accountingService.approveJournal(id);
      await loadJournal();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to approve entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async () => {
    if (!confirm('Post this journal entry to the General Ledger? This action locks the transaction and generates an official voucher.')) return;
    try {
      setActionLoading(true);
      await accountingService.postJournal(id);
      await loadJournal();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to post entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!reverseReason.trim()) {
      alert('Please provide a valid reason for reversing this journal entry.');
      return;
    }
    try {
      setActionLoading(true);
      const result = await accountingService.reverseJournal(id, reverseReason.trim());
      setShowReverseModal(false);
      setReverseReason('');
      await loadJournal();
      if (result.reversal_journal_id) {
        alert('Reversal entry successfully created and posted to the General Ledger.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to reverse entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!confirm('Are you sure you want to delete this draft journal entry?')) return;
    try {
      setActionLoading(true);
      await accountingService.deleteJournalDraft(id);
      router.push('/journal-entries');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete draft');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading journal details...</p>
      </div>
    );
  }

  if (error || !journal) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500" />
        <h2 className="text-xl font-bold text-white">Journal Not Found</h2>
        <p className="text-sm text-gray-400">{error || 'The requested journal record could not be located.'}</p>
        <Link
          href="/journal-entries"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Journal Entries</span>
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[journal.status] || {
    label: journal.status,
    color: 'text-gray-400',
    bg: 'bg-gray-800',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/journal-entries"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Journal Entries</span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {journal.status === 'DRAFT' && (
            <>
              <button
                onClick={handleDeleteDraft}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-rose-900/40 text-rose-400 border border-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Draft</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Approval</span>
              </button>
            </>
          )}

          {journal.status === 'PENDING_APPROVAL' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow-md shadow-blue-900/30"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Journal</span>
            </button>
          )}

          {journal.status === 'APPROVED' && (
            <button
              onClick={handlePost}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-md shadow-emerald-900/30"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Post to General Ledger</span>
            </button>
          )}

          {journal.status === 'POSTED' && (
            <button
              onClick={() => setShowReverseModal(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-900/40 hover:bg-purple-900/70 border border-purple-700/60 text-purple-300 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reverse Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Status Header Card */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-cyan-400">
                {journal.journal_number}
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}
              >
                {cfg.label}
              </span>
            </div>
            <p className="text-gray-300 text-base mt-2 font-medium">{journal.description}</p>
          </div>

          <div className="flex items-center gap-4 bg-gray-800/60 p-3 rounded-xl border border-gray-700">
            <div>
              <div className="text-xs text-gray-400 font-medium">Total Amount</div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {formatCurrency(journal.total_debit || 0)}
              </div>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div>
              <div className="text-xs text-gray-400 font-medium">Lines</div>
              <div className="text-lg font-bold text-white">
                {journal.lines?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Reversal Banner if Reversed */}
        {journal.status === 'REVERSED' && (
          <div className="mt-4 p-3 bg-purple-950/40 border border-purple-800/60 rounded-lg text-xs text-purple-300 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 flex-shrink-0 text-purple-400" />
            <span>
              This journal entry was reversed on {formatDate(journal.reversed_at || '')}. A mirror reversal entry has neutralized its balances in the General Ledger.
            </span>
          </div>
        )}

        {/* Meta details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-800 text-xs">
          <div>
            <span className="text-gray-400">Entry Date:</span>
            <div className="text-white font-medium mt-0.5">{formatDate(journal.entry_date)}</div>
          </div>
          <div>
            <span className="text-gray-400">Source Module:</span>
            <div className="text-cyan-400 font-medium mt-0.5">{journal.reference_type || 'MANUAL'}</div>
          </div>
          <div>
            <span className="text-gray-400">Posting Date:</span>
            <div className="text-white font-medium mt-0.5">
              {journal.posted_at ? formatDate(journal.posted_at) : 'Not Posted'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Reference ID:</span>
            <div className="text-gray-300 font-mono mt-0.5 truncate" title={journal.reference_id || ''}>
              {journal.reference_id || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Lines Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Transaction Line Items</h2>
          <span className="text-xs text-emerald-400 font-medium">Double-Entry Balanced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Account Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Line Narration</th>
                <th className="px-4 py-3 text-right">Debit (BDT)</th>
                <th className="px-4 py-3 text-right">Credit (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 text-gray-300">
              {journal.lines?.map((line, idx) => (
                <tr key={line.id || idx} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono font-semibold text-cyan-400">
                    {line.account?.account_code || '---'}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {line.account?.account_name || 'Account'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-800 border border-gray-700 text-gray-400">
                      {line.account?.account_type || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    {line.description || journal.description}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                    {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-blue-400">
                    {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-700 bg-gray-800/60 font-medium">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase font-bold text-gray-300">
                  Totals:
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                  {formatCurrency(journal.total_debit || 0)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-blue-400">
                  {formatCurrency(journal.total_credit || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-purple-400">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Reverse Journal Entry</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              In accordance with strict GAAP / IFRS accounting standards, posted entries cannot be deleted.
              Reversing will create an exact inverse mirror entry to nullify this transaction in the general ledger.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Reason for Reversal <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Explain the error or adjustment rationale..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReverseModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReverse}
                disabled={actionLoading || !reverseReason.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {actionLoading ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
