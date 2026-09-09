'use client';

import React, { useEffect, useState } from 'react';
import { ReportHeader, ReportSignatures } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { BudgetVsActualReport } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import { BarChart3, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export default function BudgetVsActualPage() {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [report, setReport] = useState<BudgetVsActualReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async (eventId?: string) => {
    setLoading(true);
    try {
      const data = await financialReportsService.getBudgetVsActual({
        event_id: eventId || undefined,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load budget vs actual report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleExportCSV = () => {
    if (!report) return;
    const headers = [
      'Event Title',
      'Budget No',
      'Budget Item',
      'Budget Allocated (BDT)',
      'Actual Spent (BDT)',
      'Variance (BDT)',
      'Variance %',
      'Utilization %',
      'Status Alert',
    ];
    const rows = report.items.map((item) => [
      item.event_title,
      item.budget_number,
      item.budget_title,
      item.budget_amount,
      item.actual_expense,
      item.variance,
      `${item.variance_percentage}%`,
      `${item.utilization_percentage}%`,
      item.status_alert,
    ]);
    exportToCSV('Budget_vs_Actual_Variance_Report', headers, rows);
  };

  const handleExportExcel = () => {
    if (!report) return;
    const headers = [
      'Event',
      'Budget Code',
      'Title',
      'Allocated Budget',
      'Actual Spent',
      'Variance',
      'Utilization %',
      'Status',
    ];
    const rows = report.items.map((item) => [
      item.event_title,
      item.budget_number,
      item.budget_title,
      item.budget_amount,
      item.actual_expense,
      item.variance,
      item.utilization_percentage,
      item.status_alert,
    ]);
    exportToExcel('Budget_vs_Actual_Report', 'Budget vs Actual', headers, rows);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReportHeader
        title="Budget vs. Actual Variance Analysis"
        subtitle="Tracking Club Allocations, Expenditure Burn Rate & Cost Overrun Alerts"
        periodText="Active Fiscal Budget Cycle (FY 2026-2027)"
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-slate-400">Filter by Event:</label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                loadReport(e.target.value);
              }}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Events & Programs</option>
              {report?.items
                .map((i) => ({ id: i.event_id, title: i.event_title }))
                .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
                .map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
            </select>
            <button
              onClick={() => loadReport(selectedEventId)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </ReportHeader>

      {/* KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Budget Allocated</p>
            <p className="text-2xl font-black text-blue-400 mt-1 font-mono">
              {formatBDT(report.total_budget)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Approved event & operational budgets</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actual Spent</p>
            <p className="text-2xl font-black text-rose-400 mt-1 font-mono">
              {formatBDT(report.total_actual_expense)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Verified expenditure vouchers</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Unspent Variance</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {formatBDT(report.total_variance)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Available fiscal headroom</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Utilization Rate</p>
            <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
              {report.overall_utilization_percentage}%
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(report.overall_utilization_percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Budget Allocation Line Items</span>
          <span className="text-xs font-mono text-slate-400">
            {report?.items.length || 0} Registered Line Items
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
            Analyzing budget lines and calculating variance metrics...
          </div>
        ) : !report || report.items.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No budget lines found. Create event budgets to view variance tracking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="py-3 px-4">Event / Budget Item</th>
                  <th className="py-3 px-4 text-right">Allocated Budget</th>
                  <th className="py-3 px-4 text-right">Actual Spent</th>
                  <th className="py-3 px-4 text-right">Variance (Unspent)</th>
                  <th className="py-3 px-4 text-center">Utilization</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {report.items.map((item) => (
                  <tr key={item.budget_id || item.event_id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-sans">
                      <p className="font-semibold text-white">{item.event_title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono mr-1.5 text-[10px]">
                          {item.budget_number}
                        </span>
                        {item.budget_title}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-200">
                      {formatBDT(item.budget_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-400">
                      {formatBDT(item.actual_expense)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                      {formatBDT(item.variance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-2">
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.status_alert === 'OVER_BUDGET'
                                ? 'bg-rose-500'
                                : item.status_alert === 'NEAR_BUDGET_LIMIT'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(item.utilization_percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] text-slate-300 font-sans">
                          {item.utilization_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {item.status_alert === 'OVER_BUDGET' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          OVER BUDGET
                        </span>
                      ) : item.status_alert === 'NEAR_BUDGET_LIMIT' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          NEAR LIMIT (&gt;85%)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          ON TRACK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReportSignatures />
    </div>
  );
}
