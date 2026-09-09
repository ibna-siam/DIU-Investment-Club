'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { governanceService } from '../../../../services/governance.service';
import { api } from '../../../../lib/api';
import { ClubAsset, AssetAssignmentItem, AssetMaintenanceItem } from '../../../../types/governance';
import {
  Package,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Wrench,
  UserCheck,
  CornerDownLeft,
  Plus,
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [asset, setAsset] = useState<ClubAsset | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assignments' | 'maintenance'>('assignments');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Forms
  const [assignForm, setAssignForm] = useState({
    assigned_to: '',
    assignment_date: new Date().toISOString().split('T')[0],
    expected_return_date: `${new Date().getFullYear()}-12-31`,
    condition_on_assignment: 'EXCELLENT',
    notes: '',
  });

  const [returnForm, setReturnForm] = useState({
    condition_on_return: 'GOOD',
    notes: '',
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    description: '',
    cost: 0,
    vendor: '',
    status: 'COMPLETED',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ast, usersRes] = await Promise.all([
        governanceService.getAssetById(id),
        api.get<any>('/users').catch(() => ({ data: [] })),
      ]);
      setAsset(ast);
      setUsersList(usersRes.data || []);
    } catch (err) {
      console.error('Failed to load asset details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.assignAsset(id, assignForm);
      setMessage({ type: 'success', text: 'Asset successfully checked out and assigned!' });
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to assign asset' });
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset?.assignments || asset.assignments.length === 0) return;
    const activeAssignment = asset.assignments.find((a) => !a.actual_return_date) || asset.assignments[0];
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.returnAsset(activeAssignment.id, returnForm);
      setMessage({ type: 'success', text: 'Asset returned to inventory custody!' });
      setShowReturnModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to return asset' });
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.addMaintenance(id, maintenanceForm);
      setMessage({ type: 'success', text: 'Maintenance record logged successfully!' });
      setShowMaintenanceModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to log maintenance' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading asset ledger...</div>;
  }

  if (!asset) {
    return (
      <div className="py-20 text-center text-slate-500">
        Asset not found.{' '}
        <Link href="/assets" className="text-cyan-400 hover:underline">
          Return to Assets
        </Link>
      </div>
    );
  }

  const activeAssignment = asset.assignments?.find((a) => !a.actual_return_date);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/assets"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Asset Registry
      </Link>

      {/* Asset Header Spotlight */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {asset.asset_code}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {asset.category}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                  asset.status === 'AVAILABLE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}
              >
                {asset.status}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{asset.asset_name}</h1>
            <p className="text-sm text-slate-400 mt-1">{asset.description || 'No description recorded.'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {asset.status === 'AVAILABLE' ? (
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-cyan-600/30"
              >
                <UserCheck className="w-4 h-4" />
                Assign Custody
              </button>
            ) : (
              <button
                onClick={() => setShowReturnModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-600/30"
              >
                <CornerDownLeft className="w-4 h-4" />
                Return to Storage
              </button>
            )}

            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Wrench className="w-4 h-4" />
              Log Servicing
            </button>
          </div>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Custodian</span>
            <span className="font-medium text-white truncate block mt-0.5">
              {activeAssignment?.assignee?.full_name || asset.assignee?.full_name || 'In Club Storage'}
            </span>
          </div>

          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Condition</span>
            <span className="font-medium text-emerald-400 truncate block mt-0.5">
              {asset.current_condition}
            </span>
          </div>

          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Purchase Value</span>
            <span className="font-medium text-white truncate block mt-0.5">
              ৳{(asset.purchase_cost || 0).toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Storage Location</span>
            <span className="font-medium text-white truncate block mt-0.5">
              {asset.location || 'Club Office'}
            </span>
          </div>
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'assignments'
              ? 'bg-cyan-600/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Custody & Assignments History ({asset.assignments?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'maintenance'
              ? 'bg-cyan-600/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Maintenance & Calibration Logs ({asset.maintenance_logs?.length || 0})
        </button>
      </div>

      {/* Tab 1: Assignments */}
      {activeTab === 'assignments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Chain of Custody Timeline</h3>
              <p className="text-xs text-slate-400">Complete historical record of officers who checked out this asset</p>
            </div>
            {asset.status === 'AVAILABLE' && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign Custody
              </button>
            )}
          </div>

          {!asset.assignments?.length ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
              No past custody assignments recorded for this asset.
            </div>
          ) : (
            <div className="space-y-3">
              {asset.assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">
                        {asg.assignee?.full_name || 'Officer / Member'}
                      </span>
                      {asg.actual_return_date ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                          RETURNED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          ACTIVE CUSTODY
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Assigned: {asg.assignment_date}</span>
                      {asg.expected_return_date && <span>• Expected: {asg.expected_return_date}</span>}
                      {asg.actual_return_date && (
                        <span className="text-emerald-400">• Returned: {asg.actual_return_date}</span>
                      )}
                    </div>
                    {asg.notes && <p className="text-xs text-slate-500 mt-1 italic">{asg.notes}</p>}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span>Condition: {asg.condition_on_assignment}</span>
                    {asg.condition_on_return && <span> ➔ {asg.condition_on_return}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Maintenance Logs */}
      {activeTab === 'maintenance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Servicing & Maintenance Records</h3>
              <p className="text-xs text-slate-400">Repairs, calibration, software updates, and vendor expenses</p>
            </div>
            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Service Record
            </button>
          </div>

          {!asset.maintenance_logs?.length ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
              No maintenance records logged for this equipment.
            </div>
          ) : (
            <div className="space-y-3">
              {asset.maintenance_logs.map((ml) => (
                <div
                  key={ml.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white text-sm">{ml.description}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {ml.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Date: {ml.maintenance_date}</span>
                      {ml.vendor && <span>• Vendor: {ml.vendor}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">৳{(ml.cost || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Check Out Asset */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Assign Asset Custody</h3>
            <p className="text-xs text-slate-400 mb-4">
              Check out "{asset.asset_name}" to an officer or club member.
            </p>

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Custodian</label>
                <select
                  required
                  value={assignForm.assigned_to}
                  onChange={(e) => setAssignForm({ ...assignForm, assigned_to: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose Officer / Member --</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assignment Date</label>
                  <input
                    type="date"
                    required
                    value={assignForm.assignment_date}
                    onChange={(e) => setAssignForm({ ...assignForm, assignment_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Return</label>
                  <input
                    type="date"
                    required
                    value={assignForm.expected_return_date}
                    onChange={(e) => setAssignForm({ ...assignForm, expected_return_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Purpose / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Purpose of check out, event venue, or project..."
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Assigning...' : 'Confirm Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Return Asset */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Return Asset to Storage</h3>
            <p className="text-xs text-slate-400 mb-4">
              Close active custody and record return condition for "{asset.asset_name}".
            </p>

            <form onSubmit={handleReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Condition on Return</label>
                <select
                  value={returnForm.condition_on_return}
                  onChange={(e) => setReturnForm({ ...returnForm, condition_on_return: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="EXCELLENT">Excellent (Good as New)</option>
                  <option value="GOOD">Good (Normal wear)</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor (Needs Inspection)</option>
                  <option value="DAMAGED">Damaged (Requires Repair)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Return Inspection Notes</label>
                <textarea
                  rows={3}
                  placeholder="Notes on cables, cleanliness, battery condition..."
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Returning...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Maintenance */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Log Servicing & Maintenance</h3>
            <p className="text-xs text-slate-400 mb-4">
              Record technical repair, calibration, or servicing expense.
            </p>

            <form onSubmit={handleMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description of Work</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lens replacement and firmware calibration"
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Maintenance Cost (৳)</label>
                  <input
                    type="number"
                    min={0}
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor / Lab</label>
                  <input
                    type="text"
                    placeholder="e.g. Authorized Lab"
                    value={maintenanceForm.vendor}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vendor: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Service Date</label>
                <input
                  type="date"
                  required
                  value={maintenanceForm.maintenance_date}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenance_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Logging...' : 'Log Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
