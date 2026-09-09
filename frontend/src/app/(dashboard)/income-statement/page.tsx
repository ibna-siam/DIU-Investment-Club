'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { ReportHeader, ReportSignatures } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { IncomeStatementReport } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import { TrendingUp, TrendingDown, Calendar, RefreshCw, Layers } from 'lucide-react';

export default function IncomeStatementPage() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [compStartDate, setCompStartDate] = useState('');
  const [compEndDate, setCompEndDate] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [report, setReport] = useState<IncomeStatementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await financialReportsService.getIncomeStatement({
        start_date: startDate,
        end_date: endDate,
        comp_start_date: showComparison && compStartDate ? compStartDate : undefined,
        comp_end_date: showComparison && compEndDate ? compEndDate : undefined,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load income statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ['Type', 'Account Code', 'Account Name', 'Subtype', 'Amount (BDT)'];
    const rows: (string | number)[][] = [];

    rows.push(['REVENUES', '', '', '', '']);
    report.revenue_items.forEach((item) => {
      rows.push(['Revenue', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Total Revenue', '', '', '', report.total_revenue]);

    rows.push(['EXPENSES', '', '', '', '']);
    report.expense_items.forEach((item) => {
      rows.push(['Expense', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Total Expenses', '', '', '', report.total_expenses]);
    rows.push(['NET SURPLUS / (DEFICIT)', '', '', '', report.net_surplus]);

    exportToCSV(`Income_Statement_${startDate}_to_${endDate}`, headers, rows);
  };

  const handleExportExcel = () => {
    if (!report) return;
    const headers = ['Category', 'Account Code', 'Account Name', 'Classification', 'Amount (BDT)'];
    const rows: (string | number)[][] = [];

    report.revenue_items.forEach((item) => {
      rows.push(['Revenue', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Total Revenue', '4999', 'TOTAL OPERATING REVENUES', 'Summary', report.total_revenue]);

    report.expense_items.forEach((item) => {
      rows.push(['Expense', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Total Expenses', '5999', 'TOTAL OPERATING EXPENSES', 'Summary', report.total_expenses]);
    rows.push(['Net Surplus', '9999', 'NET SURPLUS / (DEFICIT)', 'Summary', report.net_surplus]);

    exportToExcel(`Income_Statement_${startDate}_${endDate}`, 'Income Statement', headers, rows);
  };

  const handleSaveSnapshot = async () => {
    if (!report) return;
    setSavingSnapshot(true);
    setSnapshotSuccess('');
    try {
      await financialReportsService.createSnapshot({
        report_type: 'INCOME_STATEMENT',
        title: `Income Statement (${startDate} to ${endDate})`,
        parameters: { start_date: startDate, end_date: endDate },
        data_summary: {
          total_revenue: report.total_revenue,
          total_expenses: report.total_expenses,
          net_surplus: report.net_surplus,
        },
      });
      setSnapshotSuccess('Snapshot successfully archived into audit registry.');
      setTimeout(() => setSnapshotSuccess(''), 4000);
    } catch (err) {
      console.error('Snapshot save failed:', err);
    } finally {
      setSavingSnapshot(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <ReportHeader
        title="Statement of Activities & Net Surplus (Income Statement)"
        subtitle="Audited General Ledger Revenue & Expenditure Summary"
        periodText={`For the period: ${startDate} to ${endDate}`}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onSaveSnapshot={handleSaveSnapshot}
        isSavingSnapshot={savingSnapshot}
      >
        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Start Date
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
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2 pt-5">
              <button
                onClick={() => loadReport()}
                disabled={loading}
                className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Filter
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-5">
            <label className="flex items-center text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
                className="mr-2 rounded border-slate-700 text-blue-600 focus:ring-0"
              />
              Enable Period Comparison
            </label>
          </div>
        </div>

        {showComparison && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80 mt-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Prior Period Start
              </label>
              <input
                type="date"
                value={compStartDate}
                onChange={(e) => setCompStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Prior Period End
              </label>
              <input
                type="date"
                value={compEndDate}
                onChange={(e) => setCompEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </ReportHeader>

      {snapshotSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg">
          {snapshotSuccess}
        </div>
      )}

      {/* Summary KPI Highlights */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenues</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {formatBDT(report.total_revenue)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">From 5 distinct revenue streams</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses</p>
            <p className="text-2xl font-black text-rose-400 mt-1 font-mono">
              {formatBDT(report.total_expenses)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Posted operating & event expenses</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Operating Surplus</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className={`text-2xl font-black font-mono ${report.net_surplus >= 0 ? 'text-blue-400' : 'text-rose-500'}`}>
                {formatBDT(report.net_surplus)}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Surplus Margin:{' '}
              <strong className="text-slate-300">
                {report.total_revenue > 0
                  ? ((report.net_surplus / report.total_revenue) * 100).toFixed(1)
                  : '0.0'}
                %
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* Statement Details Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Accounting Head Particulars</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Amount (BDT)</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
            Compiling income statement from posted general ledger records...
          </div>
        ) : !report ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No accounting records found for the selected period.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {/* Section 1: Operating Revenues */}
            <div className="bg-slate-950/40 p-3 px-4 text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>1. Operating Revenues</span>
              <span className="font-mono text-slate-400 text-[11px]">Normal Balance: CREDIT</span>
            </div>

            <div className="divide-y divide-slate-800/40 font-mono text-xs">
              {report.revenue_items.map((item) => (
                <div key={item.account_id} className="p-3 px-6 flex items-center justify-between hover:bg-slate-800/20">
                  <div className="flex items-center space-x-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                      {item.account_code}
                    </span>
                    <span className="font-sans text-slate-200">{item.account_name}</span>
                  </div>
                  <span className="text-slate-100 font-semibold">{formatBDT(item.amount)}</span>
                </div>
              ))}
              <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-bold text-emerald-400 border-t border-slate-700">
                <span className="font-sans uppercase">Total Operating Revenues (A)</span>
                <span>{formatBDT(report.total_revenue)}</span>
              </div>
            </div>

            {/* Section 2: Operating Expenses */}
            <div className="bg-slate-950/40 p-3 px-4 text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
              <span>2. Operating & Administrative Expenses</span>
              <span className="font-mono text-slate-400 text-[11px]">Normal Balance: DEBIT</span>
            </div>

            <div className="divide-y divide-slate-800/40 font-mono text-xs">
              {report.expense_items.map((item) => (
                <div key={item.account_id} className="p-3 px-6 flex items-center justify-between hover:bg-slate-800/20">
                  <div className="flex items-center space-x-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                      {item.account_code}
                    </span>
                    <span className="font-sans text-slate-200">{item.account_name}</span>
                  </div>
                  <span className="text-slate-100 font-semibold">{formatBDT(item.amount)}</span>
                </div>
              ))}
              <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-bold text-rose-400 border-t border-slate-700">
                <span className="font-sans uppercase">Total Operating Expenses (B)</span>
                <span>{formatBDT(report.total_expenses)}</span>
              </div>
            </div>

            {/* Net Surplus / Deficit */}
            <div className="p-4 px-6 bg-blue-950/20 border-t-2 border-blue-500/50 flex items-center justify-between text-sm font-black">
              <div className="flex items-center space-x-2">
                <span className="text-white uppercase tracking-wide">
                  Net Operating Surplus / (Deficit) (A - B)
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-sans font-normal">
                  Transferred to Club Fund Equity
                </span>
              </div>
              <span className={`text-lg font-mono ${report.net_surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatBDT(report.net_surplus)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Official Signatures for Audits / AGM */}
      <ReportSignatures />
    </div>
  );
}
