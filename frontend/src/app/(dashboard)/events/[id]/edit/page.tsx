'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { eventsService } from '../../../../../services/events.service';
import { EventType } from '../../../../../types/financial';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    event_type: 'INVESTMENT_SUMMIT' as EventType,
    description: '',
    start_date: '',
    end_date: '',
    venue: '',
    expected_participants: '',
    proposed_budget: '',
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await eventsService.getEventById(eventId);
        if (res.success && res.data) {
          const e = res.data;
          setFormData({
            title: e.title,
            event_type: e.event_type,
            description: e.description || '',
            start_date: e.start_date ? e.start_date.substring(0, 16) : '',
            end_date: e.end_date ? e.end_date.substring(0, 16) : '',
            venue: e.venue || '',
            expected_participants: e.expected_participants ? e.expected_participants.toString() : '',
            proposed_budget: e.proposed_budget ? e.proposed_budget.toString() : '',
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load event for editing');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Event title is required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await eventsService.updateEvent(eventId, {
        title: formData.title.trim(),
        event_type: formData.event_type,
        description: formData.description.trim() || undefined,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
        venue: formData.venue.trim() || undefined,
        expected_participants: formData.expected_participants
          ? parseInt(formData.expected_participants, 10)
          : undefined,
        proposed_budget: formData.proposed_budget ? Number(formData.proposed_budget) : undefined,
      });

      if (res.success) {
        router.push(`/events/${eventId}`);
      } else {
        setError('Failed to update event');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
        <p className="text-slate-400 text-sm mt-3">Loading event details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/events/${eventId}`}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Edit Event</h1>
          <p className="text-xs text-slate-400">Update event logistics, schedule and budget envelope</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6"
      >
        <div>
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            General Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Event Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Event Type <span className="text-rose-400">*</span>
              </label>
              <select
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition"
              >
                <option value="INVESTMENT_SUMMIT">Investment Summit</option>
                <option value="WORKSHOP">Workshop / Bootcamp</option>
                <option value="NETWORKING">Networking Session</option>
                <option value="ANNUAL_CONFERENCE">Annual Conference</option>
                <option value="STOCK_PITCH">Stock Pitch Competition</option>
                <option value="PANEL_DISCUSSION">Panel Discussion</option>
                <option value="GUEST_LECTURE">Guest Lecture</option>
                <option value="INTERNAL_MEETING">Internal Meeting</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Venue / Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-5">
          <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule & Capacity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Expected Participants
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  min="1"
                  name="expected_participants"
                  value={formData.expected_participants}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Proposed Budget (BDT)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="proposed_budget"
                  value={formData.proposed_budget}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-5">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Event Description
          </label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition resize-none"
          />
        </div>

        <div className="border-t border-slate-800 pt-5 flex items-center justify-end gap-3">
          <Link
            href={`/events/${eventId}`}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
