'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Layers,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Folder,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { accountingService } from '../../../services/accounting.service';
import { ChartOfAccount, AccountCategoryType } from '../../../types/accounting';

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('tree');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountCategoryType>('ASSET');
  const [formParent, setFormParent] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const [list, tree] = await Promise.all([
        accountingService.getAccounts({
          type: selectedCategory === 'ALL' ? undefined : selectedCategory,
          search: search || undefined,
        }),
        accountingService.getAccountHierarchy(),
      ]);
      setAccounts(list);
      setHierarchy(tree);
    } catch (err) {
      console.error('Failed to load chart of accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [selectedCategory, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await accountingService.createAccount({
        account_code: formCode,
        account_name: formName,
        account_type: formType,
        parent_account_id: formParent || null,
        description: formDesc || null,
      });
      setShowModal(false);
      setFormCode('');
      setFormName('');
      setFormDesc('');
      setFormParent('');
      await loadAccounts();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'LIABILITY':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'EQUITY':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'REVENUE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'EXPENSE':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const categories = ['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: any, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 hover:border-slate-700 transition ${
            depth === 0 ? 'bg-slate-900/90 font-semibold' : ''
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <FolderOpen className="h-4 w-4 text-emerald-400" />
            ) : (
              <FileText className="h-4 w-4 text-slate-500" />
            )}
            <span className="font-mono text-xs font-bold text-slate-300">{node.account_code}</span>
            <span className="text-sm text-white">{node.account_name}</span>
            {node.is_system_account && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
                SYSTEM
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${getCategoryColor(node.account_type)}`}
            >
              {node.account_type}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                node.normal_balance === 'DEBIT' ? 'text-cyan-400 bg-cyan-950/60' : 'text-orange-400 bg-orange-950/60'
              }`}
            >
              {node.normal_balance}
            </span>
          </div>
        </div>

        {hasChildren && (
          <div className="space-y-1">{node.children.map((child: any) => renderTreeNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              COA Structure
            </span>
            <span className="text-xs font-medium text-slate-400">Strict Normal Balances</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-slate-400">
            Hierarchical 5-Category accounting taxonomy: Assets, Liabilities, Equity, Revenue, and Expenses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-900/80 p-1 ring-1 ring-slate-800">
            <button
              onClick={() => setViewMode('tree')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'tree' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hierarchy Tree
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'flat' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Flat Register
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 transition"
          >
            <Plus className="h-4 w-4" />
            Add Account Head
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/60 text-slate-400 ring-1 ring-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/70 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Content View */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : viewMode === 'tree' ? (
        <div className="space-y-2">
          {hierarchy
            .filter((node) => selectedCategory === 'ALL' || node.account_type === selectedCategory)
            .map((node) => renderTreeNode(node, 0))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Account Code</th>
                <th className="px-6 py-4">Account Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Parent Account</th>
                <th className="px-6 py-4">Normal Balance</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No accounts found matching filter criteria
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-white">{acc.account_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{acc.account_name}</div>
                      {acc.description && <div className="text-xs text-slate-500">{acc.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${getCategoryColor(
                          acc.account_type
                        )}`}
                      >
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {acc.parent_account ? `${acc.parent_account.account_code} - ${acc.parent_account.account_name}` : 'None (Root)'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold">
                      <span className={acc.normal_balance === 'DEBIT' ? 'text-cyan-400' : 'text-orange-400'}>
                        {acc.normal_balance}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          acc.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {acc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create New Account Head</h3>
            <p className="mt-1 text-xs text-slate-400">
              Create an account in the club chart of accounts. Normal balances are automatically enforced.
            </p>

            {errorMsg && (
              <div className="mt-4 rounded-lg bg-rose-950/50 p-3 text-xs text-rose-300 border border-rose-800">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Account Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1140"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Category</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as AccountCategoryType)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ASSET">ASSET (Debit Normal)</option>
                    <option value="LIABILITY">LIABILITY (Credit Normal)</option>
                    <option value="EQUITY">EQUITY (Credit Normal)</option>
                    <option value="REVENUE">REVENUE (Credit Normal)</option>
                    <option value="EXPENSE">EXPENSE (Debit Normal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petty Cash Dhaka Campus"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Parent Account (Optional)</label>
                <select
                  value={formParent}
                  onChange={(e) => setFormParent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">No Parent (Root Category)</option>
                  {accounts
                    .filter((a) => a.account_type === formType)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_code} - {a.account_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Operational purpose of this ledger account..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
