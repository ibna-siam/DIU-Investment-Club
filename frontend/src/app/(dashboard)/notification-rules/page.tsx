'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Sliders,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Layers,
  ChevronRight,
  ArrowRight,
  Send,
  Smartphone,
  Mail,
  Check,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { NotificationRuleItem } from '../../../types/governance';

export default function NotificationRulesPage() {
  const { user, hasRole, hasPermission } = useAuth();
  const [rules, setRules] = useState<NotificationRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get<{ success: boolean; data: NotificationRuleItem[] }>(
        '/notifications/rules'
      );
      if (res && res.data) {
        setRules(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load notification rules:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to load notification rules' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = async (rule: NotificationRuleItem) => {
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

      const res = await api.patch<{ success: boolean; data: NotificationRuleItem }>(
        `/notifications/rules/${rule.rule_key}`,
        { enabled: newEnabled }
      );

      if (res && res.data) {
        setRules((prev) =>
          prev.map((r) => (r.rule_key === rule.rule_key ? res.data : r))
        );
        setMessage({
          type: 'success',
          text: `"${rule.name}" toggled ${newEnabled ? 'ON' : 'OFF'}.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to update notification rule:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to update rule' });
      fetchRules();
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleToggleChannel = async (rule: NotificationRuleItem, channel: 'IN_APP' | 'EMAIL') => {
    setUpdatingKey(rule.rule_key);
    setMessage(null);
    try {
      const currentChannels = Array.isArray(rule.delivery_channels) ? rule.delivery_channels : [];
      let newChannels: ('IN_APP' | 'EMAIL' | 'SMS')[];

      if (currentChannels.includes(channel)) {
        // Prevent disabling all channels
        if (currentChannels.length === 1) {
          setMessage({
            type: 'error',
            text: 'At least one delivery channel must remain enabled.',
          });
          setUpdatingKey(null);
          return;
        }
        newChannels = currentChannels.filter((c) => c !== channel);
      } else {
        newChannels = [...currentChannels, channel];
      }

      // Optimistic update
      setRules((prev) =>
        prev.map((r) =>
          r.rule_key === rule.rule_key
            ? { ...r, delivery_channels: newChannels, updated_at: new Date().toISOString() }
            : r
        )
      );

      const res = await api.patch<{ success: boolean; data: NotificationRuleItem }>(
        `/notifications/rules/${rule.rule_key}`,
        { delivery_channels: newChannels }
      );

      if (res && res.data) {
        setRules((prev) =>
          prev.map((r) => (r.rule_key === rule.rule_key ? res.data : r))
        );
        setMessage({
          type: 'success',
          text: `Channels updated for "${rule.name}".`,
        });
      }
    } catch (err: any) {
      console.error('Failed to update rule channels:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to update delivery channels' });
      fetchRules();
    } finally {
      setUpdatingKey(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'URGENT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'NORMAL':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const notificationTypes = ['ALL', 'TASK', 'APPROVAL', 'FINANCIAL', 'MEETING', 'EVENT', 'SECURITY'];

  const filteredRules = rules.filter((r) => {
    const matchesType = typeFilter === 'ALL' || r.notification_type === typeFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.trigger_event.toLowerCase().includes(search.toLowerCase()) ||
      r.recipient_role.toLowerCase().includes(search.toLowerCase()) ||
      r.recipient_type.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

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
            <span className="text-emerald-400 font-medium">Notification Rules</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-emerald-400" />
            <span>Notification Rules Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage trigger events, role-based recipient targeting, priorities, and active delivery channels.
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
            href="/email-automation"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors text-xs font-semibold"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Email Automations</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notification rules, roles, triggers..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {notificationTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                typeFilter === type
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Notification Name & Key</th>
                <th className="py-3.5 px-4">Trigger Event</th>
                <th className="py-3.5 px-4">Recipient Target & Role</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4 text-center">Delivery Channels</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Enabled Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                    <span>Loading notification rules...</span>
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No notification rules found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const isUpdating = updatingKey === rule.rule_key;
                  const channels = Array.isArray(rule.delivery_channels) ? rule.delivery_channels : [];
                  const hasInApp = channels.includes('IN_APP');
                  const hasEmail = channels.includes('EMAIL');

                  return (
                    <tr
                      key={rule.rule_key}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4 max-w-xs">
                        <span className="font-semibold text-white text-sm block">{rule.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 inline-block">
                          {rule.rule_key}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300">
                          {rule.trigger_event}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-200 font-medium">{rule.recipient_type}</span>
                          <span className="text-[11px] text-slate-500">Role: {rule.recipient_role}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getPriorityBadge(
                            rule.priority
                          )}`}
                        >
                          {rule.priority}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* In-App Toggle Button */}
                          <button
                            onClick={() => handleToggleChannel(rule, 'IN_APP')}
                            disabled={isUpdating}
                            title="Toggle In-App Notification channel"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                              hasInApp
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-slate-950 text-slate-600 border-slate-800 opacity-60'
                            }`}
                          >
                            <Bell className="w-3 h-3" />
                            <span>In-App</span>
                            {hasInApp && <Check className="w-2.5 h-2.5 text-indigo-400 ml-0.5" />}
                          </button>

                          {/* Email Toggle Button */}
                          <button
                            onClick={() => handleToggleChannel(rule, 'EMAIL')}
                            disabled={isUpdating}
                            title="Toggle Email channel"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                              hasEmail
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'bg-slate-950 text-slate-600 border-slate-800 opacity-60'
                            }`}
                          >
                            <Mail className="w-3 h-3" />
                            <span>Email</span>
                            {hasEmail && <Check className="w-2.5 h-2.5 text-sky-400 ml-0.5" />}
                          </button>
                        </div>
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
                          <span>{rule.enabled ? 'ACTIVE' : 'MUTED'}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggle(rule)}
                          disabled={isUpdating}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            rule.enabled ? 'bg-emerald-500' : 'bg-slate-800'
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
      </div>
    </div>
  );
}
