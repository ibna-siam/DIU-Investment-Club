'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, Building2, X } from 'lucide-react';
import { departmentsService, Department } from '../../services/departments.service';

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function DepartmentSelect({
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Select official DIU Department...',
  className = '',
  error,
}: DepartmentSelectProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load cached departments once
  useEffect(() => {
    let mounted = true;
    departmentsService
      .getActiveDepartments()
      .then((data) => {
        if (mounted) {
          setDepartments(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load official DIU departments:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter departments based on search
  const filteredDepartments = useMemo(() => {
    if (!search.trim()) return departments;
    const q = search.toLowerCase().trim();
    return departments.filter(
      (d) =>
        d.official_name.toLowerCase().includes(q) ||
        d.faculty.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q))
    );
  }, [departments, search]);

  // Group filtered by faculty
  const groupedDepartments = useMemo(() => {
    const groups: { faculty: string; items: Department[] }[] = [];
    const facultyMap = new Map<string, Department[]>();

    filteredDepartments.forEach((d) => {
      if (!facultyMap.has(d.faculty)) {
        facultyMap.set(d.faculty, []);
      }
      facultyMap.get(d.faculty)!.push(d);
    });

    facultyMap.forEach((items, faculty) => {
      groups.push({ faculty, items });
    });

    return groups;
  }, [filteredDepartments]);

  // Flat list of visible selectable items for keyboard navigation
  const flatSelectable = filteredDepartments;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 < flatSelectable.length ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flatSelectable.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatSelectable[highlightedIndex]) {
          onChange(flatSelectable[highlightedIndex].official_name);
          setIsOpen(false);
          setSearch('');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearch('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  const selectedDept = departments.find((d) => d.official_name === value);

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-950 border ${
          error
            ? 'border-rose-500/80 focus:ring-rose-500/20'
            : isOpen
            ? 'border-emerald-500/80 ring-2 ring-emerald-500/10'
            : 'border-slate-800 hover:border-slate-700'
        } rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors duration-150 focus:outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {value ? (
            <div className="truncate">
              <span className="text-white font-medium">{value}</span>
              {selectedDept?.faculty && (
                <span className="ml-2 text-xs text-slate-400 font-normal">
                  ({selectedDept.faculty.replace('Faculty of ', '')})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500">{loading ? 'Loading official DIU departments...' : placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Hidden input for HTML form compliance */}
      <input type="hidden" name="department" value={value} required={required} />

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search official DIU departments (e.g. Accounting, CSE, BBA)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          {/* Grouped Department List */}
          <div ref={listRef} className="max-h-64 overflow-y-auto p-1.5 space-y-3 custom-scrollbar">
            {groupedDepartments.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No official DIU department found matching &quot;{search}&quot;.
              </div>
            ) : (
              groupedDepartments.map((group) => (
                <div key={group.faculty} className="space-y-1">
                  <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90 border-b border-slate-800/60 flex items-center justify-between">
                    <span>{group.faculty}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {group.items.length} {group.items.length === 1 ? 'dept' : 'depts'}
                    </span>
                  </div>
                  {group.items.map((dept) => {
                    const isSelected = value === dept.official_name;
                    const flatIdx = flatSelectable.findIndex((item) => item.id === dept.id);
                    const isHighlighted = flatIdx === highlightedIndex;

                    return (
                      <div
                        key={dept.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onChange(dept.official_name);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        onMouseEnter={() => setHighlightedIndex(flatIdx)}
                        className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                            : isHighlighted
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{dept.official_name}</span>
                          {dept.code && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded font-mono">
                              {dept.code}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Official Daffodil International University Directory</span>
            <span className="text-slate-400 font-mono text-[10px]">Total: {departments.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
