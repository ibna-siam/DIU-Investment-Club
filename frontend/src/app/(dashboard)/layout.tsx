'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopHeader } from '../../components/layout/TopHeader';
import { MobileDrawer } from '../../components/layout/MobileDrawer';
import { Loader2 } from 'lucide-react';

import { NotificationProvider } from '../../context/NotificationContext';
import { ROUTE_PERMISSIONS } from '../../config/navigation';

// Pre-sorted routes by specificity once statically outside component
const SORTED_ROUTES = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('diu_sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('diu_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user) {
      const matchedRoute = SORTED_ROUTES.find(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      if (matchedRoute) {
        const requiredPerm = ROUTE_PERMISSIONS[matchedRoute];
        if (requiredPerm) {
          if (!hasPermission(requiredPerm)) {
            router.replace('/unauthorized');
          }
        }
      }
    }
  }, [loading, user, pathname, router, hasPermission]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-400">Loading system session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Derive dynamic page title from pathname
  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'System Dashboard';
    if (pathname.includes('/users')) return 'User Management';
    if (pathname.includes('/roles')) return 'Roles & Permissions';
    if (pathname.includes('/settings')) return 'System Settings';
    if (pathname.includes('/unauthorized')) return 'Access Restricted';
    return 'Financial Management System';
  };

  return (
    <NotificationProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
        {/* Desktop Sidebar */}
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />

        {/* Mobile Drawer */}
        <MobileDrawer isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopHeader
            title={getPageTitle()}
            onOpenMobileMenu={() => setMobileDrawerOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
