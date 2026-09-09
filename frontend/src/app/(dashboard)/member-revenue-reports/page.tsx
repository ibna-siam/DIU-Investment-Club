'use client';

import React, { useEffect, useState } from 'react';
import { ReportHeader, ReportSignatures } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { MemberRevenueReport } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import { Users, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function MemberRevenueReportsPage() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [report, setReport] = useState<MemberRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await financialReportsService.getMemberRevenue({
        start_date: startDate,
        end_date: endDate,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load member revenue report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ['Tier Name', 'Total Dues (BDT)', 'Collected (BDT)', 'Outstanding (BDT)', 'Collection Rate %'];
    const rows = report.tiers.map((t) => [
      t.tier_name,
      t.total_dues,
      t.collected,
      t.outstanding,
      t.total_dues > 0 ? `${((t.collected / t.total_dues) * 100).toFixed(1)}%` : '100%',
    ]);
    exportToCSV(`Member_Revenue_Report_${startDate}_${endDate}`, headers, rows);
  };

  const handleExportExcel = () => {
    if (!report) return;
    const headers = ['Tier Name', 'Total Dues', 'Collected', 'Outstanding'];
    const rows = report.tiers.map((t) => [t.tier_name, t.total_dues, t.collected, t.outstanding]);
    exportToExcel(`Member_Revenue_${startDate}_${endDate}`, 'Member Revenue', headers, rows);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReportHeader
        title="Member Revenue & Dues Collection Report"
        subtitle="Membership Fee Realization, Collection Efficiency & Overdue Receivables"
        periodText={`Fiscal Period: ${startDate} to ${endDate}`}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
      >
        <div className="flex items-center space-x-3">
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

      {/* KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Dues Invoiced</p>
            <p className="text-2xl font-black text-white mt-1 font-mono">
              {formatBDT(report.total_dues_amount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Across all membership tiers</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collected In Cash</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {formatBDT(report.total_collected)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Collection Efficiency:{' '}
              <strong className="text-emerald-300">{report.collection_rate}%</strong>
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Receivables</p>
            <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
              {formatBDT(report.total_outstanding)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Overdue: <strong className="text-rose-400">{formatBDT(report.total_overdue)}</strong>
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paying Members</p>
            <p className="text-2xl font-black text-blue-400 mt-1 font-mono">
              {report.active_paying_members}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Members with verified transactions</p>
          </div>
        </div>
      )}

      {/* Breakdown by Tier */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Performance by Membership Tier</span>
          <span className="text-xs font-mono text-slate-400">{report?.tiers.length || 0} Membership Tiers</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
            Compiling membership dues and collection metrics...
          </div>
        ) : !report || report.tiers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No membership tiers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="py-3 px-4">Membership Tier</th>
                  <th className="py-3 px-4 text-right">Total Invoiced</th>
                  <th className="py-3 px-4 text-right">Collected (BDT)</th>
                  <th className="py-3 px-4 text-right">Outstanding (BDT)</th>
                  <th className="py-3 px-4 text-center">Collection Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {report.tiers.map((tier, idx) => {
                  const rate =
                    tier.total_dues > 0
                      ? Math.round((tier.collected / tier.total_dues) * 100)
                      : 100;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-sans font-semibold text-white">
                        {tier.tier_name}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-200">
                        {formatBDT(tier.total_dues)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        {formatBDT(tier.collected)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-400">
                        {formatBDT(tier.outstanding)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center space-x-2">
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-sans text-slate-300">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReportSignatures />
    </div>
  );
}
