'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Users,
  MapPin,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { eventsService } from '../../../services/events.service';
import { Event, EventStatus, EventType } from '../../../types/financial';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';

export default function EventsListPage() {
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await eventsService.getEvents({
        search: search || undefined,
        event_type: selectedType || undefined,
        status: selectedStatus || undefined,
        page,
        limit: 12,
      });

      if (res.success) {
        setEvents(res.data);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, selectedType, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await eventsService.deleteEvent(eventToDelete.id);
      setEventToDelete(null);
      await fetchEvents();
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || err?.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics computation from loaded events
  const ongoingCount = events.filter((e) => e.status === 'ONGOING').length;
  const plannedCount = events.filter((e) => ['PLANNED', 'APPROVED'].includes(e.status)).length;
  const totalBudget = events.reduce((sum, e) => sum + Number(e.proposed_budget || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      maximumFractionDigits: 0,
    }).format(amount).replace('BDT', '৳');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Events & Programs
            </span>
            <span className="text-xs text-slate-400">• Club Lifecycle</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-emerald-400" />
            Event Management
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Plan, organize, allocate budgets, and trace complete financial lifecycles of summits, workshops, and club conferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEvents()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
            title="Refresh events list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {hasPermission('events.create') && (
            <Link
              href="/events/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Create Event
            </Link>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Events</span>
            <span className="p-2 bg-slate-800 rounded-xl text-emerald-400">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalCount}</div>
          <p className="text-xs text-slate-400 mt-1">Across all categories & years</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ongoing & Planned</span>
            <span className="p-2 bg-slate-800 rounded-xl text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-300 mt-2">
            {ongoingCount} <span className="text-sm font-normal text-slate-400">Active / {plannedCount} Planned</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Currently in operational lifecycle</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Budgets</span>
            <span className="p-2 bg-slate-800 rounded-xl text-teal-400">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-teal-300 mt-2">{formatCurrency(totalBudget)}</div>
          <p className="text-xs text-slate-400 mt-1">Proposed across listed events</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Governance</span>
            <span className="p-2 bg-slate-800 rounded-xl text-purple-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-2">Multi-Tier</div>
          <p className="text-xs text-slate-400 mt-1">Treasurer + President review gate</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row gap-3 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search events, venue, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Event Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500/60 transition"
          >
            <option value="">All Event Types</option>
            <option value="INVESTMENT_SUMMIT">Investment Summit</option>
            <option value="WORKSHOP">Workshop</option>
            <option value="NETWORKING">Networking</option>
            <option value="ANNUAL_CONFERENCE">Annual Conference</option>
            <option value="STOCK_PITCH">Stock Pitch</option>
            <option value="PANEL_DISCUSSION">Panel Discussion</option>
            <option value="GUEST_LECTURE">Guest Lecture</option>
            <option value="INTERNAL_MEETING">Internal Meeting</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Event Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500/60 transition"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PLANNED">Planned</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FINANCIAL_REVIEW">Financial Review</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
          <p className="text-slate-400 text-sm mt-3">Loading club events...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80">
          <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No events found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {search || selectedType || selectedStatus
              ? 'Try modifying your search criteria or clear active filters.'
              : 'Start by creating the first event for DIU Investment Club.'}
          </p>
          <Link
            href="/events/create"
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-semibold transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Create First Event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-slate-900/50 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-emerald-950/10 group"
            >
              <div>
                {/* Card Top: Code & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-medium">
                    {event.event_code}
                  </span>
                  <StatusBadge status={event.status} />
                </div>

                {/* Event Title */}
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition line-clamp-1">
                  {event.title}
                </h3>

                {/* Event Type pill */}
                <div className="mt-1 mb-3">
                  <span className="text-[11px] font-medium text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {formatEventType(event.event_type)}
                  </span>
                </div>

                {/* Details list */}
                <div className="space-y-1.5 text-xs text-slate-400 mt-4 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  )}
                  {event.expected_participants && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>{event.expected_participants} Expected Attendees</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Proposed Budget & Link */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Proposed Budget</span>
                  <span className="text-sm font-bold text-white">
                    {formatCurrency(Number(event.proposed_budget || 0))}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasPermission('events.delete') && (
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setEventToDelete(event);
                      }}
                      className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition-all"
                      title="Delete Event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <Link
                    href={`/events/${event.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 text-xs font-semibold transition"
                  >
                    Manage
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
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
                onClick={() => !isDeleting && setEventToDelete(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete event{' '}
              <span className="font-semibold text-white font-mono">
                {eventToDelete.event_code}
              </span>{' '}
              (<span className="font-semibold text-white">{eventToDelete.title}</span>)?
            </p>
            <p className="text-xs text-rose-400/90 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              ⚠️ This action will remove the event, associated budget line items, and team rosters. This cannot be undone.
            </p>

            {deleteError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700/60 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                {isDeleting ? (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
          <div>
            Showing Page <span className="font-semibold text-white">{page}</span> of{' '}
            <span className="font-semibold text-white">{totalPages}</span> ({totalCount} total events)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
