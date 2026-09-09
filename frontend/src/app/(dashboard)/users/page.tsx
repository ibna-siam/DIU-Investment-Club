'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { UserProfile, Role, PaginatedResponse } from '../../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
  const { user: currentUser, hasPermission, hasRole } = useAuth();
  const queryClient = useQueryClient();

  // Filter & Pagination state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Create User Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch Users
  const { data: usersData, isLoading: usersLoading } = useQuery<PaginatedResponse<UserProfile>>({
    queryKey: ['users', { search, statusFilter, roleFilter, page, limit }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (roleFilter) params.set('role', roleFilter);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      return api.get(`/users?${params.toString()}`);
    },
  });

  // Fetch Roles for dropdowns
  const { data: rolesData } = useQuery<{ success: boolean; data: Role[] }>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles'),
  });

  // User Direct Permissions Modal state
  const [userPermsModalOpen, setUserPermsModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);
  const [userDirectPerms, setUserDirectPerms] = useState<any[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [selectedPermToGrant, setSelectedPermToGrant] = useState('');

  // Fetch all permissions list for assigning overrides
  const { data: allPermsData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['all-permissions-list'],
    queryFn: () => api.get('/permissions'),
    enabled: userPermsModalOpen,
  });

  const handleOpenUserPerms = async (u: UserProfile) => {
    setSelectedUserForPerms(u);
    setUserPermsModalOpen(true);
    setLoadingPerms(true);
    try {
      const res = await api.get<{ success: boolean; data: { direct: any[]; effective: string[] } }>(
        `/users/${u.id}/permissions`
      );
      if (res.success && res.data) {
        setUserDirectPerms(res.data.direct || []);
      }
    } catch (e) {
      setUserDirectPerms([]);
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleGrantPermission = async () => {
    if (!selectedUserForPerms || !selectedPermToGrant) return;
    try {
      const res = await api.post<{ success: boolean; data: { direct: any[] } }>(
        `/users/${selectedUserForPerms.id}/permissions`,
        { permission_id: selectedPermToGrant }
      );
      if (res.success && res.data) {
        setUserDirectPerms(res.data.direct || []);
        setSelectedPermToGrant('');
      }
    } catch (e) {}
  };

  const handleRevokePermission = async (permId: string) => {
    if (!selectedUserForPerms) return;
    try {
      const res = await api.delete<{ success: boolean; data: { direct: any[] } }>(
        `/users/${selectedUserForPerms.id}/permissions/${permId}`
      );
      if (res.success && res.data) {
        setUserDirectPerms(res.data.direct || []);
      }
    } catch (e) {}
  };

  // Toggle User Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      api.patch(`/users/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: (body: any) => api.post('/users', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setCreateError(err.message || 'Failed to create user');
    },
  });

  const resetForm = () => {
    setNewFullName('');
    setNewEmail('');
    setNewStudentId('');
    setNewPhone('');
    setNewPassword('');
    setNewRoleId('');
    setCreateError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const trimmedName = newFullName.trim();
    const trimmedEmail = newEmail.trim();

    if (!trimmedName) {
      setCreateError('Full name is required');
      return;
    }
    if (!trimmedEmail) {
      setCreateError('Email address is required');
      return;
    }

    createUserMutation.mutate({
      full_name: trimmedName,
      email: trimmedEmail,
      student_id: newStudentId.trim() || undefined,
      phone: newPhone.trim() || undefined,
      password: newPassword.trim() || undefined,
      role_id: newRoleId || undefined,
      status: 'active',
    });
  };

  const users = usersData?.data || [];
  const totalPages = usersData?.totalPages || 1;
  const roles = rolesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View, filter, manage account access, and assign club roles.
          </p>
        </div>

        {hasPermission('users.create') && (
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 gap-2 self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Member / User</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, student ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-800/80 text-xs uppercase tracking-wider text-slate-300 font-semibold">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Student ID</th>
                <th className="px-6 py-3.5">Assigned Roles</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {usersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No users match the search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isActive = u.status === 'active';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-bold text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {u.student_id || '—'}
                      </td>

                      {/* Roles */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles && u.roles.length > 0 ? (
                            u.roles.map((r) => (
                              <Badge key={r.id} variant="info" className="text-[11px]">
                                {r.name}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-[11px]">
                              None
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <Badge variant={isActive ? 'success' : 'danger'}>
                          {u.status.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link href={`/users/${u.id}`}>
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </Button>
                          </Link>

                          {hasRole('SUPER_ADMIN') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs border-indigo-500/40 text-indigo-400 hover:bg-indigo-950/30"
                              onClick={() => handleOpenUserPerms(u)}
                            >
                              <Shield className="h-3.5 w-3.5" />
                              <span>Overrides</span>
                            </Button>
                          )}

                          {hasPermission('users.manage') && !isCurrent && (
                            <Button
                              variant={isActive ? 'destructive' : 'secondary'}
                              size="sm"
                              className="h-8 text-xs"
                              loading={toggleStatusMutation.isPending}
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  id: u.id,
                                  status: isActive ? 'inactive' : 'active',
                                })
                              }
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </p>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Member / User"
        description="Create an authorized club account and assign initial functional role."
      >
        {createError && (
          <div className="mb-4 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <Input
              required
              placeholder="e.g. Shakib Al Hasan"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Email Address *
            </label>
            <Input
              required
              type="email"
              placeholder="e.g. member@diu-invest.club"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Student ID
              </label>
              <Input
                placeholder="e.g. 211-15-4001"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <Input
                placeholder="e.g. +8801700000000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Initial Password
            </label>
            <Input
              type="password"
              placeholder="Default: Club@12345"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Primary Role Assignment
            </label>
            <select
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Select a role (optional)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createUserMutation.isPending}
              disabled={createUserMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* User Permissions Overrides Modal */}
      <Modal
        isOpen={userPermsModalOpen}
        onClose={() => {
          setUserPermsModalOpen(false);
          setSelectedUserForPerms(null);
        }}
        title={`Permission Overrides: ${selectedUserForPerms?.full_name || 'User'}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs">
            <p className="text-slate-400">User Email: <span className="text-white font-semibold">{selectedUserForPerms?.email}</span></p>
            <p className="text-slate-400 mt-0.5">Assigned Roles: <span className="text-emerald-400 font-semibold">{selectedUserForPerms?.roles?.map((r) => r.name).join(', ') || 'None'}</span></p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Granted Direct Permission Overrides ({userDirectPerms.length})
            </h4>
            {loadingPerms ? (
              <div className="h-20 flex items-center justify-center text-xs text-slate-400">
                Loading overrides...
              </div>
            ) : userDirectPerms.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-850 rounded-xl border border-dashed border-slate-700">
                No direct permission overrides granted. User operates strictly under their assigned role permissions.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {userDirectPerms.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-slate-800 rounded-lg border border-slate-700 text-xs"
                  >
                    <div>
                      <span className="font-mono font-semibold text-emerald-400">{p.module}.{p.action}</span>
                      <p className="text-[11px] text-slate-400">{p.description || p.name}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => handleRevokePermission(p.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              Grant Individual Permission Override
            </h4>
            <div className="flex gap-2">
              <select
                value={selectedPermToGrant}
                onChange={(e) => setSelectedPermToGrant(e.target.value)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select a permission to grant...</option>
                {allPermsData?.data
                  ?.filter((p) => !userDirectPerms.some((dp) => dp.id === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.module}.{p.action} — {p.description || p.name}
                    </option>
                  ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                disabled={!selectedPermToGrant}
                onClick={handleGrantPermission}
                className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3"
              >
                Grant
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUserPermsModalOpen(false);
                setSelectedUserForPerms(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
