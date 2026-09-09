'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { governanceService } from '../../../services/governance.service';
import { ClubTask, TaskPriority, TaskStatus } from '../../../types/governance';
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  User,
  AlertCircle,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Layers,
  MessageSquare,
  Scale,
  Trash2,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export default function TasksPage() {
  const { hasPermission } = useAuth();
  const [tasks, setTasks] = useState<ClubTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'HIGH' as TaskPriority,
    due_date: new Date().toISOString().split('T')[0],
  });

  // Task Safe Deletion / Cancellation Modal (Sections 14 & 15)
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [selectedTaskForDelete, setSelectedTaskForDelete] = useState<ClubTask | null>(null);
  const [taskDeleteAction, setTaskDeleteAction] = useState<'CANCEL' | 'HARD_DELETE'>('CANCEL');
  const [taskDeleteReason, setTaskDeleteReason] = useState('');
  const [taskDeleteSubmitting, setTaskDeleteSubmitting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await governanceService.getTasks({
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [priorityFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const created = await governanceService.createTask(newTask);
      setMessage({ type: 'success', text: `Task "${created.title}" created successfully!` });
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'HIGH',
        due_date: new Date().toISOString().split('T')[0],
      });
      loadTasks();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create task' });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (id: string, status: TaskStatus) => {
    try {
      await governanceService.updateTask(id, { status });
      loadTasks();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleExecuteDeleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForDelete) return;

    setTaskDeleteSubmitting(true);
    try {
      const res = await governanceService.deleteTask(
        selectedTaskForDelete.id,
        taskDeleteAction,
        taskDeleteReason || undefined
      );

      setMessage({
        type: 'success',
        text: res.message || `Task processed successfully (${taskDeleteAction}).`,
      });
      setShowDeleteTaskModal(false);

      // Immediate state update (no window.location.reload)
      if (taskDeleteAction === 'HARD_DELETE') {
        setTasks((prev) => prev.filter((t) => t.id !== selectedTaskForDelete.id));
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === selectedTaskForDelete.id
              ? { ...t, status: 'CANCELLED' as TaskStatus }
              : t
          )
        );
      }
      setSelectedTaskForDelete(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove task.' });
    } finally {
      setTaskDeleteSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">LOW</span>;
      default:
        return null;
    }
  };

  const columns: { label: string; status: TaskStatus; color: string }[] = [
    { label: 'To Do', status: 'TODO', color: 'border-slate-700' },
    { label: 'In Progress', status: 'IN_PROGRESS', color: 'border-blue-500/40' },
    { label: 'Under Review', status: 'UNDER_REVIEW', color: 'border-amber-500/40' },
    { label: 'Completed', status: 'COMPLETED', color: 'border-emerald-500/40' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <CheckSquare className="w-4 h-4" />
            Operational Execution
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Action Items & Task Board
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Kanban workflow, decision-linked action items, accountability assignments, and officer collaboration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTasks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {hasPermission('tasks.create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and View Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Priority Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((pr) => (
            <button
              key={pr}
              onClick={() => setPriorityFilter(pr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                priorityFilter === pr
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {pr}
            </button>
          ))}
        </div>

        {/* Board / List Toggle */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              viewMode === 'board' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{col.label}</span>
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 border border-slate-700">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {loading ? (
                    <div className="py-8 text-center text-slate-500 text-xs">Loading...</div>
                  ) : !colTasks.length ? (
                    <div className="py-12 text-center text-slate-600 text-xs italic">No tasks</div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3.5 transition space-y-2 group shadow"
                      >
                        <div className="flex items-center justify-between gap-1">
                          {getPriorityBadge(t.priority)}
                          {hasPermission('tasks.update') ? (
                            <select
                              value={t.status}
                              onChange={(e) => handleQuickStatusChange(t.id, e.target.value as TaskStatus)}
                              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-400 focus:outline-none"
                            >
                              <option value="TODO">TODO</option>
                              <option value="IN_PROGRESS">IN PROG</option>
                              <option value="UNDER_REVIEW">REVIEW</option>
                              <option value="COMPLETED">DONE</option>
                            </select>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                              {t.status}
                            </span>
                          )}
                        </div>

                        <Link href={`/tasks/${t.id}`} className="block">
                          <h4 className="font-semibold text-white text-xs group-hover:text-purple-300 transition line-clamp-2">
                            {t.title}
                          </h4>
                        </Link>

                        {t.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-700/40">
                          <span>{t.assignee?.full_name || 'Unassigned'}</span>
                          <div className="flex items-center gap-2">
                            {t.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {t.due_date}
                              </span>
                            )}
                            {hasPermission('tasks.delete') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskForDelete(t);
                                  setTaskDeleteAction('CANCEL');
                                  setTaskDeleteReason('');
                                  setShowDeleteTaskModal(true);
                                }}
                                className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition"
                                title="Cancel / Delete Task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-semibold">Task Title</th>
                  <th className="py-3.5 px-4 font-semibold">Priority</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Assignee</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <Link href={`/tasks/${t.id}`} className="font-semibold text-white hover:text-purple-300">
                        {t.title}
                      </Link>
                      {t.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getPriorityBadge(t.priority)}</td>
                    <td className="py-3.5 px-4">
                      {hasPermission('tasks.update') ? (
                        <select
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t.id, e.target.value as TaskStatus)}
                          className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 focus:outline-none"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">
                          {t.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {t.assignee?.full_name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">{t.due_date || '-'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/tasks/${t.id}`}
                          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                        >
                          <span>Details</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                        {hasPermission('tasks.delete') && (
                          <button
                            onClick={() => {
                              setSelectedTaskForDelete(t);
                              setTaskDeleteAction('CANCEL');
                              setTaskDeleteReason('');
                              setShowDeleteTaskModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="Cancel / Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Task */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Action Item / Task</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a new actionable deliverable for club executives and teams.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Treasury Reserve Bank Statements"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Scope & Details</label>
                <textarea
                  rows={3}
                  placeholder="Specific requirements, deliverables, and guidance..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Safe Task Deletion / Cancellation (Sections 14 & 15) */}
      {showDeleteTaskModal && selectedTaskForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Task Resolution & Cancellation</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">{selectedTaskForDelete.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteTaskModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteDeleteTask} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Select Resolution:</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${taskDeleteAction === 'CANCEL' ? 'bg-purple-500/10 border-purple-500/40 text-white' : 'bg-slate-800/40 border-slate-800 text-slate-300'}`}>
                    <input
                      type="radio"
                      name="taskDeleteAction"
                      value="CANCEL"
                      checked={taskDeleteAction === 'CANCEL'}
                      onChange={() => setTaskDeleteAction('CANCEL')}
                      className="mt-1"
                    />
                    <div className="text-xs">
                      <span className="font-bold block">Cancel Task (Recommended)</span>
                      <span className="text-slate-400">Marks task as CANCELLED. Keeps assignment history and discussion comments intact for club records.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${taskDeleteAction === 'HARD_DELETE' ? 'bg-rose-500/10 border-rose-500/40 text-white' : 'bg-slate-800/40 border-slate-800 text-slate-300'}`}>
                    <input
                      type="radio"
                      name="taskDeleteAction"
                      value="HARD_DELETE"
                      checked={taskDeleteAction === 'HARD_DELETE'}
                      onChange={() => setTaskDeleteAction('HARD_DELETE')}
                      className="mt-1"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-rose-400 block">Permanent Hard Delete</span>
                      <span className="text-slate-400">Permanently removes task deliverable and associated comments.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Scope revised, duplicate deliverable, or obsolete requirement"
                  value={taskDeleteReason}
                  onChange={(e) => setTaskDeleteReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeleteTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskDeleteSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 ${
                    taskDeleteAction === 'HARD_DELETE'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {taskDeleteSubmitting
                    ? 'Processing...'
                    : taskDeleteAction === 'HARD_DELETE'
                    ? 'Confirm Delete'
                    : 'Cancel Task Safely'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
