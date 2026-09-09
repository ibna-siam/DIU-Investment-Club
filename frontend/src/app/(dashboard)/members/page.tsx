'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  CreditCard,
  Building2,
  GraduationCap,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  FileText,
  Trash2,
  Archive,
  AlertTriangle,
  Shield,
  X,
} from 'lucide-react';
import { membersService } from '../../../services/members.service';
import { Member, MembershipType } from '../../../types/financial';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';

export default function MembersPage() {
  const { hasPermission } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [typeId, setTypeId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Safe Member Removal Modal State (Sections 2, 3, 4, 5)
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [impactSummary, setImpactSummary] = useState<any | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [removalAction, setRemovalAction] = useState<'ARCHIVE' | 'DEACTIVATE' | 'HARD_DELETE'>('ARCHIVE');
  const [removalReason, setRemovalReason] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await membersService.getMembers({
        search: search || undefined,
        department: department || undefined,
        membership_status: status || undefined,
        membership_type_id: typeId || undefined,
        page,
        limit: 10,
      });
      setMembers(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, department, status, typeId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchMembers();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  useEffect(() => {
    membersService.getMembershipTypes().then((types) => setMembershipTypes(types || [])).catch(() => {});
  }, []);

  // Quick stats
  const activeCount = members.filter((m) => m.membership_status === 'ACTIVE').length;
  const pendingCount = members.filter((m) => m.membership_status === 'PENDING').length;
  const totalDues = members.reduce((sum, m) => sum + (m.outstanding_dues || 0), 0);

  const openRemoveModal = async (member: Member) => {
    setTargetMember(member);
    setShowRemoveModal(true);
    setImpactLoading(true);
    setImpactSummary(null);
    setConfirmInput('');
    setRemovalReason('');
    setRemovalAction('ARCHIVE');
    try {
      const summary = await membersService.getImpactSummary(member.id);
      setImpactSummary(summary);
      if (!summary.canHardDelete) {
        setRemovalAction('ARCHIVE');
      }
    } catch (err: any) {
      console.error('Failed to get impact summary', err);
    } finally {
      setImpactLoading(false);
    }
  };

  const handleExecuteRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMember) return;
    if (removalAction === 'HARD_DELETE' && confirmInput.trim().toUpperCase() !== 'REMOVE') {
      return;
    }

    setRemovalSubmitting(true);
    try {
      const res = await membersService.removeMember(targetMember.id, {
        action: removalAction,
        reason: removalReason || undefined,
      });

      setBannerMessage({
        type: 'success',
        text: res.message || `Member ${targetMember.full_name} processed successfully (${removalAction}).`,
      });
      setShowRemoveModal(false);
      setTargetMember(null);

      // Immediate state update (no window.location.reload)
      if (removalAction === 'HARD_DELETE') {
        setMembers((prev) => prev.filter((m) => m.id !== targetMember.id));
        setTotalCount((c) => Math.max(0, c - 1));
      } else {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === targetMember.id
              ? {
                  ...m,
                  membership_status: removalAction === 'ARCHIVE' ? 'ARCHIVED' : 'INACTIVE',
                }
              : m
          )
        );
      }
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err.message || 'Failed to complete member removal operation.',
      });
    } finally {
      setRemovalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Message */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{bannerMessage.text}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" />
            Member Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage club members, student credentials, tiers, dues obligations, and lifecycle statuses
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission('members.create') && (
            <Link
              href="/members/create"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/40"
            >
              <UserPlus className="w-4 h-4" />
              Register Member
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Members</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{totalCount}</div>
          <div className="text-xs text-slate-500 mt-1">Across all DIU departments</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Members</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-400">{activeCount}</div>
          <div className="text-xs text-slate-500 mt-1">Current page active</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Activation</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-400">{pendingCount}</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting joining fee verification</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Page Outstanding Dues</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-400">৳{totalDues.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Unsettled fee obligations</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between backdrop-blur-xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student ID, name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="GRADUATED">GRADUATED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>

          <select
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Membership Tiers</option>
            {membershipTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            onClick={fetchMembers}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Member Code</th>
                <th className="px-6 py-4 font-semibold">Member Info</th>
                <th className="px-6 py-4 font-semibold">Academic</th>
                <th className="px-6 py-4 font-semibold">Membership Tier</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Outstanding Dues</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading members directory...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No members found matching your search criteria.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-emerald-400">
                      {m.member_code}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{m.full_name}</div>
                      <div className="text-xs text-slate-400">{m.email}</div>
                      {m.phone && <div className="text-xs text-slate-500">{m.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-200">{m.student_id}</div>
                      <div className="text-xs text-slate-400">
                        {m.department || 'N/A'} {m.batch ? `(${m.batch})` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {m.membership_type ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          {m.membership_type.name.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={m.membership_status} />
                    </td>
                    <td className="px-6 py-4">
                      {m.outstanding_dues && m.outstanding_dues > 0 ? (
                        <span className="text-sm font-semibold text-rose-400">
                          ৳{m.outstanding_dues.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium">Cleared</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/members/${m.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Member Workspace"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {(hasPermission('members.archive') || hasPermission('members.delete') || hasPermission('members.update')) && (
                          <button
                            onClick={() => openRemoveModal(m)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            title="Manage Status / Safe Removal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-sm">
            <span className="text-xs text-slate-400">
              Showing page {page} of {totalPages} ({totalCount} total members)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Safe Member Removal & Impact Modal (Sections 2, 3, 4, 5) */}
      {showRemoveModal && targetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Member Removal & Impact Analysis</h3>
                  <p className="text-xs text-slate-400">{targetMember.full_name} ({targetMember.member_code})</p>
                </div>
              </div>
              <button
                onClick={() => setShowRemoveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {impactLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                Calculating financial balance sheet and governance impact...
              </div>
            ) : impactSummary ? (
              <form onSubmit={handleExecuteRemoval} className="mt-4 space-y-4">
                {/* Impact Report Grid */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Financial & Governance Dependencies:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400">Total Dues Incurred:</div>
                      <div className="font-semibold text-white mt-0.5">৳{impactSummary.totalDuesAmount?.toLocaleString() || 0} ({impactSummary.totalDuesCount} records)</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400">Unpaid / Outstanding:</div>
                      <div className={`font-semibold mt-0.5 ${impactSummary.outstandingDuesAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ৳{impactSummary.outstandingDuesAmount?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400">Recorded Payments:</div>
                      <div className="font-semibold text-emerald-400 mt-0.5">৳{impactSummary.totalPaidAmount?.toLocaleString() || 0} ({impactSummary.paymentsCount} payments)</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400">Governance Appointments:</div>
                      <div className="font-semibold text-white mt-0.5">{impactSummary.committeeRolesCount} committee positions</div>
                    </div>
                  </div>

                  {!impactSummary.canHardDelete && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Hard Deletion Restricted:</strong>
                        {impactSummary.blockReason} Permanent deletion is disabled to prevent orphan general ledger entries. You may Archive or Deactivate instead.
                      </div>
                    </div>
                  )}
                </div>

                {/* Choose Safe Action */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Select Resolution Method:</label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${removalAction === 'ARCHIVE' ? 'bg-blue-500/10 border-blue-500/40 text-white' : 'bg-slate-800/40 border-slate-800 text-slate-300'}`}>
                      <input
                        type="radio"
                        name="removalAction"
                        value="ARCHIVE"
                        checked={removalAction === 'ARCHIVE'}
                        onChange={() => setRemovalAction('ARCHIVE')}
                        className="mt-1"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">Archive Member (Recommended)</span>
                        <span className="text-slate-400">Moves to archive. Completely preserves all historical payments, dues, and general ledger records.</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${removalAction === 'DEACTIVATE' ? 'bg-blue-500/10 border-blue-500/40 text-white' : 'bg-slate-800/40 border-slate-800 text-slate-300'}`}>
                      <input
                        type="radio"
                        name="removalAction"
                        value="DEACTIVATE"
                        checked={removalAction === 'DEACTIVATE'}
                        onChange={() => setRemovalAction('DEACTIVATE')}
                        className="mt-1"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">Deactivate (Status: INACTIVE)</span>
                        <span className="text-slate-400">Suspends member active privileges without altering dues ledger. Member can be reactivated later.</span>
                      </div>
                    </label>

                    {impactSummary.canHardDelete && (
                      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${removalAction === 'HARD_DELETE' ? 'bg-rose-500/10 border-rose-500/40 text-white' : 'bg-slate-800/40 border-slate-800 text-slate-300'}`}>
                        <input
                          type="radio"
                          name="removalAction"
                          value="HARD_DELETE"
                          checked={removalAction === 'HARD_DELETE'}
                          onChange={() => setRemovalAction('HARD_DELETE')}
                          className="mt-1"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-rose-400 block">Permanent Hard Delete</span>
                          <span className="text-slate-400">Allowed only because 0 payments exist. Permanently deletes registration record.</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Reason Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Audit Log Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Graduated, requested removal, or administrative audit"
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Type REMOVE confirmation if hard delete */}
                {removalAction === 'HARD_DELETE' && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 space-y-2">
                    <span className="text-xs font-semibold text-rose-300 block">
                      Confirmation Required: Type <strong className="text-white underline">REMOVE</strong> below to confirm hard delete:
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Type REMOVE"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      className="w-full bg-slate-900 border border-rose-500/50 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-rose-400"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRemoveModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      removalSubmitting ||
                      (removalAction === 'HARD_DELETE' && confirmInput.trim().toUpperCase() !== 'REMOVE')
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 ${
                      removalAction === 'HARD_DELETE'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {removalSubmitting
                      ? 'Processing...'
                      : removalAction === 'HARD_DELETE'
                      ? 'Confirm Hard Delete'
                      : removalAction === 'ARCHIVE'
                      ? 'Archive Member Safely'
                      : 'Deactivate Member'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
