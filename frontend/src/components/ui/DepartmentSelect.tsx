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
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load cached departments once, and re-fetch if departments are modified elsewhere
  useEffect(() => {
    let mounted = true;
    const fetchActiveDepts = (force = false) => {
      departmentsService
        .getActiveDepartments(force)
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
    };

    fetchActiveDepts(false);

    const handleDepartmentsChanged = () => {
      fetchActiveDepts(true);
    };

    window.addEventListener('departments-changed', handleDepartmentsChanged);
    return () => {
      mounted = false;
      window.removeEventListener('departments-changed', handleDepartmentsChanged);
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

  // Focus search input when opened without scrolling the page
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 50);
      return () => clearTimeout(timer);
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

  // Scroll highlighted item into view inside the dropdown menu ONLY (never scroll the window)
  useEffect(() => {
    if (isOpen && listRef.current && optionRefs.current[highlightedIndex]) {
      const container = listRef.current;
      const element = optionRefs.current[highlightedIndex];
      if (!element) return;

      const elementTop = element.offsetTop;
      const elementBottom = elementTop + element.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      if (elementTop < containerTop) {
        container.scrollTop = elementTop;
      } else if (elementBottom > containerBottom) {
        container.scrollTop = elementBottom - container.clientHeight;
      }
    }
  }, [highlightedIndex, isOpen]);

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
    <div
      className={`relative ${isOpen ? 'z-[70]' : 'z-auto'} ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
      style={{ position: 'relative' }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 bg-slate-950 border ${
          error
            ? 'border-rose-500/80 ring-1 ring-rose-500/20'
            : isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-slate-800 hover:border-slate-700'
        } rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-150 focus:outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {value ? (
            <div className="truncate flex items-center gap-2">
              <span className="text-white font-medium text-sm">{value}</span>
              {selectedDept?.faculty && (
                <span className="hidden sm:inline-block text-xs text-slate-400 font-normal truncate">
                  • {selectedDept.faculty.replace('Faculty of ', '')}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-sm">
              {loading ? 'Loading official DIU departments...' : placeholder}
            </span>
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
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Hidden input for HTML form compliance */}
      <input type="hidden" name="department" value={value} required={required} />

      {/* Dropdown Menu - Strictly absolute overlay, positioned directly below input with zero document flow impact */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 w-full bg-[#0b1329] border border-slate-700 rounded-xl shadow-2xl ring-1 ring-white/10 overflow-hidden"
          style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999 }}
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-800 bg-[#070d1e]">
            <div className="relative">
              <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search official DIU departments (e.g. Accounting, CSE, BBA)..."
                className="w-full bg-[#0b1329] border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Department List */}
          <div
            ref={listRef}
            className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 space-y-2.5 custom-scrollbar bg-[#0b1329]"
          >
            {groupedDepartments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-300">
                No official DIU department found matching &quot;{search}&quot;.
              </div>
            ) : (
              groupedDepartments.map((group) => (
                <div key={group.faculty} className="space-y-1">
                  {/* Sticky Faculty Header for clear sectioning */}
                  <div className="sticky top-0 z-10 px-2.5 py-1.5 bg-[#070d1e]/95 backdrop-blur-md border-b border-slate-800/80 rounded flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      {group.faculty}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
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
                        ref={(el) => {
                          optionRefs.current[flatIdx] = el;
                        }}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onChange(dept.official_name);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        onMouseEnter={() => setHighlightedIndex(flatIdx)}
                        className={`px-3 py-2.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all duration-100 ${
                          isSelected
                            ? 'bg-emerald-500/25 text-emerald-200 font-semibold border border-emerald-500/40 shadow-sm'
                            : isHighlighted
                            ? 'bg-slate-800 text-white font-medium border border-slate-700'
                            : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="truncate">{dept.official_name}</span>
                          {dept.code && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] bg-slate-950 text-emerald-400 border border-slate-800 rounded font-mono font-medium">
                              {dept.code}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-2 bg-[#070d1e] border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="font-medium">Official Daffodil International University Directory</span>
            <span className="text-emerald-400 font-mono text-[10px] font-semibold">
              {filteredDepartments.length} of {departments.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
