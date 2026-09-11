'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Shield,
  Layers,
  ChevronRight,
  ExternalLink,
  Zap,
  Info,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

export default function TestEmailPage() {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const [recipient, setRecipient] = useState('siamibna75@gmail.com');
  const [templateType, setTemplateType] = useState('welcome');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const templates = [
    { id: 'welcome', name: 'Member Welcome Email', endpoint: '/email/test/welcome' },
    { id: 'payment-confirmation', name: 'Payment Confirmation Email', endpoint: '/email/test/payment-confirmation' },
    { id: 'expense-status', name: 'Expense Status Email', endpoint: '/email/test/expense-status' },
    { id: 'event-notification', name: 'Event Notification Email', endpoint: '/email/test/event-notification' },
    { id: 'meeting-invitation', name: 'Meeting Invitation Email', endpoint: '/email/test/meeting-invitation' },
    { id: 'reminder', name: 'Operational Reminder Email', endpoint: '/email/test/reminder' },
  ];

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setError('Recipient email is required');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const selected = templates.find((t) => t.id === templateType);
      const endpoint = selected ? selected.endpoint : '/email/send-test-email';

      const res = await api.post<any>(endpoint, {
        to: recipient.trim(),
        memberName: 'Executive Test Member',
        amount: 500,
        eventTitle: 'Investment Seminar 2026',
        meetingTitle: 'Annual Executive General Meeting',
      });

      setResult(res);
    } catch (err: any) {
      console.error('Test email failed:', err);
      setError(err?.message || 'Failed to dispatch test email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>System Administration</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Communication Center</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-emerald-400 font-medium">Test Email</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Send className="w-6 h-6 text-emerald-400" />
            <span>Test Email Diagnostics</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verify Resend API connection, test delivery routes, and preview live production email templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/email-logs"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors text-xs font-semibold"
          >
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>View Email Logs</span>
          </Link>
          <Link
            href="/email-automation"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors text-xs font-semibold"
          >
            <span>Automation Rules</span>
          </Link>
        </div>
      </div>

      {/* Provider Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-xs text-slate-400 font-medium">Active Email Provider</p>
          <p className="text-lg font-bold text-white mt-1">Resend Official API</p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Connected & Verified</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-xs text-slate-400 font-medium">Sender Identity</p>
          <p className="text-sm font-bold text-white mt-1 font-mono">noreply@invesmentclub.top</p>
          <p className="text-xs text-slate-400 mt-1">DIU Investment Club</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <p className="text-xs text-slate-400 font-medium">Production Domain</p>
          <p className="text-sm font-bold text-emerald-400 mt-1 font-mono">https://invesmentclub.top</p>
          <p className="text-xs text-slate-400 mt-1">Vercel • Render Backend</p>
        </div>
      </div>

      {/* Test Email Form */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl max-w-2xl">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>Dispatch Diagnostic Email</span>
        </h2>

        <form onSubmit={handleSendTest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Recipient Email Address
            </label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. yourname@gmail.com"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Ensure this inbox can receive emails to verify delivery and visual formatting.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Template to Test
            </label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-xs font-semibold shadow-lg shadow-emerald-950 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Transmitting via Resend...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Test Email Now</span>
              </>
            )}
          </button>
        </form>

        {/* Results / Error Card */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Delivery Error</p>
              <p className="mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Email Successfully Dispatched via Resend!</span>
            </div>
            <p className="text-slate-300">
              A live email has been transmitted to <strong className="text-white">{recipient}</strong>.
            </p>
            {result.data?.messageId && (
              <p className="font-mono text-[11px] text-slate-400">
                Message ID: <span className="text-emerald-300 select-all">{result.data.messageId}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
