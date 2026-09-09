'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { governanceService } from '../../../../services/governance.service';
import { membersService } from '../../../../services/members.service';
import { Meeting, MeetingAgenda, MeetingAttendance, MeetingMinutes } from '../../../../types/governance';
import { Member } from '../../../../types/financial';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  CheckSquare,
  ShieldCheck,
  Video,
  Building2,
  RefreshCw,
} from 'lucide-react';

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agendas' | 'attendance' | 'minutes' | 'decisions' | 'tasks'>('agendas');

  // Agenda modal & form
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [newAgenda, setNewAgenda] = useState({
    agenda_number: 1,
    title: '',
    description: '',
    allocated_minutes: 20,
    priority: 'MEDIUM',
  });

  // Attendance local editing state
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, { status: string; arrival_time?: string; notes?: string }>
  >({});

  // Minutes form
  const [minutesForm, setMinutesForm] = useState({
    summary: '',
    discussion_notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [meet, mems] = await Promise.all([
        governanceService.getMeetingById(id),
        membersService.getMembers({ limit: 100 }),
      ]);
      setMeeting(meet);
      setAllMembers(mems.data || []);

      // Pre-fill existing minutes if available
      if (meet.minutes && meet.minutes.length > 0) {
        setMinutesForm({
          summary: meet.minutes[0].summary || '',
          discussion_notes: meet.minutes[0].discussion_notes || '',
        });
      }

      // Pre-fill attendance records
      const existingAttendance: Record<string, { status: string; arrival_time?: string; notes?: string }> = {};
      if (meet.attendance) {
        meet.attendance.forEach((att) => {
          existingAttendance[att.member_id] = {
            status: att.attendance_status,
            arrival_time: att.arrival_time || '',
            notes: att.notes || '',
          };
        });
      }
      setAttendanceRecords(existingAttendance);

      if (meet.agendas) {
        setNewAgenda((prev) => ({
          ...prev,
          agenda_number: (meet.agendas?.length || 0) + 1,
        }));
      }
    } catch (err: any) {
      console.error('Failed to load meeting details:', err);
      setError(err?.message || 'Failed to load executive session dossier. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.addAgenda(id, newAgenda);
      setMessage({ type: 'success', text: `Agenda item added successfully!` });
      setShowAgendaModal(false);
      setNewAgenda({
        agenda_number: (meeting?.agendas?.length || 0) + 2,
        title: '',
        description: '',
        allocated_minutes: 20,
        priority: 'MEDIUM',
      });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add agenda item' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = Object.entries(attendanceRecords).map(([member_id, data]) => ({
        member_id,
        attendance_status: data.status,
        arrival_time: data.arrival_time || undefined,
        notes: data.notes || undefined,
      }));

      if (payload.length === 0) {
        setMessage({ type: 'error', text: 'No attendance records selected' });
        setSaving(false);
        return;
      }

      await governanceService.recordAttendance(id, payload);
      setMessage({ type: 'success', text: 'Attendance sheet saved successfully!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save attendance' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.saveMinutes(id, minutesForm);
      setMessage({ type: 'success', text: 'Official meeting minutes saved successfully!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save minutes' });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveMinutes = async (minutesId: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await governanceService.approveMinutes(minutesId);
      setMessage({ type: 'success', text: 'Meeting minutes officially ratified and published!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to approve minutes' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-medium">Loading executive session details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-rose-400" />
        <h3 className="text-lg font-bold text-white mb-1">Session Loading Error</h3>
        <p className="text-sm text-slate-400 mb-6">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={loadData}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <Link
            href="/meetings"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Return to Meetings
          </Link>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="py-20 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg mx-auto">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h3 className="text-lg font-bold text-white mb-1">No session details available.</h3>
        <p className="text-sm text-slate-400 mb-6">The requested executive session record could not be found or has concluded.</p>
        <Link
          href="/meetings"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition"
        >
          Return to Meeting Management
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/meetings"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Meeting Schedule
      </Link>

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {meeting.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                {meeting.meeting_type?.replace(/_/g, ' ')}
              </span>
              {meeting.committee && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {meeting.committee.committee_name}
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{meeting.title}</h1>
            <p className="text-sm text-slate-400 mt-1">{meeting.description || 'No description provided.'}</p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Calendar className="w-4 h-4" />
                {meeting.meeting_date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-500" />
                {meeting.start_time} {meeting.end_time ? `- ${meeting.end_time}` : ''}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-500" />
                {meeting.location || 'DIU Campus'}
              </span>
              {meeting.meeting_link && (
                <>
                  <span>•</span>
                  <a
                    href={meeting.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    <Video className="w-4 h-4" />
                    Virtual Meeting Link
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-medium transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('agendas')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'agendas'
              ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Structured Agendas ({meeting.agendas?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'attendance'
              ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Attendance & Quorum ({meeting.attendance?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('minutes')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'minutes'
              ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Official Minutes & Notes
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'decisions'
              ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Adopted Decisions ({meeting.decisions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'tasks'
              ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Action Items & Tasks ({meeting.tasks?.length || 0})
        </button>
      </div>

      {/* Tab 1: Agendas */}
      {activeTab === 'agendas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Session Agenda Order</h3>
              <p className="text-xs text-slate-400">Order of discussion topics and allocated time limits</p>
            </div>
            <button
              onClick={() => setShowAgendaModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Agenda Item
            </button>
          </div>

          {!meeting.agendas?.length ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
              No agenda items registered for this meeting yet.
              <div className="mt-3">
                <button
                  onClick={() => setShowAgendaModal(true)}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl text-xs font-semibold transition"
                >
                  Create Agenda Item #1
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {meeting.agendas.map((ag) => (
                <div
                  key={ag.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20 shrink-0">
                      #{ag.agenda_number}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white text-sm">{ag.title}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {ag.priority || 'MEDIUM'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                          {ag.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{ag.description || 'No additional details.'}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                        <span>Allocated: {ag.allocated_minutes || 15} minutes</span>
                        {ag.presenter && <span>Presenter: {ag.presenter.full_name}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Quorum & Attendance Register</h3>
              <p className="text-xs text-slate-400">Record attendance for quorum verification</p>
            </div>
            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Attendance Sheet'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold">Code / Student ID</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Arrival Time</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allMembers.map((m) => {
                  const current = attendanceRecords[m.id] || { status: 'ABSENT', arrival_time: '', notes: '' };
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-3 px-4 font-medium text-white">{m.full_name}</td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-400">
                        {m.member_code} • {m.student_id || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={current.status}
                          onChange={(e) =>
                            setAttendanceRecords({
                              ...attendanceRecords,
                              [m.id]: { ...current, status: e.target.value },
                            })
                          }
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                            current.status === 'PRESENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : current.status === 'LATE'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : current.status === 'EXCUSED'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="LATE">LATE</option>
                          <option value="EXCUSED">EXCUSED</option>
                          <option value="ABSENT">ABSENT</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={current.arrival_time || ''}
                          onChange={(e) =>
                            setAttendanceRecords({
                              ...attendanceRecords,
                              [m.id]: { ...current, arrival_time: e.target.value },
                            })
                          }
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={current.notes || ''}
                          onChange={(e) =>
                            setAttendanceRecords({
                              ...attendanceRecords,
                              [m.id]: { ...current, notes: e.target.value },
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Minutes */}
      {activeTab === 'minutes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Official Meeting Minutes</h3>
              <p className="text-xs text-slate-400">Formal record of discussions, debates, and resolutions</p>
            </div>
            {meeting.minutes && meeting.minutes[0] && (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  Status: {meeting.minutes[0].status}
                </span>
                {meeting.minutes[0].status !== 'PUBLISHED' && (
                  <button
                    onClick={() => handleApproveMinutes(meeting.minutes![0].id)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Approve & Publish
                  </button>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSaveMinutes} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Executive Discussion Summary & Decisions Reached
              </label>
              <textarea
                rows={5}
                required
                placeholder="High-level summary of resolutions passed, votes held, and major topics addressed..."
                value={minutesForm.summary}
                onChange={(e) => setMinutesForm({ ...minutesForm, summary: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Detailed Discussion Notes & Deliberations
              </label>
              <textarea
                rows={6}
                placeholder="Verbatim points, questions raised by officers, dissenting opinions, and contextual rationale..."
                value={minutesForm.discussion_notes}
                onChange={(e) => setMinutesForm({ ...minutesForm, discussion_notes: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Official Minutes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Adopted Decisions */}
      {activeTab === 'decisions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Adopted Decisions & Resolutions</h3>
              <p className="text-xs text-slate-400">Formal governance directives ratified during this executive session</p>
            </div>
            <Link
              href="/decisions"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Propose Resolution
            </Link>
          </div>

          {!meeting.decisions?.length ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-400" />
              No official decisions or resolutions recorded for this session yet.
            </div>
          ) : (
            <div className="space-y-3">
              {meeting.decisions.map((dec) => (
                <div
                  key={dec.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {dec.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {dec.decision_type}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">{dec.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{dec.description}</p>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0 text-right">
                    <div>Effective: {dec.effective_date || dec.decision_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Action Items & Tasks */}
      {activeTab === 'tasks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Mandated Action Items & Tasks</h3>
              <p className="text-xs text-slate-400">Action items assigned to officers originating from this meeting</p>
            </div>
            <Link
              href="/tasks"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Manage All Tasks
            </Link>
          </div>

          {!meeting.tasks?.length ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-400" />
              No action items assigned for this session yet.
            </div>
          ) : (
            <div className="space-y-3">
              {meeting.tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {task.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {task.priority} Priority
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 shrink-0 text-right">
                    <div>Due: {task.due_date || 'No deadline'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Agenda Item */}
      {showAgendaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Add Agenda Item</h3>
            <p className="text-xs text-slate-400 mb-4">Add a new discussion item to this meeting session.</p>

            <form onSubmit={handleAddAgenda} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Agenda Number</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newAgenda.agenda_number}
                    onChange={(e) => setNewAgenda({ ...newAgenda, agenda_number: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Allocated Minutes</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={newAgenda.allocated_minutes}
                    onChange={(e) => setNewAgenda({ ...newAgenda, allocated_minutes: parseInt(e.target.value) || 15 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Agenda Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Financial Audit Review & Capital Allocation"
                  value={newAgenda.title}
                  onChange={(e) => setNewAgenda({ ...newAgenda, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                <select
                  value={newAgenda.priority}
                  onChange={(e) => setNewAgenda({ ...newAgenda, priority: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Key background information, expected outcomes, and discussion scope..."
                  value={newAgenda.description}
                  onChange={(e) => setNewAgenda({ ...newAgenda, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAgendaModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
