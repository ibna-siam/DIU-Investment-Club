'use client';

import React, { useEffect, useState } from 'react';
import { ReportHeader, ReportSignatures } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { CashFlowStatementReport } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import { RefreshCw, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function CashFlowStatementPage() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [report, setReport] = useState<CashFlowStatementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await financialReportsService.getCashFlowStatement({
        start_date: startDate,
        end_date: endDate,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load cash flow statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ['Category', 'Flow Direction', 'Amount (BDT)'];
    const rows: (string | number)[][] = [];

    rows.push(['Cash Balance at Beginning of Period', '', report.opening_cash_balance]);
    rows.push(['OPERATING ACTIVITIES', '', '']);
    report.operating_items.forEach((item) => {
      rows.push([item.category, item.type === 'REVENUE' ? 'Cash Inflow' : 'Cash Outflow', item.amount]);
    });
    rows.push(['Operating Inflows', 'Inflow Total', report.operating_inflows]);
    rows.push(['Operating Outflows', 'Outflow Total', report.operating_outflows]);
    rows.push(['Net Cash Flow from Operating Activities', 'Net', report.net_operating_cash_flow]);

    rows.push(['INVESTING ACTIVITIES', '', '']);
    rows.push(['Net Cash Flow from Investing Activities', 'Net', report.net_investing_cash_flow]);

    rows.push(['FINANCING ACTIVITIES', '', '']);
    rows.push(['Net Cash Flow from Financing Activities', 'Net', report.net_financing_cash_flow]);

    rows.push(['Net Increase / (Decrease) in Cash and Equivalents', 'Summary', report.net_cash_flow]);
    rows.push(['Cash and Cash Equivalents at End of Period', 'Summary', report.closing_cash_balance]);

    exportToCSV(`Cash_Flow_Statement_${startDate}_${endDate}`, headers, rows);
  };

  const handleExportExcel = () => {
    if (!report) return;
    const headers = ['Activity Group', 'Head Description', 'Classification', 'Amount (BDT)'];
    const rows: (string | number)[][] = [];

    rows.push(['Opening Balance', 'Cash Balance at Beginning of Period', 'Asset', report.opening_cash_balance]);
    report.operating_items.forEach((item) => {
      rows.push([
        'Operating Activity',
        item.category,
        item.type === 'REVENUE' ? 'Cash Inflow' : 'Cash Outflow',
        item.type === 'REVENUE' ? item.amount : -item.amount,
      ]);
    });
    rows.push(['Operating Summary', 'Net Cash from Operating Activities', 'Net Flow', report.net_operating_cash_flow]);
    rows.push(['Investing Summary', 'Net Cash from Investing Activities', 'Net Flow', report.net_investing_cash_flow]);
    rows.push(['Financing Summary', 'Net Cash from Financing Activities', 'Net Flow', report.net_financing_cash_flow]);
    rows.push(['Net Flow', 'NET INCREASE / (DECREASE) IN CASH', 'Summary', report.net_cash_flow]);
    rows.push(['Closing Balance', 'Cash and Cash Equivalents at End of Period', 'Asset', report.closing_cash_balance]);

    exportToExcel(`Cash_Flow_Statement_${startDate}_${endDate}`, 'Cash Flows', headers, rows);
  };

  const handleSaveSnapshot = async () => {
    if (!report) return;
    setSavingSnapshot(true);
    setSnapshotSuccess('');
    try {
      await financialReportsService.createSnapshot({
        report_type: 'CASH_FLOW_STATEMENT',
        title: `Statement of Cash Flows (${startDate} to ${endDate})`,
        parameters: { start_date: startDate, end_date: endDate },
        data_summary: {
          opening_cash: report.opening_cash_balance,
          operating_net: report.net_operating_cash_flow,
          net_cash_flow: report.net_cash_flow,
          closing_cash: report.closing_cash_balance,
        },
      });
      setSnapshotSuccess('Cash flow statement audit snapshot archived successfully.');
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
        title="Statement of Cash Flows (Liquidity & Treasury)"
        subtitle="Audited Operating, Investing & Financing Liquidity Inflows and Outflows"
        periodText={`For the period: ${startDate} to ${endDate}`}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onSaveSnapshot={handleSaveSnapshot}
        isSavingSnapshot={savingSnapshot}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                From Date
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
                To Date
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
                className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Filter
              </button>
            </div>
          </div>

          {report && (
            <div className="pt-5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reconciled Closing Cash: {formatBDT(report.closing_cash_balance)}</span>
              </div>
            </div>
          )}
        </div>
      </ReportHeader>

      {snapshotSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg">
          {snapshotSuccess}
        </div>
      )}

      {/* KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opening Cash</p>
            <p className="text-2xl font-black text-slate-300 mt-1 font-mono">
              {formatBDT(report.opening_cash_balance)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Cash balance at start of period</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operating Inflows</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {formatBDT(report.operating_inflows)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Member dues, sponsors, donations</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operating Outflows</p>
            <p className="text-2xl font-black text-rose-400 mt-1 font-mono">
              {formatBDT(report.operating_outflows)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Operational & event disbursements</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Closing Cash Balance</p>
            <p className="text-2xl font-black text-cyan-400 mt-1 font-mono">
              {formatBDT(report.closing_cash_balance)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Net Change: +{formatBDT(report.net_cash_flow)}
            </p>
          </div>
        </div>
      )}

      {/* Cash Flow Detailed Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Cash Flow Breakdown</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Amount (BDT)</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
            Compiling cash flow activities from verified journal entries...
          </div>
        ) : !report ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No cash flow activities found for the selected period.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {/* Opening Cash Balance */}
            <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-mono text-xs">
              <span className="font-sans font-bold text-slate-200">
                Cash and Cash Equivalents at Beginning of Period
              </span>
              <span className="text-slate-300 font-semibold">{formatBDT(report.opening_cash_balance)}</span>
            </div>

            {/* 1. Operating Activities */}
            <div className="bg-slate-950/40 p-3 px-4 text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>1. Cash Flows from Operating Activities</span>
            </div>

            <div className="divide-y divide-slate-800/40 font-mono text-xs">
              {report.operating_items.map((item, idx) => (
                <div key={idx} className="p-3 px-6 flex items-center justify-between hover:bg-slate-800/20">
                  <div className="flex items-center space-x-2">
                    {item.type === 'REVENUE' ? (
                      <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-sans text-slate-200">{item.category}</span>
                  </div>
                  <span className={item.type === 'REVENUE' ? 'text-emerald-400' : 'text-rose-400'}>
                    {item.type === 'REVENUE' ? `+${formatBDT(item.amount)}` : `-${formatBDT(item.amount)}`}
                  </span>
                </div>
              ))}

              <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-bold text-emerald-400 border-t border-slate-700">
                <span className="font-sans uppercase">Net Cash Generated from Operating Activities (A)</span>
                <span>{formatBDT(report.net_operating_cash_flow)}</span>
              </div>
            </div>

            {/* 2. Investing Activities */}
            <div className="bg-slate-950/40 p-3 px-4 text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
              <span>2. Cash Flows from Investing Activities</span>
            </div>
            <div className="p-3 px-6 font-mono text-xs text-slate-400 flex items-center justify-between">
              <span className="font-sans">Capital equipment, software, long-term asset investments</span>
              <span>{formatBDT(report.net_investing_cash_flow)}</span>
            </div>
            <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-bold text-blue-400 border-t border-slate-700 font-mono text-xs">
              <span className="font-sans uppercase">Net Cash Flow from Investing Activities (B)</span>
              <span>{formatBDT(report.net_investing_cash_flow)}</span>
            </div>

            {/* 3. Financing Activities */}
            <div className="bg-slate-950/40 p-3 px-4 text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center justify-between">
              <span>3. Cash Flows from Financing Activities</span>
            </div>
            <div className="p-3 px-6 font-mono text-xs text-slate-400 flex items-center justify-between">
              <span className="font-sans">Endowment grants, university allocations, long-term funding</span>
              <span>{formatBDT(report.net_financing_cash_flow)}</span>
            </div>
            <div className="p-3 px-6 bg-slate-800/30 flex items-center justify-between font-bold text-purple-400 border-t border-slate-700 font-mono text-xs">
              <span className="font-sans uppercase">Net Cash Flow from Financing Activities (C)</span>
              <span>{formatBDT(report.net_financing_cash_flow)}</span>
            </div>

            {/* Net Change in Cash */}
            <div className="p-4 px-6 bg-slate-950 flex items-center justify-between text-sm font-black border-t-2 border-slate-700">
              <span className="text-white uppercase tracking-wide">
                Net Increase / (Decrease) in Cash and Equivalents (A + B + C)
              </span>
              <span className="text-lg font-mono text-emerald-400">
                +{formatBDT(report.net_cash_flow)}
              </span>
            </div>

            {/* Closing Cash Reconciled */}
            <div className="p-4 px-6 bg-blue-950/30 flex items-center justify-between text-sm font-black border-t border-blue-500/40">
              <div>
                <span className="text-white uppercase tracking-wide">
                  Cash and Cash Equivalents at End of Period
                </span>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  Reconciled against Cash in Hand (1110), Bank Operating (1120), and MFS (1130)
                </p>
              </div>
              <span className="text-xl font-mono text-cyan-400">
                {formatBDT(report.closing_cash_balance)}
              </span>
            </div>
          </div>
        )}
      </div>

      <ReportSignatures />
    </div>
  );
}
