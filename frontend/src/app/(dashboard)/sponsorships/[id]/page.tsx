'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Handshake, 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  ShieldCheck, 
  FileText, 
  AlertCircle,
  Receipt,
  Printer,
  Clock,
  ExternalLink
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import { api } from '@/lib/api';
import { Sponsorship, SponsorshipPayment, FinancialAccount } from '@/types/financial';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SponsorshipWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [sponsorship, setSponsorship] = useState<(Sponsorship & { payments: SponsorshipPayment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    installment_number: 1,
    amount: '',
    payment_method: 'BANK_TRANSFER',
    trx_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    financial_account_id: '',
    notes: '',
  });

  // Verify / Reject Modal
  const [verifyPaymentId, setVerifyPaymentId] = useState<string | null>(null);
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [agrRes, accRes] = await Promise.all([
        membersService.getSponsorshipById(id),
        api.get<any>('/accounts?status=ACTIVE'),
      ]);
      setSponsorship(agrRes);
      const activeAccs = accRes.data?.data || accRes.data || [];
      setAccounts(activeAccs);

      const nextInstallmentNum = (agrRes.payments?.length || 0) + 1;
      setPaymentFormData((prev) => ({
        ...prev,
        installment_number: nextInstallmentNum,
        financial_account_id: activeAccs[0]?.id || '',
      }));
    } catch (err: any) {
      console.error('Failed to load agreement:', err);
      setError(err?.response?.data?.message || 'Sponsorship agreement not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentFormError(null);

    if (!paymentFormData.amount || Number(paymentFormData.amount) <= 0) {
      setPaymentFormError('Please enter a valid installment amount');
      return;
    }
    if (!paymentFormData.financial_account_id) {
      setPaymentFormError('Please select a receiving club financial account');
      return;
    }

    try {
      setSubmittingPayment(true);
      await membersService.recordSponsorshipPayment(id, {
        ...paymentFormData,
        amount: Number(paymentFormData.amount),
        installment_number: Number(paymentFormData.installment_number),
      });
      setShowPaymentModal(false);
      loadData();
    } catch (err: any) {
      setPaymentFormError(err?.response?.data?.message || 'Failed to record installment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string) => {
    try {
      setActionLoading(true);
      await membersService.verifySponsorshipPayment(paymentId);
      setVerifyPaymentId(null);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Payment verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading sponsorship workspace...</p>
      </div>
    );
  }

  if (error || !sponsorship) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Agreement Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'This agreement does not exist.'}</p>
        <Link
          href="/sponsorships"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sponsorships
        </Link>
      </div>
    );
  }

  const agreed = Number(sponsorship.agreed_amount);
  const received = Number(sponsorship.received_amount);
  const outstanding = Math.max(0, agreed - received);
  const progressPercent = agreed > 0 ? Math.min(100, Math.round((received / agreed) * 100)) : 0;
  const payments = sponsorship.payments || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {sponsorship.agreement_title || 'Sponsorship Contract'}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {sponsorship.agreement_number}
              </span>
              <StatusBadge status={sponsorship.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Partner:{' '}
              <Link href={`/sponsors/${sponsorship.sponsor?.id}`} className="text-amber-400 hover:underline font-semibold">
                {sponsorship.sponsor?.company_name}
              </Link>{' '}
              • Signed {new Date(sponsorship.agreement_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            Record Installment
          </button>
        </div>
      </div>

      {/* Progress & KPIs Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Agreed Contract Value
            </span>
            <span className="text-3xl font-black text-white font-mono">
              ৳{agreed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              Tier: <span className="text-amber-300 font-bold">{sponsorship.tier}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Verified Revenue Collected
            </span>
            <span className="text-3xl font-black text-emerald-400 font-mono">
              ৳{received.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <div className="text-xs text-slate-500 mt-1">
              Credited directly to club accounts
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Outstanding Receivable
            </span>
            <span className={`text-3xl font-black font-mono ${outstanding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              ৳{outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <div className="text-xs text-slate-500 mt-1">
              {outstanding === 0 ? 'Contract fully realized' : 'Pending contractual installments'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
            <span>Sponsorship Realization Progress</span>
            <span className="font-mono text-emerald-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Contract Particulars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Deliverable Terms & Partner Obligations
          </h2>
          <p className="text-slate-200 whitespace-pre-line text-xs leading-relaxed">
            {sponsorship.deliverable_terms || 'Standard branding, logo inclusion, and promotional announcements across club channels.'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Associated Event & Context
          </h2>
          {sponsorship.event ? (
            <div className="space-y-1">
              <span className="text-xs text-slate-400">Linked Club Event</span>
              <Link
                href={`/events/${sponsorship.event.id}`}
                className="text-indigo-400 hover:underline font-semibold block text-sm"
              >
                {sponsorship.event.title} ({sponsorship.event.event_type})
              </Link>
            </div>
          ) : (
            <span className="text-slate-500 text-xs">General Club Annual Partnership</span>
          )}
          {sponsorship.notes && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 block">Notes:</span>
              <span className="text-xs text-slate-300 italic">{sponsorship.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Installments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Contract Installments & Cash Inflows</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {payments.length} installment records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-4">Installment</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method & Trx ID</th>
                <th className="py-3 px-4">Account Credited</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No installments recorded for this sponsorship yet. Click "Record Installment" above to enter a payment.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {p.payment_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        Installment #{p.installment_number}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      ৳{Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-white text-xs font-medium">{p.payment_method}</div>
                      {p.trx_id && (
                        <div className="text-xs font-mono text-slate-500 mt-0.5">
                          {p.trx_id}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {p.financial_account ? (
                        <div>
                          <div>{p.financial_account.account_name}</div>
                          <div className="text-slate-500 font-mono">
                            {p.financial_account.account_number}
                          </div>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.verification_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.verification_status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setVerifyPaymentId(p.id)}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verify
                          </button>
                        </div>
                      )}
                      {p.verification_status === 'VERIFIED' && (
                        <span className="text-xs text-emerald-400 flex items-center justify-end gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Ledgered
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Installment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Record Sponsorship Installment</h2>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {paymentFormError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {paymentFormError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Installment # *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={paymentFormData.installment_number}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, installment_number: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="25000"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentFormData.payment_method}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / Cheque</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Transaction / Cheque Ref #
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-998822 / TR-9871"
                  value={paymentFormData.trx_id}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, trx_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Receiving Club Account *
                </label>
                <select
                  required
                  value={paymentFormData.financial_account_id}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, financial_account_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.account_type}) - ৳{Number(acc.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Notes / Voucher Ref
                </label>
                <input
                  type="text"
                  placeholder="Optional details..."
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {submittingPayment ? 'Saving...' : 'Record Installment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Installment Modal */}
      {verifyPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Verify Installment & Credit Account</h3>
              <p className="text-xs text-slate-400 mt-2">
                Verifying will automatically deposit funds into the designated club financial account, credit the Sponsorship Income category, and update the agreement realization balance.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setVerifyPaymentId(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyPayment(verifyPaymentId)}
                disabled={actionLoading}
                className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                {actionLoading ? 'Processing...' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
