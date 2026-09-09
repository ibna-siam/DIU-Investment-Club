'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { automationService } from '../../../services/automation.service';
import { AutomationDashboardMetrics, AutomationLog, AutomationRule } from '../../../types/automation';
import {
  Zap,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Repeat,
  Bell,
  CalendarCheck,
  ArrowRight,
  Activity,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export default function AutomationCommandCenterPage() {
  const [metrics, setMetrics] = useState<AutomationDashboardMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AutomationLog[]>([]);
  const [activeRules, setActiveRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCycle, setRunningCycle] = useState(false);
  const [runnerResult, setRunnerResult] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, l, r] = await Promise.all([
        automationService.getMetrics(),
        automationService.getLogs({ limit: 6 }),
        automationService.getRules({ status: 'ACTIVE' }),
      ]);
      setMetrics(m);
      setRecentLogs(l.logs);
      setActiveRules(r);
    } catch (err) {
      console.error('Failed to load automation metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunNow = async () => {
    setRunningCycle(true);
    setRunnerResult(null);
    try {
      const res = await automationService.executeRunner();
      setRunnerResult(res);
      await loadData();
    } catch (err: any) {
      console.error('Failed to run cycle:', err);
      alert(`Cycle execution failed: ${err.message}`);
    } finally {
      setRunningCycle(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Zap className="w-4 h-4" />
            Autonomous Automation & Smart Workflows
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Automation Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous scheduling, condition evaluation, safe recurring operations, and governance workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition border border-slate-700"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleRunNow}
            disabled={runningCycle}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-900/30 transition disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${runningCycle ? 'animate-spin' : ''}`} />
            {runningCycle ? 'Executing Cycle...' : 'Run Automation Now'}
          </button>
        </div>
      </div>

      {/* Runner Feedback Banner */}
      {runnerResult && (
        <div className="bg-purple-950/30 border border-purple-800/60 rounded-xl p-4 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Automated Cycle Completed Successfully
            </div>
            <p className="text-xs text-slate-300">
              Evaluated {runnerResult.rules?.evaluated || 0} rules, dispatched {runnerResult.reminders?.sent || 0} reminders, scanned {runnerResult.overdue_sweep?.alerts_created || 0} overdue alerts.
            </p>
          </div>
          <button
            onClick={() => setRunnerResult(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Rules</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2">
            {metrics?.active_rules_count || 0}
            <span className="text-xs font-normal text-slate-500 ml-2">/ {metrics?.total_rules_count || 0} total</span>
          </div>
          <div className="text-xs text-purple-400 font-medium mt-2 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> 100% evaluated server-side
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Executions Today</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2">
            {metrics?.executions_today || 0}
          </div>
          <div className="text-xs text-emerald-400 font-medium mt-2 flex items-center gap-1">
            {metrics?.successful_executions || 0} successful / {metrics?.failed_executions || 0} failed
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Recurring Operations</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Repeat className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2">
            {(metrics?.active_recurring_transactions || 0) + (metrics?.active_recurring_tasks || 0)}
          </div>
          <div className="text-xs text-indigo-400 font-medium mt-2">
            {metrics?.active_recurring_transactions || 0} financial / {metrics?.active_recurring_tasks || 0} operational
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Overdue & Alerts</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2">
            {(metrics?.overdue_tasks_count || 0) + (metrics?.overdue_dues_count || 0)}
          </div>
          <div className="text-xs text-amber-400 font-medium mt-2">
            {metrics?.overdue_tasks_count || 0} tasks / {metrics?.overdue_dues_count || 0} dues overdue
          </div>
        </div>
      </div>

      {/* Quick Access Module Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/automation/rules"
          className="group bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 rounded-xl p-5 transition flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white group-hover:text-purple-300 transition">
              Automation Rules
            </h2>
            <p className="text-xs text-slate-400">
              Configure trigger-condition-action rules for budgets, dues, approvals and deadlines.
            </p>
          </div>
          <div className="flex items-center text-xs text-purple-400 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
            Manage Rules <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          href="/recurring-operations"
          className="group bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 transition flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Repeat className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
              Recurring Operations
            </h2>
            <p className="text-xs text-slate-400">
              Safe scheduled financial transactions and recurring operational club tasks.
            </p>
          </div>
          <div className="flex items-center text-xs text-indigo-400 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
            View Schedules <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          href="/reminders"
          className="group bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 transition flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white group-hover:text-amber-300 transition">
              Smart Reminders
            </h2>
            <p className="text-xs text-slate-400">
              Targeted multi-channel reminders, overdue escalation alerts, and return notices.
            </p>
          </div>
          <div className="flex items-center text-xs text-amber-400 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
            View Reminders <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          href="/month-end"
          className="group bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 transition flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
              Month-End Closing
            </h2>
            <p className="text-xs text-slate-400">
              Automated multi-point audit checklist, journal validation, and reconciliation.
            </p>
          </div>
          <div className="flex items-center text-xs text-emerald-400 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
            Open Checklist <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>
      </div>

      {/* Safety & Compliance Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Financial Automation Safety Guardrails Active</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automation engine operates with strict safety gates: zero automatic journal postings, zero unauthorized balance transfers, and zero automatic expense approvals. All recurring transactions remain in pending approval status requiring human authorization.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Active Rules & Recent Execution Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Rules */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Zap className="w-4 h-4 text-purple-400" />
              Active Automation Rules
            </div>
            <Link
              href="/automation/rules"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium"
            >
              View All ({metrics?.total_rules_count || 0})
            </Link>
          </div>

          <div className="space-y-3">
            {activeRules.slice(0, 5).map((rule) => (
              <div
                key={rule.id}
                className="p-3.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-800/80 flex items-center justify-between transition"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{rule.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-purple-900/30 text-purple-300 rounded text-[10px] font-mono">
                      {rule.trigger_type}
                    </span>
                    <span>Triggered {rule.execution_count} times</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/50 rounded-full text-xs font-medium">
                  ACTIVE
                </span>
              </div>
            ))}
            {activeRules.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-500">
                No active automation rules found.
              </div>
            )}
          </div>
        </div>

        {/* Recent Execution Logs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Clock className="w-4 h-4 text-emerald-400" />
              Recent Execution Logs
            </div>
            <Link
              href="/automation/logs"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              View Audit History
            </Link>
          </div>

          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-slate-800/50 rounded-lg border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    {log.rule_name || log.trigger_type}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[10px]">
                      {new Date(log.execution_time).toLocaleTimeString()}
                    </span>
                    <span className="text-slate-400">{log.action_type}</span>
                  </div>
                </div>
                <div>
                  {log.status === 'SUCCESS' ? (
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded-full text-xs">
                      SUCCESS
                    </span>
                  ) : log.status === 'FAILED' ? (
                    <span className="px-2 py-0.5 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-full text-xs">
                      FAILED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-xs">
                      {log.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-500">
                No recent execution logs recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
