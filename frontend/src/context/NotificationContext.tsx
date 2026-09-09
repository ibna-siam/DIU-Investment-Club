'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { governanceService } from '../services/governance.service';
import { NotificationItem } from '../types/governance';
import { supabase } from '../lib/supabase';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  archiveAllRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const activeChannelRef = useRef<any>(null);

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await governanceService.getNotifications({ limit: 100 });
      // Deduplicate by ID on load
      const uniqueMap = new Map<string, NotificationItem>();
      (data || []).forEach((item) => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, {
            ...item,
            status: item.status || (item.is_read ? 'READ' : 'UNREAD'),
          });
        }
      });
      setNotifications(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error('[NotificationContext] Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      refreshNotifications();
    } else {
      setNotifications([]);
    }
  }, [user?.id, refreshNotifications]);

  // Single centralized Supabase Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    // Clean up any existing channel before subscribing
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current);
      activeChannelRef.current = null;
    }

    const channelName = `central-user-notifs-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as any;
            const newNotif: NotificationItem = {
              ...raw,
              status: raw.status || (raw.is_read ? 'READ' : 'UNREAD'),
            };

            setNotifications((prev) => {
              // Deduplicate: check by ID or duplicate title within last hour
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              const hasRecentDuplicate = prev.some(
                (n) =>
                  n.title === newNotif.title &&
                  n.is_read === newNotif.is_read &&
                  Math.abs(new Date(n.created_at).getTime() - new Date(newNotif.created_at).getTime()) < 3600000
              );
              if (hasRecentDuplicate) return prev;
              return [newNotif, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const raw = payload.new as any;
            const updated: NotificationItem = {
              ...raw,
              status: raw.status || (raw.is_read ? 'READ' : 'UNREAD'),
            };

            setNotifications((prev) =>
              prev.map((n) => {
                if (n.id === updated.id) {
                  // Guard: if notification was already marked read locally, keep it read
                  const isRead = n.is_read || updated.is_read;
                  const status = n.status === 'ARCHIVED' ? 'ARCHIVED' : isRead ? 'READ' : updated.status;
                  return {
                    ...n,
                    ...updated,
                    is_read: isRead,
                    status,
                  };
                }
                return n;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          }
        }
      )
      .subscribe();

    activeChannelRef.current = channel;

    return () => {
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      }
    };
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string): Promise<void> => {
    try {
      const nowIso = new Date().toISOString();
      // Optimistic local update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, status: 'READ', read_at: nowIso } : n
        )
      );
      // Persist permanently in backend & Supabase
      await governanceService.markNotificationRead(id);
    } catch (err) {
      console.error('[NotificationContext] Failed to mark read:', err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    try {
      const nowIso = new Date().toISOString();
      // Optimistic local update
      setNotifications((prev) =>
        prev.map((n) =>
          !n.is_read && n.status !== 'ARCHIVED'
            ? { ...n, is_read: true, status: 'READ', read_at: nowIso }
            : n
        )
      );
      // Persist permanently in backend & Supabase
      await governanceService.markAllNotificationsRead();
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all read:', err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const archiveNotification = useCallback(async (id: string): Promise<void> => {
    try {
      const nowIso = new Date().toISOString();
      // Optimistic local update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, status: 'ARCHIVED', archived_at: nowIso } : n
        )
      );
      await governanceService.archiveNotification(id);
    } catch (err) {
      console.error('[NotificationContext] Failed to archive notification:', err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const archiveAllRead = useCallback(async (): Promise<void> => {
    try {
      const nowIso = new Date().toISOString();
      // Optimistic local update
      setNotifications((prev) =>
        prev.map((n) =>
          n.is_read && n.status !== 'ARCHIVED'
            ? { ...n, status: 'ARCHIVED', archived_at: nowIso }
            : n
        )
      );
      await governanceService.archiveAllRead();
    } catch (err) {
      console.error('[NotificationContext] Failed to archive all read:', err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read && n.status !== 'ARCHIVED').length,
    [notifications]
  );

  const contextValue = useMemo<NotificationContextType>(
    () => ({
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      archiveNotification,
      archiveAllRead,
      refreshNotifications,
    }),
    [
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      archiveNotification,
      archiveAllRead,
      refreshNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationStore() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationStore must be used within a NotificationProvider');
  }
  return context;
}
