'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { governanceService } from '../../../../services/governance.service';
import { ClubTask, TaskComment, TaskStatus, TaskPriority } from '../../../../types/governance';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Scale,
  RefreshCw,
} from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [task, setTask] = useState<ClubTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTask = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await governanceService.getTaskById(id);
      setTask(data);
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [id]);

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      await governanceService.updateTask(id, { status });
      setMessage({ type: 'success', text: `Task status updated to ${status}!` });
      loadTask();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    setMessage(null);
    try {
      await governanceService.addTaskComment(id, newComment.trim());
      setNewComment('');
      setMessage({ type: 'success', text: 'Comment added to task discussion!' });
      loadTask();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to post comment' });
    } finally {
      setPostingComment(false);
    }
  };

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">URGENT</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-300">LOW</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading task dossier...</div>;
  }

  if (!task) {
    return (
      <div className="py-20 text-center text-slate-500">
        Task not found.{' '}
        <Link href="/tasks" className="text-purple-400 hover:underline">
          Return to Tasks Board
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tasks Board
      </Link>

      {/* Main Task Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getPriorityBadge(task.priority)}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {task.status}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{task.title}</h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
              {task.description || 'No detailed description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Update Status
              </label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-purple-500"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task Attributes Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Assignee</span>
            <span className="font-medium text-white truncate block mt-0.5">
              {task.assignee?.full_name || 'Unassigned'}
            </span>
          </div>

          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Due Date</span>
            <span className="font-medium text-purple-400 truncate block mt-0.5">
              {task.due_date || 'No deadline'}
            </span>
          </div>

          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Created By</span>
            <span className="font-medium text-white truncate block mt-0.5">
              {task.creator?.full_name || 'Officer'}
            </span>
          </div>

          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Created At</span>
            <span className="font-medium text-white truncate block mt-0.5">
              {new Date(task.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Linked References */}
        {task.decision && (
          <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs">
            <Scale className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-purple-300">
              Linked Resolution: <strong>{task.decision.title}</strong>
            </span>
          </div>
        )}
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

      {/* Discussion & Activity Thread */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            Officer Updates & Discussion ({task.comments?.length || 0})
          </div>
          <span className="text-xs text-slate-500">Collaborative Activity</span>
        </div>

        {/* Comments List */}
        <div className="space-y-3">
          {!task.comments?.length ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              No updates or notes posted on this task yet.
            </div>
          ) : (
            task.comments.map((c) => (
              <div
                key={c.id}
                className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-300">
                    {c.author?.full_name || 'Executive Officer'}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{c.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* Post Comment Box */}
        <form onSubmit={handlePostComment} className="space-y-3 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Post Progress Update / Note</label>
            <textarea
              rows={3}
              required
              placeholder="Provide a progress report, blocker notice, or execution update..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={postingComment || !newComment.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {postingComment ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
