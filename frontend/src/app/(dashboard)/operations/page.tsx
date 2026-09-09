'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { governanceService } from '../../../services/governance.service';
import { OperationsSummary } from '../../../types/governance';
import {
  Briefcase,
  Calendar,
  CheckSquare,
  Scale,
  FolderLock,
  Package,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  FileText,
  Activity,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function OperationsPage() {
  const [data, setData] = useState<OperationsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const summary = await governanceService.getOperationsSummary();
      setData(summary);
    } catch (err) {
      console.error('Failed to load operations summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Briefcase className="w-4 h-4" />
            Governance & Executive Operations
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Club Operations Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Executive oversight, committee governance, strategic resolutions, and club asset lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSummary}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/meetings"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Schedule Meeting
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Committee */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Committee</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-white truncate">
              {data?.active_committee_name || 'Executive Committee'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {data?.active_committee_members_count ?? 0} active appointed officers
            </p>
          </div>
          <Link
            href="/committee"
            className="mt-4 flex items-center justify-between text-xs text-blue-400 font-medium hover:text-blue-300 pt-3 border-t border-slate-800"
          >
            <span>View Board Roster</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Upcoming Meetings</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{data?.upcoming_meetings_count ?? 0}</div>
            <p className="text-xs text-slate-400 mt-1">Scheduled executive & general sessions</p>
          </div>
          <Link
            href="/meetings"
            className="mt-4 flex items-center justify-between text-xs text-emerald-400 font-medium hover:text-emerald-300 pt-3 border-t border-slate-800"
          >
            <span>Meeting Schedules</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Pending Decisions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Decisions</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{data?.pending_decisions_count ?? 0}</div>
            <p className="text-xs text-slate-400 mt-1">Resolutions awaiting vote or ratification</p>
          </div>
          <Link
            href="/decisions"
            className="mt-4 flex items-center justify-between text-xs text-amber-400 font-medium hover:text-amber-300 pt-3 border-t border-slate-800"
          >
            <span>Resolutions Log</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Active Action Items */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Tasks</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{data?.active_tasks_count ?? 0}</div>
            <p className="text-xs text-slate-400 mt-1">
              {data?.overdue_tasks_count ? (
                <span className="text-rose-400 font-medium">{data.overdue_tasks_count} overdue</span>
              ) : (
                <span className="text-emerald-400">All tasks on track</span>
              )}
            </p>
          </div>
          <Link
            href="/tasks"
            className="mt-4 flex items-center justify-between text-xs text-purple-400 font-medium hover:text-purple-300 pt-3 border-t border-slate-800"
          >
            <span>Action Items Board</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Secondary Metrics & Quick Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets & Equipment Quick Stat */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Package className="w-5 h-5 text-cyan-400" />
              Club Inventory & Assets
            </div>
            <Link href="/assets" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-800">
              <div className="text-xs text-slate-400">Total Registered</div>
              <div className="text-xl font-bold text-white mt-1">{data?.total_assets_count ?? 0}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-800">
              <div className="text-xs text-slate-400">In Active Custody</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{data?.assets_in_use_count ?? 0}</div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Track club hardware, electronics, projectors, and event banners with custody logs and maintenance records.
          </p>
        </div>

        {/* Documents Repository Quick Stat */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-white">
              <FolderLock className="w-5 h-5 text-indigo-400" />
              Official Documentation
            </div>
            <Link href="/documents" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
              Browse <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-800">
              <div className="text-xs text-slate-400">Active Files</div>
              <div className="text-xl font-bold text-white mt-1">{data?.total_documents_count ?? 0}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-800">
              <div className="text-xs text-slate-400">Access Tiers</div>
              <div className="text-xl font-bold text-indigo-400 mt-1">5 Levels</div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Role-based document vault for bylaws, financial statements, meeting packets, and legal agreements.
          </p>
        </div>

        {/* Governance Integrity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-white mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Governance & Compliance
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Immutable audit trail logging every administrative election, asset checkout, and policy amendment.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300 bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-800">
                <span>Quorum Rule Check</span>
                <span className="text-emerald-400 font-semibold">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-800">
                <span>Action Item Traceability</span>
                <span className="text-emerald-400 font-semibold">100% LINKED</span>
              </div>
            </div>
          </div>
          <Link
            href="/audit-logs"
            className="mt-4 text-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            Inspect Security Audit Logs
          </Link>
        </div>
      </div>

      {/* Main Content Split: Meetings & Decisions | Tasks & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upcoming Meetings & Decisions */}
        <div className="space-y-6">
          {/* Upcoming Meetings List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-bold">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Upcoming Meetings
              </div>
              <Link href="/meetings" className="text-xs text-emerald-400 hover:underline">
                View All ({data?.upcoming_meetings_count ?? 0})
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 text-sm">Loading sessions...</div>
            ) : !data?.recent_meetings?.length ? (
              <div className="py-8 text-center text-slate-500 text-sm">No upcoming meetings scheduled.</div>
            ) : (
              <div className="space-y-3">
                {data.recent_meetings.map((m) => (
                  <Link
                    key={m.id}
                    href={`/meetings/${m.id}`}
                    className="block bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-4 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
                          {m.meeting_type?.replace(/_/g, ' ')}
                        </span>
                        <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition">
                          {m.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {m.meeting_date} at {m.start_time}
                          </span>
                          <span>•</span>
                          <span>{m.location || 'DIU Campus'}</span>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pending Decisions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-bold">
                <Scale className="w-5 h-5 text-amber-400" />
                Pending Decisions & Resolutions
              </div>
              <Link href="/decisions" className="text-xs text-amber-400 hover:underline">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 text-sm">Loading decisions...</div>
            ) : !data?.recent_decisions?.length ? (
              <div className="py-8 text-center text-slate-500 text-sm">No pending decisions currently active.</div>
            ) : (
              <div className="space-y-3">
                {data.recent_decisions.map((d) => (
                  <div
                    key={d.id}
                    className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-semibold text-white">{d.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{d.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                      <span>Type: {d.decision_type}</span>
                      <span>Target: {d.effective_date || 'Ongoing'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High Priority Tasks & Audit Stream */}
        <div className="space-y-6">
          {/* Active Tasks */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-bold">
                <CheckSquare className="w-5 h-5 text-purple-400" />
                Action Items & Tasks
              </div>
              <Link href="/tasks" className="text-xs text-purple-400 hover:underline">
                Manage Board ({data?.active_tasks_count ?? 0})
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 text-sm">Loading tasks...</div>
            ) : !data?.recent_tasks?.length ? (
              <div className="py-8 text-center text-slate-500 text-sm">No active tasks.</div>
            ) : (
              <div className="space-y-3">
                {data.recent_tasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="block bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-4 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.priority === 'URGENT' || t.priority === 'HIGH'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium">{t.status}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition">
                          {t.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>Assignee: {t.assignee?.full_name || 'Unassigned'}</span>
                          {t.due_date && (
                            <span className={t.is_overdue ? 'text-rose-400 font-medium' : ''}>
                              Due: {t.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Governance Audit Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-bold">
                <Activity className="w-5 h-5 text-cyan-400" />
                Governance Activity Log
              </div>
              <span className="text-xs text-slate-500">Live Audit Trail</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 text-sm">Loading activities...</div>
            ) : !data?.recent_activity?.length ? (
              <div className="py-8 text-center text-slate-500 text-sm">No recent activity recorded.</div>
            ) : (
              <div className="space-y-2.5">
                {data.recent_activity.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between text-xs py-2 px-3 bg-slate-800/30 rounded-lg border border-slate-800/50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {act.module}
                      </span>
                      <span className="text-slate-200 font-medium truncate">{act.action}</span>
                      <span className="text-slate-500 hidden sm:inline">by {act.user_name}</span>
                    </div>
                    <span className="text-slate-500 text-[11px] shrink-0 ml-2">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
