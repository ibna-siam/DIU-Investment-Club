'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { governanceService } from '../../../services/governance.service';
import { Meeting, MeetingType, MeetingStatus, ClubCommittee } from '../../../types/governance';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Video,
  FileText,
  Building2,
  RefreshCw,
  Trash2,
  X,
  Shield,
  AlertTriangle,
} from 'lucide-react';

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [committees, setCommittees] = useState<ClubCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    meeting_type: 'EXECUTIVE_MEETING' as MeetingType,
    committee_id: '',
    meeting_date: new Date().toISOString().split('T')[0],
    start_time: '16:00',
    end_time: '18:00',
    location: 'DIU Smart Classroom 402',
    meeting_link: '',
    description: '',
  });

  // Safe Cancel / Delete Meeting Modal (Sections 12 & 13)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMeetingForDelete, setSelectedMeetingForDelete] = useState<Meeting | null>(null);
  const [meetingImpact, setMeetingImpact] = useState<any | null>(null);
  const [meetingImpactLoading, setMeetingImpactLoading] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'CANCEL' | 'HARD_DELETE'>('CANCEL');
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const [meets, comms] = await Promise.all([
        governanceService.getMeetings({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          meeting_type: typeFilter === 'ALL' ? undefined : typeFilter,
        }),
        governanceService.getCommittees(),
      ]);
      setMeetings(meets);
      setCommittees(comms);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [statusFilter, typeFilter]);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const created = await governanceService.createMeeting({
        ...newMeeting,
        committee_id: newMeeting.committee_id || undefined,
      });

      setMessage({ type: 'success', text: `Meeting "${created.title}" scheduled successfully!` });
      setShowScheduleModal(false);
      setNewMeeting({
        title: '',
        meeting_type: 'EXECUTIVE_MEETING',
        committee_id: '',
        meeting_date: new Date().toISOString().split('T')[0],
        start_time: '16:00',
        end_time: '18:00',
        location: 'DIU Smart Classroom 402',
        meeting_link: '',
        description: '',
      });
      loadMeetings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to schedule meeting' });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteMeetingModal = async (m: Meeting) => {
    setSelectedMeetingForDelete(m);
    setShowDeleteModal(true);
    setMeetingImpactLoading(true);
    setMeetingImpact(null);
    setDeleteAction('CANCEL');
    setDeleteReason('');
    setConfirmInput('');
    try {
      const impact = await governanceService.getMeetingImpact(m.id);
      setMeetingImpact(impact);
      if (!impact.canHardDelete) {
        setDeleteAction('CANCEL');
      }
    } catch (err: any) {
      console.error('Failed to get meeting impact', err);
    } finally {
      setMeetingImpactLoading(false);
    }
  };

  const handleExecuteDeleteMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingForDelete) return;
    if (deleteAction === 'HARD_DELETE' && confirmInput.trim().toUpperCase() !== 'REMOVE') {
      return;
    }

    setDeleteSubmitting(true);
    try {
      const res = await governanceService.deleteMeeting(
        selectedMeetingForDelete.id,
        deleteAction,
        deleteReason || undefined
      );

      setMessage({
        type: 'success',
        text: res.message || `Meeting processed successfully (${deleteAction}).`,
      });
      setShowDeleteModal(false);

      // Immediate state update (no window.location.reload)
      if (deleteAction === 'HARD_DELETE') {
        setMeetings((prev) => prev.filter((m) => m.id !== selectedMeetingForDelete.id));
      } else {
        setMeetings((prev) =>
          prev.map((m) =>
            m.id === selectedMeetingForDelete.id
              ? { ...m, status: 'CANCELLED' as MeetingStatus }
              : m
          )
        );
      }
      setSelectedMeetingForDelete(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to process meeting removal.' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SCHEDULED</span>;
      case 'ONGOING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">LIVE NOW</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">CONCLUDED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">CANCELLED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Calendar className="w-4 h-4" />
            Institutional Governance
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Meeting Management & Official Records
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Organize executive board sessions, manage structured agendas, record quorums, and publish minutes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadMeetings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Schedule Session
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

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {['ALL', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Meeting Type Dropdown */}
        <div className="w-full md:w-64">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Meeting Types</option>
            <option value="EXECUTIVE_MEETING">Executive Meetings</option>
            <option value="GENERAL_MEETING">General Assembly</option>
            <option value="FINANCIAL_MEETING">Financial Audit Meetings</option>
            <option value="EVENT_PLANNING_MEETING">Event Planning</option>
            <option value="EMERGENCY_MEETING">Emergency Sessions</option>
          </select>
        </div>
      </div>

      {/* Meeting Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading scheduled sessions...</div>
      ) : !meetings.length ? (
        <div className="py-16 text-center text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-2xl">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-400" />
          No meetings found matching the selected filters.
          <div className="mt-4">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl text-xs font-semibold transition"
            >
              Schedule First Meeting
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {m.meeting_type?.replace(/_/g, ' ')}
                  </span>
                  {getStatusBadge(m.status)}
                </div>

                <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition line-clamp-1">
                  {m.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                  {m.description || 'Official session of DIU Investment Club.'}
                </p>

                <div className="space-y-2 mt-4 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{m.meeting_date}</span>
                    <span className="text-slate-600">•</span>
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {m.start_time} {m.end_time ? `- ${m.end_time}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{m.location || 'DIU Campus'}</span>
                  </div>

                  {m.committee && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">{m.committee.committee_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <Link
                  href={`/meetings/${m.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>Dossier & Minutes</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => openDeleteMeetingModal(m)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Cancel Session or Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Schedule Meeting */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Schedule Official Meeting</h3>
            <p className="text-xs text-slate-400 mb-4">
              Create an executive session, general assembly, or audit review meeting.
            </p>

            <form onSubmit={handleScheduleMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Meeting Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Portfolio Review & Investment Hackathon Planning"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Meeting Type</label>
                  <select
                    value={newMeeting.meeting_type}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meeting_type: e.target.value as MeetingType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="EXECUTIVE_MEETING">Executive Meeting</option>
                    <option value="GENERAL_MEETING">General Assembly</option>
                    <option value="FINANCIAL_MEETING">Financial Audit Meeting</option>
                    <option value="EVENT_PLANNING_MEETING">Event Planning</option>
                    <option value="EMERGENCY_MEETING">Emergency Session</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Committee (Optional)</label>
                  <select
                    value={newMeeting.committee_id}
                    onChange={(e) => setNewMeeting({ ...newMeeting, committee_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- General / No Committee --</option>
                    {committees.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.committee_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newMeeting.meeting_date}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meeting_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newMeeting.start_time}
                    onChange={(e) => setNewMeeting({ ...newMeeting, start_time: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newMeeting.end_time}
                    onChange={(e) => setNewMeeting({ ...newMeeting, end_time: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. DIU Smart Classroom 402"
                    value={newMeeting.location}
                    onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Virtual Meeting URL</label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/..."
                    value={newMeeting.meeting_link}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meeting_link: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Agenda Summary & Scope</label>
                <textarea
                  rows={3}
                  placeholder="Summary of matters to be discussed, financial proposals, and review items..."
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Safe Meeting Cancellation & Deletion (Sections 12 & 13) */}
      {showDeleteModal && selectedMeetingForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Meeting Cancellation & Impact</h3>
                  <p className="text-xs text-slate-400">{selectedMeetingForDelete.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {meetingImpactLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                Checking governance minutes and decisions dependencies...
              </div>
            ) : meetingImpact ? (
              <form onSubmit={handleExecuteDeleteMeeting} className="mt-4 space-y-4">
                {/* Impact Grid */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Session Records Summary:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400">Scheduled Date:</div>
                      <div className="font-semibold text-white mt-0.5">{selectedMeetingForDelete.meeting_date}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400">Agendas Listed:</div>
                      <div className="font-semibold text-white mt-0.5">{meetingImpact.agendasCount} topics</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400">Attendance Roll:</div>
                      <div className="font-semibold text-white mt-0.5">{meetingImpact.attendanceCount} participants</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400">Adopted Decisions:</div>
                      <div className={`font-semibold mt-0.5 ${meetingImpact.decisionsCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {meetingImpact.decisionsCount} official resolutions
                      </div>
                    </div>
                  </div>

                  {!meetingImpact.canHardDelete && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Hard Deletion Restricted:</strong>
                        {meetingImpact.blockReason}
                      </div>
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Select Resolution:</label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${deleteAction === 'CANCEL' ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-slate-800/40 border-slate-800 text-slate-300'}`}>
                      <input
                        type="radio"
                        name="deleteAction"
                        value="CANCEL"
                        checked={deleteAction === 'CANCEL'}
                        onChange={() => setDeleteAction('CANCEL')}
                        className="mt-1"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">Cancel Session (Recommended)</span>
                        <span className="text-slate-400">Marks meeting status as CANCELLED. Keeps all historical agenda items and documentation intact.</span>
                      </div>
                    </label>

                    {meetingImpact.canHardDelete && (
                      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${deleteAction === 'HARD_DELETE' ? 'bg-rose-500/10 border-rose-500/40 text-white' : 'bg-slate-800/40 border-slate-800 text-slate-300'}`}>
                        <input
                          type="radio"
                          name="deleteAction"
                          value="HARD_DELETE"
                          checked={deleteAction === 'HARD_DELETE'}
                          onChange={() => setDeleteAction('HARD_DELETE')}
                          className="mt-1"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-rose-400 block">Permanent Hard Delete</span>
                          <span className="text-slate-400">Permitted only because no minutes or decisions were recorded. Permanently drops the meeting.</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Cancellation</label>
                  <input
                    type="text"
                    placeholder="e.g. Rescheduled due to DIU exams, lack of quorum, holiday..."
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {deleteAction === 'HARD_DELETE' && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 space-y-2">
                    <span className="text-xs font-semibold text-rose-300 block">
                      Confirmation Required: Type <strong className="text-white underline">REMOVE</strong> to confirm permanent deletion:
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Type REMOVE"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      className="w-full bg-slate-900 border border-rose-500/50 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-rose-400"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      deleteSubmitting ||
                      (deleteAction === 'HARD_DELETE' && confirmInput.trim().toUpperCase() !== 'REMOVE')
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 ${
                      deleteAction === 'HARD_DELETE'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {deleteSubmitting
                      ? 'Processing...'
                      : deleteAction === 'HARD_DELETE'
                      ? 'Confirm Hard Delete'
                      : 'Cancel Meeting Safely'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
