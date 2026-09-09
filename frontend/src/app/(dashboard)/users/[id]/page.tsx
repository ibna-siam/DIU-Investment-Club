'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../hooks/useAuth';
import { UserProfile, Role } from '../../../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { formatDate, formatDateTime } from '../../../../lib/utils';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser, hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch target user profile
  const { data: userData, isLoading, error } = useQuery<{ success: boolean; data: UserProfile }>({
    queryKey: ['user', id],
    queryFn: () => api.get(`/users/${id}`),
    enabled: Boolean(id),
  });

  // Fetch all roles for assignment modal
  const { data: rolesData } = useQuery<{ success: boolean; data: Role[] }>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles'),
  });

  // Toggle status mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus: 'active' | 'inactive') =>
      api.patch(`/users/${id}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update account status');
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.post(`/users/${id}/roles`, { role_id: roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setAssignModalOpen(false);
      setSelectedRoleId('');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to assign role');
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.delete(`/users/${id}/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to remove role');
    },
  });

  const profile = userData?.data;
  const allRoles = rolesData?.data || [];
  const assignedRoleIds = profile?.roles?.map((r) => r.id) || [];
  const availableRoles = allRoles.filter((r) => !assignedRoleIds.includes(r.id));
  const isSelf = currentUser?.id === profile?.id;
  const canManageRoles = hasRole('SUPER_ADMIN');
  const canManageStatus = hasPermission('users.manage') && !isSelf;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-1" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-bold">User Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">The requested profile does not exist.</p>
        <Link href="/users">
          <Button variant="outline" className="mt-4">
            Back to Users
          </Button>
        </Link>
      </div>
    );
  }

  const isActive = profile.status === 'active';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/users">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {profile.full_name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              User ID: <span className="font-mono">{profile.id}</span>
            </p>
          </div>
        </div>

        {/* Status Action Button */}
        {canManageStatus && (
          <Button
            variant={isActive ? 'destructive' : 'primary'}
            loading={statusMutation.isPending}
            onClick={() => statusMutation.mutate(isActive ? 'inactive' : 'active')}
            className={isActive ? '' : 'bg-emerald-600 hover:bg-emerald-500'}
          >
            {isActive ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            <span>{isActive ? 'Deactivate Account' : 'Activate Account'}</span>
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4 text-xs text-rose-300 flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Overview & Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Profile Summary Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 font-bold text-3xl text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-800 shadow-sm">
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
              {profile.full_name}
            </h3>
            <div className="mt-1 flex justify-center">
              <Badge variant={isActive ? 'success' : 'danger'}>
                {profile.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>

            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <GraduationCap className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Student ID: {profile.student_id || 'Not Specified'}</span>
            </div>

            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{profile.phone || 'No phone recorded'}</span>
            </div>

            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Registered: {formatDate(profile.created_at)}</span>
            </div>

            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Last Updated: {formatDateTime(profile.updated_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Right: Assigned Roles & Permissions Card */}
        <div className="md:col-span-2 space-y-6">
          {/* Roles Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Assigned Roles</CardTitle>
                <CardDescription>
                  Functional responsibilities determining module permissions.
                </CardDescription>
              </div>

              {canManageRoles && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={availableRoles.length === 0}
                  onClick={() => setAssignModalOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Assign Role</span>
                </Button>
              )}
            </CardHeader>

            <CardContent>
              {profile.roles && profile.roles.length > 0 ? (
                <div className="space-y-3">
                  {profile.roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3.5"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {role.name}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                            {role.slug}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {role.description}
                        </p>
                      </div>

                      {canManageRoles && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removeRoleMutation.isPending || (isSelf && role.slug === 'SUPER_ADMIN')}
                          onClick={() => removeRoleMutation.mutate(role.id)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 px-2"
                          title={isSelf && role.slug === 'SUPER_ADMIN' ? 'Cannot revoke own Super Admin' : 'Remove role'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                  No roles currently assigned to this user.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolved Effective Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Effective Permissions</CardTitle>
              <CardDescription>
                Resolved capabilities derived from assigned roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.permissions?.includes('*') ? (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    <span>Unrestricted Administrative Access (*)</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                    This user holds the Super Admin role and possesses full permissions across all 18 modules and system actions.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.permissions && profile.permissions.length > 0 ? (
                    profile.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-mono text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No active permissions.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Role Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedRoleId('');
        }}
        title={`Assign Role to ${profile.full_name}`}
        description="Select a role to grant corresponding module permissions."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Available Roles
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Choose a role to assign...</option>
              {availableRoles.map((r) => (
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
                setAssignModalOpen(false);
                setSelectedRoleId('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!selectedRoleId}
              loading={assignRoleMutation.isPending}
              onClick={() => assignRoleMutation.mutate(selectedRoleId)}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
