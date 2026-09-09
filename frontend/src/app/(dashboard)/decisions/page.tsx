'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { governanceService } from '../../../services/governance.service';
import { ClubDecision, DecisionType, DecisionStatus, Meeting } from '../../../types/governance';
import {
  Scale,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  User,
  ShieldCheck,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<ClubDecision[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDecisionForAction, setSelectedDecisionForAction] = useState<ClubDecision | null>(null);
  const [showActionItemModal, setShowActionItemModal] = useState(false);

  // Forms
  const [newDecision, setNewDecision] = useState({
    title: '',
    description: '',
    decision_type: 'GOVERNANCE' as DecisionType,
    meeting_id: '',
    decision_date: new Date().toISOString().split('T')[0],
    effective_date: `${new Date().getFullYear()}-12-31`,
    status: 'PROPOSED' as DecisionStatus,
  });

  const [actionItemForm, setActionItemForm] = useState({
    title: '',
    description: '',
    due_date: `${new Date().getFullYear()}-12-31`,
    priority: 'HIGH',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDecisions = async () => {
    setLoading(true);
    try {
      const [decs, meets] = await Promise.all([
        governanceService.getDecisions({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          decision_type: typeFilter === 'ALL' ? undefined : typeFilter,
        }),
        governanceService.getMeetings(),
      ]);
      setDecisions(decs);
      setMeetings(meets);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecisions();
  }, [statusFilter, typeFilter]);

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const created = await governanceService.createDecision({
        ...newDecision,
        meeting_id: newDecision.meeting_id || undefined,
      });

      setMessage({ type: 'success', text: `Resolution "${created.title}" proposed successfully!` });
      setShowCreateModal(false);
      setNewDecision({
        title: '',
        description: '',
        decision_type: 'GOVERNANCE',
        meeting_id: '',
        decision_date: new Date().toISOString().split('T')[0],
        effective_date: `${new Date().getFullYear()}-12-31`,
        status: 'PROPOSED',
      });
      loadDecisions();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to propose decision' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: DecisionStatus) => {
    try {
      await governanceService.updateDecision(id, { status });
      setMessage({ type: 'success', text: `Decision status updated to ${status}!` });
      loadDecisions();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update decision' });
    }
  };

  const handleOpenActionItem = (decision: ClubDecision) => {
    setSelectedDecisionForAction(decision);
    setActionItemForm({
      title: `Execute: ${decision.title}`,
      description: `Action item mandated by executive decision: ${decision.description}`,
      due_date: decision.effective_date || new Date().toISOString().split('T')[0],
      priority: 'HIGH',
    });
    setShowActionItemModal(true);
  };

  const handleCreateActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecisionForAction) return;
    setSaving(true);
    setMessage(null);
    try {
      const task = await governanceService.createActionItem(selectedDecisionForAction.id, actionItemForm);
      setMessage({
        type: 'success',
        text: `Action Item Task "${task.title}" generated successfully from decision!`,
      });
      setShowActionItemModal(false);
      loadDecisions();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to generate action item' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">APPROVED</span>;
      case 'PROPOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">PROPOSED</span>;
      case 'IMPLEMENTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">IMPLEMENTED</span>;
      case 'DEFERRED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-300">DEFERRED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">CANCELLED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Scale className="w-4 h-4" />
            Strategic Resolutions & Policy Ledger
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Club Decisions & Policy Directives
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track executive board resolutions, votes, implementation pipelines, and linked operational action items.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDecisions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-amber-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Propose Decision
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

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {['ALL', 'PROPOSED', 'APPROVED', 'IMPLEMENTED', 'DEFERRED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Decision Types</option>
            <option value="GOVERNANCE">Governance & Elections</option>
            <option value="FINANCIAL">Financial & Capital Allocation</option>
            <option value="EVENT">Event & Summit Sanctions</option>
            <option value="POLICY">Regulatory & Policy</option>
            <option value="OPERATIONAL">Operational Directives</option>
          </select>
        </div>
      </div>

      {/* Decisions Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Recorded Club Resolutions</h3>
          <span className="text-xs text-slate-500">{decisions.length} recorded items</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading decisions ledger...</div>
        ) : !decisions.length ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <Scale className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-400" />
            No decisions found matching the selected filters.
            <div className="mt-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl text-xs font-semibold transition"
              >
                Propose First Resolution
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {decisions.map((d) => (
              <div key={d.id} className="p-5 hover:bg-slate-800/20 transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {d.decision_type}
                      </span>
                      {getStatusBadge(d.status)}
                      {d.tasks_count && d.tasks_count > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" />
                          {d.tasks_count} Action Item{d.tasks_count > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="font-bold text-white text-base">{d.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{d.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Decided: {d.decision_date}
                      </span>
                      {d.effective_date && (
                        <>
                          <span>•</span>
                          <span>Effective: {d.effective_date}</span>
                        </>
                      )}
                      {d.meeting && (
                        <>
                          <span>•</span>
                          <Link href={`/meetings/${d.meeting.id}`} className="text-emerald-400 hover:underline">
                            Meeting: {d.meeting.title}
                          </Link>
                        </>
                      )}
                      {d.responsible_person && (
                        <>
                          <span>•</span>
                          <span>Officer: {d.responsible_person.full_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenActionItem(d)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl text-xs font-semibold border border-purple-500/30 transition"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Create Action Item
                    </button>

                    {d.status === 'PROPOSED' && (
                      <button
                        onClick={() => handleStatusUpdate(d.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-500/30 transition"
                      >
                        Ratify & Approve
                      </button>
                    )}

                    {d.status === 'APPROVED' && (
                      <button
                        onClick={() => handleStatusUpdate(d.id, 'IMPLEMENTED')}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-semibold border border-blue-500/30 transition"
                      >
                        Mark Implemented
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Propose Decision */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Propose Board Resolution</h3>
            <p className="text-xs text-slate-400 mb-4">
              Draft an official decision, policy directive, or strategic sanction.
            </p>

            <form onSubmit={handleCreateDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resolution Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Risk Parity Portfolio Allocation"
                  value={newDecision.title}
                  onChange={(e) => setNewDecision({ ...newDecision, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category / Domain</label>
                  <select
                    value={newDecision.decision_type}
                    onChange={(e) => setNewDecision({ ...newDecision, decision_type: e.target.value as DecisionType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="GOVERNANCE">Governance & Elections</option>
                    <option value="FINANCIAL">Financial & Capital Allocation</option>
                    <option value="EVENT">Event Sanction</option>
                    <option value="POLICY">Constitutional Policy</option>
                    <option value="OPERATIONAL">Operational Directive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Associated Meeting (Optional)</label>
                  <select
                    value={newDecision.meeting_id}
                    onChange={(e) => setNewDecision({ ...newDecision, meeting_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Standalone / Board Decision --</option>
                    {meetings.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.meeting_date})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Decision Date</label>
                  <input
                    type="date"
                    required
                    value={newDecision.decision_date}
                    onChange={(e) => setNewDecision({ ...newDecision, decision_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Effective Deadline</label>
                  <input
                    type="date"
                    value={newDecision.effective_date}
                    onChange={(e) => setNewDecision({ ...newDecision, effective_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Resolution Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="State the resolution text, rationale, and specific operational requirements..."
                  value={newDecision.description}
                  onChange={(e) => setNewDecision({ ...newDecision, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Proposing...' : 'Propose Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Convert Decision to Action Item */}
      {showActionItemModal && selectedDecisionForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Generate Action Item</h3>
            <p className="text-xs text-slate-400 mb-4">
              Convert "{selectedDecisionForAction.title}" into an actionable club task.
            </p>

            <form onSubmit={handleCreateActionItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Action Task Title</label>
                <input
                  type="text"
                  required
                  value={actionItemForm.title}
                  onChange={(e) => setActionItemForm({ ...actionItemForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={actionItemForm.priority}
                    onChange={(e) => setActionItemForm({ ...actionItemForm, priority: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={actionItemForm.due_date}
                    onChange={(e) => setActionItemForm({ ...actionItemForm, due_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Action Specifications</label>
                <textarea
                  rows={3}
                  required
                  value={actionItemForm.description}
                  onChange={(e) => setActionItemForm({ ...actionItemForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActionItemModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Generating...' : 'Confirm Action Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
