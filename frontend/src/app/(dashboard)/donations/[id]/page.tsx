'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  HeartHandshake, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Building, 
  User, 
  CreditCard, 
  ShieldCheck, 
  Printer, 
  FileText, 
  AlertCircle,
  Hash,
  Clock
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import { Donation } from '@/types/financial';
import StatusBadge from '@/components/ui/StatusBadge';

export default function DonationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification & Rejection Modals
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadDonation();
    }
  }, [id]);

  const loadDonation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await membersService.getDonationById(id);
      setDonation(res);
    } catch (err: any) {
      console.error('Failed to load donation:', err);
      setError(err?.response?.data?.message || 'Donation not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setActionLoading(true);
      await membersService.verifyDonation(id);
      setShowVerifyModal(false);
      loadDonation();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please specify rejection reason');
      return;
    }
    try {
      setActionLoading(true);
      await membersService.rejectDonation(id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      loadDonation();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading donation details...</p>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Donation Record Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'This donation record does not exist or has been removed.'}</p>
        <Link
          href="/donations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Donations Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
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
                Donation: <span className="font-mono text-rose-400">{donation.donation_number}</span>
              </h1>
              <StatusBadge status={donation.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Recorded on {new Date(donation.donation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {donation.status === 'PENDING' && (
            <>
              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify & Ledger
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 text-sm bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-medium rounded-lg border border-rose-500/30 transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print Slip
          </button>
        </div>
      </div>

      {/* Hero Financial Amount Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Total Contributed Amount
          </div>
          <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
            ৳{Number(donation.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400">
            Intended Purpose: <span className="text-slate-200 font-medium">{donation.purpose}</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 sm:text-right space-y-1">
          <div className="text-xs text-slate-400">Payment Channel</div>
          <div className="text-base font-bold text-white flex items-center gap-2 sm:justify-end">
            <CreditCard className="w-4 h-4 text-rose-400" />
            {donation.payment_method}
          </div>
          {donation.trx_id && (
            <div className="text-xs font-mono text-emerald-400">
              Trx ID: {donation.trx_id}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Donor Profile vs Financial Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donor Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Donor Profile</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Donor Name</span>
              <span className="font-semibold text-white text-base">
                {donation.donor_name}
              </span>
              {donation.anonymous && (
                <span className="ml-2 inline-flex text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Anonymous Patron
                </span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Donor Category</span>
              <span className="text-slate-200 capitalize font-medium">
                {donation.donor_type.toLowerCase()}
              </span>
            </div>

            {donation.donor_type === 'ORGANIZATION' && donation.organization_name && (
              <div>
                <span className="text-xs text-slate-400 block">Organization</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-slate-500" />
                  {donation.organization_name}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs text-slate-400 block">Email</span>
                <span className="text-slate-200 font-mono text-xs">
                  {donation.email || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Phone</span>
                <span className="text-slate-200 font-mono text-xs">
                  {donation.phone || 'Not provided'}
                </span>
              </div>
            </div>

            {donation.event && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400 block">Linked Club Event</span>
                <Link
                  href={`/events/${donation.event.id}`}
                  className="text-indigo-400 hover:underline font-medium text-sm flex items-center gap-1 mt-0.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {donation.event.title}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Financial Accounting & Audit Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Financial & Ledger Trace</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Receiving Financial Account</span>
              <div className="text-white font-medium">
                {donation.financial_account?.account_name || 'General Account'}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Acct No: {donation.financial_account?.account_number || 'N/A'} • {donation.financial_account?.bank_name || 'DIU Treasury'}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Income Ledger Integration</span>
              {donation.income_id ? (
                <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ledgered as Income #{donation.income_id}
                </div>
              ) : (
                <div className="text-xs text-amber-400 flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Not yet posted to ledger (Pending verification)
                </div>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Verification Audit</span>
              {donation.status === 'VERIFIED' ? (
                <div className="text-xs text-slate-300 space-y-0.5 mt-1">
                  <div>Status: <span className="font-bold text-emerald-400">VERIFIED</span></div>
                  <div>Audit Timestamp: {donation.verified_at ? new Date(donation.verified_at).toLocaleString() : 'N/A'}</div>
                </div>
              ) : donation.status === 'REJECTED' ? (
                <div className="text-xs text-rose-400 space-y-0.5 mt-1">
                  <div>Status: <span className="font-bold">REJECTED</span></div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-1">
                  Awaiting audit by Club Treasurer or President
                </div>
              )}
            </div>

            {donation.notes && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400 block">Internal Notes</span>
                <p className="text-xs text-slate-300 mt-1 italic">
                  "{donation.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verify Confirmation Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Verify Donation & Post to Ledger</h3>
              <p className="text-xs text-slate-400 mt-2">
                This will officially credit ৳{Number(donation.amount).toFixed(2)} to {donation.financial_account?.account_name} and create an immutable Income ledger record.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowVerifyModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                {actionLoading ? 'Verifying...' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Reject Donation Entry</h3>
              <p className="text-xs text-slate-400 mt-1">
                State reason for rejecting this donation record.
              </p>
            </div>
            <div>
              <textarea
                rows={3}
                placeholder="Reason (e.g. fraudulent transaction, sender recalled)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-5 py-2 text-sm bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
