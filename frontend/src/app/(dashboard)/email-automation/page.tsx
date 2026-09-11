'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Mail,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Send,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sliders,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { EmailAutomationRuleItem } from '../../../types/governance';

export default function EmailAutomationPage() {
  const { user, hasRole, hasPermission } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const [rules, setRules] = useState<EmailAutomationRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get<{ success: boolean; data: EmailAutomationRuleItem[] }>(
        '/email/automation-rules'
      );
      if (res && res.data) {
        setRules(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load email automation rules:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to load email automation rules' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = async (rule: EmailAutomationRuleItem) => {
    if (rule.is_protected && rule.enabled) {
      setMessage({
        type: 'error',
        text: `Rule "${rule.name}" is protected for security and cannot be disabled.`,
      });
      return;
    }

    setUpdatingKey(rule.rule_key);
    setMessage(null);
    try {
      const newEnabled = !rule.enabled;
      // Optimistic update
      setRules((prev) =>
        prev.map((r) =>
          r.rule_key === rule.rule_key
            ? { ...r, enabled: newEnabled, updated_at: new Date().toISOString() }
            : r
        )
      );

      const res = await api.patch<{ success: boolean; data: EmailAutomationRuleItem }>(
        `/email/automation-rules/${rule.rule_key}`,
        { enabled: newEnabled }
      );

      if (res && res.data) {
        setRules((prev) =>
          prev.map((r) => (r.rule_key === rule.rule_key ? res.data : r))
        );
        setMessage({
          type: 'success',
          text: `"${rule.name}" successfully toggled ${newEnabled ? 'ON' : 'OFF'}.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle rule:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to update rule' });
      fetchRules();
    } finally {
      setUpdatingKey(null);
    }
  };

  const categories = ['ALL', 'MEMBERSHIP', 'FINANCIAL', 'TASKS', 'MEETINGS', 'EVENTS', 'SECURITY'];

  const filteredRules = rules.filter((r) => {
    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.trigger_event.toLowerCase().includes(search.toLowerCase()) ||
      r.recipient_logic.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'MEMBERSHIP':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'FINANCIAL':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'TASKS':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'MEETINGS':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'EVENTS':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'SECURITY':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
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
            <span className="text-emerald-400 font-medium">Email Automation</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-emerald-400" />
            <span>Email Automation Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure, manage, and toggle club-wide email automation rules with real-time delivery targeting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRules}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh Rules</span>
          </button>
          <Link
            href="/test-email"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-xs font-semibold shadow-lg shadow-emerald-950"
          >
            <Send className="w-4 h-4" />
            <span>Send Test Email</span>
          </Link>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats & Quick Actions Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Automation Rules</p>
            <p className="text-2xl font-bold text-white mt-1">{rules.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <Sliders className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Active Automations</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {rules.filter((r) => r.enabled).length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Disabled Automations</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {rules.filter((r) => !r.enabled).length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40">
            <XCircle className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Delivery Provider</p>
            <p className="text-base font-bold text-white mt-1">Resend API</p>
            <p className="text-[11px] text-emerald-400 font-mono">noreply@invesmentclub.top</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <Zap className="w-5 h-5 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules, triggers, recipients..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                categoryFilter === cat
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Table / Cards */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Automation Name & Description</th>
                <th className="py-3.5 px-4">Trigger Event</th>
                <th className="py-3.5 px-4">Recipient Logic</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action / Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                    <span>Loading 17 email automation rules...</span>
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No automation rules matching your filter.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const isUpdating = updatingKey === rule.rule_key;
                  return (
                    <tr
                      key={rule.rule_key}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{rule.name}</span>
                          {rule.is_protected && (
                            <span
                              title="Security Protected Rule"
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            >
                              <Shield className="w-2.5 h-2.5" />
                              <span>Protected</span>
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">
                          {rule.description}
                        </p>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 inline-block">
                          Template: <span className="text-slate-400">{rule.template_key}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300">
                          {rule.trigger_event}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-300 max-w-xs">
                        <p className="text-xs leading-relaxed">{rule.recipient_logic}</p>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getCategoryBadge(
                            rule.category
                          )}`}
                        >
                          {rule.category}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            rule.enabled
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rule.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          <span>{rule.enabled ? 'ENABLED' : 'DISABLED'}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggle(rule)}
                          disabled={isUpdating || (rule.is_protected && rule.enabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            rule.enabled ? 'bg-emerald-500' : 'bg-slate-800'
                          } ${
                            rule.is_protected && rule.enabled ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              rule.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>All 17 email automation rules are dynamically persisted in Supabase.</span>
          <div className="flex items-center gap-4">
            <Link
              href="/notification-rules"
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Manage Notification Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
