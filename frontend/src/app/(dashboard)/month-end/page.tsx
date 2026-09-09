'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { automationService } from '../../../services/automation.service';
import { MonthEndChecklist, MonthEndChecklistItem } from '../../../types/automation';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Play,
  ArrowLeft,
  ShieldCheck,
  FileCheck2,
  Calendar,
  Lock,
} from 'lucide-react';

export default function MonthEndClosingPage() {
  const [currentMonth, setCurrentMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [checklist, setChecklist] = useState<MonthEndChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);

  const loadChecklist = async (monthYear?: string) => {
    setLoading(true);
    try {
      const data = await automationService.getCurrentMonthChecklist(monthYear || currentMonth);
      setChecklist(data);
    } catch (err) {
      console.error('Failed to load month-end checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [currentMonth]);

  const handleRunVerification = async () => {
    if (!checklist) return;
    setVerifying(true);
    try {
      await automationService.runVerification(checklist.id);
      await loadChecklist();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleItem = async (item: MonthEndChecklistItem) => {
    if (!checklist) return;
    try {
      await automationService.toggleChecklistItem(
        checklist.id,
        item.id,
        !item.is_completed,
        item.notes || undefined
      );
      await loadChecklist();
    } catch (err: any) {
      alert(`Failed to update item: ${err.message}`);
    }
  };

  const handleCompleteMonthEnd = async () => {
    if (!checklist) return;
    const completedCount = (checklist.items || []).filter((i) => i.is_completed).length;
    const totalCount = checklist.items?.length || 8;

    if (completedCount < totalCount) {
      if (!confirm(`Only ${completedCount} of ${totalCount} items are marked complete. Complete anyway?`)) {
        return;
      }
    }

    setCompleting(true);
    try {
      await automationService.completeMonthEndChecklist(checklist.id, 'Management sign-off verified.');
      alert('Month-end closing checklist successfully signed off and marked completed!');
      await loadChecklist();
    } catch (err: any) {
      alert(`Sign-off failed: ${err.message}`);
    } finally {
      setCompleting(false);
    }
  };

  const completedCount = (checklist?.items || []).filter((i) => i.is_completed).length;
  const totalCount = checklist?.items?.length || 8;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/automation"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold tracking-wider uppercase">
              <CalendarCheck className="w-4 h-4" />
              Financial Period Control
            </div>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mt-1 ml-8">
            Month-End Closing Workflow
          </h1>
          <p className="text-slate-400 text-sm mt-1 ml-8">
            Automated multi-point audit verification, trial balance reconciliation, and administrative review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none"
            />
          </div>

          <button
            onClick={handleRunVerification}
            disabled={verifying || loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            Run Auto-Verification
          </button>

          {checklist?.status !== 'COMPLETED' ? (
            <button
              onClick={handleCompleteMonthEnd}
              disabled={completing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/30 transition"
            >
              <FileCheck2 className="w-4 h-4" />
              Sign Off & Complete Review
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Period Review Completed
            </span>
          )}
        </div>
      </div>

      {/* Progress & Health Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400 uppercase font-semibold">
              Month-End Audit Health ({currentMonth})
            </div>
            <div className="text-xl font-bold text-white">
              {completedCount} of {totalCount} Items Completed ({progressPercent}%)
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              checklist?.status === 'COMPLETED'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                : 'bg-amber-950 text-amber-400 border border-amber-800/50'
            }`}
          >
            {checklist?.status || 'IN_PROGRESS'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Governance & Authorization Safety Warning */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-white">Controlled Closure Safety:</span> Completing the checklist performs review sign-off and verification tracking. In compliance with internal controls, accounting periods and financial years are never closed automatically without explicit human authorization.
        </div>
      </div>

      {/* Checklist Items List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <FileCheck2 className="w-5 h-5 text-emerald-400" />
          Audit & Reconciliation Checklist
        </h2>

        <div className="divide-y divide-slate-800">
          {(checklist?.items || []).map((item) => (
            <div
              key={item.id}
              className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                item.is_completed ? 'opacity-80' : ''
              }`}
            >
              <div className="flex items-start gap-3.5">
                <input
                  type="checkbox"
                  checked={item.is_completed}
                  onChange={() => handleToggleItem(item)}
                  className="mt-1 w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        item.is_completed ? 'line-through text-slate-400' : 'text-white'
                      }`}
                    >
                      {item.order_index}. {item.title}
                    </span>
                    {item.auto_verification_status === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded-full text-[10px] font-medium">
                        <CheckCircle className="w-3 h-3" /> Auto-Verified
                      </span>
                    ) : item.auto_verification_status === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-full text-[10px] font-medium">
                        <XCircle className="w-3 h-3" /> Issues Detected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-800/40 rounded-full text-[10px] font-medium">
                        <AlertTriangle className="w-3 h-3" /> Manual Verification
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{item.description}</p>

                  {/* Auto-Verification Details */}
                  {item.auto_verification_details && Object.keys(item.auto_verification_details).length > 0 && (
                    <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800/80 inline-block mt-1">
                      {item.auto_verification_details.message ||
                        Object.entries(item.auto_verification_details)
                          .map(([k, v]) => `${k.replace('_', ' ')}: ${v}`)
                          .join(' | ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Status / Completer */}
              <div className="text-right text-xs text-slate-400 shrink-0 self-end md:self-auto">
                {item.is_completed ? (
                  <div>
                    <span className="text-emerald-400 font-medium">Signed off</span>
                    {item.completed_at && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.completed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-500">Pending review</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
