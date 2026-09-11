'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { governanceService } from '../../../services/governance.service';
import { NotificationItem, NotificationPreference, NotificationStatus } from '../../../types/governance';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CheckSquare,
  Scale,
  DollarSign,
  Settings,
  Mail,
  Shield,
  RefreshCw,
  Clock,
  ExternalLink,
  Archive,
  Inbox,
  Filter,
  CheckCheck,
  Smartphone,
  Lock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTE_PERMISSIONS } from '../../../config/navigation';
import { useNotificationStore } from '../../../context/NotificationContext';

export default function NotificationsPage() {
  const { hasPermission } = useAuth();
  const router = useRouter();

  const {
    notifications: storeNotifications,
    loading: storeLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    archiveAllRead,
    refreshNotifications,
  } = useNotificationStore();

  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'preferences'>('feed');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // UI state
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    governanceService
      .getNotificationPreferences()
      .then((data) => {
        setPreferences(data);
      })
      .catch((err) => console.error('Failed to load prefs:', err))
      .finally(() => setLoadingPrefs(false));
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
    } catch (err: any) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setMessage({ type: 'success', text: 'All active notifications marked as read!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to mark all as read' });
    }
  };

  const handleArchive = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await archiveNotification(id);
      setMessage({ type: 'success', text: 'Notification moved to archive.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to archive' });
    }
  };

  const handleArchiveAllRead = async () => {
    try {
      await archiveAllRead();
      setMessage({ type: 'success', text: 'All read notifications archived.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to archive read notifications' });
    }
  };

  const handleOpenRecord = (notif: NotificationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const destination = notif.link || (notif as any).action_url;
    if (!destination) return;

    const baseRoute = destination.split('?')[0].split('#')[0];
    let requiredPermission: string | undefined;

    for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
      if (baseRoute === route || baseRoute.startsWith(route + '/')) {
        requiredPermission = perm;
        break;
      }
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      setMessage({
        type: 'error',
        text: `Access Denied: You do not have permission (${requiredPermission}) to view this resource.`,
      });
      return;
    }

    if (!notif.is_read) {
      markAsRead(notif.id).catch(() => {});
    }

    router.push(destination);
  };

  const handleTogglePreference = async (key: keyof NotificationPreference) => {
    if (!preferences) return;
    if (key === 'security_alerts') return; // Protected

    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    setSavingPrefs(true);
    try {
      await governanceService.updateNotificationPreferences({ [key]: updated[key] });
      setMessage({ type: 'success', text: 'Communication preference saved immediately.' });
      await refreshNotifications();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save preferences' });
    } finally {
      setSavingPrefs(false);
    }
  };

  // Filtered notifications
  const filteredNotifications = storeNotifications.filter((n) => {
    // Status filter
    if (statusFilter === 'UNREAD') {
      if (n.is_read || n.status === 'ARCHIVED') return false;
    } else if (statusFilter === 'READ') {
      if (!n.is_read || n.status === 'ARCHIVED') return false;
    } else if (statusFilter === 'ARCHIVED') {
      if (n.status !== 'ARCHIVED') return false;
    } else if (statusFilter === 'ALL') {
      if (n.status === 'ARCHIVED') return false; // In ALL view, hide archived by default
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      const cat = (n.category || n.type || '').toUpperCase();
      if (!cat.includes(categoryFilter)) return false;
    }

    return true;
  });

  const getCategoryIcon = (category?: string, type?: string) => {
    const raw = (category || type || '').toUpperCase();
    if (raw.includes('EVENT')) return <Calendar className="w-4 h-4 text-sky-400" />;
    if (raw.includes('MEET')) return <Clock className="w-4 h-4 text-emerald-400" />;
    if (raw.includes('TASK')) return <CheckSquare className="w-4 h-4 text-purple-400" />;
    if (raw.includes('FINANC') || raw.includes('PAYMENT') || raw.includes('DUE') || raw.includes('EXPENSE')) {
      return <DollarSign className="w-4 h-4 text-blue-400" />;
    }
    if (raw.includes('SECURITY') || raw.includes('PASSWORD') || raw.includes('ALERT')) {
      return <Shield className="w-4 h-4 text-rose-400" />;
    }
    return <Bell className="w-4 h-4 text-amber-400" />;
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const loading = storeLoading || loadingPrefs;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-wider uppercase mb-1">
            <Bell className="w-4 h-4" />
            DIU Investment Club • Daffodil International University
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Notification & Communication Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Centralized notification dispatch, real-time alerts, read state synchronization, and communication preferences.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={refreshNotifications}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}
          <button
            onClick={handleArchiveAllRead}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-sm font-medium transition"
            title="Archive all read notifications"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">Archive Read</span>
          </button>
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
          <button onClick={() => setMessage(null)} className="text-xs hover:underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'feed'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notification Activity</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'preferences'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Communication Preferences</span>
        </button>
      </div>

      {/* TAB 1: NOTIFICATION FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'UNREAD', 'READ', 'ARCHIVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Active Feed'
                    : st === 'UNREAD'
                    ? `Unread (${unreadCount})`
                    : st === 'READ'
                    ? 'Read'
                    : 'Archived'}
                </button>
              ))}
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories</option>
                <option value="EVENT">Events</option>
                <option value="MEETING">Meetings</option>
                <option value="TASK">Tasks</option>
                <option value="FINANCIAL">Financial & Dues</option>
                <option value="SECURITY">Security Alerts</option>
                <option value="REMINDER">Reminders</option>
              </select>
            </div>
          </div>

          {/* Notification List */}
          <div className="space-y-2.5">
            {loading && filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                <p className="text-sm">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No notifications yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {statusFilter === 'ARCHIVED'
                    ? 'No archived notifications found.'
                    : statusFilter === 'UNREAD'
                    ? "You're completely caught up! No unread notifications."
                    : 'Activity and reminder alerts will appear here in real time.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isUnread = !notif.is_read && notif.status !== 'ARCHIVED';
                const isArchived = notif.status === 'ARCHIVED';

                return (
                  <div
                    key={notif.id}
                    className={`group relative p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isUnread
                        ? 'bg-slate-900/90 border-indigo-500/30 shadow-lg shadow-indigo-950/20'
                        : isArchived
                        ? 'bg-slate-950/40 border-slate-900 text-slate-500'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Left Icon & Text */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="mt-0.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                        {getCategoryIcon(notif.category, notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className={`text-sm font-semibold truncate ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                            {notif.title}
                          </h4>
                          {isUnread && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              NEW
                            </span>
                          )}
                          {isArchived && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                              ARCHIVED
                            </span>
                          )}
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40">
                            {notif.category || notif.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                          <span>{formatRelativeTime(notif.created_at)}</span>
                          {notif.channel && <span>• Channel: {notif.channel}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {(notif.link || (notif as any).action_url) && (
                        <button
                          onClick={(e) => handleOpenRecord(notif, e)}
                          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg text-xs font-medium transition flex items-center gap-1"
                          title="Open Related Record"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="hidden md:inline">Open</span>
                        </button>
                      )}
                      {isUnread && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 rounded-lg transition flex items-center gap-1.5"
                          title="Mark as Read"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Read</span>
                        </button>
                      )}
                      {!isArchived && (
                        <button
                          onClick={(e) => handleArchive(notif.id, e)}
                          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs transition"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNICATION PREFERENCE CENTER */}
      {activeTab === 'preferences' && preferences && (
        <div className="space-y-6">
          {/* Preferences Banner */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">User Communication Preference Center</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Manage your delivery channels across optional club categories. Changes persist immediately to your user profile.
              In accordance with Section 5 security policy, critical account security alerts are mandatory and cannot be toggled off.
            </p>

            {/* Master Channel Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Global In-App Notifications</h4>
                    <p className="text-xs text-slate-400">Receive alerts in the top bar bell dropdown</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreference('in_app_enabled')}
                  disabled={savingPrefs}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.in_app_enabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                      preferences.in_app_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Global Email Notifications</h4>
                    <p className="text-xs text-slate-400">Receive transactional emails via official club email</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreference('email_enabled')}
                  disabled={savingPrefs}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.email_enabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                      preferences.email_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Category Matrix */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Category Delivery Matrix</h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize channel delivery for each club activity module independently.
              </p>
            </div>

            <div className="divide-y divide-slate-800">
              {/* 1. Events */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Club Events & Summits</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Invitations, schedule updates, and venue announcements</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 self-end sm:self-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.events_in_app}
                      onChange={() => handleTogglePreference('events_in_app')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.events_email}
                      onChange={() => handleTogglePreference('events_email')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              {/* 2. Meetings */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Executive & Committee Meetings</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Meeting notices, agenda items, and quorum callouts</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 self-end sm:self-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.meetings_in_app}
                      onChange={() => handleTogglePreference('meetings_in_app')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.meetings_email}
                      onChange={() => handleTogglePreference('meetings_email')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              {/* 3. Tasks */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Task Assignments & Deadlines</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Assigned duties, checklist items, and deadline notices</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 self-end sm:self-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.tasks_in_app}
                      onChange={() => handleTogglePreference('tasks_in_app')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.tasks_email}
                      onChange={() => handleTogglePreference('tasks_email')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              {/* 4. General Announcements */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">General Announcements & Bulletins</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Club-wide announcements and leadership updates</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 self-end sm:self-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.announcements_in_app}
                      onChange={() => handleTogglePreference('announcements_in_app')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.announcements_email}
                      onChange={() => handleTogglePreference('announcements_email')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              {/* 5. Automated Reminders */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Automated Scheduler Reminders</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Pre-event intervals (-7d, -24h, -1h) and task reminders</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 self-end sm:self-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.reminders_in_app}
                      onChange={() => handleTogglePreference('reminders_in_app')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.reminders_email}
                      onChange={() => handleTogglePreference('reminders_email')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              {/* 6. Financial Updates */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Optional Financial & Dues Updates</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Membership fee reminders and financial summaries</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 self-end sm:self-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.financial_in_app}
                      onChange={() => handleTogglePreference('financial_in_app')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.financial_email}
                      onChange={() => handleTogglePreference('financial_email')}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              {/* 7. Critical Security Alerts (Section 5 Protected) */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-rose-950/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">Critical Account Security Alerts</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-full">
                        MANDATORY
                      </span>
                    </div>
                    <p className="text-xs text-rose-300/80 mt-0.5">
                      Password resets, password change notices, and suspicious login security alerts. Cannot be disabled.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 self-end sm:self-center font-mono text-xs text-rose-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> In-App: Active
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Email: Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
