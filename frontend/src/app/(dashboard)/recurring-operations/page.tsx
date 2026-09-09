'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { automationService } from '../../../services/automation.service';
import { api } from '../../../lib/api';
import {
  RecurringTransaction,
  RecurringTask,
  RecurringFrequency,
  RecurringTransactionStatus,
  RecurringTaskStatus,
} from '../../../types/automation';
import {
  Repeat,
  DollarSign,
  CheckSquare,
  Plus,
  Play,
  Pause,
  Clock,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export default function RecurringOperationsPage() {
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'TASKS'>('TRANSACTIONS');
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txFormData, setTxFormData] = useState({
    name: '',
    transaction_type: 'EXPENSE',
    amount: '',
    frequency: 'MONTHLY' as RecurringFrequency,
    source_account_id: '',
    category_id: '',
    start_date: new Date().toISOString().split('T')[0],
    description: '',
    auto_submit_for_approval: true,
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    frequency: 'WEEKLY' as RecurringFrequency,
    assignee_id: '',
    due_date_days_offset: 7,
    start_date: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [txList, taskList, accList, expCatList, userList] = await Promise.all([
        automationService.getRecurringTransactions(),
        automationService.getRecurringTasks(),
        api.get<any>('/accounts?status=ACTIVE').then((r) => r.data || []),
        api.get<any>('/expense-categories?limit=50').then((r) => r.data || []),
        api.get<any>('/users?limit=50').then((r) => r.data?.users || []),
      ]);
      setTransactions(txList);
      setTasks(taskList);
      setAccounts(accList);
      setCategories(expCatList);
      setUsers(userList);
      if (accList.length > 0 && !txFormData.source_account_id) {
        setTxFormData((prev) => ({ ...prev, source_account_id: accList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load recurring operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTxStatus = async (tx: RecurringTransaction) => {
    const nextStatus: RecurringTransactionStatus = tx.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await automationService.setRecurringTransactionStatus(tx.id, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleToggleTaskStatus = async (t: RecurringTask) => {
    const nextStatus: RecurringTaskStatus = t.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await automationService.setRecurringTaskStatus(t.id, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleProcessDueTx = async () => {
    setProcessing(true);
    try {
      const res = await automationService.processDueRecurringTransactions();
      alert(`Successfully processed ${res.generated} recurring transactions into pending status.`);
      await loadData();
    } catch (err: any) {
      alert(`Processing error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessDueTasks = async () => {
    setProcessing(true);
    try {
      const res = await automationService.processDueRecurringTasks();
      alert(`Successfully generated ${res.generated} club tasks.`);
      await loadData();
    } catch (err: any) {
      alert(`Processing error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await automationService.createRecurringTransaction({
        name: txFormData.name,
        transaction_type: txFormData.transaction_type as any,
        amount: Number(txFormData.amount),
        frequency: txFormData.frequency,
        source_account_id: txFormData.source_account_id,
        category_id: txFormData.category_id || undefined,
        start_date: txFormData.start_date,
        next_execution_date: txFormData.start_date,
        description: txFormData.description,
        auto_submit_for_approval: txFormData.auto_submit_for_approval,
      });
      setIsTxModalOpen(false);
      setTxFormData({
        name: '',
        transaction_type: 'EXPENSE',
        amount: '',
        frequency: 'MONTHLY',
        source_account_id: accounts[0]?.id || '',
        category_id: '',
        start_date: new Date().toISOString().split('T')[0],
        description: '',
        auto_submit_for_approval: true,
      });
      await loadData();
    } catch (err: any) {
      alert(`Creation failed: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await automationService.createRecurringTask({
        title: taskFormData.title,
        description: taskFormData.description,
        priority: taskFormData.priority as any,
        frequency: taskFormData.frequency,
        assignee_id: taskFormData.assignee_id || undefined,
        due_date_days_offset: Number(taskFormData.due_date_days_offset),
        start_date: taskFormData.start_date,
        next_execution_date: taskFormData.start_date,
      });
      setIsTaskModalOpen(false);
      setTaskFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        frequency: 'WEEKLY',
        assignee_id: '',
        due_date_days_offset: 7,
        start_date: new Date().toISOString().split('T')[0],
      });
      await loadData();
    } catch (err: any) {
      alert(`Task creation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/automation"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Repeat className="w-6 h-6 text-indigo-400" />
              Recurring Operations
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1 ml-8">
            Scheduled operational routines and strictly governed recurring financial records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'TRANSACTIONS' ? (
            <>
              <button
                onClick={handleProcessDueTx}
                disabled={processing}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Process Due Now
              </button>
              <button
                onClick={() => setIsTxModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-900/30 transition"
              >
                <Plus className="w-4 h-4" />
                New Recurring Transaction
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleProcessDueTasks}
                disabled={processing}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                <Play className="w-3.5 h-3.5 text-purple-400" />
                Generate Due Tasks Now
              </button>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/30 transition"
              >
                <Plus className="w-4 h-4" />
                New Recurring Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'TRANSACTIONS'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4 text-indigo-400" />
          Recurring Transactions ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('TASKS')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'TASKS'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-purple-400" />
          Recurring Tasks ({tasks.length})
        </button>
      </div>

      {/* Safety Notice for Financial Transactions */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">Financial Integrity Gate:</span> Recurring transactions are generated strictly in <span className="text-amber-400 font-mono">PENDING_APPROVAL</span> status with automated approval tickets. They will never post to double-entry general ledgers or debit bank balances without human authorization.
          </div>
        </div>
      )}

      {/* Content View: Transactions */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Template Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Frequency</th>
                  <th className="py-3.5 px-4">Account</th>
                  <th className="py-3.5 px-4">Next Run Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{tx.name}</div>
                      {tx.description && (
                        <div className="text-[11px] text-slate-500 font-normal">{tx.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded font-mono text-[10px]">
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      BDT {Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-purple-300">{tx.frequency}</td>
                    <td className="py-3.5 px-4 text-slate-400">{tx.source_account_name || 'Primary Vault'}</td>
                    <td className="py-3.5 px-4 font-mono text-amber-300">{tx.next_execution_date}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleTxStatus(tx)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium transition"
                      >
                        {tx.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-500">
                      No recurring financial transactions configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content View: Tasks */}
      {activeTab === 'TASKS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Task Title</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Frequency</th>
                  <th className="py-3.5 px-4">Due Offset</th>
                  <th className="py-3.5 px-4">Assignee</th>
                  <th className="py-3.5 px-4">Next Run Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{task.title}</div>
                      {task.description && (
                        <div className="text-[11px] text-slate-500 font-normal">{task.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          task.priority === 'HIGH' || task.priority === 'URGENT'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-purple-300">{task.frequency}</td>
                    <td className="py-3.5 px-4 text-slate-400">+{task.due_date_days_offset} days</td>
                    <td className="py-3.5 px-4 text-slate-300">{task.assignee_name || 'Unassigned'}</td>
                    <td className="py-3.5 px-4 font-mono text-amber-300">{task.next_execution_date}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          task.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium transition"
                      >
                        {task.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                      </button>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-500">
                      No recurring operational tasks configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Recurring Transaction Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <DollarSign className="w-5 h-5 text-indigo-400" />
              New Recurring Financial Transaction
            </h2>
            <form onSubmit={handleCreateTx} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Web Hosting & Domain Bill"
                  value={txFormData.name}
                  onChange={(e) => setTxFormData({ ...txFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Transaction Type</label>
                  <select
                    value={txFormData.transaction_type}
                    onChange={(e) => setTxFormData({ ...txFormData, transaction_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="EXPENSE">EXPENSE</option>
                    <option value="INCOME">INCOME</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Amount (BDT) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="2500"
                    value={txFormData.amount}
                    onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Frequency</label>
                  <select
                    value={txFormData.frequency}
                    onChange={(e) => setTxFormData({ ...txFormData, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Source Account *</label>
                  <select
                    value={txFormData.source_account_id}
                    onChange={(e) => setTxFormData({ ...txFormData, source_account_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} ({a.account_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Start Date</label>
                <input
                  type="date"
                  value={txFormData.start_date}
                  onChange={(e) => setTxFormData({ ...txFormData, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Recurring Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckSquare className="w-5 h-5 text-purple-400" />
              New Recurring Operational Task
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Physical Cash Audit"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Priority</label>
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Frequency</label>
                  <select
                    value={taskFormData.frequency}
                    onChange={(e) => setTaskFormData({ ...taskFormData, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Assignee</label>
                  <select
                    value={taskFormData.assignee_id}
                    onChange={(e) => setTaskFormData({ ...taskFormData, assignee_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">-- Unassigned --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Due Date Days Offset</label>
                  <input
                    type="number"
                    min="1"
                    value={taskFormData.due_date_days_offset}
                    onChange={(e) => setTaskFormData({ ...taskFormData, due_date_days_offset: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
