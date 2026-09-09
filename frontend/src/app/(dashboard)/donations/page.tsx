'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HeartHandshake, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Building, 
  User, 
  CreditCard,
  RefreshCw,
  Eye,
  TrendingUp,
  Clock,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import { eventsService } from '@/services/events.service';
import { api } from '@/lib/api';
import { Donation, FinancialAccount, Event } from '@/types/financial';
import StatusBadge from '@/components/ui/StatusBadge';

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [donorTypeFilter, setDonorTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    donor_name: '',
    donor_type: 'INDIVIDUAL',
    email: '',
    phone: '',
    organization_name: '',
    amount: '',
    payment_method: 'BKASH',
    trx_id: '',
    donation_date: new Date().toISOString().split('T')[0],
    purpose: 'General Club Development & Welfare Fund',
    financial_account_id: '',
    event_id: '',
    anonymous: false,
    notes: '',
  });

  // Action modals
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const res = await membersService.getDonations({
        donor_type: donorTypeFilter || undefined,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page,
        limit: 15,
      });
      setDonations(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load donations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHelpers = async () => {
    try {
      const [accRes, evRes] = await Promise.all([
        api.get<any>('/accounts?status=ACTIVE'),
        eventsService.getEvents({ limit: 50 }),
      ]);
      const activeAccounts = accRes.data?.data || accRes.data || [];
      setAccounts(activeAccounts);
      if (activeAccounts.length > 0) {
        setFormData((prev) => ({ ...prev, financial_account_id: activeAccounts[0].id }));
      }
      setEvents(evRes.data || []);
    } catch (err) {
      console.error('Failed to load accounts/events:', err);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [page, donorTypeFilter, statusFilter]);

  useEffect(() => {
    fetchHelpers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDonations();
  };

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.donor_name.trim()) {
      setFormError('Donor name is required');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Please enter a valid donation amount');
      return;
    }
    if (!formData.financial_account_id) {
      setFormError('Please select a receiving financial account');
      return;
    }

    try {
      setSubmitting(true);
      await membersService.createDonation({
        ...formData,
        amount: Number(formData.amount),
        event_id: formData.event_id || undefined,
        organization_name: formData.donor_type === 'ORGANIZATION' ? formData.organization_name : undefined,
      });
      setShowModal(false);
      setFormData({
        donor_name: '',
        donor_type: 'INDIVIDUAL',
        email: '',
        phone: '',
        organization_name: '',
        amount: '',
        payment_method: 'BKASH',
        trx_id: '',
        donation_date: new Date().toISOString().split('T')[0],
        purpose: 'General Club Development & Welfare Fund',
        financial_account_id: accounts[0]?.id || '',
        event_id: '',
        anonymous: false,
        notes: '',
      });
      fetchDonations();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to record donation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      setActionLoading(true);
      await membersService.verifyDonation(id);
      setVerifyId(null);
      fetchDonations();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    try {
      setActionLoading(true);
      await membersService.rejectDonation(id, rejectReason);
      setRejectId(null);
      setRejectReason('');
      fetchDonations();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics calculation
  const totalAmount = donations.reduce((acc, d) => acc + Number(d.amount), 0);
  const verifiedAmount = donations
    .filter((d) => d.status === 'VERIFIED')
    .reduce((acc, d) => acc + Number(d.amount), 0);
  const pendingCount = donations.filter((d) => d.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Club Donations</h1>
              <p className="text-sm text-slate-400">
                Track alumni contributions, patron gifts, and philanthropic funding with automated financial accounting
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDonations}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            Record Donation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Donated</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ৳{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {donations.length} recorded contribution records
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Verified Revenue</span>
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            ৳{verifiedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Credited directly to club financial accounts
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Awaiting Audit</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {pendingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Donations awaiting treasurer verification
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Donor Name, Donation # (e.g. DON-2026-00001), or Trx ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={donorTypeFilter}
            onChange={(e) => setDonorTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Donor Types</option>
            <option value="INDIVIDUAL">Individual Patron</option>
            <option value="ORGANIZATION">Corporate / Organization</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Audit</option>
            <option value="VERIFIED">Verified & Ledgered</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Donations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Donation #</th>
                <th className="py-3.5 px-4">Donor Details</th>
                <th className="py-3.5 px-4">Purpose / Linked Event</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Method & Trx</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading donations...
                  </td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <HeartHandshake className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No donations found matching criteria.
                  </td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      <Link href={`/donations/${d.id}`} className="hover:underline">
                        {d.donation_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white flex items-center gap-1.5">
                        {d.donor_name}
                        {d.anonymous && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {d.donor_type === 'ORGANIZATION' && d.organization_name ? (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" />
                            {d.organization_name}
                          </span>
                        ) : (
                          d.email || d.phone || 'Patron'
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="truncate text-slate-300">{d.purpose}</div>
                      {d.event && (
                        <div className="text-xs text-indigo-400 font-medium truncate">
                          Event: {d.event.title}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white">
                        ৳{Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {d.payment_method}
                      </span>
                      {d.trx_id && (
                        <div className="text-xs font-mono text-slate-500 mt-0.5 truncate max-w-[120px]">
                          {d.trx_id}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(d.donation_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/donations/${d.id}`}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {d.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => setVerifyId(d.id)}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition"
                              title="Verify & Credit Ledger"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setRejectId(d.id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
                              title="Reject Donation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Donation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-400" />
                <h2 className="text-lg font-bold text-white">Record New Donation</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateDonation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Donor Type *
                  </label>
                  <select
                    value={formData.donor_type}
                    onChange={(e) => setFormData({ ...formData, donor_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="INDIVIDUAL">Individual Donor</option>
                    <option value="ORGANIZATION">Organization / Corporate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Donor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. K. M. Hasan / Apex Corp"
                    value={formData.donor_name}
                    onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {formData.donor_type === 'ORGANIZATION' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Organization / Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grameenphone / DIU Alumni Association"
                    value={formData.organization_name}
                    onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="donor@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Donation Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Donation Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.donation_date}
                    onChange={(e) => setFormData({ ...formData, donation_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Payment Channel *
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="ROCKET">Rocket</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash Deposit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Transaction Ref / Trx ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9J4K2L90P1"
                    value={formData.trx_id}
                    onChange={(e) => setFormData({ ...formData, trx_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Receiving Club Account *
                  </label>
                  <select
                    required
                    value={formData.financial_account_id}
                    onChange={(e) => setFormData({ ...formData, financial_account_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
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
                    Link to Event (Optional)
                  </label>
                  <select
                    value={formData.event_id}
                    onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="">-- No Event (General Fund) --</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.event_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Purpose / Intended Use
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="anonymousCheck"
                  checked={formData.anonymous}
                  onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <label htmlFor="anonymousCheck" className="text-xs text-slate-300 select-none">
                  Keep donor publicly anonymous (Hide donor name on public publications)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  {submitting ? 'Saving...' : 'Record Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Confirmation Modal */}
      {verifyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Verify Donation & Post to Ledger</h3>
              <p className="text-xs text-slate-400 mt-2">
                Verifying will automatically deposit the funds into the chosen club financial account, credit the income category, and lock this donation record.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setVerifyId(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerify(verifyId)}
                disabled={actionLoading}
                className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                {actionLoading ? 'Processing...' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Reject Donation Record</h3>
              <p className="text-xs text-slate-400 mt-1">
                Please specify why this donation entry was declined.
              </p>
            </div>
            <div>
              <textarea
                rows={3}
                placeholder="Reason for rejection (e.g. invalid transaction ID, payment not reflected)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => { setRejectId(null); setRejectReason(''); }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectId)}
                disabled={actionLoading}
                className="px-5 py-2 text-sm bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Donation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
