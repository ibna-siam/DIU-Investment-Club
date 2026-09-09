'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowLeft,
  Edit2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { membersService } from '../../../services/members.service';
import { MembershipType } from '../../../types/financial';

export default function MembershipTypesPage() {
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    joining_fee: 500,
    renewal_fee: 300,
    billing_cycle: 'YEARLY',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingTier, setEditingTier] = useState<MembershipType | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    joining_fee: 0,
    renewal_fee: 0,
    billing_cycle: 'YEARLY',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const data = await membersService.getMembershipTypes();
      setTypes(data || []);
    } catch (err) {
      console.error('Failed to load types', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await membersService.createMembershipType({
        ...formData,
        joining_fee: Number(formData.joining_fee),
        renewal_fee: Number(formData.renewal_fee),
      });
      setModalOpen(false);
      setFormData({ name: '', description: '', joining_fee: 500, renewal_fee: 300, billing_cycle: 'YEARLY' });
      fetchTypes();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create tier');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (tier: MembershipType) => {
    setEditingTier(tier);
    setEditFormData({
      name: tier.name,
      description: tier.description || '',
      joining_fee: tier.joining_fee,
      renewal_fee: tier.renewal_fee,
      billing_cycle: tier.billing_cycle || 'YEARLY',
    });
    setEditError('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setEditSaving(true);
    setEditError('');
    try {
      await membersService.updateMembershipType(editingTier.id, {
        ...editFormData,
        joining_fee: Number(editFormData.joining_fee),
        renewal_fee: Number(editFormData.renewal_fee),
      });
      setEditingTier(null);
      fetchTypes();
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || err.message || 'Failed to update tier');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (tier: MembershipType) => {
    if (
      !confirm(
        `Are you sure you want to delete "${tier.name.replace(
          /_/g,
          ' '
        )}"? If members are enrolled, delete will be prevented.`
      )
    ) {
      return;
    }
    setDeletingId(tier.id);
    try {
      await membersService.deleteMembershipType(tier.id);
      fetchTypes();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete tier');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/members"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-emerald-400" />
              Membership Tiers
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Configure club membership classifications, joining fee policies, and renewal cycles
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/40"
        >
          <Plus className="w-4 h-4" />
          Add Membership Tier
        </button>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            Loading membership tiers...
          </div>
        ) : types.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No Membership Tiers Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Configure club membership classifications, joining fee policies, and renewal cycles.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Tier
            </button>
          </div>
        ) : (
          types.map((tier) => (
            <div
              key={tier.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Layers className="w-5 h-5" />
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {tier.billing_cycle}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mt-4 tracking-tight">
                  {tier.name.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[36px]">
                  {tier.description || 'Standard club membership tier'}
                </p>

                <div className="mt-5 space-y-2 pt-4 border-t border-slate-800/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Admission Fee:</span>
                    <span className="font-semibold text-emerald-400">৳{tier.joining_fee}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Renewal Fee:</span>
                    <span className="font-semibold text-white">৳{tier.renewal_fee}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/50 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Active Policy
                  </span>
                  <Link
                    href={`/members?membership_type_id=${tier.id}`}
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium text-[11px]"
                  >
                    <Users className="w-3 h-3" />
                    Enrolled Members
                  </Link>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/40">
                  <button
                    onClick={() => openEditModal(tier)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Tier
                  </button>
                  <button
                    onClick={() => handleDelete(tier)}
                    disabled={deletingId === tier.id}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors disabled:opacity-50"
                    title="Delete Tier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Tier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              New Membership Tier
            </h2>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tier Name (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADVISORY_MEMBER"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Tier purpose and privileges..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Joining Fee (৳)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.joining_fee}
                    onChange={(e) => setFormData({ ...formData, joining_fee: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Renewal Fee (৳)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.renewal_fee}
                    onChange={(e) => setFormData({ ...formData, renewal_fee: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Billing Cycle</label>
                <select
                  value={formData.billing_cycle}
                  onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="YEARLY">YEARLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="ONE_TIME">ONE TIME</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs"
                >
                  {saving ? 'Creating...' : 'Save Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tier Modal */}
      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditingTier(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-emerald-400" />
              Edit Membership Tier: {editingTier.name}
            </h2>

            {editError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tier Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Tier purpose and privileges..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Joining Fee (৳)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editFormData.joining_fee}
                    onChange={(e) => setEditFormData({ ...editFormData, joining_fee: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Renewal Fee (৳)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editFormData.renewal_fee}
                    onChange={(e) => setEditFormData({ ...editFormData, renewal_fee: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Billing Cycle</label>
                <select
                  value={editFormData.billing_cycle}
                  onChange={(e) => setEditFormData({ ...editFormData, billing_cycle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="YEARLY">YEARLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="ONE_TIME">ONE TIME</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs"
                >
                  {editSaving ? 'Updating...' : 'Update Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
