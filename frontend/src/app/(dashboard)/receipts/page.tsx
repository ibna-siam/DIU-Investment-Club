'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Receipt, 
  Search, 
  Filter, 
  Printer, 
  CheckCircle2, 
  Calendar, 
  User, 
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import type { MemberPayment } from '@/types/financial';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ReceiptsDirectoryPage() {
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      // Receipts are payments with status VERIFIED
      const res = await membersService.getPayments({
        status: 'VERIFIED',
        search: searchTerm || undefined,
        page,
        limit: 15,
      });
      setPayments(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [page, paymentMethod]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReceipts();
  };

  const filteredPayments = paymentMethod 
    ? payments.filter(p => p.payment_method === paymentMethod)
    : payments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Official Payment Receipts</h1>
              <p className="text-sm text-slate-400">
                Browse, view, and print verifiable receipts for club dues and member subscriptions
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReceipts}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/member-payments"
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition flex items-center gap-1.5"
          >
            Payments Central
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Receipt # (e.g. RCT-2026-00001), Member Code, or Student ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Payment Methods</option>
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
            <option value="ROCKET">Rocket</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Member Info</th>
                <th className="py-3.5 px-4">Due Reference</th>
                <th className="py-3.5 px-4">Amount Paid</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Verified At</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading official receipts...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No verified receipts found. Receipts are generated automatically when payments are verified.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const receiptNum = p.receipt_number || `RCT-PENDING`;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">
                            {p.receipt_number || 'N/A'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {p.payment_number}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">
                          {p.member?.full_name || 'Club Member'}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {p.member?.member_code} • {p.member?.student_id || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.due ? (
                          <div>
                            <span className="text-xs font-mono text-slate-300">
                              {p.due.due_number}
                            </span>
                            <div className="text-xs text-slate-400 capitalize">
                              {p.due.due_type?.replace(/_/g, ' ').toLowerCase()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">General Credit</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">
                          ৳{Number(p.amount ?? p.amount_paid ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {p.payment_method}
                        </span>
                        {p.trx_id && (
                          <div className="text-xs font-mono text-slate-500 mt-0.5">
                            Trx: {p.trx_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {p.verified_at ? new Date(p.verified_at).toLocaleDateString() : (p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A')}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status || p.verification_status || 'VERIFIED'} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.receipt_number ? (
                          <Link
                            href={`/receipts/${encodeURIComponent(p.receipt_number)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            View & Print
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-600">Pending</span>
                        )}
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
