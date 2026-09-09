'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { ExpenseCategory, FinancialAccount } from '../../../../types/financial';
import { formatBDT } from '../../../../lib/formatters';
import { ArrowLeft, CreditCard, ShieldAlert, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function CreateExpensePage() {
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    expense_date: today,
    category_id: '',
    amount: 0,
    paid_to: '',
    financial_account_id: '',
    payment_method: 'CASH',
    invoice_number: '',
    receipt_url: '',
    description: '',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Categories
  const { data: categoriesResponse } = useQuery<{ success: boolean; data: ExpenseCategory[] }>({
    queryKey: ['expense-categories'],
    queryFn: () => api.get('/expense-categories'),
  });

  // Fetch Accounts
  const { data: accountsResponse } = useQuery<{ success: boolean; data: FinancialAccount[] }>({
    queryKey: ['financial-accounts-active'],
    queryFn: () => api.get('/accounts?status=ACTIVE'),
  });

  const categories = categoriesResponse?.data || [];
  const accounts = accountsResponse?.data || [];

  const selectedAccount = accounts.find((a) => a.id === formData.financial_account_id);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/expenses', data);
    },
    onSuccess: () => {
      router.push('/expenses');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to record expense');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.category_id) {
      setErrorMsg('Please select an expense category');
      return;
    }
    if (!formData.financial_account_id) {
      setErrorMsg('Please select a paying financial account');
      return;
    }
    if (formData.amount <= 0) {
      setErrorMsg('Amount must be greater than zero');
      return;
    }
    if (!formData.paid_to.trim()) {
      setErrorMsg('Please specify who this expense was paid to');
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/expenses"
          className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-rose-400" />
            Record New Expense
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Log financial disbursements for club activities, logistics, printing, and refreshments.
          </p>
        </div>
      </div>

      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Expense Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Amount (BDT ৳) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Paying Financial Account <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.financial_account_id}
                onChange={(e) => setFormData({ ...formData, financial_account_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Select Paying Account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Bal: {formatBDT(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedAccount && formData.amount > selectedAccount.current_balance && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong>Warning:</strong> Selected account balance ({formatBDT(selectedAccount.current_balance)}) is currently less than the expense amount ({formatBDT(formData.amount)}). Payment execution will be blocked until sufficient funds are available.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Paid To (Payee / Vendor) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Al-Madina Printers, Cafeteria, DIU IT Store"
                value={formData.paid_to}
                onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer / BEFTN / NPSB</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Invoice / Voucher Number
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-089"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Receipt / Voucher Document URL
              </label>
              <input
                type="url"
                placeholder="e.g. https://storage... or drive link"
                value={formData.receipt_url}
                onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Description / Justification
            </label>
            <textarea
              rows={3}
              placeholder="Provide context and justification for this disbursement..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/expenses"
              className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Draft...
                </>
              ) : (
                'Save Expense Draft'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
