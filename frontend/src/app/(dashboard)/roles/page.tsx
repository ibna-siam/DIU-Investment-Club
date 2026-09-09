'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { Role, Permission } from '../../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Check,
  Lock,
  Layers,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';

export default function RolesPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  // Selected Role for Permission Editing
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Create Role Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete Role Confirmation Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Selected Permission IDs for the active role being edited
  const [activePermIds, setActivePermIds] = useState<string[]>([]);
  const [hasUnsavedPerms, setHasUnsavedPerms] = useState(false);
  const [rolePermsLoading, setRolePermsLoading] = useState(false);

  // Fetch Roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery<{ success: boolean; data: Role[] }>({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles'),
  });

  // Fetch all permissions grouped by module
  const { data: modulesData, isLoading: permsLoading } = useQuery<{
    success: boolean;
    data: Record<string, Permission[]>;
  }>({
    queryKey: ['permissions-modules'],
    queryFn: () => api.get('/permissions/modules'),
  });

  // When a role is selected, load its permissions
  const handleSelectRole = async (role: Role) => {
    setSelectedRole(role);
    setHasUnsavedPerms(false);
    if (role.slug === 'SUPER_ADMIN') {
      setActivePermIds([]);
      setRolePermsLoading(false);
      return;
    }
    setRolePermsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Permission[] }>(
        `/roles/${role.id}/permissions`
      );
      if (res.success && res.data) {
        setActivePermIds(res.data.map((p) => p.id));
      } else {
        setActivePermIds([]);
      }
    } catch (e) {
      setActivePermIds([]);
    } finally {
      setRolePermsLoading(false);
    }
  };

  // Auto-select Treasurer or first role on initial load if none selected
  React.useEffect(() => {
    if (!selectedRole && rolesData?.data && rolesData.data.length > 0) {
      const defaultRole = rolesData.data.find((r) => r.slug === 'TREASURER') || rolesData.data[0];
      handleSelectRole(defaultRole);
    }
  }, [rolesData?.data]);

  // Create Role Mutation
  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; description: string }) =>
      api.post('/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleSlug('');
      setNewRoleDesc('');
      setCreateError(null);
    },
    onError: (err: any) => {
      setCreateError(err.message || 'Failed to create role');
    },
  });

  // Delete Role Mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      if (selectedRole?.id === roleToDelete?.id) {
        setSelectedRole(null);
      }
    },
  });

  // Save Permissions Mutation
  const savePermsMutation = useMutation({
    mutationFn: ({ roleId, permIds }: { roleId: string; permIds: string[] }) =>
      api.patch(`/roles/${roleId}/permissions`, { permissionIds: permIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setHasUnsavedPerms(false);
    },
  });

  const roles = rolesData?.data || [];
  const moduleGroups = modulesData?.data || {};

  // Toggle individual permission checkbox
  const togglePermission = (permId: string) => {
    if (selectedRole?.slug === 'SUPER_ADMIN') return; // Super admin has all
    setActivePermIds((prev) => {
      const next = prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId];
      setHasUnsavedPerms(true);
      return next;
    });
  };

  // Toggle all permissions within a module
  const toggleModuleAll = (modulePerms: Permission[]) => {
    if (selectedRole?.slug === 'SUPER_ADMIN') return;
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) => activePermIds.includes(id));

    setActivePermIds((prev) => {
      let next: string[];
      if (allSelected) {
        next = prev.filter((id) => !modulePermIds.includes(id));
      } else {
        const toAdd = modulePermIds.filter((id) => !prev.includes(id));
        next = [...prev, ...toAdd];
      }
      setHasUnsavedPerms(true);
      return next;
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createRoleMutation.mutate({
      name: newRoleName,
      slug: newRoleSlug.toUpperCase().replace(/\s+/g, '_'),
      description: newRoleDesc,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure club roles and granular action permissions across all 18 system modules.
          </p>
        </div>

        {hasRole('SUPER_ADMIN') && (
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Role</span>
          </Button>
        )}
      </div>

      {/* Main Grid: Roles List (Left) & Permissions Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Roles List Card (4 cols) */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-bold">Defined Roles</CardTitle>
            <CardDescription>Select a role to inspect or update permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rolesLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : (
              roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;

                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {r.name}
                          </span>
                          {r.is_system && (
                            <span className="flex items-center gap-1 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                              <Lock className="h-2.5 w-2.5" />
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {r.description}
                        </p>
                      </div>

                      {!r.is_system && hasRole('SUPER_ADMIN') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoleToDelete(r);
                            setDeleteModalOpen(true);
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800/80">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {r.permissionsCount ?? 0} permissions
                      </span>
                      <span className="font-mono">{r.slug}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Permissions Matrix Card (8 cols) */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Permission Matrix</span>
                {selectedRole && (
                  <Badge variant="info" className="text-xs">
                    {selectedRole.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedRole
                  ? `Configure accessible modules and authorized actions for ${selectedRole.name}`
                  : 'Select a role from the list on the left to review or edit permissions'}
              </CardDescription>
            </div>

            {selectedRole && hasRole('SUPER_ADMIN') && (
              <Button
                variant="primary"
                size="sm"
                disabled={!hasUnsavedPerms || selectedRole.slug === 'SUPER_ADMIN'}
                loading={savePermsMutation.isPending}
                onClick={() =>
                  savePermsMutation.mutate({
                    roleId: selectedRole.id,
                    permIds: activePermIds,
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <Check className="h-4 w-4 mr-1.5" />
                <span>Save Changes</span>
              </Button>
            )}
          </CardHeader>

          <CardContent className="pt-6">
            {rolePermsLoading ? (
              <div className="space-y-6 p-4">
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                  </div>
                </div>
              </div>
            ) : !selectedRole ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <ShieldCheck className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="font-semibold text-sm">No Role Selected</p>
                <p className="text-xs max-w-sm mt-1">
                  Click on any role in the left panel to inspect its assigned actions and module privileges.
                </p>
              </div>
            ) : selectedRole.slug === 'SUPER_ADMIN' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                <div className="flex items-center space-x-2 font-bold text-base mb-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span>Full System Super Administrator</span>
                </div>
                <p className="text-xs leading-relaxed">
                  The Super Admin role inherently holds wildcard (<code className="font-mono font-bold">*</code>) authority across all modules and cannot have individual permissions restricted.
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {Object.entries(moduleGroups).map(([moduleName, perms]) => {
                  const modulePermIds = perms.map((p) => p.id);
                  const isAllChecked = modulePermIds.every((id) => activePermIds.includes(id));
                  const isSomeChecked =
                    modulePermIds.some((id) => activePermIds.includes(id)) && !isAllChecked;

                  return (
                    <div
                      key={moduleName}
                      className="rounded-xl border border-slate-800 bg-slate-800/40 p-4"
                    >
                      {/* Module Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center space-x-2">
                          <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            {moduleName.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {hasRole('SUPER_ADMIN') && (
                          <button
                            type="button"
                            onClick={() => toggleModuleAll(perms)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            {isAllChecked ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      {/* Action Checkboxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                        {perms.map((perm) => {
                          const isChecked = activePermIds.includes(perm.id);

                          return (
                            <label
                              key={perm.id}
                              className={`flex items-center space-x-2.5 rounded-lg border p-2.5 text-xs transition-all select-none ${
                                isChecked
                                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-medium shadow-sm shadow-emerald-950/20'
                                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 hover:border-slate-700 hover:text-slate-300'
                              } ${hasRole('SUPER_ADMIN') ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!hasRole('SUPER_ADMIN')}
                                onChange={() => togglePermission(perm.id)}
                                className="sr-only"
                              />
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-500 shrink-0" />
                              )}
                              <span className="capitalize">{perm.action.replace(/_/g, ' ')}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Custom Role Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Custom Role"
        description="Define a new organizational role with customizable module access."
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
              Role Name *
            </label>
            <Input
              required
              placeholder="e.g. Media Coordinator"
              value={newRoleName}
              onChange={(e) => {
                setNewRoleName(e.target.value);
                if (!newRoleSlug) {
                  setNewRoleSlug(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                }
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Role Identifier (Slug) *
            </label>
            <Input
              required
              placeholder="e.g. MEDIA_COORDINATOR"
              value={newRoleSlug}
              onChange={(e) => setNewRoleSlug(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe the responsibilities of this role..."
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createRoleMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Role"
        description="Are you sure you want to permanently delete this custom role?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Role <span className="font-bold text-slate-900 dark:text-white">{roleToDelete?.name}</span>{' '}
            will be deleted. Users with this role will lose its corresponding privileges.
          </p>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleteRoleMutation.isPending}
              onClick={() => roleToDelete && deleteRoleMutation.mutate(roleToDelete.id)}
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
