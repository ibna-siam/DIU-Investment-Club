'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { eventsService } from '../../../../services/events.service';
import { EventType } from '../../../../types/financial';

export default function CreateEventPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
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

  // Audience & Notification State (Default to NONE)
  const [targetAudience, setTargetAudience] = useState<
    'NONE' | 'ALL_ACTIVE_MEMBERS' | 'EXECUTIVE' | 'ROLES' | 'MEMBERS'
  >('NONE');
  const [targetEmails, setTargetEmails] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    'Executive Member',
    'Treasurer',
    'General Secretary',
    'President',
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Event title is required');
      return;
    }
    if (!formData.start_date) {
      setError('Start date is required');
      return;
    }
    if (!formData.end_date) {
      setError('End date is required');
      return;
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date cannot be earlier than start date');
      return;
    }

    const budgetNum = Number(formData.proposed_budget || 0);
    if (budgetNum <= 0) {
      setError('Proposed budget must be greater than zero');
      return;
    }

    try {
      setSubmitting(true);
      const parsedEmails = targetEmails
        .split(/[\n,]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@'));

      const res = await eventsService.createEvent({
        title: formData.title.trim(),
        event_type: formData.event_type,
        description: formData.description.trim() || undefined,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        venue: formData.venue.trim() || undefined,
        expected_participants: formData.expected_participants
          ? parseInt(formData.expected_participants, 10)
          : undefined,
        proposed_budget: budgetNum,
        target_audience: targetAudience,
        target_emails: targetAudience === 'MEMBERS' ? parsedEmails : undefined,
        target_roles: targetAudience === 'ROLES' ? selectedRoles : undefined,
        notify_members: targetAudience !== 'NONE',
      });

      if (res.success && res.data?.id) {
        router.push(`/events/${res.data.id}`);
      } else {
        setError('Failed to create event');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create New Event</h1>
          <p className="text-xs text-slate-400">Initialize a new event proposal in DRAFT status</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6"
      >
        {/* Basic Info */}
        <div>
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Event Details
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
                placeholder="e.g. DIU National Investment Summit 2026"
                className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition"
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
                  placeholder="e.g. DIU Auditorium 71 / Google Meet"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Participation */}
        <div className="border-t border-slate-800/80 pt-5">
          <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule & Scope
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Start Date & Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                name="start_date"
                required
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                End Date & Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                name="end_date"
                required
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
                  placeholder="e.g. 150"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Proposed Total Budget (BDT) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  name="proposed_budget"
                  value={formData.proposed_budget}
                  onChange={handleChange}
                  placeholder="e.g. 50000"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Description */}
        <div className="border-t border-slate-800/80 pt-5">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Event Description & Purpose
          </label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            placeholder="Outline objectives, special guest speakers, agendas, or target participant outcomes..."
            className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition resize-none"
          />
        </div>

        {/* Event Audience & Announcement Notification */}
        <div className="border-t border-slate-800/80 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Audience & Announcement
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Control who receives email invitations and in-portal alerts for this event.
              </p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Default: No Spam
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                targetAudience === 'NONE'
                  ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="targetAudience"
                value="NONE"
                checked={targetAudience === 'NONE'}
                onChange={() => setTargetAudience('NONE')}
                className="mt-0.5 text-emerald-500"
              />
              <div>
                <span className="font-semibold block text-slate-200">No Email Announcement (Recommended)</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Creates event in draft mode. Zero automated emails are sent out.
                </span>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                targetAudience === 'EXECUTIVE'
                  ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="targetAudience"
                value="EXECUTIVE"
                checked={targetAudience === 'EXECUTIVE'}
                onChange={() => setTargetAudience('EXECUTIVE')}
                className="mt-0.5 text-emerald-500"
              />
              <div>
                <span className="font-semibold block text-slate-200">Executive Committee Only</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Sends notice exclusively to President, General Secretary, Treasurer, and Executive members.
                </span>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                targetAudience === 'ROLES'
                  ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="targetAudience"
                value="ROLES"
                checked={targetAudience === 'ROLES'}
                onChange={() => setTargetAudience('ROLES')}
                className="mt-0.5 text-emerald-500"
              />
              <div>
                <span className="font-semibold block text-slate-200">Specific Roles</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Target custom officer designations and committee roles.
                </span>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                targetAudience === 'MEMBERS'
                  ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="targetAudience"
                value="MEMBERS"
                checked={targetAudience === 'MEMBERS'}
                onChange={() => setTargetAudience('MEMBERS')}
                className="mt-0.5 text-emerald-500"
              />
              <div>
                <span className="font-semibold block text-slate-200">Specific Email List</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Enter specific attendee or partner email addresses.
                </span>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 sm:col-span-2 ${
                targetAudience === 'ALL_ACTIVE_MEMBERS'
                  ? 'bg-amber-950/30 border-amber-500/60 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="targetAudience"
                value="ALL_ACTIVE_MEMBERS"
                checked={targetAudience === 'ALL_ACTIVE_MEMBERS'}
                onChange={() => setTargetAudience('ALL_ACTIVE_MEMBERS')}
                className="mt-0.5 text-amber-500"
              />
              <div>
                <span className="font-semibold block text-amber-300">Broadcast to All Active Club Members</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Sends an official club-wide email announcement to every registered active member.
                </span>
              </div>
            </label>
          </div>

          {targetAudience === 'ROLES' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Select Roles to Notify:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {['President', 'General Secretary', 'Treasurer', 'Executive Member', 'Advisor', 'Member'].map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role]);
                        } else {
                          setSelectedRoles(selectedRoles.filter((r) => r !== role));
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                    />
                    <span>{role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {targetAudience === 'MEMBERS' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Recipient Emails (comma or newline separated):</label>
              <textarea
                rows={2}
                placeholder="name@diu.edu.bd, member2@example.com"
                value={targetEmails}
                onChange={(e) => setTargetEmails(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="border-t border-slate-800 pt-5 flex items-center justify-end gap-3">
          <Link
            href="/events"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold shadow-lg shadow-emerald-950/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating Event...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
