'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Handshake, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Building2, 
  DollarSign, 
  Eye, 
  RefreshCw,
  TrendingUp,
  FileCheck,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import { eventsService } from '@/services/events.service';
import { Sponsorship, Sponsor, Event } from '@/types/financial';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SponsorshipsDirectoryPage() {
  const searchParams = useSearchParams();
  const preselectedSponsorId = searchParams?.get('sponsor_id') || searchParams?.get('new_for') || '';

  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sponsorFilter, setSponsorFilter] = useState(preselectedSponsorId);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // New Agreement Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sponsor_id: preselectedSponsorId,
    event_id: '',
    agreement_title: '',
    tier: 'GOLD',
    agreed_amount: '',
    agreement_date: new Date().toISOString().split('T')[0],
    deliverable_terms: '',
    contract_url: '',
    notes: '',
  });

  const fetchSponsorships = async () => {
    try {
      setLoading(true);
      const res = await membersService.getSponsorships({
        sponsor_id: sponsorFilter || undefined,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page,
        limit: 15,
      });
      setSponsorships(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load sponsorships:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHelpers = async () => {
    try {
      const [spRes, evRes] = await Promise.all([
        membersService.getSponsors({ limit: 100 }),
        eventsService.getEvents({ limit: 50 }),
      ]);
      const activeSponsors = spRes.data || [];
      setSponsors(activeSponsors);
      setEvents(evRes.data || []);

      if (activeSponsors.length > 0 && !formData.sponsor_id) {
        setFormData((prev) => ({ ...prev, sponsor_id: preselectedSponsorId || activeSponsors[0].id }));
      }
      if (searchParams?.get('new_for')) {
        setShowModal(true);
      }
    } catch (err) {
      console.error('Failed to load helpers:', err);
    }
  };

  useEffect(() => {
    fetchSponsorships();
  }, [page, sponsorFilter, statusFilter]);

  useEffect(() => {
    fetchHelpers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSponsorships();
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.sponsor_id) {
      setFormError('Please select a sponsor partner');
      return;
    }
    if (!formData.agreed_amount || Number(formData.agreed_amount) <= 0) {
      setFormError('Please enter a valid agreed amount');
      return;
    }

    try {
      setSubmitting(true);
      await membersService.createSponsorship({
        ...formData,
        agreed_amount: Number(formData.agreed_amount),
        event_id: formData.event_id || undefined,
      });
      setShowModal(false);
      setFormData({
        sponsor_id: sponsors[0]?.id || '',
        event_id: '',
        agreement_title: '',
        tier: 'GOLD',
        agreed_amount: '',
        agreement_date: new Date().toISOString().split('T')[0],
        deliverable_terms: '',
        contract_url: '',
        notes: '',
      });
      fetchSponsorships();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create sponsorship agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const totalContracted = sponsorships.reduce((acc, s) => acc + Number(s.agreed_amount), 0);
  const totalReceived = sponsorships.reduce((acc, s) => acc + Number(s.received_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Handshake className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Sponsorship Agreements</h1>
              <p className="text-sm text-slate-400">
                Track corporate partnership contracts, installment schedules, deliverables, and ledgered inflows
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSponsorships}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            New Agreement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Contract Pipeline</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ৳{totalContracted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {sponsorships.length} partnership contracts
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Collected Revenue</span>
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ৳{totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Verified installments ledgered into accounts
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Outstanding Inflow</span>
            <FileCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            ৳{(totalContracted - totalReceived).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Remaining uncollected contractual dues
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Agreement # (e.g. SP-AGR-2026-00001), Sponsor, or Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={sponsorFilter}
            onChange={(e) => setSponsorFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500 max-w-[180px]"
          >
            <option value="">All Partners</option>
            {sponsors.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.company_name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="PROSPECT">Prospect</option>
            <option value="NEGOTIATION">Negotiation</option>
            <option value="AGREED">Agreed</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Fully Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Sponsorships Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Agreement #</th>
                <th className="py-3.5 px-4">Partner & Title</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">Contract Amount</th>
                <th className="py-3.5 px-4">Collection Progress</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading agreements...
                  </td>
                </tr>
              ) : sponsorships.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Handshake className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No sponsorship agreements found.
                  </td>
                </tr>
              ) : (
                sponsorships.map((s) => {
                  const agreed = Number(s.agreed_amount);
                  const received = Number(s.received_amount);
                  const pct = agreed > 0 ? Math.min(100, Math.round((received / agreed) * 100)) : 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        <Link href={`/sponsorships/${s.id}`} className="hover:underline">
                          {s.agreement_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {s.sponsor?.company_name || 'Partner'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {s.agreement_title || 'General Partnership'}
                        </div>
                        {s.event && (
                          <div className="text-xs text-indigo-400">
                            Event: {s.event.title}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-amber-300 border border-amber-500/30">
                          {s.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white font-mono">
                        ৳{agreed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-emerald-400 font-mono">
                            ৳{received.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 font-mono">{pct}%</span>
                        </div>
                        <div className="w-32 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(s.agreement_date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/sponsorships/${s.id}`}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-medium transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Workspace
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

      {/* New Agreement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Create Sponsorship Agreement</h2>
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

            <form onSubmit={handleCreateAgreement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Corporate Partner *
                  </label>
                  <select
                    required
                    value={formData.sponsor_id}
                    onChange={(e) => setFormData({ ...formData, sponsor_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {sponsors.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.company_name} ({sp.sponsor_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Sponsorship Tier *
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="TITLE_SPONSOR">Title Sponsor</option>
                    <option value="PLATINUM">Platinum Partner</option>
                    <option value="GOLD">Gold Sponsor</option>
                    <option value="SILVER">Silver Sponsor</option>
                    <option value="BRONZE">Bronze Sponsor</option>
                    <option value="PARTNER">Supporting Partner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Agreement Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Investment Summit 2026 - Title Sponsorship"
                  value={formData.agreement_title}
                  onChange={(e) => setFormData({ ...formData, agreement_title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Agreed Contract Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100000"
                    value={formData.agreed_amount}
                    onChange={(e) => setFormData({ ...formData, agreed_amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Signing Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.agreement_date}
                    onChange={(e) => setFormData({ ...formData, agreement_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Link to Club Event (Optional)
                </label>
                <select
                  value={formData.event_id}
                  onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Standalone Partnership (No Event) --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.event_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Deliverable Terms & Commitments
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Logo on all stage backdrops, 20min keynote speech, booth at main hall..."
                  value={formData.deliverable_terms}
                  onChange={(e) => setFormData({ ...formData, deliverable_terms: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
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
                  className="px-5 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-600/20"
                >
                  {submitting ? 'Creating...' : 'Create Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
