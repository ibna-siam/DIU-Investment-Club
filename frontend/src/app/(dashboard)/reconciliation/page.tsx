'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Plus,
  Clock,
  UserCheck,
  Building2,
  FileCheck2,
} from 'lucide-react';
import Link from 'next/link';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { CashReconciliation } from '../../../types/audit-compliance';

export default function CashReconciliationPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [history, setHistory] = useState<CashReconciliation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [physicalCash, setPhysicalCash] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const systemBalance = selectedAccount ? Number(selectedAccount.current_balance) : 0;
  const difference = physicalCash !== '' ? Number(physicalCash) - systemBalance : 0;

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, hist] = await Promise.all([
        auditComplianceService.getCashAccounts(),
        auditComplianceService.listCashReconciliations(),
      ]);
      setAccounts(accs || []);
      if (accs && accs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accs[0].id);
      }
      setHistory(hist?.data || []);
    } catch (e) {
      console.error('Failed to load reconciliation data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePerformReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || physicalCash === '') {
      setAlertMsg({ type: 'error', text: 'Please select an account and enter physical counted cash.' });
      return;
    }

    setSubmitting(true);
    setAlertMsg(null);
    try {
      const res = await auditComplianceService.createCashReconciliation({
        account_id: selectedAccountId,
        physical_cash: Number(physicalCash),
        notes,
      });

      if (res) {
        setAlertMsg({
          type: 'success',
          text: `Cash reconciliation recorded successfully. Discrepancy: BDT ${res.difference.toFixed(2)}`,
        });
        setPhysicalCash('');
        setNotes('');
        loadData();
      }
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.error?.message || 'Reconciliation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Module 2 & 3
            </span>
            <span className="text-xs text-muted-foreground">Internal Control & Balance Assurance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Financial & Cash Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Perform physical cash counts, verify account balances, and record exact variances without silent accounting adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/bank-reconciliation"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            Bank Reconciliation Center
          </Link>
        </div>
      </div>

      {/* Safety Notice Card */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-foreground">Strict Internal Control Policy</p>
          <p className="text-muted-foreground">
            Physical cash discrepancies are recorded as audit events and flagged for executive review. The system will{' '}
            <span className="font-semibold text-foreground">NEVER silently adjust</span> journal entry lines or trial balance accounts.
          </p>
        </div>
      </div>

      {alertMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            alertMsg.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-600'
          }`}
        >
          {alertMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {alertMsg.text}
        </div>
      )}

      {/* Main Reconciliation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Calculator */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Wallet className="w-4 h-4 text-primary" />
            Perform Physical Count
          </h2>

          <form onSubmit={handlePerformReconciliation} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Select Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_type}) — BDT {Number(acc.current_balance).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">System Recorded Balance:</span>
                <span className="font-mono font-bold text-foreground">BDT {systemBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Type:</span>
                <span className="font-semibold text-foreground">{selectedAccount?.account_type || '—'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Physical Cash Counted (BDT)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter physical cash amount"
                value={physicalCash}
                onChange={(e) => setPhysicalCash(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
              />
            </div>

            {/* Difference Preview */}
            <div
              className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                Math.abs(difference) < 0.01
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'
                  : 'border-rose-500/20 bg-rose-500/5 text-rose-600'
              }`}
            >
              <span className="font-semibold">Calculated Difference:</span>
              <span className="font-mono font-bold text-sm">
                {difference >= 0 ? `+BDT ${difference.toFixed(2)}` : `-BDT ${Math.abs(difference).toFixed(2)}`}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Verification Notes</label>
              <textarea
                rows={3}
                placeholder="Notes on cash count, denomination tally, or discrepancies..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Recording Verification...' : 'Submit & Record Reconciliation'}
            </button>
          </form>
        </div>

        {/* Right: Reconciliation History Log */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Reconciliation History & Variance Log
            </h2>
            <button
              onClick={loadData}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Account</th>
                  <th className="px-3 py-2.5 text-right">System Cash</th>
                  <th className="px-3 py-2.5 text-right">Physical Cash</th>
                  <th className="px-3 py-2.5 text-right">Difference</th>
                  <th className="px-3 py-2.5">Verified By</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Loading history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      No cash reconciliations recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono">{rec.reconciliation_date}</td>
                      <td className="px-3 py-2.5 font-medium">{rec.account_name || 'Cash Account'}</td>
                      <td className="px-3 py-2.5 text-right font-mono">BDT {rec.system_cash.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">
                        BDT {rec.physical_cash.toLocaleString()}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-bold ${
                          Math.abs(rec.difference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {rec.difference > 0 ? `+${rec.difference.toFixed(2)}` : rec.difference.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{rec.verified_by_name || 'System User'}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            rec.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
