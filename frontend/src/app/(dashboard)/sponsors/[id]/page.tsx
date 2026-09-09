'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ArrowLeft, 
  Handshake, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Plus, 
  Edit3, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import { Sponsor, Sponsorship } from '@/types/financial';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SponsorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [agreements, setAgreements] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    address: '',
    status: 'ACTIVE',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadSponsorData();
    }
  }, [id]);

  const loadSponsorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [spRes, agrRes] = await Promise.all([
        membersService.getSponsorById(id),
        membersService.getSponsorships({ sponsor_id: id, limit: 50 }),
      ]);
      setSponsor(spRes);
      setAgreements(agrRes.data || []);
      setEditData({
        company_name: spRes.company_name,
        contact_person: spRes.contact_person || '',
        email: spRes.email || '',
        phone: spRes.phone || '',
        website: spRes.website || '',
        industry: spRes.industry || '',
        address: spRes.address || '',
        status: spRes.status,
      });
    } catch (err: any) {
      console.error('Failed to load sponsor:', err);
      setError(err?.response?.data?.message || 'Sponsor not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await membersService.updateSponsor(id, editData);
      setShowEditModal(false);
      loadSponsorData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update sponsor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading partner details...</p>
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Partner Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'This sponsor partner does not exist.'}</p>
        <Link
          href="/sponsors"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sponsors Directory
        </Link>
      </div>
    );
  }

  const totalContracted = agreements.reduce((acc, a) => acc + Number(a.agreed_amount), 0);
  const totalReceived = agreements.reduce((acc, a) => acc + Number(a.received_amount), 0);

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
                {sponsor.company_name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {sponsor.sponsor_code}
              </span>
              <StatusBadge status={sponsor.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Corporate Partner Profile & Sponsorship Agreements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4" />
            Edit Partner
          </button>
          <Link
            href={`/sponsorships?new_for=${sponsor.id}`}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            New Agreement
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Total Contracted Sponsorship
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ৳{totalContracted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {agreements.length} partnership agreements
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Total Revenue Received
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ৳{totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Deposited into club financial accounts
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Pending / Outstanding
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            ৳{(totalContracted - totalReceived).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Installments due or in negotiation
          </div>
        </div>
      </div>

      {/* Sponsor Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800 pb-2">
          Company Information & Communication Channels
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Primary Contact</span>
            <span className="font-semibold text-white">
              {sponsor.contact_person || 'Not specified'}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Industry Sector</span>
            <span className="text-slate-200">
              {sponsor.industry || 'Financial Services'}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Email Address</span>
            {sponsor.email ? (
              <a href={`mailto:${sponsor.email}`} className="text-amber-400 hover:underline text-xs font-mono">
                {sponsor.email}
              </a>
            ) : (
              <span className="text-slate-500">None</span>
            )}
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Phone Number</span>
            {sponsor.phone ? (
              <span className="text-slate-200 font-mono text-xs">{sponsor.phone}</span>
            ) : (
              <span className="text-slate-500">None</span>
            )}
          </div>

          {sponsor.website && (
            <div className="sm:col-span-2">
              <span className="text-xs text-slate-400 block">Official Website</span>
              <a
                href={sponsor.website.startsWith('http') ? sponsor.website : `https://${sponsor.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline text-xs flex items-center gap-1 mt-0.5"
              >
                <Globe className="w-3 h-3" />
                {sponsor.website}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {sponsor.address && (
            <div className="sm:col-span-2">
              <span className="text-xs text-slate-400 block">Headquarters / Office Address</span>
              <span className="text-slate-300 text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-500" />
                {sponsor.address}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Agreements Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white">Sponsorship Agreements</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {agreements.length} contracts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Agreement #</th>
                <th className="py-3.5 px-4">Agreement Title / Event</th>
                <th className="py-3.5 px-4">Tier / Package</th>
                <th className="py-3.5 px-4">Agreed Amount</th>
                <th className="py-3.5 px-4">Received / Paid</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {agreements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No sponsorship agreements recorded for this partner yet.
                  </td>
                </tr>
              ) : (
                agreements.map((agr) => {
                  const percent = Number(agr.agreed_amount) > 0 
                    ? Math.round((Number(agr.received_amount) / Number(agr.agreed_amount)) * 100) 
                    : 0;
                  return (
                    <tr key={agr.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        <Link href={`/sponsorships/${agr.id}`} className="hover:underline">
                          {agr.agreement_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {agr.agreement_title || 'Sponsorship Contract'}
                        </div>
                        {agr.event && (
                          <div className="text-xs text-indigo-400">
                            Linked Event: {agr.event.title}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-amber-300 border border-amber-500/20">
                          {agr.tier || 'PARTNER'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white font-mono">
                        ৳{Number(agr.agreed_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-emerald-400 font-mono">
                          ৳{Number(agr.received_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={agr.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/sponsorships/${agr.id}`}
                          className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition inline-flex items-center gap-1"
                        >
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

      {/* Edit Sponsor Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">Edit Partner Details</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={editData.company_name}
                  onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editData.contact_person}
                    onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ACTIVE">Active Partner</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
