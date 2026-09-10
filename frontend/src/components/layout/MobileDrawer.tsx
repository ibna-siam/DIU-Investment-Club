'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { getAuthorizedNavItems, NavItem } from '../../config/navigation';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, hasPermission, hasRole } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const authorizedNavItems = useMemo(() => {
    return getAuthorizedNavItems(hasPermission, hasRole);
  }, [hasPermission, hasRole]);

  // Auto-expand group if current route is inside it
  React.useEffect(() => {
    if (!pathname) return;
    authorizedNavItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (c) => pathname === c.href || pathname.startsWith(c.href + '/')
        );
        if (hasActiveChild) {
          setOpenGroups((prev) => ({ ...prev, [item.title]: true }));
        }
      }
    });
  }, [pathname, authorizedNavItems]);

  if (!isOpen) return null;

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative flex w-4/5 max-w-xs flex-col bg-slate-950 p-4 text-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white shadow">
              DIU
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">DIU Investment</p>
              <p className="text-[11px] text-emerald-400 font-medium">Finance System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Snapshot */}
        <div className="my-4 rounded-lg bg-slate-900 p-3 border border-slate-800">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="text-sm font-bold truncate text-white">{user?.full_name}</p>
          <span className="inline-block mt-1 text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-800">
            {user?.roles?.[0]?.name || 'Member'}
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          {authorizedNavItems.map((item) => {
            const Icon = item.icon;

            if (!item.children) {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href + item.title}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              );
            }

            const isGroupOpen = !!openGroups[item.title];
            const hasActiveChild = item.children.some(
              (c) => pathname === c.href || pathname?.startsWith(c.href + '/')
            );

            return (
              <div key={item.title} className="space-y-1">
                <button
                  onClick={() => toggleGroup(item.title)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
                    hasActiveChild
                      ? 'text-emerald-400 bg-slate-900/80 font-semibold'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  {isGroupOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {isGroupOpen && (
                  <div className="ml-7 space-y-1 border-l border-slate-800 pl-2">
                    {item.children.map((child) => {
                      const isChildActive = pathname === child.href || pathname?.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            'block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                            isChildActive
                              ? 'bg-emerald-600 text-white font-semibold shadow'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                          )}
                        >
                          {child.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 text-center text-xs text-slate-400">
          DIU Investment Club ERP
        </div>
      </div>
    </div>
  );
}
