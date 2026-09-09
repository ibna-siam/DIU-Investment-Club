'use client';

import React, { useEffect, useState } from 'react';
import { ReportHeader, ReportSignatures } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { SponsorshipReport } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import { Award, RefreshCw, Briefcase, Building, CheckCircle2 } from 'lucide-react';

export default function SponsorshipReportsPage() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [report, setReport] = useState<SponsorshipReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await financialReportsService.getSponsorshipReports({
        start_date: startDate,
        end_date: endDate,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load sponsorship reports:', err);
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
      'Agreement No',
      'Sponsor Partner',
      'Event / Initiative',
      'Title',
      'Agreed Amount (BDT)',
      'Received Amount (BDT)',
      'Remaining Balance (BDT)',
      'Agreement Date',
      'Status',
    ];
    const rows = report.sponsorships.map((s) => [
      s.sponsorship_number,
      s.sponsor_name,
      s.event_title || 'General Club Partnership',
      s.title,
      s.agreed_amount,
      s.received_amount,
      s.remaining_amount,
      s.agreement_date,
      s.status,
    ]);
    exportToCSV(`Sponsorship_Reports_${startDate}_${endDate}`, headers, rows);
  };

  const handleExportExcel = () => {
    if (!report) return;
    const headers = [
      'Ref No',
      'Corporate Partner',
      'Event',
      'Tier Title',
      'Contract Value',
      'Cash Received',
      'Outstanding',
      'Date',
      'Status',
    ];
    const rows = report.sponsorships.map((s) => [
      s.sponsorship_number,
      s.sponsor_name,
      s.event_title || 'General Club Partnership',
      s.title,
      s.agreed_amount,
      s.received_amount,
      s.remaining_amount,
      s.agreement_date,
      s.status,
    ]);
    exportToExcel(`Sponsorships_${startDate}_${endDate}`, 'Sponsorships', headers, rows);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReportHeader
        title="Corporate Sponsorship & Partnership Report"
        subtitle="Corporate Contract Commitments, Cash Collections & Partner Receivables Ledger"
        periodText={`Fiscal Window: ${startDate} to ${endDate}`}
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

      {/* Summary KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Contract Value</p>
            <p className="text-2xl font-black text-white mt-1 font-mono">
              {formatBDT(report.total_agreed_amount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total signed corporate agreements</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Received Cash Flow</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {formatBDT(report.total_received_amount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Realization Rate: <strong className="text-emerald-300">{report.collection_rate}%</strong>
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Receivables</p>
            <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
              {formatBDT(report.total_outstanding_amount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Contract balances to be invoiced</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Corporate Partners</p>
            <p className="text-2xl font-black text-blue-400 mt-1 font-mono">
              {report.sponsor_count}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Engaged brands and sponsors</p>
          </div>
        </div>
      )}

      {/* Sponsorship Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Sponsorship Ledger</span>
          <span className="text-xs font-mono text-slate-400">{report?.sponsorships.length || 0} Contracts</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
            Compiling corporate sponsorship records...
          </div>
        ) : !report || report.sponsorships.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No corporate sponsorships recorded for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="py-3 px-4">Partner / Contract</th>
                  <th className="py-3 px-4">Associated Event</th>
                  <th className="py-3 px-4 text-right">Agreed (BDT)</th>
                  <th className="py-3 px-4 text-right">Received (BDT)</th>
                  <th className="py-3 px-4 text-right">Outstanding (BDT)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {report.sponsorships.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                          {s.sponsorship_number}
                        </span>
                        <span className="font-semibold text-white">{s.sponsor_name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{s.title}</p>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300">
                      {s.event_title || 'General Club Partnership'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-200">
                      {formatBDT(s.agreed_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                      {formatBDT(s.received_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-400">
                      {formatBDT(s.remaining_amount)}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        {s.status}
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
