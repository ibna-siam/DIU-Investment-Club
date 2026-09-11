'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, User, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationDropdown } from './NotificationDropdown';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
  title?: string;
}

export function TopHeader({ onOpenMobileMenu, title = 'Financial Management System' }: TopHeaderProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          {title}
        </h1>
      </div>

      {/* Middle: Search input */}
      <div className="hidden lg:flex items-center w-80 relative">
        <Search className="absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search accounts, transactions, users..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-800/80 border border-slate-700/60 rounded-xl text-white placeholder:text-slate-400 focus:bg-slate-800 focus:border-indigo-500 focus:outline-none transition-all"
        />
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Real-time Notifications Dropdown */}
        <NotificationDropdown />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 rounded-xl p-1.5 hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-none">
                {user?.full_name || 'Loading...'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {user?.roles?.[0]?.name || 'Member'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl shadow-black/60 z-50 animate-in fade-in zoom-in-95">
              <div className="border-b border-slate-800 p-3">
                <p className="text-sm font-semibold text-white">{user?.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {user?.roles?.map((role) => (
                    <span
                      key={role.id}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Your Profile</span>
                </Link>
                {user?.roles?.some((r) => r.slug === 'SUPER_ADMIN') && (
                  <Link
                    href="/roles"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Shield className="h-4 w-4 text-slate-400" />
                    <span>Role Management</span>
                  </Link>
                )}
              </div>

              <div className="border-t border-slate-800 pt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center space-x-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
