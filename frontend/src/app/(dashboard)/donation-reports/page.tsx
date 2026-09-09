'use client';

import React, { useEffect, useState } from 'react';
import { ReportHeader, ReportSignatures } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { DonationReport } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import { HeartHandshake, RefreshCw, CheckCircle2, Clock, Users } from 'lucide-react';

export default function DonationReportsPage() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [report, setReport] = useState<DonationReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await financialReportsService.getDonationReports({
        start_date: startDate,
        end_date: endDate,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load donation reports:', err);
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
      'Donation No',
      'Donor Name',
      'Donor Type',
      'Donation Date',
      'Purpose / Cause',
      'Amount (BDT)',
      'Verification Status',
    ];
    const rows = report.donations.map((d) => [
      d.donation_number,
      d.donor_name,
      d.donor_type,
      d.donation_date,
      d.purpose,
      d.amount,
      d.status,
    ]);
    exportToCSV(`Donation_Reports_${startDate}_${endDate}`, headers, rows);
  };

  const handleExportExcel = () => {
    if (!report) return;
    const headers = [
      'Receipt No',
      'Donor',
      'Type',
      'Date',
      'Purpose',
      'Amount',
      'Status',
    ];
    const rows = report.donations.map((d) => [
      d.donation_number,
      d.donor_name,
      d.donor_type,
      d.donation_date,
      d.purpose,
      d.amount,
      d.status,
    ]);
    exportToExcel(`Donation_Records_${startDate}_${endDate}`, 'Donations', headers, rows);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReportHeader
        title="Donations & Philanthropic Giving Report"
        subtitle="Alumni Endowments, Patron Contributions & Charitable Fund Allocations"
        periodText={`Fiscal Record: ${startDate} to ${endDate}`}
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Donations Received</p>
            <p className="text-2xl font-black text-white mt-1 font-mono">
              {formatBDT(report.total_amount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total recorded philanthropic funds</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified & Credited</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {formatBDT(report.verified_amount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Audited cash in bank/MFS</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Verification</p>
            <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
              {formatBDT(report.pending_amount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting treasurer approval</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Distinct Donors</p>
            <p className="text-2xl font-black text-blue-400 mt-1 font-mono">
              {report.donor_count}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Patrons, alumni & contributors</p>
          </div>
        </div>
      )}

      {/* Donations Registry Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Donations Registry</span>
          <span className="text-xs font-mono text-slate-400">{report?.donations.length || 0} Records</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
            Fetching verified donation entries...
          </div>
        ) : !report || report.donations.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No donation transactions recorded in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="py-3 px-4">Receipt / Donor</th>
                  <th className="py-3 px-4 text-center">Donor Type</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4 text-right">Amount (BDT)</th>
                  <th className="py-3 px-4 text-center">Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {report.donations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                          {d.donation_number}
                        </span>
                        <span className="font-semibold text-white">{d.donor_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {d.donor_type || 'INDIVIDUAL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300">{d.purpose || 'General Fund'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                      {formatBDT(d.amount)}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">
                      {new Date(d.donation_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {d.status}
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
