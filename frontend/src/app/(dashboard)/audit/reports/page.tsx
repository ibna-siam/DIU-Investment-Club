'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { auditComplianceService } from '../../../../services/audit-compliance.service';

export default function AuditReportsPage() {
  const [reportType, setReportType] = useState<string>('FINANCIAL_CHANGES');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await auditComplianceService.getAuditReports(reportType, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 200,
      });
      setRecords(data || []);
    } catch (e) {
      console.error('Failed to generate audit report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const exportCSV = () => {
    if (!records.length) return;
    const headers = ['Timestamp', 'Actor', 'Module', 'Action', 'Record ID'];
    const rows = records.map((r) => [
      `"${new Date(r.created_at).toISOString()}"`,
      `"${r.user?.full_name || 'System'}"`,
      `"${r.module}"`,
      `"${r.action}"`,
      `"${r.record_id || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_report_${reportType.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <Link
            href="/audit"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Audit Trail
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Reporting & Compliance Exports</h1>
          <p className="text-sm text-muted-foreground">
            Generate formal, verifiable audit reports for internal executive review and external statutory compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={!records.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={!records.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Configuration Form */}
      <div className="bg-card p-4 rounded-xl border border-border space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Select Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
            >
              <option value="FINANCIAL_CHANGES">Financial Mutations Report</option>
              <option value="APPROVAL_HISTORY">Multi-Level Approval Audit Report</option>
              <option value="USER_ACTIVITY">User Authentication & Access Report</option>
              <option value="SYSTEM_EVENTS">System Automation & Integrations Report</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-border">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Compile Audit Report
          </button>
        </div>
      </div>

      {/* Report Preview Document */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4 print:border-none print:shadow-none">
        <div className="border-b border-border pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              DIU INVESTMENT CLUB — {reportType.replace(/_/g, ' ')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compiled on {new Date().toLocaleString()} | Verified Immutable Trail
            </p>
          </div>
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-muted text-foreground border border-border">
            {records.length} Records Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-3 py-2.5">Date & Time</th>
                <th className="px-3 py-2.5">Actor</th>
                <th className="px-3 py-2.5">Module</th>
                <th className="px-3 py-2.5">Action Executed</th>
                <th className="px-3 py-2.5">Target Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Compiling report records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No matching audit records found for this timeframe.
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      {r.user?.full_name || 'Automated Engine'}
                    </td>
                    <td className="px-3 py-2.5">{r.module}</td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{r.action}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground text-[11px]">
                      {r.record_id ? r.record_id.substring(0, 8) + '...' : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
