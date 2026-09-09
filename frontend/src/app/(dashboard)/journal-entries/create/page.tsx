'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  Send,
  HelpCircle,
} from 'lucide-react';
import { accountingService } from '../../../../services/accounting.service';
import { ChartOfAccount } from '../../../../types/accounting';
import { formatCurrency } from '../../../../lib/utils';

interface JournalLineForm {
  id: string;
  account_id: string;
  description: string;
  debit_amount: string;
  credit_amount: string;
  subledger_type?: string;
  subledger_id?: string;
}

export default function CreateJournalEntryPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState<string>('');
  const [referenceType, setReferenceType] = useState<string>('MANUAL');
  const [lines, setLines] = useState<JournalLineForm[]>([
    { id: '1', account_id: '', description: '', debit_amount: '', credit_amount: '' },
    { id: '2', account_id: '', description: '', debit_amount: '', credit_amount: '' },
  ]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoading(true);
        const data = await accountingService.getAccounts({ is_active: true });
        setAccounts(data);
      } catch (err: any) {
        console.error('Failed to load accounts', err);
        setError('Failed to fetch Chart of Accounts.');
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, []);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        account_id: '',
        description: '',
        debit_amount: '',
        credit_amount: '',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      alert('A double-entry journal requires at least two transaction lines.');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof JournalLineForm, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      const current = { ...next[index] };

      // Mutual exclusivity for Debit and Credit
      if (field === 'debit_amount' && value && Number(value) > 0) {
        current.credit_amount = '';
      } else if (field === 'credit_amount' && value && Number(value) > 0) {
        current.debit_amount = '';
      }

      (current as any)[field] = value;
      next[index] = current;
      return next;
    });
  };

  // Math Calculations
  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;

  const handleSubmit = async (submitForApproval: boolean) => {
    try {
      setError(null);
      if (!description.trim()) {
        setError('Please provide a general journal description / narration.');
        return;
      }

      if (lines.length < 2) {
        setError('At least two lines are required for a double-entry entry.');
        return;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.account_id) {
          setError(`Line #${i + 1} must have an account selected.`);
          return;
        }
        const dr = parseFloat(line.debit_amount) || 0;
        const cr = parseFloat(line.credit_amount) || 0;
        if (dr <= 0 && cr <= 0) {
          setError(`Line #${i + 1} must specify either a Debit or Credit amount.`);
          return;
        }
        if (dr > 0 && cr > 0) {
          setError(`Line #${i + 1} cannot have both Debit and Credit amounts.`);
          return;
        }
      }

      if (!isBalanced) {
        setError(`Journal entry is out of balance. Total Debit must equal Total Credit (Difference: BDT ${difference.toFixed(2)}).`);
        return;
      }

      setSubmitting(true);

      const payload = {
        entry_date: entryDate,
        description: description.trim(),
        reference_type: referenceType,
        lines: lines.map((l) => ({
          account_id: l.account_id,
          description: l.description.trim() || description.trim(),
          debit_amount: parseFloat(l.debit_amount) || 0,
          credit_amount: parseFloat(l.credit_amount) || 0,
          subledger_type: l.subledger_type || null,
          subledger_id: l.subledger_id || null,
        })),
      };

      const created = await accountingService.createJournalDraft(payload);

      if (submitForApproval) {
        await accountingService.submitJournal(created.id);
      }

      router.push(`/journal-entries/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create journal', err);
      setError(err.response?.data?.message || err.message || 'Failed to create journal entry.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/journal-entries"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Journal Entries</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Create Journal Entry</h1>
        <p className="text-sm text-gray-400 mt-1">
          Record a balanced double-entry manual transaction into the general journal
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-900/30 border border-rose-800/60 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-semibold">Validation Error</p>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* General Entry Details */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white">General Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Entry Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Source / Reference Type
            </label>
            <select
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="MANUAL">Manual General Journal</option>
              <option value="OPENING_BALANCE">Opening Balance</option>
              <option value="INCOME">Adjustment - Income</option>
              <option value="EXPENSE">Adjustment - Expense</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              General Narration / Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State the economic rationale or reason for this entry..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Journal Lines (Debits & Credits)</h2>
            <p className="text-xs text-gray-400">
              Each row represents an account ledger post. Ensure sum of debits strictly equals sum of credits.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium text-cyan-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-3 py-2.5 w-1/3">Account (COA)</th>
                <th className="px-3 py-2.5">Line Narration</th>
                <th className="px-3 py-2.5 w-36 text-right">Debit (BDT)</th>
                <th className="px-3 py-2.5 w-36 text-right">Credit (BDT)</th>
                <th className="px-2 py-2.5 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {lines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-gray-800/20">
                  <td className="px-3 py-2">
                    <select
                      value={line.account_id}
                      onChange={(e) => updateLine(idx, 'account_id', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- Select Account --</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_code} - {acc.account_name} ({acc.account_type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      placeholder={description || 'Line remarks...'}
                      value={line.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.debit_amount}
                      onChange={(e) => updateLine(idx, 'debit_amount', e.target.value)}
                      className="w-full text-right font-mono bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.credit_amount}
                      onChange={(e) => updateLine(idx, 'credit_amount', e.target.value)}
                      className="w-full text-right font-mono bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-blue-400 focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 2}
                      className="p-1 text-gray-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot className="border-t border-gray-700 bg-gray-800/40 font-medium">
              <tr>
                <td colSpan={2} className="px-3 py-3 text-right text-xs uppercase text-gray-400 font-bold">
                  Total Transaction Amount:
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-emerald-400">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-blue-400">
                  {formatCurrency(totalCredit)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Balance Indicator Status Card */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          isBalanced
            ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
            : 'bg-rose-950/20 border-rose-800/60 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
          )}
          <div>
            <p className="font-semibold text-sm">
              {isBalanced ? 'Journal Entry is Balanced' : 'Journal Entry is Out of Balance'}
            </p>
            <p className="text-xs opacity-80">
              {isBalanced
                ? 'Total Debits equal Total Credits. Entry satisfies the fundamental double-entry equation.'
                : `Difference of ${formatCurrency(difference)} between debits and credits. Entry cannot be posted until balanced.`}
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-sm font-bold">
          <div>Diff: {formatCurrency(difference)}</div>
        </div>
      </div>

      {/* Submit Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/journal-entries"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitting || !isBalanced}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium border border-gray-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save as Draft</span>
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={submitting || !isBalanced}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-lg shadow-cyan-900/30 transition-all"
        >
          <Send className="w-4 h-4" />
          <span>{submitting ? 'Submitting...' : 'Save & Submit for Approval'}</span>
        </button>
      </div>
    </div>
  );
}
