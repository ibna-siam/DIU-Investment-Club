'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { membersService } from '../../../services/members.service';
import { MemberPayment } from '../../../types/financial';
import { StatusBadge } from '../../../components/ui/StatusBadge';

export default function MemberPaymentsPage() {
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Verification modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<MemberPayment | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<'verify' | 'reject'>('verify');
  const [rejectReason, setRejectReason] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await membersService.getPayments({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 10,
      });
      setPayments(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, status]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setPage(1);
      fetchPayments();
    }, 400);
    return () => clearTimeout(delay);
  }, [search]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      if (actionType === 'verify') {
        await membersService.verifyPayment(selectedPayment.id, notes);
      } else {
        await membersService.rejectPayment(selectedPayment.id, rejectReason);
      }
      setVerifyModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
  const verifiedVolume = payments
    .filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-400" />
            Payment Collections & Verification
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review recorded member collections, verify bank/bKash receipts, and credit club financial ledger
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Verification</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-400">{pendingCount}</div>
          <div className="text-xs text-slate-500 mt-1">Collections awaiting finance approval</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Page Verified Volume</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-400">৳{verifiedVolume.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Credited directly to account balances</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Records</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{totalCount}</div>
          <div className="text-xs text-slate-500 mt-1">Payment transactions recorded</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between backdrop-blur-xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payment #, receipt #, or reference..."
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
            <option value="">All Verification Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <button
            onClick={fetchPayments}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Payment #</th>
                <th className="px-6 py-4 font-semibold">Receipt #</th>
                <th className="px-6 py-4 font-semibold">Member</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Financial Account</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-white">{p.payment_number}</td>
                    <td className="px-6 py-4 font-mono text-xs text-emerald-400">
                      {p.receipt_number || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{p.member?.full_name || 'Member'}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {p.member?.member_code} • {p.member?.student_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      ৳{(Number(p.amount_paid || p.amount || 0)).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{p.account_name || 'Operating A/C'}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{p.payment_date}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setActionType('verify');
                                setNotes('');
                                setVerifyModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setActionType('reject');
                                setRejectReason('');
                                setVerifyModalOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-lg text-xs transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {p.receipt_number && (
                          <Link
                            href={`/receipts/${p.receipt_number}`}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Print / View Receipt"
                          >
                            <Receipt className="w-4 h-4 text-indigo-400" />
                          </Link>
                        )}
                      </div>
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
              Showing page {page} of {totalPages} ({totalCount} total payments)
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

      {/* Verify / Reject Modal */}
      {verifyModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {actionType === 'verify' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Verify Payment Collection
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" /> Reject Payment Record
                </>
              )}
            </h2>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Number:</span>
                <span className="font-mono text-white">{selectedPayment.payment_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="text-white font-medium">{selectedPayment.member?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="text-emerald-400 font-bold">৳{selectedPayment.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method & Account:</span>
                <span className="text-slate-300">
                  {selectedPayment.payment_method} • {selectedPayment.account_name}
                </span>
              </div>
            </div>

            {actionType === 'verify' ? (
              <form onSubmit={handleActionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Verification Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Merchant statement or cash receipt match details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs"
                  >
                    {actionLoading ? 'Verifying...' : 'Confirm & Credit Ledger'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleActionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Rejection Reason <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide reason for rejecting this payment submission..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-xl text-xs"
                  >
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
