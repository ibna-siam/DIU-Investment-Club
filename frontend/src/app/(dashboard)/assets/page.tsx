'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { governanceService } from '../../../services/governance.service';
import { ClubAsset, AssetCategory, AssetStatus, AssetCondition } from '../../../types/governance';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Wrench,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

export default function AssetsPage() {
  const [assets, setAssets] = useState<ClubAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    asset_name: '',
    asset_code: '',
    category: 'ELECTRONICS' as AssetCategory,
    purchase_cost: 0,
    current_condition: 'EXCELLENT' as AssetCondition,
    location: 'DIU Investment Club Office Room 402',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = await governanceService.getAssets({
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setAssets(data);
    } catch (err) {
      console.error('Failed to load club assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [categoryFilter, statusFilter, searchQuery]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const code = newAsset.asset_code || `DIU-AST-${Math.floor(Math.random() * 9000 + 1000)}`;
      const created = await governanceService.createAsset({
        ...newAsset,
        asset_code: code,
      });

      setMessage({ type: 'success', text: `Asset "${created.asset_name}" [${created.asset_code}] registered successfully!` });
      setShowCreateModal(false);
      setNewAsset({
        asset_name: '',
        asset_code: '',
        category: 'ELECTRONICS',
        purchase_cost: 0,
        current_condition: 'EXCELLENT',
        location: 'DIU Investment Club Office Room 402',
        description: '',
      });
      loadAssets();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to register asset' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AVAILABLE</span>;
      case 'ASSIGNED':
      case 'IN_USE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">IN CUSTODY</span>;
      case 'UNDER_MAINTENANCE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">SERVICING</span>;
      case 'DAMAGED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">DAMAGED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getConditionBadge = (cond: string) => {
    switch (cond) {
      case 'EXCELLENT':
        return <span className="text-emerald-400 font-medium">Excellent</span>;
      case 'GOOD':
        return <span className="text-blue-400 font-medium">Good</span>;
      case 'FAIR':
        return <span className="text-amber-400 font-medium">Fair</span>;
      case 'POOR':
      case 'DAMAGED':
        return <span className="text-rose-400 font-medium">Needs Repair</span>;
      default:
        return <span className="text-slate-400">{cond}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Package className="w-4 h-4" />
            Club Inventory & Asset Lifecycle
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Club Assets & Equipment Register
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Maintain complete chain of custody, hardware tracking, maintenance logs, and asset allocations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAssets}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search asset tag or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Assets Register Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Club Assets Ledger</h3>
          <span className="text-xs text-slate-500">{assets.length} items logged</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading assets registry...</div>
        ) : !assets.length ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30 text-cyan-400" />
            No assets found matching the selected filters.
            <div className="mt-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-xl text-xs font-semibold transition"
              >
                Register First Asset
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-semibold">Asset Tag</th>
                  <th className="py-3.5 px-4 font-semibold">Asset Name & Scope</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Condition</th>
                  <th className="py-3.5 px-4 font-semibold">Current Custody</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-cyan-400 font-bold">
                      {ast.asset_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/assets/${ast.id}`}
                        className="font-semibold text-white hover:text-cyan-300 transition"
                      >
                        {ast.asset_name}
                      </Link>
                      {ast.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-sm">
                          {ast.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {ast.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(ast.status)}</td>
                    <td className="py-3.5 px-4 text-xs">{getConditionBadge(ast.current_condition)}</td>
                    <td className="py-3.5 px-4 text-xs">
                      {ast.assignee ? (
                        <span className="text-white font-medium">{ast.assignee.full_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">In Storage</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 truncate max-w-xs">
                      {ast.location || 'Club Office'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/assets/${ast.id}`}
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        <span>Manage</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Register Asset */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Register Club Equipment / Asset</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add new hardware, audiovisual equipment, or branding assets to the inventory.
            </p>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Epson 4K Laser Projector"
                  value={newAsset.asset_name}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Tag / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. DIU-AST-1042"
                    value={newAsset.asset_code}
                    onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value as AssetCategory })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="AUDIO_VISUAL">Audio / Visual</option>
                    <option value="FURNITURE">Furniture</option>
                    <option value="BANNER_BRANDING">Banner & Branding</option>
                    <option value="STATIONERY">Stationery</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Purchase Cost (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={newAsset.purchase_cost}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Condition</label>
                  <select
                    value={newAsset.current_condition}
                    onChange={(e) => setNewAsset({ ...newAsset, current_condition: e.target.value as AssetCondition })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Location</label>
                <input
                  type="text"
                  placeholder="e.g. DIU Investment Club Office Room 402, Cabinet B"
                  value={newAsset.location}
                  onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Description</label>
                <textarea
                  rows={3}
                  placeholder="Serial numbers, specifications, warranty information..."
                  value={newAsset.description}
                  onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
