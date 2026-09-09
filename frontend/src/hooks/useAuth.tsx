'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../lib/api';
import { UserProfile } from '../types';
import { supabase, isSupabaseClientConfigured } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('diu_auth_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      setToken(storedToken);
      const res = await api.get<{ success: boolean; data: UserProfile }>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.warn('Session refresh check:', err);
      // Only remove token if explicitly unauthorized
      if (err?.status === 401 || err?.code === 'UNAUTHORIZED' || err?.code === 'TOKEN_EXPIRED') {
        localStorage.removeItem('diu_auth_token');
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    if (isSupabaseClientConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          if (session?.access_token) {
            localStorage.setItem('diu_auth_token', session.access_token);
            setToken(session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('diu_auth_token');
          setUser(null);
          setToken(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // 1. If Supabase client is configured, authenticate with Supabase Auth
      if (isSupabaseClientConfigured()) {
        const { data: suData, error: suError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (suError) {
          throw new ApiError(suError.message, 'AUTH_ERROR', 400);
        }
        if (suData.session?.access_token) {
          localStorage.setItem('diu_auth_token', suData.session.access_token);
        }
      }

      // 2. Call backend login endpoint to sync session and fetch complete RBAC profile
      const res = await api.post<{ success: boolean; data: { user: UserProfile; token: string } }>(
        '/auth/login',
        { email, password }
      );

      if (res.success && res.data) {
        localStorage.setItem('diu_auth_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout').catch(() => {});
      if (isSupabaseClientConfigured()) {
        await supabase.auth.signOut().catch(() => {});
      }
    } finally {
      localStorage.removeItem('diu_auth_token');
      setUser(null);
      setToken(null);
      setLoading(false);
      router.push('/login');
    }
  }, [router]);

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user || !user.roles) return false;
    const targetRoles = Array.isArray(roles) ? roles : [roles];
    if (user.roles.some((r) => r.slug === 'SUPER_ADMIN')) return true;
    return user.roles.some((r) => targetRoles.includes(r.slug));
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.roles?.some((r) => r.slug === 'SUPER_ADMIN')) return true;
    const perms = user.permissions || [];
    if (perms.includes('*') || perms.includes(permission)) return true;

    const parts = permission.split('.');
    const module = parts[0];
    const action = parts[1];

    if (!module) return false;

    // Check direct module manage/admin wildcard
    if (perms.includes(`${module}.manage`) || perms.includes(`${module}.admin`)) return true;

    // Module alias / plural / singular normalization
    const alternates: string[] = [];
    if (module.endsWith('s')) {
      alternates.push(module.slice(0, -1));
    } else {
      alternates.push(`${module}s`);
    }
    if (module === 'accounts' || module === 'account') {
      alternates.push('financial_accounts');
    }
    if (module === 'financial_accounts') {
      alternates.push('accounts', 'account');
    }

    for (const alt of alternates) {
      if (action && perms.includes(`${alt}.${action}`)) return true;
      if (perms.includes(`${alt}.manage`) || perms.includes(`${alt}.admin`)) return true;
      // If permission is just a module check (no action specified)
      if (!action && perms.some((p) => p.startsWith(`${alt}.`))) return true;
    }

    // If permission has no action and user has any perm in this module
    if (!action && perms.some((p) => p.startsWith(`${module}.`))) return true;

    return false;
  }, [user]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    hasRole,
    hasPermission,
  }), [user, token, loading, login, logout, refreshUser, hasRole, hasPermission]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
