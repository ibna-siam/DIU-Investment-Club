'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Send,
  Search,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Ban,
  Activity,
  BarChart3,
  ListFilter,
  Layers,
  HeartPulse,
  Calendar,
  Sliders,
  Save,
  Check,
  FlaskConical,
  Shield,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

interface EmailLogItem {
  id: string;
  idempotency_key?: string | null;
  email_type: string;
  recipient: string;
  subject: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  trigger_source?: string | null;
  provider_message_id?: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING' | 'CANCELLED' | 'SKIPPED';
  attempt_count: number;
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
}

interface EmailStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  retrying: number;
  cancelled: number;
  skipped: number;
  successRate: number;
  failureRate: number;
  sentToday: number;
  sentThisWeek: number;
  duplicatesBlocked: number;
  byType: Record<string, { total: number; sent: number; failed: number; retrying: number }>;
  systemHealth: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    score: number;
    reason: string;
    evaluatedAt: string;
  };
  recentActivity: EmailLogItem[];
  brand?: {
    name: string;
    university: string;
    supportEmail: string;
  };
  provider?: {
    name: string;
    configured: boolean;
    mode: string;
  };
}

export default function EmailManagementPage() {
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
    retrying: 0,
    cancelled: 0,
    skipped: 0,
    successRate: 100,
    failureRate: 0,
    sentToday: 0,
    sentThisWeek: 0,
    duplicatesBlocked: 0,
    byType: {},
    systemHealth: {
      status: 'HEALTHY',
      score: 100,
      reason: 'All delivery pipelines operational',
      evaluatedAt: new Date().toISOString(),
    },
    recentActivity: [],
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'failures' | 'types' | 'automation'>('overview');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Super Admin Automation & Environment Settings
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  interface AutomationSettingsData {
    environmentMode: 'LIVE' | 'TEST';
    testRecipientEmail: string;
    rules: {
      newMemberWelcome: boolean;
      expenseApproval: boolean;
      taskAssignment: boolean;
      meetingReminder: boolean;
      eventReminder: boolean;
      securityAlert: boolean;
    };
  }

  const [automationSettings, setAutomationSettings] = useState<AutomationSettingsData>({
    environmentMode: 'LIVE',
    testRecipientEmail: 'siamibna75@gmail.com',
    rules: {
      newMemberWelcome: true,
      expenseApproval: true,
      taskAssignment: true,
      meetingReminder: true,
      eventReminder: true,
      securityAlert: true,
    },
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Modals & Action States
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);
  const [resendLogTarget, setResendLogTarget] = useState<EmailLogItem | null>(null);
  const [cancelLogTarget, setCancelLogTarget] = useState<EmailLogItem | null>(null);
  const [resendReason, setResendReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchLogsAndStats = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('emailType', typeFilter);
      if (search.trim()) params.append('search', search.trim());
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const [logsRes, analyticsRes] = await Promise.all([
        api.get<{ success: boolean; data: EmailLogItem[]; total: number; totalPages: number }>(
          `/email/logs?${params.toString()}`
        ),
        api.get<{ success: boolean; data: EmailStats }>('/email/analytics'),
      ]);

      if (logsRes && logsRes.data) {
        setLogs(logsRes.data);
        setTotalCount(logsRes.total || 0);
        setTotalPages(logsRes.totalPages || 1);
      }

      if (analyticsRes && analyticsRes.data) {
        setStats(analyticsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load email analytics data:', err);
      setActionError(err.message || 'Failed to load email delivery records');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, search, fromDate, toDate]);

  const fetchAutomationSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: AutomationSettingsData }>('/email/automation-settings');
      if (res && res.data) {
        setAutomationSettings(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load automation settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogsAndStats();
  }, [fetchLogsAndStats]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAutomationSettings();
    }
  }, [isSuperAdmin, fetchAutomationSettings]);

  const handleSaveAutomationSettings = async () => {
    setSettingsSaving(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.patch<{ success: boolean; message: string; data: AutomationSettingsData }>(
        '/email/automation-settings',
        automationSettings
      );
      setActionSuccess(res.message || 'Email automation settings saved successfully');
      if (res.data) setAutomationSettings(res.data);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save automation settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await api.post<{ success: boolean; message: string; data: any }>('/email/send-test-email', {});
      setTestEmailResult({
        success: true,
        message: res.message || '✓ Test Email Sent Successfully',
      });
      fetchLogsAndStats();
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: `✗ Test Email Failed: ${err.message || 'Provider rejected test message'}`,
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleRetry = async (logId: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/email/logs/${logId}/retry`, {});
      setActionSuccess(res.message || 'Email delivery retry queued');
      fetchLogsAndStats();
    } catch (err: any) {
      setActionError(err.message || 'Failed to retry email delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelLogTarget) return;
    setActionLoading(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/email/logs/${cancelLogTarget.id}/cancel`, {
        reason: cancelReason.trim() || 'Cancelled via Admin Control Center',
      });
      setActionSuccess(res.message || 'Email delivery cancelled successfully');
      setCancelLogTarget(null);
      setCancelReason('');
      fetchLogsAndStats();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel email delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResend = async () => {
    if (!resendLogTarget) return;
    setActionLoading(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/email/logs/${resendLogTarget.id}/resend`, {
        reason: resendReason.trim() || 'Manual Admin Resend',
      });
      setActionSuccess(res.message || 'Email resend queued successfully');
      setResendLogTarget(null);
      setResendReason('');
      fetchLogsAndStats();
    } catch (err: any) {
      setActionError(err.message || 'Failed to resend transactional email');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> SENT
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <RotateCcw className="w-3 h-3 animate-spin" /> RETRYING
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
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            SKIPPED
          </span>
        );
      case 'TEST':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <FlaskConical className="w-3 h-3" /> TEST
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

  const getHealthBadge = () => {
    const health = stats.systemHealth?.status || 'HEALTHY';
    switch (health) {
      case 'HEALTHY':
        return {
          label: 'SYSTEM HEALTHY',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: CheckCircle2,
        };
      case 'WARNING':
        return {
          label: 'DELIVERY WARNING',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          icon: AlertTriangle,
        };
      case 'CRITICAL':
        return {
          label: 'ACTION REQUIRED',
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          icon: AlertTriangle,
        };
    }
  };

  const healthMeta = getHealthBadge();
  const HealthIcon = healthMeta.icon;

  const failedLogs = logs.filter((l) => l.status === 'FAILED' || l.status === 'RETRYING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Email Analytics & Health Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Resend Verified
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time delivery health, retry telemetry, error classification, and duplicate protection for DIU Investment Club.
          </p>
        </div>
        <button
          onClick={() => fetchLogsAndStats()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          Refresh Analytics
        </button>
      </div>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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

      {/* System Health Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-emerald-400">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${healthMeta.color}`}>
                <span className={`w-2 h-2 rounded-full ${healthMeta.dot} animate-pulse`} />
                <HealthIcon className="w-3.5 h-3.5" />
                {healthMeta.label}
              </span>
              <span className="text-sm font-semibold text-white">
                Health Score: <span className="text-emerald-400">{stats.systemHealth?.score ?? 100}%</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {stats.systemHealth?.reason || 'All transactional email pipelines operating within normal thresholds.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
          <div>
            <div className="text-slate-500 uppercase tracking-wider font-semibold">Success Rate</div>
            <div className="text-lg font-bold text-emerald-400">{stats.successRate}%</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider font-semibold">Failure Rate</div>
            <div className="text-lg font-bold text-rose-400">{stats.failureRate}%</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider font-semibold">Duplicates Prevented</div>
            <div className="text-lg font-bold text-sky-400">{stats.duplicatesBlocked}</div>
          </div>
        </div>
      </div>

      {/* Metrics Row (4-up) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Delivered Today / Week</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.sentToday} <span className="text-sm font-normal text-slate-500">/ {stats.sentThisWeek}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Confirmed deliveries this period</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pending & Retrying</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.pending + stats.retrying}
          </div>
          <div className="text-xs text-slate-500 mt-1">{stats.retrying} in active backoff retry</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Failed & Cancelled</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.failed} <span className="text-sm font-normal text-slate-500">({stats.cancelled} cancelled)</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Exhausted retries or stopped</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Logged</span>
            <Mail className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1">Across all automated workflows</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Overview & Timeline
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          Audit Logs ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('failures')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'failures'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Failed Deliveries ({stats.failed + stats.retrying})
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'types'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Type Breakdown
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('automation')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'automation'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Automation Settings & Test Mode
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW & TIMELINE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Status Summary */}
            <div className="lg:col-span-1 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Operational Telemetry
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Email Brand</span>
                  <span className="text-white font-medium">DIU Investment Club</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">University</span>
                  <span className="text-white font-medium">Daffodil International University</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Provider</span>
                  <span className="text-emerald-400 font-medium">Resend REST API</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Idempotency Guard</span>
                  <span className="text-emerald-400 font-medium">Enabled (SHA256 Keys)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Max Auto Retries</span>
                  <span className="text-slate-200 font-medium">3 Attempts with Backoff</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Cancelled Emails</span>
                  <span className="text-zinc-400 font-medium">{stats.cancelled}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Opt-Out Filtered</span>
                  <span className="text-slate-400 font-medium">{stats.skipped}</span>
                </div>
              </div>
            </div>

            {/* Recent Email Activity Timeline */}
            <div className="lg:col-span-2 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Recent Delivery Timeline
              </h3>
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800/80 rounded-lg text-slate-300">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{activity.email_type}</span>
                            <span className="text-xs text-slate-500 font-mono">→ {activity.recipient}</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5">{activity.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>{getStatusBadge(activity.status)}</div>
                        <div className="text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">No recent email deliveries logged.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search recipient, subject..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Delivery Statuses</option>
                  <option value="SENT">SENT (Delivered)</option>
                  <option value="PENDING">PENDING (Queued)</option>
                  <option value="RETRYING">RETRYING (Backoff)</option>
                  <option value="FAILED">FAILED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="SKIPPED">SKIPPED (Opt-Out)</option>
                </select>
              </div>

              {/* Email Type Filter */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Email Types</option>
                  <option value="WELCOME">WELCOME</option>
                  <option value="ACCOUNT_INVITATION">ACCOUNT_INVITATION</option>
                  <option value="EMAIL_VERIFICATION">EMAIL_VERIFICATION</option>
                  <option value="PASSWORD_RESET">PASSWORD_RESET</option>
                  <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
                  <option value="PAYMENT_CONFIRMATION">PAYMENT_CONFIRMATION</option>
                  <option value="EXPENSE_SUBMITTED">EXPENSE_SUBMITTED</option>
                  <option value="EXPENSE_APPROVED">EXPENSE_APPROVED</option>
                  <option value="EXPENSE_REJECTED">EXPENSE_REJECTED</option>
                  <option value="EVENT_NOTIFICATION">EVENT_NOTIFICATION</option>
                  <option value="MEETING_INVITATION">MEETING_INVITATION</option>
                  <option value="TASK_ASSIGNED">TASK_ASSIGNED</option>
                  <option value="REMINDER_MEMBER_DUES">REMINDER_MEMBER_DUES</option>
                </select>
              </div>

              {/* Reset Filters */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                    setTypeFilter('ALL');
                    setFromDate('');
                    setToDate('');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium border border-slate-700 transition"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Attempts</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                        Loading delivery audit logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        No email logs found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                            {log.email_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white max-w-[180px] truncate">{log.recipient}</div>
                          {log.trigger_source && (
                            <div className="text-xs text-slate-500">{log.trigger_source}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="text-slate-200 truncate">{log.subject}</div>
                          {log.error_message && (
                            <div className="text-xs text-rose-400 truncate max-w-[220px]" title={log.error_message}>
                              Error: {log.error_message}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                          {log.attempt_count} / 3
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          <div>{new Date(log.created_at).toLocaleDateString()}</div>
                          <div className="text-slate-500">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedLog(log)}
                              title="View Details"
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md border border-slate-700 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Retry button for FAILED or RETRYING */}
                            {(log.status === 'FAILED' || log.status === 'RETRYING') && (
                              <button
                                onClick={() => handleRetry(log.id)}
                                disabled={actionLoading}
                                title="Safe Retry Email Delivery"
                                className="p-1.5 text-amber-400 hover:text-amber-300 bg-amber-950/30 hover:bg-amber-900/40 rounded-md border border-amber-700/40 transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancel button for PENDING or RETRYING */}
                            {(log.status === 'PENDING' || log.status === 'RETRYING') && (
                              <button
                                onClick={() => setCancelLogTarget(log)}
                                title="Cancel Email Delivery"
                                className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 rounded-md border border-rose-700/40 transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Resend button for SENT */}
                            {log.status === 'SENT' && (
                              <button
                                onClick={() => setResendLogTarget(log)}
                                title="Authorized Manual Resend"
                                className="p-1.5 text-sky-400 hover:text-sky-300 bg-sky-950/30 hover:bg-sky-900/40 rounded-md border border-sky-700/40 transition"
                              >
                                <Send className="w-3.5 h-3.5" />
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

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing <span className="font-semibold text-slate-200">{logs.length}</span> of{' '}
                <span className="font-semibold text-slate-200">{totalCount}</span> log records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FAILED DELIVERIES */}
      {activeTab === 'failures' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Failed & Retrying Deliveries ({failedLogs.length})
            </h3>
            <p className="text-xs text-slate-400">
              Emails that encountered delivery errors or are currently undergoing automatic backoff retry.
            </p>
          </div>

          {failedLogs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/80 border border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No Delivery Failures</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                All transactional messages have delivered successfully. No pending retries or exhausted delivery attempts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {failedLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 bg-slate-900/80 border border-rose-900/30 rounded-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                        {log.email_type}
                      </span>
                      <span className="text-sm font-semibold text-white">{log.recipient}</span>
                    </div>
                    <div>{getStatusBadge(log.status)}</div>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500">Subject:</span> {log.subject}
                  </div>

                  {log.error_message && (
                    <div className="p-2.5 bg-rose-950/30 border border-rose-900/50 rounded-lg text-xs text-rose-300 font-mono">
                      {log.error_message}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-500">
                    <div>
                      Attempts: <span className="font-mono text-slate-300">{log.attempt_count} / 3</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCancelLogTarget(log)}
                        className="px-3 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-lg transition"
                      >
                        Cancel Delivery
                      </button>
                      <button
                        onClick={() => handleRetry(log.id)}
                        disabled={actionLoading}
                        className="px-3 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 rounded-lg transition inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TYPE BREAKDOWN */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byType || {}).map(([type, counts]) => (
              <div
                key={type}
                className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded">
                    {type}
                  </span>
                  <span className="text-sm font-bold text-slate-200">
                    {counts.total} <span className="text-xs text-slate-500 font-normal">total</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                  <div className="p-2 bg-emerald-950/20 rounded-lg border border-emerald-900/30">
                    <div className="text-xs text-slate-400">Sent</div>
                    <div className="text-sm font-bold text-emerald-400">{counts.sent}</div>
                  </div>
                  <div className="p-2 bg-amber-950/20 rounded-lg border border-amber-900/30">
                    <div className="text-xs text-slate-400">Retrying</div>
                    <div className="text-sm font-bold text-amber-400">{counts.retrying}</div>
                  </div>
                  <div className="p-2 bg-rose-950/20 rounded-lg border border-rose-900/30">
                    <div className="text-xs text-slate-400">Failed</div>
                    <div className="text-sm font-bold text-rose-400">{counts.failed}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUTOMATION SETTINGS & TEST MODE */}
      {activeTab === 'automation' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Section 1: Email Environment Mode & Diagnostic Testing */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Email Environment Mode & Safe Testing</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Configure project delivery environment and perform isolated test dispatches without touching live member records.
                </p>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAutomationSettings((prev) => ({ ...prev, environmentMode: 'LIVE' }))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    automationSettings.environmentMode === 'LIVE'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${automationSettings.environmentMode === 'LIVE' ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                  LIVE MODE
                </button>
                <button
                  type="button"
                  onClick={() => setAutomationSettings((prev) => ({ ...prev, environmentMode: 'TEST' }))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    automationSettings.environmentMode === 'TEST'
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${automationSettings.environmentMode === 'TEST' ? 'bg-white' : 'bg-violet-400'}`} />
                  TEST MODE
                </button>
              </div>
            </div>

            {/* Mode Explanation & Test Recipient */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Active Routing Rule
                </div>
                {automationSettings.environmentMode === 'LIVE' ? (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-emerald-400 font-semibold">LIVE MODE Active:</strong> All automated emails (Member Welcome, User Invitation, Expense Approvals, Reminders) are dispatched strictly to their actual registered recipient addresses. No silent rerouting.
                  </p>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-violet-400 font-semibold">TEST MODE Active:</strong> Production logic preserves strict recipient routing, while all manual diagnostic tests route safely to the configured test mailbox.
                  </p>
                )}
              </div>

              {/* Test Recipient Email & Safe Test Button */}
              <div className="space-y-3 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Configured Test Email Recipient
                  </label>
                  <span className="text-[10px] text-slate-500">Super Admin Diagnostic</span>
                </div>
                <input
                  type="email"
                  value={automationSettings.testRecipientEmail}
                  onChange={(e) => setAutomationSettings((prev) => ({ ...prev, testRecipientEmail: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="siamibna75@gmail.com"
                />

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={testEmailLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${testEmailLoading ? 'animate-spin' : ''}`} />
                    {testEmailLoading ? 'Dispatching Test Email...' : 'Send Test Email'}
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Dispatches safely to <strong className="text-slate-300">{automationSettings.testRecipientEmail}</strong>
                  </span>
                </div>

                {testEmailResult && (
                  <div
                    className={`mt-2 p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
                      testEmailResult.success
                        ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/40 border border-rose-800 text-rose-300'
                    }`}
                  >
                    <span>{testEmailResult.message}</span>
                    <button
                      onClick={() => setTestEmailResult(null)}
                      className="text-slate-400 hover:text-white ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Six Dynamic Automation Rule Controls */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Dynamic Automation Rules
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enable or disable automated email notifications dynamically without code changes or server redeployment.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveAutomationSettings}
                disabled={settingsSaving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${settingsSaving ? 'animate-spin' : ''}`} />
                {settingsSaving ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </div>

            {/* Rules Grid (6 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. New Member Welcome Email */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">New Member Welcome Email</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      automationSettings.rules.newMemberWelcome
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {automationSettings.rules.newMemberWelcome ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatically send an official club welcome email to new members upon registration in Member Directory. Recipient: <strong className="text-slate-300">member.email</strong>.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={automationSettings.rules.newMemberWelcome}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, newMemberWelcome: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* 2. Expense Approval Email */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Expense Approval Email</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      automationSettings.rules.expenseApproval
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {automationSettings.rules.expenseApproval ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Notify approvers upon expense claim submission, and notify claimants upon approval or rejection. Recipient: <strong className="text-slate-300">approver & claimant</strong>.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={automationSettings.rules.expenseApproval}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, expenseApproval: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* 3. Task Assignment Email */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Task Assignment Email</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      automationSettings.rules.taskAssignment
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {automationSettings.rules.taskAssignment ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Send direct action assignments and priority instructions when a task is delegated. Recipient: <strong className="text-slate-300">assigned user.email</strong>.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={automationSettings.rules.taskAssignment}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, taskAssignment: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* 4. Meeting Reminder Email */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Meeting Reminder Email</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      automationSettings.rules.meetingReminder
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {automationSettings.rules.meetingReminder ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Dispatch calendar invitations, agendas, and venue details to selected participants. Recipient: <strong className="text-slate-300">participant.email</strong>.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={automationSettings.rules.meetingReminder}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, meetingReminder: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* 5. Event Reminder Email */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Event Reminder Email</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      automationSettings.rules.eventReminder
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {automationSettings.rules.eventReminder ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Deliver event announcements, logistical briefings, and reminder notices. Recipient: <strong className="text-slate-300">event.target_emails</strong>.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={automationSettings.rules.eventReminder}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, eventReminder: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* 6. Security Alert Email */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Security Alert Email</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                      PROTECTED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Critical security warnings, password recovery, and role modification alerts. Sent to <strong className="text-slate-300">affected user / admin</strong>. Always preserved.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={automationSettings.rules.securityAlert}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, securityAlert: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Email Log Telemetry</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Log ID</span>
                <span className="font-mono text-xs text-slate-200">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Idempotency Key</span>
                <span className="font-mono text-xs text-emerald-400">{selectedLog.idempotency_key || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Email Type</span>
                <span className="font-semibold text-white">{selectedLog.email_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Recipient</span>
                <span className="text-slate-200">{selectedLog.recipient}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Subject</span>
                <span className="text-slate-200 font-medium">{selectedLog.subject}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Delivery Status</span>
                <div>{getStatusBadge(selectedLog.status)}</div>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Provider Message ID</span>
                <span className="font-mono text-xs text-slate-300">{selectedLog.provider_message_id || 'Pending'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Trigger Source</span>
                <span className="text-slate-300">{selectedLog.trigger_source || 'System Automation'}</span>
              </div>
              {selectedLog.error_message && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-300 text-xs">
                  <span className="font-bold">Error Message:</span> {selectedLog.error_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelLogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold text-white">Cancel Email Delivery</h3>
              </div>
              <button
                onClick={() => setCancelLogTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to cancel the delivery of this email to{' '}
              <strong className="text-white">{cancelLogTarget.recipient}</strong>?
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
              <div><span className="text-slate-500">Subject:</span> {cancelLogTarget.subject}</div>
              <div><span className="text-slate-500">Type:</span> {cancelLogTarget.email_type}</div>
              <div><span className="text-slate-500">Current Status:</span> {cancelLogTarget.status}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                placeholder="e.g. Transaction revoked by administrator"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelLogTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
              >
                Keep In Queue
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition inline-flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Confirmation Modal */}
      {resendLogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Confirm Manual Resend</h3>
              </div>
              <button
                onClick={() => setResendLogTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              You are preparing to manually resend this email to{' '}
              <strong className="text-white">{resendLogTarget.recipient}</strong>.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
              <div><span className="text-slate-500">Subject:</span> {resendLogTarget.subject}</div>
              <div><span className="text-slate-500">Type:</span> {resendLogTarget.email_type}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Audit Reason for Resend
              </label>
              <input
                type="text"
                placeholder="e.g. Member requested statement copy"
                value={resendReason}
                onChange={(e) => setResendReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResendLogTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResend}
                disabled={actionLoading}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {actionLoading ? 'Dispatching...' : 'Confirm & Resend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
