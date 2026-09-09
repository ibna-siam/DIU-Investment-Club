'use client';

import React, { useEffect, useState } from 'react';
import { ReportHeader, ReportSignatures } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { BalanceSheetReport } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import { CheckCircle2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState('2026-12-31');
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await financialReportsService.getBalanceSheet({ as_of_date: asOfDate });
      setReport(data);
    } catch (err) {
      console.error('Failed to load balance sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ['Classification', 'Account Code', 'Account Head', 'Subtype', 'Balance (BDT)'];
    const rows: (string | number)[][] = [];

    rows.push(['ASSETS', '', '', '', '']);
    report.assets.forEach((item) => {
      rows.push(['Asset', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Total Assets', '', '', '', report.total_assets]);

    rows.push(['LIABILITIES', '', '', '', '']);
    report.liabilities.forEach((item) => {
      rows.push(['Liability', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Total Liabilities', '', '', '', report.total_liabilities]);

    rows.push(['EQUITY & CLUB FUND', '', '', '', '']);
    report.equity_items.forEach((item) => {
      rows.push(['Equity', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Current Year Net Surplus', '', '', '', report.current_year_surplus]);
    rows.push(['Total Club Fund (Equity)', '', '', '', report.total_club_fund]);
    rows.push(['TOTAL LIABILITIES & EQUITY', '', '', '', report.total_liabilities_and_fund]);
    rows.push(['Reconciliation Difference', '', '', '', report.difference]);

    exportToCSV(`Balance_Sheet_As_Of_${asOfDate}`, headers, rows);
  };

  const handleExportExcel = () => {
    if (!report) return;
    const headers = ['Type', 'Account Code', 'Head Description', 'Subtype', 'Amount (BDT)'];
    const rows: (string | number)[][] = [];

    report.assets.forEach((item) => {
      rows.push(['Asset', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Total Assets', '1999', 'TOTAL CURRENT ASSETS', 'Summary', report.total_assets]);

    report.liabilities.forEach((item) => {
      rows.push(['Liability', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Total Liabilities', '2999', 'TOTAL LIABILITIES', 'Summary', report.total_liabilities]);

    report.equity_items.forEach((item) => {
      rows.push(['Equity', item.account_code, item.account_name, item.account_subtype, item.amount]);
    });
    rows.push(['Retained Surplus', '3998', 'Current Year Operating Surplus', 'Equity', report.current_year_surplus]);
    rows.push(['Total Fund', '3999', 'TOTAL CLUB FUND (EQUITY)', 'Summary', report.total_club_fund]);
    rows.push(['Total Liab + Fund', '9999', 'TOTAL LIABILITIES AND FUND', 'Summary', report.total_liabilities_and_fund]);

    exportToExcel(`Balance_Sheet_${asOfDate}`, 'Balance Sheet', headers, rows);
  };

  const handleSaveSnapshot = async () => {
    if (!report) return;
    setSavingSnapshot(true);
    setSnapshotSuccess('');
    try {
      await financialReportsService.createSnapshot({
        report_type: 'BALANCE_SHEET',
        title: `Balance Sheet (As of ${asOfDate})`,
        parameters: { as_of_date: asOfDate },
        data_summary: {
          total_assets: report.total_assets,
          total_liabilities: report.total_liabilities,
          total_club_fund: report.total_club_fund,
          is_balanced: report.is_balanced,
        },
      });
      setSnapshotSuccess('Balance Sheet audit snapshot saved to permanent database archive.');
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
        title="Statement of Financial Position (Balance Sheet)"
        subtitle="Audited Asset Holdings, Liabilities & Accumulated Club Fund"
        periodText={`As of: ${asOfDate}`}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onSaveSnapshot={handleSaveSnapshot}
        isSavingSnapshot={savingSnapshot}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Statement Date (As Of)
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="pt-5">
              <button
                onClick={() => loadReport()}
                disabled={loading}
                className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Recalculate
              </button>
            </div>
          </div>

          {report && (
            <div className="pt-5">
              {report.is_balanced ? (
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Statement Reconciled: Assets = Liabilities + Club Fund (Diff: ৳0.00)</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Unbalanced by: {formatBDT(report.difference)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </ReportHeader>

      {snapshotSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg">
          {snapshotSuccess}
        </div>
      )}

      {/* Summary KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Assets</p>
            <p className="text-2xl font-black text-blue-400 mt-1 font-mono">
              {formatBDT(report.total_assets)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Cash, Bank & Mobile Financial Accounts</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Liabilities</p>
            <p className="text-2xl font-black text-slate-300 mt-1 font-mono">
              {formatBDT(report.total_liabilities)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Zero unrecorded or delinquent liabilities</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Club Fund (Net Worth)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {formatBDT(report.total_club_fund)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Current Surplus: {formatBDT(report.current_year_surplus)}
            </p>
          </div>
        </div>
      )}

      {/* Balance Sheet Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Balance Sheet Head Particulars</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Amount (BDT)</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
            Reconciling balance sheet accounts against posted ledger balances...
          </div>
        ) : !report ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No accounting entries recorded as of the selected date.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {/* Section 1: Assets */}
            <div className="bg-slate-950/40 p-3 px-4 text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
              <span>1. Current Assets</span>
              <span className="font-mono text-slate-400 text-[11px]">Normal Balance: DEBIT</span>
            </div>

            <div className="divide-y divide-slate-800/40 font-mono text-xs">
              {report.assets.map((item) => (
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
              <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-bold text-blue-400 border-t border-slate-700">
                <span className="font-sans uppercase">Total Assets (A)</span>
                <span>{formatBDT(report.total_assets)}</span>
              </div>
            </div>

            {/* Section 2: Liabilities */}
            <div className="bg-slate-950/40 p-3 px-4 text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>2. Current Liabilities</span>
              <span className="font-mono text-slate-400 text-[11px]">Normal Balance: CREDIT</span>
            </div>

            <div className="divide-y divide-slate-800/40 font-mono text-xs">
              {report.liabilities.length === 0 ? (
                <div className="p-3 px-6 text-slate-500 text-[11px] italic">
                  No outstanding liabilities or payables recorded.
                </div>
              ) : (
                report.liabilities.map((item) => (
                  <div key={item.account_id} className="p-3 px-6 flex items-center justify-between hover:bg-slate-800/20">
                    <div className="flex items-center space-x-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                        {item.account_code}
                      </span>
                      <span className="font-sans text-slate-200">{item.account_name}</span>
                    </div>
                    <span className="text-slate-100 font-semibold">{formatBDT(item.amount)}</span>
                  </div>
                ))
              )}
              <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-bold text-amber-400 border-t border-slate-700">
                <span className="font-sans uppercase">Total Liabilities (B)</span>
                <span>{formatBDT(report.total_liabilities)}</span>
              </div>
            </div>

            {/* Section 3: Equity / Club Fund */}
            <div className="bg-slate-950/40 p-3 px-4 text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>3. Club Fund & Reserves (Equity)</span>
              <span className="font-mono text-slate-400 text-[11px]">Normal Balance: CREDIT</span>
            </div>

            <div className="divide-y divide-slate-800/40 font-mono text-xs">
              {report.equity_items.map((item) => (
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
              <div className="p-3 px-6 flex items-center justify-between hover:bg-slate-800/20">
                <div className="flex items-center space-x-3">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 text-[10px] font-mono">
                    3998
                  </span>
                  <span className="font-sans text-slate-200">Current Year Operating Surplus (Transferred)</span>
                </div>
                <span className="text-emerald-400 font-semibold">{formatBDT(report.current_year_surplus)}</span>
              </div>

              <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-bold text-emerald-400 border-t border-slate-700">
                <span className="font-sans uppercase">Total Club Fund / Equity (C)</span>
                <span>{formatBDT(report.total_club_fund)}</span>
              </div>
            </div>

            {/* Total Liabilities & Club Fund */}
            <div className="p-4 px-6 bg-slate-950 flex items-center justify-between text-sm font-black border-t-2 border-slate-700">
              <span className="text-white uppercase tracking-wide">
                Total Liabilities & Club Fund (B + C)
              </span>
              <span className="text-lg font-mono text-blue-400">
                {formatBDT(report.total_liabilities_and_fund)}
              </span>
            </div>

            {/* Reconciliation Check */}
            <div className="p-3 px-6 bg-slate-900 flex items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-800">
              <span>Reconciliation Equation: [Assets (A)] - [Liabilities + Fund (B+C)]</span>
              <span className={report.is_balanced ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                Difference: {formatBDT(report.difference)} {report.is_balanced ? '• (BALANCED)' : '• (MISMATCH)'}
              </span>
            </div>
          </div>
        )}
      </div>

      <ReportSignatures />
    </div>
  );
}
