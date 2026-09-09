'use client';

import React, { useEffect, useState } from 'react';
import { governanceService } from '../../../services/governance.service';
import { membersService } from '../../../services/members.service';
import { ClubCommittee, CommitteePosition, CommitteeMember } from '../../../types/governance';
import { Member } from '../../../types/financial';
import {
  Building2,
  Users,
  Award,
  Plus,
  Calendar,
  Shield,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Trash2,
  ChevronRight,
  RefreshCw,
  Edit2,
  Power,
  X,
} from 'lucide-react';

export default function CommitteePage() {
  const [committees, setCommittees] = useState<ClubCommittee[]>([]);
  const [selectedCommittee, setSelectedCommittee] = useState<ClubCommittee | null>(null);
  const [positions, setPositions] = useState<CommitteePosition[]>([]);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'positions' | 'history'>('roster');

  // Committee Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Position Modals & State
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [showEditPositionModal, setShowEditPositionModal] = useState(false);
  const [selectedPositionForEdit, setSelectedPositionForEdit] = useState<CommitteePosition | null>(null);
  const [showDeletePositionModal, setShowDeletePositionModal] = useState(false);
  const [selectedPositionForDelete, setSelectedPositionForDelete] = useState<CommitteePosition | null>(null);

  // Officer Removal Modal
  const [showRemoveOfficerModal, setShowRemoveOfficerModal] = useState(false);
  const [selectedOfficerForRemoval, setSelectedOfficerForRemoval] = useState<any | null>(null);

  // Form states
  const [newCommittee, setNewCommittee] = useState({
    committee_name: '',
    committee_type: 'EXECUTIVE',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: `${new Date().getFullYear() + 1}-12-31`,
  });

  const [newAssignment, setNewAssignment] = useState({
    member_id: '',
    position_id: '',
    start_date: new Date().toISOString().split('T')[0],
  });

  const [positionForm, setPositionForm] = useState({
    position_name: '',
    description: '',
    hierarchy_level: 10,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [comms, pos, mems] = await Promise.all([
        governanceService.getCommittees(),
        governanceService.getPositions({ include_inactive: true }),
        membersService.getMembers({ limit: 100 }),
      ]);
      setCommittees(comms);
      setPositions(pos);
      setMembersList(mems.data || []);

      if (comms.length > 0) {
        const activeComm = comms.find((c) => c.status === 'ACTIVE') || comms[0];
        const detail = await governanceService.getCommitteeById(activeComm.id);
        setSelectedCommittee(detail);
      }
    } catch (err) {
      console.error('Failed to load committee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCommittee = async (c: ClubCommittee) => {
    try {
      const detail = await governanceService.getCommitteeById(c.id);
      setSelectedCommittee(detail);
    } catch (err) {
      console.error('Failed to load committee detail:', err);
    }
  };

  const handleCreateCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const created = await governanceService.createCommittee(newCommittee);
      setMessage({ type: 'success', text: `Committee "${created.committee_name}" created successfully!` });
      setShowCreateModal(false);
      setNewCommittee({
        committee_name: '',
        committee_type: 'EXECUTIVE',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: `${new Date().getFullYear() + 1}-12-31`,
      });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create committee' });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommittee) return;
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.assignMember(selectedCommittee.id, newAssignment);
      setMessage({ type: 'success', text: 'Officer appointed successfully!' });
      setShowAssignModal(false);
      setNewAssignment({
        member_id: '',
        position_id: '',
        start_date: new Date().toISOString().split('T')[0],
      });
      // Refresh selected committee
      const detail = await governanceService.getCommitteeById(selectedCommittee.id);
      setSelectedCommittee(detail);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to appoint officer' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.createPosition(positionForm);
      setMessage({ type: 'success', text: `Position "${positionForm.position_name}" created successfully!` });
      setShowAddPositionModal(false);
      setPositionForm({ position_name: '', description: '', hierarchy_level: 10 });
      const pos = await governanceService.getPositions({ include_inactive: true });
      setPositions(pos);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create position' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPositionForEdit) return;
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.updatePosition(selectedPositionForEdit.id, positionForm);
      setMessage({ type: 'success', text: `Position "${positionForm.position_name}" updated successfully!` });
      setShowEditPositionModal(false);
      setSelectedPositionForEdit(null);
      const pos = await governanceService.getPositions({ include_inactive: true });
      setPositions(pos);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update position' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePositionStatus = async (pos: CommitteePosition) => {
    const nextStatus = !pos.is_active;
    try {
      await governanceService.togglePositionStatus(pos.id, nextStatus);
      setMessage({
        type: 'success',
        text: `Position "${pos.position_name}" ${nextStatus ? 'activated' : 'deactivated/archived'}.`,
      });
      const updated = await governanceService.getPositions({ include_inactive: true });
      setPositions(updated);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change position status' });
    }
  };

  const handleDeletePosition = async () => {
    if (!selectedPositionForDelete) return;
    setSaving(true);
    try {
      await governanceService.deletePosition(selectedPositionForDelete.id);
      setMessage({ type: 'success', text: `Position "${selectedPositionForDelete.position_name}" deleted safely.` });
      setShowDeletePositionModal(false);
      setSelectedPositionForDelete(null);
      const updated = await governanceService.getPositions({ include_inactive: true });
      setPositions(updated);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete position' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOfficer = async (permanent: boolean) => {
    if (!selectedOfficerForRemoval) return;
    setSaving(true);
    try {
      await governanceService.removeMemberAssignment(selectedOfficerForRemoval.id, permanent);
      setMessage({
        type: 'success',
        text: permanent
          ? 'Officer assignment removed from roster. Member registration remains intact.'
          : 'Officer tenure concluded successfully. Member registration remains intact.',
      });
      setShowRemoveOfficerModal(false);
      setSelectedOfficerForRemoval(null);
      if (selectedCommittee) {
        const detail = await governanceService.getCommitteeById(selectedCommittee.id);
        setSelectedCommittee(detail);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove officer' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Building2 className="w-4 h-4" />
            Governance Structure
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Executive Committee & Leadership Board
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage governing boards, leadership positions, officer tenures, and organizational hierarchy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            New Committee Term
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

      {/* Active Committee Spotlight Card */}
      {selectedCommittee && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedCommittee.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {selectedCommittee.committee_type}
                </span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">{selectedCommittee.committee_name}</h2>
              <p className="text-sm text-slate-400 mt-1">{selectedCommittee.description || 'No description set.'}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  Tenure: {selectedCommittee.start_date} to {selectedCommittee.end_date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate-500" />
                  {selectedCommittee.members?.length || 0} Appointed Officers
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow transition"
              >
                <UserCheck className="w-4 h-4" />
                Appoint Officer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'roster'
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Officer Roster ({selectedCommittee?.members?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'positions'
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Governance Positions ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'history'
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Committee Sessions ({committees.length})
        </button>
      </div>

      {/* Tab 1: Officer Roster */}
      {activeTab === 'roster' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Appointed Executive Officers</h3>
            <span className="text-xs text-slate-500">Sorted by hierarchy</span>
          </div>

          {!selectedCommittee?.members?.length ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-400" />
              No officers appointed to this committee session yet.
              <div className="mt-3">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-semibold transition"
                >
                  Appoint First Officer
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3.5 px-4 font-semibold">Hierarchy</th>
                    <th className="py-3.5 px-4 font-semibold">Position</th>
                    <th className="py-3.5 px-4 font-semibold">Officer Name</th>
                    <th className="py-3.5 px-4 font-semibold">Member Code</th>
                    <th className="py-3.5 px-4 font-semibold">Contact</th>
                    <th className="py-3.5 px-4 font-semibold">Tenure</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedCommittee.members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">
                          {m.position?.hierarchy_level || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-400" />
                          {m.position?.position_name || 'Officer'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{m.member?.full_name || 'Club Member'}</div>
                        <div className="text-xs text-slate-400">{m.member?.student_id || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {m.member?.member_code || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        <div>{m.member?.email}</div>
                        <div>{m.member?.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {m.start_date} {m.end_date ? `to ${m.end_date}` : '(Present)'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedOfficerForRemoval(m);
                            setShowRemoveOfficerModal(true);
                          }}
                          className="px-2.5 py-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition inline-flex items-center gap-1"
                          title="Remove officer from this committee roster"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Positions Hierarchy */}
      {activeTab === 'positions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-white text-base">Defined Constitutional Positions</h3>
              <p className="text-xs text-slate-400">Official DIU Investment Club governance roles and hierarchy</p>
            </div>
            <button
              onClick={() => {
                setPositionForm({
                  position_name: '',
                  hierarchy_level: (positions.length + 1) * 10,
                  description: '',
                });
                setShowAddPositionModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Position</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((p) => (
              <div
                key={p.id}
                className={`bg-slate-800/40 border rounded-xl p-4 flex flex-col justify-between transition ${
                  p.is_active === false
                    ? 'border-slate-800/60 opacity-60 bg-slate-950/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500/10 text-blue-400 font-mono text-xs font-bold border border-blue-500/20">
                      #{p.hierarchy_level}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        p.is_active === false
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {p.is_active === false ? 'ARCHIVED' : 'ACTIVE'}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{p.position_name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {p.description || 'Constitutional governing authority and portfolio stewardship.'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-4 mt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedPositionForEdit(p);
                      setPositionForm({
                        position_name: p.position_name,
                        hierarchy_level: p.hierarchy_level,
                        description: p.description || '',
                      });
                      setShowEditPositionModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                    title="Edit Position Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleTogglePositionStatus(p)}
                    className={`p-1.5 rounded-lg transition ${
                      p.is_active === false
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-amber-400 hover:bg-amber-500/10'
                    }`}
                    title={p.is_active === false ? 'Reactivate Position' : 'Archive / Deactivate Position'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPositionForDelete(p);
                      setShowDeletePositionModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Delete Position (if unassigned)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: History & Past Committees */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-base">All Executive Committees</h3>
            <span className="text-xs text-slate-500">{committees.length} recorded terms</span>
          </div>

          <div className="space-y-3">
            {committees.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCommittee(c)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  selectedCommittee?.id === c.id
                    ? 'bg-blue-500/10 border-blue-500/40'
                    : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">{c.committee_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Tenure: {c.start_date} to {c.end_date} • {c.committee_type}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                  <span>{selectedCommittee?.id === c.id ? 'Viewing' : 'Select'}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Committee */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Committee Session</h3>
            <p className="text-xs text-slate-400 mb-4">
              Initialize a new executive board or sub-committee tenure period.
            </p>

            <form onSubmit={handleCreateCommittee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Committee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Committee 2026-2027"
                  value={newCommittee.committee_name}
                  onChange={(e) => setNewCommittee({ ...newCommittee, committee_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Committee Type</label>
                <select
                  value={newCommittee.committee_type}
                  onChange={(e) => setNewCommittee({ ...newCommittee, committee_type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="EXECUTIVE">Executive Committee</option>
                  <option value="ADVISORY">Advisory Board</option>
                  <option value="SUB_COMMITTEE">Sub-Committee</option>
                  <option value="ORGANIZING">Organizing Committee</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newCommittee.start_date}
                    onChange={(e) => setNewCommittee({ ...newCommittee, start_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newCommittee.end_date}
                    onChange={(e) => setNewCommittee({ ...newCommittee, end_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Official scope, executive mandate, and charter details..."
                  value={newCommittee.description}
                  onChange={(e) => setNewCommittee({ ...newCommittee, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Committee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Appoint Officer */}
      {showAssignModal && selectedCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Appoint Executive Officer</h3>
            <p className="text-xs text-slate-400 mb-4">
              Assign a registered member to an official constitutional position in {selectedCommittee.committee_name}.
            </p>

            <form onSubmit={handleAssignMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Member</label>
                <select
                  required
                  value={newAssignment.member_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, member_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Member --</option>
                  {membersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.member_code}) - {m.student_id || 'Student'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Position</label>
                <select
                  required
                  value={newAssignment.position_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, position_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Position --</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.hierarchy_level} - {p.position_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Appointment Date</label>
                <input
                  type="date"
                  required
                  value={newAssignment.start_date}
                  onChange={(e) => setNewAssignment({ ...newAssignment, start_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Appointing...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Constitutional Position */}
      {showAddPositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Constitutional Position</h3>
            <p className="text-xs text-slate-400 mb-4">
              Define a new official role in the DIU Investment Club governance hierarchy.
            </p>

            <form onSubmit={handleCreatePosition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Risk Officer, Head of Research"
                  value={positionForm.position_name}
                  onChange={(e) => setPositionForm({ ...positionForm, position_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hierarchy Level (Rank)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={999}
                  value={positionForm.hierarchy_level}
                  onChange={(e) => setPositionForm({ ...positionForm, hierarchy_level: parseInt(e.target.value) || 10 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Lower numbers indicate senior executive rank (e.g. 10 = President, 20 = VP).</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role Description</label>
                <textarea
                  rows={3}
                  placeholder="Scope of mandate, authority, and responsibilities..."
                  value={positionForm.description}
                  onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPositionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Constitutional Position */}
      {showEditPositionModal && selectedPositionForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Edit Constitutional Position</h3>
            <p className="text-xs text-slate-400 mb-4">
              Modify details for {selectedPositionForEdit.position_name}.
            </p>

            <form onSubmit={handleUpdatePosition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  value={positionForm.position_name}
                  onChange={(e) => setPositionForm({ ...positionForm, position_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hierarchy Level (Rank)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={999}
                  value={positionForm.hierarchy_level}
                  onChange={(e) => setPositionForm({ ...positionForm, hierarchy_level: parseInt(e.target.value) || 10 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role Description</label>
                <textarea
                  rows={3}
                  value={positionForm.description}
                  onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditPositionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Constitutional Position Confirmation */}
      {showDeletePositionModal && selectedPositionForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Position</h3>
            <p className="text-xs text-slate-300 mb-3">
              Are you sure you want to permanently delete the position <strong className="text-white">"{selectedPositionForDelete.position_name}"</strong>?
            </p>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-400 mb-5">
              <span className="font-semibold text-amber-400 block mb-1">Safety Guard:</span>
              Positions that currently have active or historical officer appointments cannot be deleted to preserve governance records. Deactivate instead if appointments exist.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeletePositionModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePosition}
                disabled={saving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Remove Officer Assignment (Section 7) */}
      {showRemoveOfficerModal && selectedOfficerForRemoval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Remove Officer From Roster</h3>
            <p className="text-xs text-slate-400 mb-4">
              Managing governance appointment for <strong className="text-white">{selectedOfficerForRemoval.member?.full_name || 'Officer'}</strong> ({selectedOfficerForRemoval.position?.position_name}).
            </p>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 mb-5">
              <strong>Member Safety Guarantee:</strong> Removing or concluding an officer assignment will NOT delete the person's member account, registration, dues, or transaction history. They will remain an active member of the club.
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleRemoveOfficer(false)}
                disabled={saving}
                className="w-full text-left p-3.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition group"
              >
                <div className="text-xs font-bold text-white group-hover:text-blue-400">Option A: Conclude Tenure (Recommended)</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Marks end date as today. Preserves historical committee record for club history & archives.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRemoveOfficer(true)}
                disabled={saving}
                className="w-full text-left p-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition group"
              >
                <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200">Option B: Remove Assignment Completely</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Permanently removes this assignment row from this committee roster (use if appointed by mistake).
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end mt-5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRemoveOfficerModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
