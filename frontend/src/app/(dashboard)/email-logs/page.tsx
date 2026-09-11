'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Mail,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  Ban,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Sliders,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

interface EmailLogItem {
  id: string;
  idempotency_key?: string | null;
  email_type: string;
  recipient: string;
  subject: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  trigger_source?: string | null;
  provider_message_id?: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING' | 'CANCELLED' | 'SKIPPED';
  attempt_count: number;
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
}

export default function EmailLogsPage() {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get<{
        success: boolean;
        data: EmailLogItem[];
        total: number;
        totalPages: number;
      }>(`/email/logs?${params.toString()}`);

      if (res && res.data) {
        setLogs(res.data);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Failed to load email logs:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to load email logs' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRetry = async (logId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/email/logs/${logId}/retry`, {});
      setMessage({ type: 'success', text: 'Email queued for retry.' });
      fetchLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to retry email' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'FAILED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'RETRYING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'CANCELLED':
        return 'bg-slate-700 text-slate-300 border-slate-600';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>System Administration</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Communication Center</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-emerald-400 font-medium">Email Logs</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-emerald-400" />
            <span>Email Delivery Logs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit outbound email transmissions, inspect Resend provider statuses, and retry failed deliveries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh Logs</span>
          </button>
          <Link
            href="/test-email"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-xs font-semibold"
          >
            <Send className="w-4 h-4" />
            <span>Send Test Email</span>
          </Link>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search recipient, subject, or ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'SENT', 'FAILED', 'RETRYING', 'PENDING', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Email Subject & Type</th>
                <th className="py-3.5 px-4">Provider / Message ID</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                    <span>Loading email logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No email logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-semibold text-white block">{log.recipient}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Attempts: {log.attempt_count}
                      </span>
                    </td>

                    <td className="py-4 px-4 max-w-sm">
                      <p className="font-medium text-slate-200 truncate">{log.subject}</p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 mt-1 inline-block">
                        {log.email_type}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {log.provider_message_id ? (
                        <span className="truncate block max-w-[140px]" title={log.provider_message_id}>
                          {log.provider_message_id}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-slate-400">
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="View Log Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {log.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(log.id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                          title="Retry Transmission"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {logs.length} of {totalCount} email logs
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-200">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Email Delivery Details</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Log ID:</span>
                <p className="font-mono text-slate-300 select-all">{selectedLog.id}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Recipient:</span>
                <p className="font-semibold text-white">{selectedLog.recipient}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Subject:</span>
                <p className="text-slate-200">{selectedLog.subject}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 font-medium">Status:</span>
                  <p className="font-bold text-emerald-400">{selectedLog.status}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Attempts:</span>
                  <p className="font-bold text-slate-200">{selectedLog.attempt_count}</p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300">
                  <span className="font-bold block mb-1">Error Message:</span>
                  <p className="font-mono leading-relaxed">{selectedLog.error_message}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
