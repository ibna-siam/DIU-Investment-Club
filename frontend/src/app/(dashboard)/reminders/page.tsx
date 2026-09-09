'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { automationService } from '../../../services/automation.service';
import { api } from '../../../lib/api';
import { Reminder, ReminderType, ReminderPriority } from '../../../types/automation';
import {
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Play,
  RotateCcw,
  Calendar,
  XCircle,
  ShieldCheck,
  Ban,
  Search,
  RefreshCw,
  Eye,
  X,
  Activity,
  Zap,
} from 'lucide-react';

interface ReminderStats {
  total: number;
  upcoming: number;
  sentToday: number;
  pending: number;
  failed: number;
  cancelled: number;
  byType: Record<string, number>;
  timezone: string;
  scheduler: {
    running: boolean;
    intervalSeconds: number;
    totalTicks: number;
    lastTickAt: string | null;
    lastResult: any;
  };
}

export default function SmartRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<ReminderStats>({
    total: 0,
    upcoming: 0,
    sentToday: 0,
    pending: 0,
    failed: 0,
    cancelled: 0,
    byType: {},
    timezone: 'Asia/Dhaka (UTC+6)',
    scheduler: {
      running: true,
      intervalSeconds: 60,
      totalTicks: 0,
      lastTickAt: null,
      lastResult: null,
    },
  });

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reminder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<Reminder | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    title: '',
    reminder_type: 'TASK_DEADLINE' as ReminderType,
    target_date: new Date().toISOString().slice(0, 16),
    offset_spec: '-24h',
    recipient_type: 'USER',
    recipient_user_id: '',
    recipient_email: '',
    recipient_role: 'Treasurer',
    priority: 'NORMAL' as ReminderPriority,
    message: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [rems, statsData, userList] = await Promise.all([
        automationService.getReminders({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          reminder_type: typeFilter !== 'ALL' ? typeFilter : undefined,
          search: search.trim() || undefined,
        }),
        automationService.getReminderStats().catch(() => null),
        api.get<any>('/users?limit=50').then((r) => r.data?.users || []).catch(() => []),
      ]);

      setReminders(rems);
      if (statsData) {
        setStats(statsData);
      }
      setUsers(userList);
    } catch (err: any) {
      console.error('Failed to load reminders:', err);
      setActionError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProcessDue = async () => {
    setProcessing(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await automationService.processDueReminders();
      setActionSuccess(`Batch completed: ${res.sent} sent, ${res.reminders?.length || 0} evaluated.`);
      await loadData();
    } catch (err: any) {
      setActionError(`Failed to process reminders: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleTriggerTick = async () => {
    setProcessing(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await automationService.triggerSchedulerTick();
      setActionSuccess(`Scheduler tick executed: ${res.data?.sent || 0} reminders processed.`);
      await loadData();
    } catch (err: any) {
      setActionError(`Scheduler tick failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setProcessing(true);
    try {
      await automationService.cancelReminder(cancelTarget.id, cancelReason || 'Cancelled by admin');
      setActionSuccess(`Reminder "${cancelTarget.title}" has been cancelled.`);
      setCancelTarget(null);
      setCancelReason('');
      await loadData();
    } catch (err: any) {
      setActionError(`Failed to cancel reminder: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    setProcessing(true);
    try {
      const scheduledIso = new Date(rescheduleDate).toISOString();
      await automationService.rescheduleReminder(rescheduleTarget.id, scheduledIso, rescheduleReason);
      setActionSuccess(`Reminder rescheduled to ${rescheduleDate}.`);
      setRescheduleTarget(null);
      setRescheduleDate('');
      setRescheduleReason('');
      await loadData();
    } catch (err: any) {
      setActionError(`Failed to reschedule reminder: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = async (id: string) => {
    setProcessing(true);
    try {
      await automationService.retryReminder(id);
      setActionSuccess('Reminder re-queued for delivery.');
      await loadData();
    } catch (err: any) {
      setActionError(`Failed to retry reminder: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await automationService.scheduleEntityReminders({
        entityType: formData.reminder_type === 'EVENT_DATE' ? 'EVENT' : formData.reminder_type === 'MEETING_DATE' ? 'MEETING' : formData.reminder_type === 'MEMBER_DUES' ? 'MEMBER_DUE' : 'TASK',
        entityId: `custom_${Date.now()}`,
        title: formData.title,
        targetDate: new Date(formData.target_date).toISOString(),
        customOffsets: [formData.offset_spec],
        recipientUserId: formData.recipient_type === 'USER' ? formData.recipient_user_id || undefined : undefined,
        recipientEmail: formData.recipient_type === 'EMAIL' ? formData.recipient_email : undefined,
        recipientRole: formData.recipient_type === 'ROLE' ? formData.recipient_role : undefined,
        priority: formData.priority,
        message: formData.message || formData.title,
      });

      setIsCreateModalOpen(false);
      setActionSuccess(`Reminder "${formData.title}" scheduled successfully.`);
      setFormData({
        title: '',
        reminder_type: 'TASK_DEADLINE',
        target_date: new Date().toISOString().slice(0, 16),
        offset_spec: '-24h',
        recipient_type: 'USER',
        recipient_user_id: '',
        recipient_email: '',
        recipient_role: 'Treasurer',
        priority: 'NORMAL',
        message: '',
      });
      await loadData();
    } catch (err: any) {
      setActionError(`Failed to schedule reminder: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> SENT
          </span>
        );
      case 'SCHEDULED':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-3 h-3" /> SCHEDULED
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RotateCcw className="w-3 h-3 animate-spin" /> PROCESSING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> FAILED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Ban className="w-3 h-3" /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDhakaDisplay = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
      return (
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Dhaka',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date(isoStr)) + ' (BST)'
      );
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Smart Reminder Engine</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Asia/Dhaka (UTC+6)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automated, duplicate-protected scheduling for Events, Meetings, Tasks, and Member Dues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTriggerTick()}
            disabled={processing || loading}
            title="Execute on-demand scheduler check"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <Zap className={`w-4 h-4 text-amber-400 ${processing ? 'animate-spin' : ''}`} />
            Tick Scheduler
          </button>
          <button
            onClick={() => handleProcessDue()}
            disabled={processing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <Play className={`w-4 h-4 text-emerald-400 ${processing ? 'animate-spin' : ''}`} />
            Process Due
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow transition"
          >
            <Plus className="w-4 h-4" />
            Schedule Reminder
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real Telemetry Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Upcoming</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.upcoming}</div>
          <div className="text-xs text-slate-500 mt-1">Scheduled for future delivery</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Sent Today</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.sentToday}</div>
          <div className="text-xs text-slate-500 mt-1">Delivered via Resend today</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pending / Due</span>
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.pending}</div>
          <div className="text-xs text-slate-500 mt-1">In queue or awaiting trigger</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Cancelled</span>
            <Ban className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.cancelled}</div>
          <div className="text-xs text-slate-500 mt-1">Auto or manually revoked</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Logged</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1">Across all business entities</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search reminder title or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">SCHEDULED / PENDING</option>
              <option value="SENT">SENT</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Reminder Types</option>
              <option value="EVENT_DATE">EVENT_DATE</option>
              <option value="MEETING_DATE">MEETING_DATE</option>
              <option value="TASK_DEADLINE">TASK_DEADLINE</option>
              <option value="MEMBER_DUES">MEMBER_DUES</option>
              <option value="PAYMENT_DUE">PAYMENT_DUE</option>
              <option value="CUSTOM_ADMIN">CUSTOM_ADMIN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reminders Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Title / Target</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Scheduled Time (Asia/Dhaka)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && reminders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    Loading reminder engine records...
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No upcoming reminders found matching criteria.
                  </td>
                </tr>
              ) : (
                reminders.map((rem) => (
                  <tr key={rem.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                        {rem.reminder_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="font-medium text-white truncate">{rem.title}</div>
                      <div className="text-xs text-slate-500 truncate">{rem.message}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 truncate">{rem.recipient_name || rem.recipient_email || rem.recipient_role || 'Global'}</div>
                      {rem.recipient_email && (
                        <div className="text-xs text-slate-500">{rem.recipient_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                      {formatDhakaDisplay(rem.scheduled_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(rem.status)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedReminder(rem)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md border border-slate-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {(rem.status === 'SCHEDULED' || rem.status === 'PENDING') && (
                          <>
                            <button
                              onClick={() => {
                                setRescheduleTarget(rem);
                                setRescheduleDate(rem.scheduled_at.slice(0, 16));
                              }}
                              title="Reschedule Reminder"
                              className="p-1.5 text-sky-400 hover:text-sky-300 bg-sky-950/30 hover:bg-sky-900/40 rounded-md border border-sky-700/40 transition"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setCancelTarget(rem)}
                              title="Cancel Reminder"
                              className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 rounded-md border border-rose-700/40 transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {rem.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(rem.id)}
                            title="Retry Reminder"
                            className="p-1.5 text-amber-400 hover:text-amber-300 bg-amber-950/30 hover:bg-amber-900/40 rounded-md border border-amber-700/40 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold text-white">Cancel Reminder</h3>
              </div>
              <button onClick={() => setCancelTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to cancel the scheduled reminder for <strong className="text-white">{cancelTarget.title}</strong>?
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                placeholder="e.g. Event cancelled or dues settled"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
              >
                Keep Active
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={processing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition"
              >
                {processing ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Reschedule Reminder</h3>
              </div>
              <button onClick={() => setRescheduleTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  New Scheduled Time (Asia/Dhaka)
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Reason for Rescheduling
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meeting postponed by 2 hours"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRescheduleTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={processing || !rescheduleDate}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition"
              >
                {processing ? 'Saving...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Reminder Telemetry</h3>
              </div>
              <button onClick={() => setSelectedReminder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Idempotency Key</span>
                <span className="font-mono text-xs text-emerald-400">{selectedReminder.idempotency_key || selectedReminder.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Reminder Type</span>
                <span className="font-semibold text-white">{selectedReminder.reminder_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Target Date</span>
                <span className="text-slate-200">{formatDhakaDisplay(selectedReminder.target_date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Scheduled At</span>
                <span className="text-slate-200">{formatDhakaDisplay(selectedReminder.scheduled_at)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Status</span>
                <div>{getStatusBadge(selectedReminder.status)}</div>
              </div>
              {selectedReminder.error_message && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-300 text-xs">
                  <span className="font-bold">Error / Reason:</span> {selectedReminder.error_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReminder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Schedule Custom Reminder</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strategic Investment Workshop Reminder"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Type</label>
                  <select
                    value={formData.reminder_type}
                    onChange={(e) => setFormData({ ...formData, reminder_type: e.target.value as ReminderType })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TASK_DEADLINE">TASK_DEADLINE</option>
                    <option value="EVENT_DATE">EVENT_DATE</option>
                    <option value="MEETING_DATE">MEETING_DATE</option>
                    <option value="MEMBER_DUES">MEMBER_DUES</option>
                    <option value="CUSTOM_ADMIN">CUSTOM_ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Offset</label>
                  <select
                    value={formData.offset_spec}
                    onChange={(e) => setFormData({ ...formData, offset_spec: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="-7d">7 Days Before</option>
                    <option value="-3d">3 Days Before</option>
                    <option value="-24h">24 Hours Before</option>
                    <option value="-1h">1 Hour Before</option>
                    <option value="DUE">On Target Date</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Target Event / Due Date (Asia/Dhaka)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Message</label>
                <textarea
                  rows={2}
                  placeholder="Optional reminder message details..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition"
                >
                  {processing ? 'Scheduling...' : 'Save & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
