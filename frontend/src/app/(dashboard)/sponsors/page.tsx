'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  Phone, 
  Globe, 
  Eye, 
  RefreshCw,
  Handshake,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import { Sponsor } from '@/types/financial';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SponsorsDirectoryPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Add Sponsor Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    address: '',
    notes: '',
  });

  const fetchSponsors = async () => {
    try {
      setLoading(true);
      const res = await membersService.getSponsors({
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page,
        limit: 15,
      });
      setSponsors(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load sponsors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSponsors();
  };

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.company_name.trim()) {
      setFormError('Company or partner name is required');
      return;
    }

    try {
      setSubmitting(true);
      await membersService.createSponsor(formData);
      setShowModal(false);
      setFormData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        website: '',
        industry: '',
        address: '',
        notes: '',
      });
      fetchSponsors();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create sponsor partner');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Corporate Sponsors & Partners</h1>
              <p className="text-sm text-slate-400">
                Directory of institutional partners, corporate sponsors, and career event benefactors
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSponsors}
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
            Add Partner / Sponsor
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Company Name, Partner Code (e.g. SPN-2026-00001), or Contact Person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Partners</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Sponsors Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Partner Code</th>
                <th className="py-3.5 px-4">Company Name</th>
                <th className="py-3.5 px-4">Primary Contact</th>
                <th className="py-3.5 px-4">Industry / Domain</th>
                <th className="py-3.5 px-4">Communication</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading partners...
                  </td>
                </tr>
              ) : sponsors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No corporate partners found.
                  </td>
                </tr>
              ) : (
                sponsors.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      <Link href={`/sponsors/${s.id}`} className="hover:underline">
                        {s.sponsor_code}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {s.company_name}
                      </div>
                      {s.website && (
                        <a
                          href={s.website.startsWith('http') ? s.website : `https://${s.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 mt-0.5"
                        >
                          <Globe className="w-3 h-3" />
                          {s.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-white font-medium">
                        {s.contact_person || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.phone || 'No direct phone'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {s.industry || 'Financial Services'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {s.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {s.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/sponsors/${s.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Profile
                        </Link>
                        <Link
                          href={`/sponsorships?sponsor_id=${s.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-medium transition"
                          title="Agreements"
                        >
                          <Handshake className="w-3.5 h-3.5" />
                          Agreements
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sponsor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Add Corporate Sponsor / Partner</h2>
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

            <form onSubmit={handleCreateSponsor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LankaBangla Securities Ltd."
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Asif Rahman, Head of PR"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Industry / Sector
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brokerage & Asset Management"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="partnerships@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+880 1711XXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  placeholder="https://company.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Office Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Motijheel C/A, Dhaka"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal notes about partnership scope..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  {submitting ? 'Saving...' : 'Save Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
