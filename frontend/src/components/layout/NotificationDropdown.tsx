'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  CheckSquare,
  Calendar,
  DollarSign,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  Inbox,
  Check,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationStore } from '../../context/NotificationContext';
import { NotificationItem } from '../../types/governance';

export function NotificationDropdown() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markAsRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    const destination = notif.link || (notif as any).action_url;
    if (destination) {
      router.push(destination);
    }
  };

  const getNotificationIcon = (category?: string, type?: string) => {
    const key = (category || type || '').toUpperCase();
    if (key.includes('FINANCIAL') || key.includes('PAYMENT') || key.includes('INCOME') || key.includes('EXPENSE')) {
      return <DollarSign className="w-4 h-4 text-emerald-400" />;
    }
    if (key.includes('APPROVAL')) {
      return <FileCheck className="w-4 h-4 text-amber-400" />;
    }
    if (key.includes('TASK')) {
      return <CheckSquare className="w-4 h-4 text-purple-400" />;
    }
    if (key.includes('EVENT') || key.includes('MEETING')) {
      return <Calendar className="w-4 h-4 text-sky-400" />;
    }
    if (key.includes('ALERT') || key.includes('WARNING') || key.includes('RISK')) {
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    }
    return <Bell className="w-4 h-4 text-indigo-400" />;
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-md shadow-emerald-950 ring-2 ring-slate-900 animate-in zoom-in-50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-slate-950/60">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-300">All caught up!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No notifications right now.</p>
              </div>
            ) : (
              notifications.filter((n) => n.status !== 'ARCHIVED').slice(0, 8).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-slate-800/60 transition-colors cursor-pointer text-left ${
                    !notif.is_read ? 'bg-emerald-950/15' : ''
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                    {getNotificationIcon(notif.category, notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold truncate ${!notif.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      title="Mark as read"
                      className="mt-1 p-1 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800/80 p-2.5 bg-slate-950/60 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
            >
              <span>View All Notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
