'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ArrowLeft,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Send,
  Lock,
  Unlock,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  PieChart,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { eventsService } from '../../../../services/events.service';
import { api } from '../../../../lib/api';
import {
  Event,
  EventMember,
  EventBudget,
  EventFinancialSummary,
  EventStatus,
  EventRole,
  Income,
  Expense,
  ExpenseCategory,
} from '../../../../types/financial';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { useAuth } from '../../../../hooks/useAuth';

export default function EventDetailPage() {
  const { hasPermission } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  // Delete event modal state
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deleteEventError, setDeleteEventError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'team' | 'budget' | 'incomes' | 'expenses' | 'financial' | 'report'
  >((searchParams.get('tab') as any) || 'overview');

  // Core Event State
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab Data States
  const [members, setMembers] = useState<EventMember[]>([]);
  const [budget, setBudget] = useState<EventBudget | null>(null);
  const [financialSummary, setFinancialSummary] = useState<EventFinancialSummary | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetVsActual, setBudgetVsActual] = useState<any[]>([]);

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [nextStatus, setNextStatus] = useState<EventStatus>('PLANNED');

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<EventRole>('TEAM_MEMBER');
  const [memberResponsibility, setMemberResponsibility] = useState('');

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    title: 'Official Event Budget',
    proposed_amount: '',
    items: [
      { expense_category_id: '', title: '', allocated_amount: '', description: '' },
    ],
  });

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

  // Data Loading
  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await eventsService.getEventById(eventId);
      if (res.success && res.data) {
        setEvent(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      if (activeTab === 'team') {
        const res = await eventsService.getMembers(eventId);
        if (res.success) setMembers(res.data);
      } else if (activeTab === 'budget') {
        const res = await eventsService.getBudget(eventId);
        if (res.success) setBudget(res.data);
      } else if (activeTab === 'financial') {
        const res = await eventsService.getFinancialSummary(eventId);
        if (res.success) setFinancialSummary(res.data);
      } else if (activeTab === 'incomes') {
        const res: any = await api.get(`/income?event_id=${eventId}&limit=50`);
        if (res.success) setIncomes(res.data || []);
      } else if (activeTab === 'expenses') {
        const res: any = await api.get(`/expenses?event_id=${eventId}&limit=50`);
        if (res.success) setExpenses(res.data || []);
      } else if (activeTab === 'report') {
        const [sumRes, bvaRes] = await Promise.all([
          eventsService.getFinancialSummary(eventId),
          eventsService.getBudgetVsActual(eventId),
        ]);
        if (sumRes.success) setFinancialSummary(sumRes.data);
        if (bvaRes.success) setBudgetVsActual(bvaRes.data?.categories || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (event) {
      loadTabData();
    }
  }, [activeTab, event]);

  // Load auxiliary data for modals
  useEffect(() => {
    api.get<any>('/users?limit=100').then((res) => {
      if (res.success && res.data) setAllUsers(res.data);
    }).catch(() => {});

    api.get<any>('/expense-categories').then((res) => {
      if (res.success && res.data) setExpenseCategories(res.data);
    }).catch(() => {});
  }, []);

  // Status transitions
  const handleUpdateStatus = async (status: EventStatus) => {
    try {
      setActionLoading(true);
      await eventsService.updateStatus(eventId, status);
      await loadEvent();
      setShowStatusModal(false);
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseEvent = async () => {
    try {
      setActionLoading(true);
      await eventsService.closeEvent(eventId);
      await loadEvent();
      setShowCloseModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to close event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenEvent = async () => {
    if (!reopenReason.trim()) {
      alert('Please provide a mandatory reason for audit logging when reopening an event');
      return;
    }
    try {
      setActionLoading(true);
      await eventsService.reopenEvent(eventId, reopenReason.trim());
      await loadEvent();
      setShowReopenModal(false);
      setReopenReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to reopen event');
    } finally {
      setActionLoading(false);
    }
  };

  // Team Actions
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUserId) return;
    try {
      setActionLoading(true);
      await eventsService.addMember(eventId, {
        user_id: memberUserId,
        role: memberRole,
        responsibility: memberResponsibility.trim() || undefined,
      });
      setShowAddMemberModal(false);
      setMemberUserId('');
      setMemberResponsibility('');
      loadTabData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign committee member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the event committee?')) return;
    try {
      await eventsService.removeMember(eventId, memberId);
      loadTabData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleDeleteEvent = async () => {
    try {
      setIsDeletingEvent(true);
      setDeleteEventError(null);
      await eventsService.deleteEvent(eventId);
      router.push('/events');
    } catch (err: any) {
      setDeleteEventError(err?.response?.data?.message || err?.message || 'Failed to delete event');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  // Budget Actions
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const proposed = Number(budgetForm.proposed_amount || 0);
    if (proposed <= 0) {
      alert('Proposed budget must be greater than zero');
      return;
    }

    const validItems = budgetForm.items
      .filter((it) => it.expense_category_id && it.allocated_amount)
      .map((it) => ({
        expense_category_id: it.expense_category_id,
        title: it.title || 'Budget Item',
        description: it.description || undefined,
        allocated_amount: Number(it.allocated_amount),
      }));

    try {
      setActionLoading(true);
      if (budget?.id) {
        await eventsService.updateBudget(budget.id, {
          title: budgetForm.title,
          proposed_amount: proposed,
          items: validItems,
        });
      } else {
        await eventsService.createBudget(eventId, {
          title: budgetForm.title,
          proposed_amount: proposed,
          items: validItems,
        });
      }
      setShowBudgetModal(false);
      loadTabData();
    } catch (err: any) {
      alert(err.message || 'Failed to save budget');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitBudget = async () => {
    if (!budget?.id) return;
    if (!confirm('Submit this budget proposal for executive multi-tier approval (Treasurer -> President)?')) return;
    try {
      setActionLoading(true);
      await eventsService.submitBudget(budget.id);
      loadTabData();
      alert('Budget submitted for approval successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit budget');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      maximumFractionDigits: 0,
    }).format(amt).replace('BDT', '৳');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
        <p className="text-slate-400 text-sm mt-4">Loading event command centre...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center max-w-xl mx-auto space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Event Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'The requested event could not be found or has been deleted.'}</p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
        {/* Navigation & Code */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Events
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
              {event.event_code}
            </span>
            <StatusBadge status={event.status} />
          </div>
        </div>

        {/* Title & Meta Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {event.event_type.replace(/_/g, ' ')}
              </span>
              {event.venue && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  {event.venue}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                {formatDate(event.start_date)} - {formatDate(event.end_date)}
              </span>
              {event.expected_participants && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  {event.expected_participants} Expected Attendees
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                Proposed: {formatCurrency(Number(event.proposed_budget || 0))}
              </span>
            </div>
          </div>

          {/* Quick Lifecycle Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {event.status === 'DRAFT' && (
              <button
                onClick={() => handleUpdateStatus('PLANNED')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition"
              >
                Mark as Planned
              </button>
            )}

            {event.status === 'APPROVED' && (
              <button
                onClick={() => handleUpdateStatus('ONGOING')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition"
              >
                Launch (Ongoing)
              </button>
            )}

            {event.status === 'ONGOING' && (
              <button
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
              >
                Complete Event
              </button>
            )}

            {event.status === 'COMPLETED' && (
              <button
                onClick={() => handleUpdateStatus('FINANCIAL_REVIEW')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition"
              >
                Start Financial Review
              </button>
            )}

            {event.status === 'FINANCIAL_REVIEW' && (
              <button
                onClick={() => setShowCloseModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition"
              >
                <Lock className="h-3.5 w-3.5" />
                Close Event
              </button>
            )}

            {event.status === 'CLOSED' && (
              <button
                onClick={() => setShowReopenModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition"
              >
                <Unlock className="h-3.5 w-3.5" />
                Reopen Event
              </button>
            )}

            <Link
              href={`/events/${event.id}/edit`}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
              title="Edit Event Information"
            >
              <Edit3 className="h-4 w-4" />
            </Link>

            {hasPermission('events.delete') && (
              <button
                onClick={() => {
                  setDeleteEventError(null);
                  setShowDeleteEventModal(true);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition"
                title="Delete Event"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto scrollbar-none gap-1 border-t border-slate-800/80 pt-3">
          {[
            { id: 'overview', label: 'Overview', icon: Sparkles },
            { id: 'team', label: 'Committee & Team', icon: Users },
            { id: 'budget', label: 'Budget Plan', icon: Layers },
            { id: 'incomes', label: 'Incomes & Sponsorships', icon: ArrowDownLeft },
            { id: 'expenses', label: 'Expenses & Payments', icon: ArrowUpRight },
            { id: 'financial', label: 'Financial Health', icon: PieChart },
            { id: 'report', label: 'Variance Report', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/40 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Event Description
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {event.description || 'No detailed narrative description provided for this event.'}
              </p>

              <div className="border-t border-slate-800 pt-4 mt-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Lifecycle Progress
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className={event.status === 'DRAFT' ? 'text-emerald-400 font-bold' : ''}>1. Draft</span>
                  <span>→</span>
                  <span className={event.status === 'PLANNED' ? 'text-emerald-400 font-bold' : ''}>2. Planned</span>
                  <span>→</span>
                  <span className={['APPROVED', 'ONGOING'].includes(event.status) ? 'text-emerald-400 font-bold' : ''}>
                    3. Approved / Active
                  </span>
                  <span>→</span>
                  <span className={event.status === 'COMPLETED' ? 'text-emerald-400 font-bold' : ''}>4. Completed</span>
                  <span>→</span>
                  <span className={event.status === 'FINANCIAL_REVIEW' ? 'text-emerald-400 font-bold' : ''}>5. Review</span>
                  <span>→</span>
                  <span className={event.status === 'CLOSED' ? 'text-rose-400 font-bold' : ''}>6. Closed</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Quick Snapshot
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                  <span className="text-slate-400">Event Code</span>
                  <span className="font-mono font-medium text-slate-200">{event.event_code}</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                  <span className="text-slate-400">Lifecycle Status</span>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                  <span className="text-slate-400">Proposed Budget</span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(Number(event.proposed_budget || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                  <span className="text-slate-400">Created At</span>
                  <span className="text-slate-300">{formatDate(event.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Committee & Team */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Event Organizing Committee</h2>
              <p className="text-xs text-slate-400">Assigned club members with operational responsibilities</p>
            </div>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign Member
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {members.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No committee members assigned yet. Click "Assign Member" to build the team.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Member Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Event Role</th>
                      <th className="px-5 py-3">Responsibility</th>
                      <th className="px-5 py-3">Assigned Date</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 font-medium text-white">{m.user_name || 'Member'}</td>
                        <td className="px-5 py-3.5 text-slate-400">{m.user_email || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {(m.role || m.event_role).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">{m.responsibilities || m.responsibility || 'General Duties'}</td>
                        <td className="px-5 py-3.5 text-slate-400">{formatDate(m.assigned_at)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Remove Member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Budget Plan */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Event Budget & Allocations</h2>
              <p className="text-xs text-slate-400">Formal financial envelope and category-wise spending targets</p>
            </div>

            <div className="flex items-center gap-2">
              {budget && ['DRAFT', 'CHANGES_REQUESTED'].includes(budget.status) && (
                <button
                  onClick={handleSubmitBudget}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 text-xs font-semibold shadow-lg shadow-emerald-950/40 transition hover:scale-[1.02]"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit for Approval
                </button>
              )}
              {(!budget || ['DRAFT', 'CHANGES_REQUESTED'].includes(budget.status)) && (
                <button
                  onClick={() => {
                    if (budget) {
                      setBudgetForm({
                        title: budget.title,
                        proposed_amount: budget.proposed_amount.toString(),
                        items: (budget.items || []).map((it) => ({
                          expense_category_id: it.expense_category_id,
                          title: it.title,
                          allocated_amount: it.allocated_amount.toString(),
                          description: it.description || '',
                        })),
                      });
                    }
                    setShowBudgetModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                >
                  {budget ? <Edit3 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {budget ? 'Edit Budget' : 'Create Budget Proposal'}
                </button>
              )}
            </div>
          </div>

          {/* Budget Overview Cards */}
          {budget && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Budget Code</span>
                <span className="font-mono text-sm font-bold text-white mt-1 block">{budget.budget_number}</span>
                <div className="mt-2">
                  <StatusBadge status={budget.status} />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Proposed Amount</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {formatCurrency(Number(budget.proposed_amount || 0))}
                </span>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Approved Amount</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">
                  {formatCurrency(Number(budget.approved_amount || 0))}
                </span>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Actual Spent (Paid)</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">
                  {formatCurrency(Number(budget.spent_amount || 0))}
                </span>
              </div>
            </div>
          )}

          {/* Budget Items Table */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {!budget || !budget.items || budget.items.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No budget items recorded yet. Click "Create Budget Proposal" to allocate expense limits.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Item / Description</th>
                      <th className="px-5 py-3">Expense Category</th>
                      <th className="px-5 py-3 text-right">Allocated (Limit)</th>
                      <th className="px-5 py-3 text-right">Actual Spent</th>
                      <th className="px-5 py-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {budget.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-white block">{it.title}</span>
                          {it.description && <span className="text-slate-400 text-[11px]">{it.description}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">{it.category_name || 'General'}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-white">
                          {formatCurrency(Number(it.allocated_amount || 0))}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-rose-400">
                          {formatCurrency(Number(it.actual_spent || 0))}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-emerald-400">
                          {formatCurrency(Number(it.remaining_amount ?? (it.allocated_amount - (it.actual_spent || 0))))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Incomes */}
      {activeTab === 'incomes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Event Incomes & Sponsorships</h2>
              <p className="text-xs text-slate-400">All registered inflows, ticket sales, and title partner contributions</p>
            </div>
            <Link
              href={`/income`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Income
            </Link>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {incomes.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No incomes recorded specifically for this event yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Number</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Received From</th>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {incomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 font-mono text-emerald-400">{inc.income_number}</td>
                        <td className="px-5 py-3.5 text-slate-400">{formatDate(inc.transaction_date)}</td>
                        <td className="px-5 py-3.5 font-medium text-white">{inc.received_from}</td>
                        <td className="px-5 py-3.5 text-slate-300">{inc.account_name || 'Bank/Cash'}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-emerald-400">
                          {formatCurrency(Number(inc.amount || 0))}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <StatusBadge status={inc.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Event Expenses & Outflows</h2>
              <p className="text-xs text-slate-400">All registered disbursements, venue invoices, and production costs</p>
            </div>
            <Link
              href={`/expenses`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Expense
            </Link>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No expenses recorded specifically for this event yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Expense Number</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Paid To</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 font-mono text-rose-400">{exp.expense_number}</td>
                        <td className="px-5 py-3.5 text-slate-400">{formatDate(exp.expense_date)}</td>
                        <td className="px-5 py-3.5 font-medium text-white">{exp.paid_to}</td>
                        <td className="px-5 py-3.5 text-slate-300">{exp.category_name || 'General'}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-rose-400">
                          {formatCurrency(Number(exp.amount || 0))}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <StatusBadge status={exp.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Financial Health */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Event Financial Health</h2>
              <p className="text-xs text-slate-400">Calculated strictly from database financial transactions and approved ledger</p>
            </div>
            <button
              onClick={loadTabData}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              title="Recalculate summary"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {financialSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Approved Budget</span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {formatCurrency(financialSummary.approved_budget)}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Proposed: {formatCurrency(financialSummary.proposed_budget)}
                </span>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Inflow (Income)</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {formatCurrency(financialSummary.total_income || financialSummary.total_incomes || 0)}
                </span>
                <span className="text-[11px] text-emerald-500/80 mt-1 block">Sponsorships & tickets</span>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Outflow (Paid)</span>
                <span className="text-2xl font-bold text-rose-400 mt-1 block">
                  {formatCurrency(financialSummary.total_expenses)}
                </span>
                <span className="text-[11px] text-rose-500/80 mt-1 block">
                  Pending: {formatCurrency(financialSummary.pending_expenses)}
                </span>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Net Outcome (Surplus)</span>
                <span
                  className={`text-2xl font-bold mt-1 block ${
                    (financialSummary.net_financial_result || financialSummary.net_profit_loss || 0) >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(financialSummary.net_financial_result || financialSummary.net_profit_loss || 0)}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Remaining Budget: {formatCurrency(financialSummary.remaining_budget)}
                </span>
              </div>
            </div>
          )}

          {/* Budget Utilization Meter */}
          {financialSummary && (
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-white">Budget Utilization Rate</span>
                <span className="font-mono font-bold text-emerald-400">
                  {financialSummary.budget_utilization || financialSummary.budget_utilization_percentage || 0}% ({financialSummary.utilization_status})
                </span>
              </div>

              <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    financialSummary.utilization_status === 'EXCEEDED'
                      ? 'bg-rose-500'
                      : financialSummary.utilization_status === 'WARNING'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      financialSummary.budget_utilization || financialSummary.budget_utilization_percentage || 0
                    )}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500">
                <span>0% Safe</span>
                <span>80% Monitor</span>
                <span>90% Warning</span>
                <span>100%+ Exceeded</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Variance Report */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Event Variance Report</h2>
              <p className="text-xs text-slate-400">Comparison of allocated budget against actual expenditures</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {budgetVsActual.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No budget variance data available. Ensure a budget plan is established for this event.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-right">Allocated Budget</th>
                      <th className="px-5 py-3 text-right">Actual Spent</th>
                      <th className="px-5 py-3 text-right">Variance (৳)</th>
                      <th className="px-5 py-3 text-right">Variance (%)</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {budgetVsActual.map((item, idx) => {
                      const allocated = Number(item.allocated || 0);
                      const spent = Number(item.spent || 0);
                      const variance = allocated - spent;
                      const variancePct = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : '0';
                      const isOver = spent > allocated;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3.5 font-medium text-white">{item.category_name}</td>
                          <td className="px-5 py-3.5 text-right text-slate-300">{formatCurrency(allocated)}</td>
                          <td className="px-5 py-3.5 text-right font-medium text-rose-400">{formatCurrency(spent)}</td>
                          <td
                            className={`px-5 py-3.5 text-right font-semibold ${
                              isOver ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {formatCurrency(variance)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-300">{variancePct}%</td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isOver
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              }`}
                            >
                              {isOver ? 'Over Budget' : 'Within Budget'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Close Event */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-rose-400" />
              Close Event
            </h3>
            <p className="text-xs text-slate-300">
              Closing an event locks it against further modification, disallows new expenses, and marks its financial cycle as complete.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseEvent}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                {actionLoading ? 'Closing...' : 'Confirm Close Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reopen Event */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Unlock className="h-5 w-5 text-amber-400" />
              Reopen Event
            </h3>
            <p className="text-xs text-slate-300">
              Reopening moves the event back to FINANCIAL_REVIEW. A documented reason is mandatory for governance audit logs.
            </p>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Provide reason for reopening event (e.g. Audit reconciliation required)..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReopenEvent}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition"
              >
                {actionLoading ? 'Reopening...' : 'Confirm Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Assign Team Member */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Assign Committee Member
            </h3>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select User</label>
                <select
                  required
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose club member...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Event Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="EVENT_DIRECTOR">Event Director</option>
                  <option value="EVENT_COORDINATOR">Event Coordinator</option>
                  <option value="FINANCE_COORDINATOR">Finance Coordinator</option>
                  <option value="MARKETING_LEAD">Marketing Lead</option>
                  <option value="LOGISTICS_LEAD">Logistics Lead</option>
                  <option value="VOLUNTEER">Volunteer</option>
                  <option value="TEAM_MEMBER">Team Member</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Responsibilities</label>
                <input
                  type="text"
                  value={memberResponsibility}
                  onChange={(e) => setMemberResponsibility(e.target.value)}
                  placeholder="e.g. Stage equipment and microphone management"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  {actionLoading ? 'Assigning...' : 'Assign Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Budget Proposal Editor */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-400" />
              {budget ? 'Edit Budget Proposal' : 'Create Budget Proposal'}
            </h3>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Budget Title</label>
                  <input
                    type="text"
                    required
                    value={budgetForm.title}
                    onChange={(e) => setBudgetForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Proposed Total Budget (BDT)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={budgetForm.proposed_amount}
                    onChange={(e) => setBudgetForm((p) => ({ ...p, proposed_amount: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Category Allocations
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setBudgetForm((p) => ({
                        ...p,
                        items: [
                          ...p.items,
                          { expense_category_id: '', title: '', allocated_amount: '', description: '' },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                {budgetForm.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <select
                      required
                      value={it.expense_category_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBudgetForm((p) => {
                          const copy = [...p.items];
                          copy[idx].expense_category_id = val;
                          return { ...p, items: copy };
                        });
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                    >
                      <option value="">Category...</option>
                      {expenseCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Item Title (e.g. Venue sound)"
                      value={it.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBudgetForm((p) => {
                          const copy = [...p.items];
                          copy[idx].title = val;
                          return { ...p, items: copy };
                        });
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Limit ৳"
                        required
                        min="1"
                        value={it.allocated_amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBudgetForm((p) => {
                            const copy = [...p.items];
                            copy[idx].allocated_amount = val;
                            return { ...p, items: copy };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                      />
                      {budgetForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBudgetForm((p) => ({
                              ...p,
                              items: p.items.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  {actionLoading ? 'Saving...' : 'Save Budget Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {showDeleteEventModal && event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="font-bold text-white text-base">Delete Club Event</h3>
              </div>
              <button
                onClick={() => !isDeletingEvent && setShowDeleteEventModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                X
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete event{' '}
              <span className="font-semibold text-white font-mono">
                {event.event_code}
              </span>{' '}
              (<span className="font-semibold text-white">{event.title}</span>)?
            </p>
            <p className="text-xs text-rose-400/90 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              ⚠️ This action will remove the event, its associated budget line items, and member rosters. This cannot be undone.
            </p>

            {deleteEventError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl">
                {deleteEventError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteEventModal(false)}
                disabled={isDeletingEvent}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700/60 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={isDeletingEvent}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                {isDeletingEvent ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
