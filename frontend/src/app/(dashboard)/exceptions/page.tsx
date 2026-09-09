'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Scan,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { FinancialException, ExceptionSeverity, ExceptionStatus } from '../../../types/audit-compliance';

export default function FinancialExceptionsPage() {
  const [exceptions, setExceptions] = useState<FinancialException[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Resolution modal
  const [activeException, setActiveException] = useState<FinancialException | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const res = await auditComplianceService.listExceptions({
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        limit: 50,
      });
      setExceptions(res?.data || []);
    } catch (e) {
      console.error('Failed to load exceptions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [filterStatus]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await auditComplianceService.scanExceptions();
      alert(`Automated scan completed! Identified ${res.detected || 0} candidate exception(s).`);
      fetchExceptions();
    } catch (e) {
      alert('Failed to execute automated exception detection.');
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeException || !resolutionNotes) return;

    setResolving(true);
    try {
      await auditComplianceService.resolveException(activeException.id, resolutionNotes);
      setActiveException(null);
      setResolutionNotes('');
      fetchExceptions();
    } catch (e) {
      alert('Failed to resolve exception.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Module 7
            </span>
            <span className="text-xs text-muted-foreground">Internal Control Assurance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Financial Exception Management</h1>
          <p className="text-sm text-muted-foreground">
            Automated detection and review workflow for duplicate transactions, budget overruns, and accounting discrepancies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <Scan className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning System...' : 'Run Exception Scan'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex gap-1">
          {['ALL', 'FLAGGED', 'REVIEW_REQUIRED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === st
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          onClick={fetchExceptions}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Exceptions Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Flagged At</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Exception Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading exceptions...
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No exceptions flagged under this filter. All financial records are clear.
                  </td>
                </tr>
              ) : (
                exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                      {ex.flagged_at ? new Date(ex.flagged_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{ex.entity_type}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-muted text-foreground border border-border">
                        {ex.exception_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ex.severity === 'CRITICAL' || ex.severity === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : ex.severity === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                        }`}
                      >
                        {ex.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-sm truncate">{ex.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          ex.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {ex.status !== 'RESOLVED' ? (
                        <button
                          onClick={() => {
                            setActiveException(ex);
                            setResolutionNotes('');
                          }}
                          className="px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Resolved by {ex.resolved_by_name || 'Admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {activeException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Resolve Financial Exception</h3>
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">{activeException.exception_type}</p>
              <p className="text-muted-foreground">{activeException.description}</p>
            </div>

            <form onSubmit={handleResolve} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Resolution Justification & Audit Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain why this exception is justified or how the discrepancy was rectified..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActiveException(null)}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                >
                  {resolving ? 'Submitting...' : 'Mark as Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
