'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { NavItem, getAuthorizedNavItems } from '../../config/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function SidebarComponent({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { hasRole, hasPermission } = useAuth();

  // Dynamically filter navItems according to user's permissions and roles (memoized to prevent render loops)
  const authorizedNavItems = useMemo(() => {
    return getAuthorizedNavItems(hasPermission, hasRole);
  }, [hasPermission, hasRole]);

  // Identify which group contains the active route
  const activeRouteGroup = useMemo(() => {
    if (!pathname) return null;
    for (const item of authorizedNavItems) {
      if (item.children) {
        const hasActiveChild = item.children.some((c) => {
          if (pathname === c.href) return true;
          if (c.href !== '/' && pathname.startsWith(c.href + '/')) return true;
          return false;
        });
        if (hasActiveChild) return item.title;
      }
    }
    return null;
  }, [pathname, authorizedNavItems]);

  // Single active accordion section state (with sessionStorage persistence)
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('diu_sidebar_open_group');
      if (saved) return saved;
    }
    return activeRouteGroup;
  });
  const prevPathnameRef = useRef(pathname);

  // Synchronize active group on route transition or initial route resolution
  useEffect(() => {
    if (activeRouteGroup) {
      setOpenGroup(activeRouteGroup);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('diu_sidebar_open_group', activeRouteGroup);
      }
    } else if (pathname !== prevPathnameRef.current) {
      // Retain currently open group if route doesn't belong to any group (e.g., single root pages)
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('diu_sidebar_open_group') : null;
      if (saved && !openGroup) {
        setOpenGroup(saved);
      }
    }
    prevPathnameRef.current = pathname;
  }, [pathname, activeRouteGroup]);

  // Strict single-accordion toggle: opening one closes all others
  const toggleGroup = (title: string) => {
    setOpenGroup((prev) => {
      const next = prev === title ? null : title;
      if (typeof window !== 'undefined') {
        if (next) {
          sessionStorage.setItem('diu_sidebar_open_group', next);
        } else {
          sessionStorage.removeItem('diu_sidebar_open_group');
        }
      }
      return next;
    });
  };

  const handleGroupClick = (title: string) => {
    if (collapsed) {
      onToggleCollapse();
      setOpenGroup(title);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('diu_sidebar_open_group', title);
      }
    } else {
      toggleGroup(title);
    }
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-slate-800 bg-slate-950 text-slate-200 transition-[width] duration-200 ease-in-out select-none z-30',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center space-x-3 overflow-hidden group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-lg shadow-md shadow-emerald-950 group-hover:bg-emerald-500 transition-colors">
              DIU
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-white tracking-wide">Investment Club</span>
              <span className="text-xs text-emerald-400 font-medium">Finance System</span>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href="/dashboard" className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-lg">
            DIU
          </Link>
        )}

        <button
          onClick={onToggleCollapse}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto overscroll-contain [transform:translateZ(0)] py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {authorizedNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isGroupOpen = openGroup === item.title;

          // Submenu grouping
          if (item.children) {
            const hasActiveChild = item.children.some((c) => {
              if (pathname === c.href) return true;
              if (c.href !== '/' && pathname.startsWith(c.href + '/')) return true;
              return false;
            });

            return (
              <div key={item.title} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleGroupClick(item.title)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer',
                    hasActiveChild
                      ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn('h-5 w-5 shrink-0', hasActiveChild ? 'text-emerald-400' : 'text-slate-400')} />
                    {!collapsed && <span>{item.title}</span>}
                  </div>
                  {!collapsed && (
                    <span className="transition-transform duration-150">
                      {isGroupOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                  )}
                </button>

                {!collapsed && isGroupOpen && (
                  <div className="pl-6 space-y-1 py-1 animate-in fade-in-50 duration-150">
                    {item.children.map((child) => {
                      const isChildActive =
                        pathname === child.href ||
                        (child.href !== '/' && pathname.startsWith(child.href + '/'));

                      return (
                        <Link
                          key={child.title}
                          href={child.href}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                            isChildActive
                              ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-400/30'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          )}
                        >
                          <span>{child.title}</span>
                          {isChildActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Single menu item (Next.js Link for client-side routing)
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-950 ring-1 ring-emerald-400/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                {!collapsed && <span>{item.title}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Clean Production Status Footer */}
      <div className="border-t border-slate-800 p-3">
        {!collapsed ? (
          <div className="rounded-xl bg-slate-900/90 p-3 border border-slate-800/80 text-xs">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span className="font-semibold text-white">System Online</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">DIU Investment Club ERP</p>
          </div>
        ) : (
          <div className="flex justify-center py-1" title="System Online">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          </div>
        )}
      </div>
    </aside>
  );
}

export const Sidebar = React.memo(SidebarComponent);
