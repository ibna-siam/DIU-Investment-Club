'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  Search,
  Eye,
  Activity,
  User,
} from 'lucide-react';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { RiskFlag, RiskFlagType, RiskFlagStatus, ExceptionSeverity } from '../../../types/audit-compliance';

export default function RiskFlagsPage() {
  const [flags, setFlags] = useState<RiskFlag[]>([]);
  const [metrics, setMetrics] = useState({
    openExceptions: 0,
    openRiskFlags: 0,
    criticalFlags: 0,
    resolvedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // New flag modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [flagType, setFlagType] = useState<RiskFlagType>('THRESHOLD_BREACH');
  const [severity, setSeverity] = useState<ExceptionSeverity>('HIGH');
  const [targetEntity, setTargetEntity] = useState('TRANSACTION');
  const [riskScore, setRiskScore] = useState('75');
  const [submitting, setSubmitting] = useState(false);

  // Status update modal
  const [activeFlag, setActiveFlag] = useState<RiskFlag | null>(null);
  const [statusVal, setStatusVal] = useState<RiskFlagStatus>('INVESTIGATING');
  const [notesVal, setNotesVal] = useState('');

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const [listRes, metRes] = await Promise.all([
        auditComplianceService.listRiskFlags({
          status: filterStatus !== 'ALL' ? filterStatus : undefined,
          limit: 50,
        }),
        auditComplianceService.getExceptionsRiskMetrics(),
      ]);
      setFlags(listRes?.data || []);
      setMetrics(metRes);
    } catch (e) {
      console.error('Failed to load risk flags:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [filterStatus]);

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setSubmitting(true);
    try {
      await auditComplianceService.createRiskFlag({
        title,
        description,
        flag_type: flagType,
        severity,
        target_entity: targetEntity,
        risk_score: Number(riskScore),
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      fetchFlags();
    } catch (e) {
      alert('Failed to register risk flag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlag) return;

    try {
      await auditComplianceService.updateRiskFlagStatus(activeFlag.id, statusVal, notesVal);
      setActiveFlag(null);
      fetchFlags();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
              Module 8
            </span>
            <span className="text-xs text-muted-foreground">Suspicious Activity Monitoring</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Suspicious Activity & Risk Flags</h1>
          <p className="text-sm text-muted-foreground">
            Risk scoring, pattern violation warnings, and investigation registers to safeguard club assets and integrity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Raise Risk Flag
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground font-medium">OPEN RISK FLAGS</span>
          <p className="text-2xl font-bold text-foreground mt-1">{metrics.openRiskFlags}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground font-medium">CRITICAL RISK ALERTS</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{metrics.criticalFlags}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground font-medium">PENDING EXCEPTIONS</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.openExceptions}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground font-medium">RESOLVED THIS MONTH</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.resolvedThisMonth}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex gap-1">
          {['ALL', 'OPEN', 'INVESTIGATING', 'DISMISSED', 'RESOLVED'].map((st) => (
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
          onClick={fetchFlags}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Risk Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-12 text-center bg-card rounded-xl border border-border text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Loading risk flags...
          </div>
        ) : flags.length === 0 ? (
          <div className="col-span-2 p-12 text-center bg-card rounded-xl border border-border text-muted-foreground">
            No risk flags recorded under this status filter.
          </div>
        ) : (
          flags.map((flag) => (
            <div key={flag.id} className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        flag.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : flag.severity === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}
                    >
                      {flag.severity}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">{flag.flag_type}</span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mt-1">{flag.title}</h3>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-foreground">Score: {flag.risk_score} / 100</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full ${
                        flag.risk_score > 70 ? 'bg-rose-500' : flag.risk_score > 40 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${flag.risk_score}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{flag.description}</p>

              {flag.resolution_notes && (
                <div className="p-2.5 bg-muted/40 rounded-lg text-[11px] space-y-0.5 border border-border">
                  <span className="font-semibold text-foreground">Resolution Notes:</span>
                  <p className="text-muted-foreground">{flag.resolution_notes}</p>
                </div>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border text-[11px] ${
                    flag.status === 'RESOLVED' || flag.status === 'DISMISSED'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : flag.status === 'INVESTIGATING'
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}
                >
                  Status: {flag.status}
                </span>

                <button
                  onClick={() => {
                    setActiveFlag(flag);
                    setStatusVal(flag.status);
                    setNotesVal(flag.resolution_notes || '');
                  }}
                  className="px-2.5 py-1 rounded-md border border-border hover:bg-muted font-medium text-foreground"
                >
                  Update Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: New Risk Flag */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Raise Suspicious Activity Risk Flag</h3>

            <form onSubmit={handleCreateFlag} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Unusually High bKash Cash-Out"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Flag Type</label>
                  <select
                    value={flagType}
                    onChange={(e) => setFlagType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="THRESHOLD_BREACH">Threshold Breach</option>
                    <option value="SIMILAR_TRANSACTIONS">Similar Transactions</option>
                    <option value="MULTIPLE_FAILED_ACTIONS">Multiple Failed Actions</option>
                    <option value="UNUSUAL_APPROVAL">Unusual Approval</option>
                    <option value="REPEATED_REVERSALS">Repeated Reversals</option>
                    <option value="SOD_VIOLATION">SOD Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Risk Score (1-100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={riskScore}
                  onChange={(e) => setRiskScore(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Detail the circumstances, accounts, or actors involved..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {submitting ? 'Creating...' : 'Raise Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Status */}
      {activeFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Update Risk Flag Investigation</h3>

            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Status</label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="DISMISSED">DISMISSED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Investigation Notes</label>
                <textarea
                  rows={3}
                  placeholder="Investigation findings or justification for dismissal..."
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActiveFlag(null)}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
