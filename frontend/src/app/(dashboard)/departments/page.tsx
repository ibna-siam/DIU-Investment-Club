'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ArrowUpDown,
  GraduationCap,
  ShieldAlert,
  Save,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { departmentsService, Department } from '../../../services/departments.service';
import { useAuth } from '../../../hooks/useAuth';

const OFFICIAL_FACULTIES = [
  'Faculty of Science & Information Technology',
  'Faculty of Engineering',
  'Faculty of Business & Entrepreneurship',
  'Faculty of Humanities & Social Science',
  'Faculty of Health & Life Sciences',
  'Faculty of Agricultural Sciences',
];

export default function DepartmentsManagementPage() {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [modalForm, setModalForm] = useState({
    official_name: '',
    faculty: OFFICIAL_FACULTIES[0],
    code: '',
    sort_order: 0,
    active: true,
  });
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadDepartments = async () => {
    setLoading(true);
    try {
      // If super admin, fetch all (including inactive)
      const data = isSuperAdmin
        ? await departmentsService.getAllDepartments()
        : await departmentsService.getActiveDepartments(true);
      setDepartments(data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load department directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [isSuperAdmin]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        !search.trim() ||
        d.official_name.toLowerCase().includes(search.toLowerCase().trim()) ||
        d.faculty.toLowerCase().includes(search.toLowerCase().trim()) ||
        (d.code && d.code.toLowerCase().includes(search.toLowerCase().trim()));

      const matchesFaculty = selectedFaculty === 'ALL' || d.faculty === selectedFaculty;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && d.active) ||
        (statusFilter === 'INACTIVE' && !d.active);

      return matchesSearch && matchesFaculty && matchesStatus;
    });
  }, [departments, search, selectedFaculty, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingDept(null);
    setModalForm({
      official_name: '',
      faculty: OFFICIAL_FACULTIES[0],
      code: '',
      sort_order: departments.length + 1,
      active: true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept: Department) => {
    setEditingDept(dept);
    setModalForm({
      official_name: dept.official_name,
      faculty: dept.faculty,
      code: dept.code || '',
      sort_order: dept.sort_order,
      active: dept.active,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSaving(true);

    try {
      if (editingDept) {
        await departmentsService.updateDepartment(editingDept.id, {
          official_name: modalForm.official_name,
          faculty: modalForm.faculty,
          code: modalForm.code || null,
          sort_order: Number(modalForm.sort_order),
          active: modalForm.active,
        });
        setSuccess(`Department "${modalForm.official_name}" updated successfully.`);
      } else {
        await departmentsService.createDepartment({
          official_name: modalForm.official_name,
          faculty: modalForm.faculty,
          code: modalForm.code || undefined,
          sort_order: Number(modalForm.sort_order),
          active: modalForm.active,
        });
        setSuccess(`Department "${modalForm.official_name}" created successfully.`);
      }

      setIsModalOpen(false);
      await loadDepartments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || 'Failed to save department.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    if (!isSuperAdmin) return;
    if (togglingId) return; // Prevent duplicate requests while another toggle is in flight

    const targetActive = !dept.active;
    setTogglingId(dept.id);
    setError('');

    // Optimistic UI update
    setDepartments((prev) =>
      prev.map((d) => (d.id === dept.id ? { ...d, active: targetActive } : d))
    );

    try {
      await departmentsService.updateDepartment(dept.id, { active: targetActive });
      setSuccess(`Department "${dept.official_name}" status set to ${targetActive ? 'ACTIVE' : 'INACTIVE'}.`);
      departmentsService.invalidateCache();
      await loadDepartments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      // Revert optimistic update on failure
      setDepartments((prev) =>
        prev.map((d) => (d.id === dept.id ? { ...d, active: dept.active } : d))
      );
      setError(err.response?.data?.error?.message || 'Failed to toggle status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!isSuperAdmin) return;
    if (
      !confirm(
        `Are you sure you want to delete "${dept.official_name}"? Note: If members are currently linked to this department, deactivating it is safer.`
      )
    ) {
      return;
    }

    try {
      await departmentsService.deleteDepartment(dept.id);
      setSuccess(`Department "${dept.official_name}" deleted.`);
      await loadDepartments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete department.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">DIU Department Directory</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Official Daffodil International University academic departments master database
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/members"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors"
          >
            Back to Members
          </Link>
          {isSuperAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Non-Super Admin Banner */}
      {!isSuperAdmin && (
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You are viewing the official department directory in read-only mode. Only SUPER_ADMIN can modify the master directory.
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search departments, faculties, codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Faculties ({departments.length})</option>
            {OFFICIAL_FACULTIES.map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Sort #</th>
                <th className="px-5 py-3.5">Official Department Name</th>
                <th className="px-5 py-3.5">Faculty / School</th>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Status</th>
                {isSuperAdmin && <th className="px-5 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Loading official departments directory...
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No departments found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400">{dept.sort_order}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-white">{dept.official_name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{dept.faculty}</td>
                    <td className="px-5 py-3.5">
                      {dept.code ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {dept.code}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          disabled={togglingId === dept.id}
                          onClick={() => handleToggleActive(dept)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 ${
                            togglingId === dept.id
                              ? 'bg-slate-800/80 text-slate-300 border border-slate-700 cursor-wait'
                              : dept.active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 cursor-pointer'
                          }`}
                          title="Click to toggle active/inactive"
                        >
                          {togglingId === dept.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                              <span>Updating...</span>
                            </>
                          ) : dept.active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Inactive
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                            dept.active ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {dept.active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(dept)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Showing {filteredDepartments.length} of {departments.length} official departments</span>
          <span>Daffodil International University Master Directory</span>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                {editingDept ? 'Edit Official Department' : 'Add Official DIU Department'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Official Department Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Department of Accounting"
                  value={modalForm.official_name}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, official_name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Faculty / School <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={modalForm.faculty}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, faculty: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {OFFICIAL_FACULTIES.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ACC, CSE, SWE"
                    value={modalForm.code}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={modalForm.sort_order}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeCheckbox"
                  checked={modalForm.active}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                />
                <label htmlFor="activeCheckbox" className="text-xs text-slate-300">
                  Active (available in member registration dropdowns)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {modalSaving ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
