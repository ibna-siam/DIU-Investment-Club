'use client';

import React, { useEffect, useState } from 'react';
import { ReportHeader, ReportSignatures } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { EventFinancialReportsData } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import { Calendar, RefreshCw, Trophy, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function EventFinancialReportsPage() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [report, setReport] = useState<EventFinancialReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await financialReportsService.getEventReports({
        start_date: startDate,
        end_date: endDate,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load event financial reports:', err);
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
      'Event Code',
      'Event Name',
      'Status',
      'Start Date',
      'Budget (BDT)',
      'Income (BDT)',
      'Expenses (BDT)',
      'Net Surplus (BDT)',
      'Budget Utilization %',
    ];
    const rows = report.events.map((ev) => [
      ev.event_code,
      ev.title,
      ev.status,
      ev.start_date,
      ev.budget_amount,
      ev.total_income,
      ev.total_expenses,
      ev.net_surplus,
      `${ev.budget_utilization}%`,
    ]);
    exportToCSV(`Event_Financial_Reports_${startDate}_${endDate}`, headers, rows);
  };

  const handleExportExcel = () => {
    if (!report) return;
    const headers = [
      'Code',
      'Event Name',
      'Status',
      'Start Date',
      'Allocated Budget',
      'Total Income',
      'Total Expense',
      'Net Contribution',
      'Utilization %',
    ];
    const rows = report.events.map((ev) => [
      ev.event_code,
      ev.title,
      ev.status,
      ev.start_date,
      ev.budget_amount,
      ev.total_income,
      ev.total_expenses,
      ev.net_surplus,
      ev.budget_utilization,
    ]);
    exportToExcel(`Event_Financials_${startDate}_${endDate}`, 'Event Financials', headers, rows);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReportHeader
        title="Event Financial Performance & ROI Report"
        subtitle="Comprehensive Financial Statements for All Club Workshops, Competitions & Summits"
        periodText={`Fiscal Window: ${startDate} to ${endDate}`}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
      >
        <div className="flex items-center space-x-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="pt-5">
            <button
              onClick={() => loadReport()}
              disabled={loading}
              className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Filter
            </button>
          </div>
        </div>
      </ReportHeader>

      {/* Summary KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Event Revenue</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {formatBDT(report.total_income)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Ticket registrations & event sponsorships</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Event Expenses</p>
            <p className="text-2xl font-black text-rose-400 mt-1 font-mono">
              {formatBDT(report.total_expenses)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Direct venue, logistics, and speaker costs</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Event Contribution</p>
            <p className="text-2xl font-black text-blue-400 mt-1 font-mono">
              {formatBDT(report.net_surplus)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Net surplus generated for Club Fund</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Events</p>
            <p className="text-2xl font-black text-white mt-1 font-mono">
              {report.events.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Recorded in calendar period</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Event Performance Breakdown</span>
          <span className="text-xs font-mono text-slate-400">
            {report?.events.length || 0} Events Evaluated
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
            Analyzing event accounting lines and profitability...
          </div>
        ) : !report || report.events.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No events registered in this date window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Allocated Budget</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Expenses</th>
                  <th className="py-3 px-4 text-right">Net Contribution</th>
                  <th className="py-3 px-4 text-center">Budget Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {report.events.map((ev) => (
                  <tr key={ev.event_id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                          {ev.event_code}
                        </span>
                        <span className="font-semibold text-white">{ev.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Date: {ev.start_date ? new Date(ev.start_date).toLocaleDateString('en-GB') : 'TBD'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-300">
                      {formatBDT(ev.budget_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                      {formatBDT(ev.total_income)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-400">
                      {formatBDT(ev.total_expenses)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={ev.net_surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatBDT(ev.net_surplus)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {ev.budget_utilization}%
                      </span>
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
