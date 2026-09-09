'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Link as LinkIcon,
  Unlink,
  Eye,
  Check,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { auditComplianceService } from '../../../services/audit-compliance.service';
import { BankReconciliation, BankReconciliationItem } from '../../../types/audit-compliance';

export default function BankReconciliationPage() {
  const [sessions, setSessions] = useState<BankReconciliation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<BankReconciliation | null>(null);
  const [loading, setLoading] = useState(true);

  // New session modal
  const [showModal, setShowModal] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [statementBalance, setStatementBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const [accs, list] = await Promise.all([
        auditComplianceService.getBankAccounts(),
        auditComplianceService.listBankReconciliations(),
      ]);
      setBankAccounts(accs || []);
      const sessionList = list?.data || [];
      setSessions(sessionList);
      if (sessionList.length > 0 && !activeSession) {
        const first = await auditComplianceService.getBankReconciliation(sessionList[0].id);
        setActiveSession(first);
      }
    } catch (e) {
      console.error('Failed to load bank reconciliation:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const selectSession = async (id: string) => {
    setLoading(true);
    try {
      const s = await auditComplianceService.getBankReconciliation(id);
      setActiveSession(s);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !periodStart || !periodEnd || statementBalance === '') return;

    setSubmitting(true);
    try {
      const newSession = await auditComplianceService.createBankReconciliation({
        account_id: accountId,
        period_start: periodStart,
        period_end: periodEnd,
        statement_ending_balance: Number(statementBalance),
        notes,
        items: [
          {
            statement_date: periodEnd,
            statement_description: 'EBL Operating Deposit - Membership Collection',
            statement_reference: 'DEP-2026-09',
            statement_amount: 15000,
          },
          {
            statement_date: periodEnd,
            statement_description: 'Utility & Internet Banking Debit',
            statement_reference: 'DEB-UTIL-44',
            statement_amount: 4500,
          },
        ],
      });

      setShowModal(false);
      fetchSessions();
      if (newSession) setActiveSession(newSession);
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMatch = async (item: BankReconciliationItem) => {
    if (!item.financial_transaction_id) {
      alert('Please link a financial transaction to match.');
      return;
    }
    await auditComplianceService.matchBankItem(item.id, item.financial_transaction_id);
    if (activeSession) selectSession(activeSession.id);
  };

  const handleUnmatch = async (itemId: string) => {
    await auditComplianceService.unmatchBankItem(itemId);
    if (activeSession) selectSession(activeSession.id);
  };

  const handleApproveSession = async () => {
    if (!activeSession) return;
    if (Math.abs(activeSession.difference) > 0.01) {
      if (!confirm('Variance exists between statement balance and reconciled total. Are you sure you want to approve?')) {
        return;
      }
    }
    await auditComplianceService.updateBankReconciliationStatus(activeSession.id, 'APPROVED');
    selectSession(activeSession.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Module 3
            </span>
            <span className="text-xs text-muted-foreground">Bank Statement Audit</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Bank Reconciliation Center</h1>
          <p className="text-sm text-muted-foreground">
            Match bank statement transactions against system ledger records with auto-suggestions and human sign-off.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Bank Reconciliation
          </button>
        </div>
      </div>

      {/* Sessions Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => selectSession(s.id)}
            className={`px-4 py-2.5 rounded-xl border text-left shrink-0 transition-all ${
              activeSession?.id === s.id
                ? 'border-primary bg-primary/5 text-primary shadow-xs'
                : 'border-border bg-card hover:bg-muted text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="font-semibold text-xs">{s.account_name || 'Bank Account'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              {s.period_start} to {s.period_end}
            </p>
          </button>
        ))}
      </div>

      {/* Active Session Detail View */}
      {activeSession ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium">STATEMENT BALANCE</span>
              <p className="text-xl font-bold font-mono text-foreground mt-1">
                BDT {activeSession.statement_ending_balance.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium">SYSTEM LEDGER BALANCE</span>
              <p className="text-xl font-bold font-mono text-foreground mt-1">
                BDT {activeSession.system_ending_balance.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium">TOTAL RECONCILED</span>
              <p className="text-xl font-bold font-mono text-foreground mt-1">
                BDT {activeSession.reconciled_balance.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium">UNRECONCILED VARIANCE</span>
              <p
                className={`text-xl font-bold font-mono mt-1 ${
                  Math.abs(activeSession.difference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                BDT {activeSession.difference.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Statement Items Matching Table */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Statement Transaction Lines</h2>
                <p className="text-xs text-muted-foreground">Confirm automated suggestions or manually match transactions</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                    activeSession.status === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}
                >
                  Status: {activeSession.status}
                </span>
                {activeSession.status !== 'APPROVED' && (
                  <button
                    onClick={handleApproveSession}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Approve Reconciliation
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Statement Description</th>
                    <th className="px-3 py-2.5 text-right">Amount (BDT)</th>
                    <th className="px-3 py-2.5">Match Suggestion / Status</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(activeSession.items || []).map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                        {item.statement_date}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-foreground">{item.statement_description}</p>
                        {item.statement_reference && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Ref: {item.statement_reference}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">
                        BDT {item.statement_amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.match_status === 'MATCHED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" /> Matched (#{item.transaction_number || 'TX-OK'})
                          </span>
                        ) : item.confidence_score && item.confidence_score > 0 ? (
                          <div className="text-[11px]">
                            <span className="font-semibold text-amber-600">
                              Suggested ({item.confidence_score}% confidence)
                            </span>
                            <p className="text-muted-foreground truncate max-w-[200px]">{item.notes}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Unmatched</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {item.match_status === 'MATCHED' ? (
                          <button
                            onClick={() => handleUnmatch(item.id)}
                            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                          >
                            <Unlink className="w-3 h-3" /> Unmatch
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMatch(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                          >
                            <Check className="w-3 h-3" /> Confirm Match
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground">
          No bank reconciliation sessions found. Click "New Bank Reconciliation" to start a period audit.
        </div>
      )}

      {/* Modal: New Reconciliation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Initiate Bank Reconciliation</h3>

            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Bank Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — #{acc.account_number} (BDT {Number(acc.current_balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Period Start</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">Period End</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Statement Ending Balance (BDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 75000"
                  value={statementBalance}
                  onChange={(e) => setStatementBalance(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">Audit Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes from physical bank statement sheet..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {submitting ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
