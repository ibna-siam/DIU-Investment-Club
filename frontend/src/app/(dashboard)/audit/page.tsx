'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  ArrowRight,
  Database,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { AuditLogItem } from '../../../types/audit-compliance';

export default function AuditCenterPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState({
    total_logs: 0,
    financial_logs: 0,
    approval_logs: 0,
    user_logs: 0,
    suspicious_activities: 0,
  });
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 25;

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        auditComplianceService.getAuditLogs({
          category: category !== 'ALL' ? category : undefined,
          action: actionFilter !== 'ALL' ? actionFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: search || undefined,
          page,
          limit,
        }),
        auditComplianceService.getAuditStats(),
      ]);

      const logList = logsRes?.data || [];
      setLogs(logList);
      setTotalCount(logsRes?.pagination?.total || logList.length);
      setTotalPages(logsRes?.pagination?.totalPages || Math.ceil((logsRes?.pagination?.total || logList.length) / limit) || 1);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [category, actionFilter, startDate, endDate, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuditData();
  };

  const resetFilters = () => {
    setCategory('ALL');
    setActionFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('LOGIN') || act.includes('APPROVE') || act.includes('CREATE')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    }
    if (act.includes('REJECT') || act.includes('DELETE') || act.includes('BLOCK')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              System Audit & Oversight
            </span>
            <span className="text-xs text-slate-400">Immutable Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Audit Center & Activity Trail</h1>
          <p className="text-sm text-slate-400">
            Cryptographic traceability, financial mutations, and governance records with automatic sensitive data redaction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/audit/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            Audit Reports
          </Link>
          <button
            onClick={fetchAuditData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>TOTAL AUDIT EVENTS</span>
            <Database className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.total_logs}</p>
          <p className="text-xs text-slate-400 mt-1">System-wide immutable ledger</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>FINANCIAL MUTATIONS</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.financial_logs}</p>
          <p className="text-xs text-slate-400 mt-1">Accounts, vouchers & journals</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>APPROVAL ACTIVITIES</span>
            <CheckCircle className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.approval_logs}</p>
          <p className="text-xs text-slate-400 mt-1">Multi-tier sign-off audits</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>SUSPICIOUS RISK FLAGS</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{stats.suspicious_activities}</p>
          <p className="text-xs text-slate-400 mt-1">Pending review & verification</p>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-1">
            {['ALL', 'FINANCIAL', 'APPROVAL', 'USER', 'SECURITY', 'SYSTEM'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  category === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, record, or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </form>
        </div>

        {/* Second Row Filters: Action, Date Range */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="APPROVE">Approve</option>
              <option value="REJECT">Reject</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {(category !== 'ALL' || actionFilter !== 'ALL' || startDate || endDate || search) && (
            <button
              onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 border-b border-slate-700/80 text-slate-300 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / User</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading system audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No audit events match current criteria</p>
                    <p className="text-xs text-slate-500 mt-1">Adjust filters or search parameters to view activity.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300">
                          <User className="w-3 h-3" />
                        </div>
                        <span className="font-medium text-white">
                          {log.user?.full_name || (log as any).user_id?.slice(0, 8) || 'System / Auto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                      {log.record_id ? log.record_id.slice(0, 8) + '...' : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs bg-slate-950/50">
          <span className="text-slate-400">
            Showing {logs.length} of {totalCount} records (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-300">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Audit Event Snapshot & Diff
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {selectedLog.id} • Action: {selectedLog.action}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-md hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium mb-1">Previous State (Before Mutation):</span>
                <pre className="p-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 font-mono overflow-auto max-h-60 text-[11px]">
                  {selectedLog.old_data
                    ? JSON.stringify(selectedLog.old_data, null, 2)
                    : '// No prior state (CREATE or INITIAL event)'}
                </pre>
              </div>
              <div>
                <span className="text-slate-400 block font-medium mb-1">New State (After Mutation):</span>
                <pre className="p-3 rounded-lg border border-slate-800 bg-slate-950 text-emerald-300 font-mono overflow-auto max-h-60 text-[11px]">
                  {selectedLog.new_data
                    ? JSON.stringify(selectedLog.new_data, null, 2)
                    : '// Record was deleted'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
