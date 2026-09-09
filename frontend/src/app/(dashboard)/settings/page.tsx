'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  User,
  Shield,
  Building2,
  DollarSign,
  Sliders,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Server,
  Layers,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser, hasPermission, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole('SUPER_ADMIN') || hasPermission('settings.manage');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'general' | 'financial' | 'system' | 'security'>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Status Message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // System Settings Query
  const { data: settingsData, isLoading: settingsLoading } = useQuery<{
    success: boolean;
    data: Record<string, any>;
  }>({
    queryKey: ['system-settings-flat'],
    queryFn: () => api.get('/settings?format=flat'),
    enabled: !!user,
  });

  // Admin Settings Form States
  const [settingsForm, setSettingsForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (settingsData?.data) {
      setSettingsForm(settingsData.data);
    }
  }, [settingsData]);

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updates: Record<string, any>) => api.patch('/settings', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings-flat'] });
      setMessage({ type: 'success', text: 'System configuration updated and persisted to database!' });
      setTimeout(() => setMessage(null), 4000);
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.message || 'Failed to save system settings' });
    },
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setMessage(null);
    try {
      await api.patch(`/users/${user.id}`, {
        full_name: fullName,
        phone: phone || null,
        student_id: studentId || null,
      });
      await refreshUser();
      setMessage({ type: 'success', text: 'Personal profile updated successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettingsForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    updateSettingsMutation.mutate(settingsForm);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sliders className="h-6 w-6 text-emerald-500" />
            System & Operational Settings
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage personal profile credentials, club identity, financial rules, and centralized system parameters.
          </p>
        </div>
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-400 self-start sm:self-auto">
          <ShieldCheck className="h-4 w-4" />
          <span>v2.4.0 Production</span>
        </div>
      </div>

      {/* Notification Message Banner */}
      {message && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium flex items-center space-x-2 transition-all ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-800 gap-2 pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'profile'
              ? 'border-b-2 border-emerald-500 bg-slate-900 text-emerald-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Personal Profile</span>
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'general'
                  ? 'border-b-2 border-emerald-500 bg-slate-900 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Club Information</span>
            </button>

            <button
              onClick={() => setActiveTab('financial')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'financial'
                  ? 'border-b-2 border-emerald-500 bg-slate-900 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Financial Rules</span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'system'
                  ? 'border-b-2 border-emerald-500 bg-slate-900 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>System Preferences</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'security'
                  ? 'border-b-2 border-emerald-500 bg-slate-900 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Security & Access</span>
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Personal Profile */}
      {activeTab === 'profile' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <User className="h-4 w-4 text-emerald-500" />
              <span>Personal Identity & Credentials</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Update your contact details and club identity representation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Full Name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Full Name"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Official Email Address
                  </label>
                  <Input value={user?.email || ''} disabled className="opacity-60 bg-slate-800/60 border-slate-700 text-slate-300 cursor-not-allowed" />
                  <p className="mt-1 text-[11px] text-slate-400">Institutional email managed by administrator</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Student ID
                  </label>
                  <Input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 211-15-4321"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1700-000000"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Assigned Primary Role
                  </label>
                  <div className="flex items-center h-10 px-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                    <span className="text-xs font-bold text-emerald-400">
                      {user?.roles?.[0]?.name || 'Standard Member'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{profileSaving ? 'Saving...' : 'Update Profile'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: General Club Information (Admin Only) */}
      {activeTab === 'general' && isAdmin && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <Building2 className="h-4 w-4 text-emerald-500" />
              <span>Club Operational Information</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage organization details, contact info, and official campus location. Stored centrally in database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Official Club Name
                  </label>
                  <Input
                    value={settingsForm.club_name || ''}
                    onChange={(e) => handleSettingChange('club_name', e.target.value)}
                    placeholder="DIU Investment Club"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Club Acronym / Short Name
                  </label>
                  <Input
                    value={settingsForm.club_short_name || ''}
                    onChange={(e) => handleSettingChange('club_short_name', e.target.value)}
                    placeholder="DIU IC"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Administrative Email
                  </label>
                  <Input
                    value={settingsForm.contact_email || ''}
                    onChange={(e) => handleSettingChange('contact_email', e.target.value)}
                    placeholder="investmentclub@diu.edu.bd"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Administrative Contact Phone
                  </label>
                  <Input
                    value={settingsForm.contact_phone || ''}
                    onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
                    placeholder="+880 1700-000000"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Official Campus Office Address
                </label>
                <Input
                  value={settingsForm.campus_address || ''}
                  onChange={(e) => handleSettingChange('campus_address', e.target.value)}
                  placeholder="Daffodil Smart City, Ashulia, Dhaka, Bangladesh"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Facebook Page URL
                  </label>
                  <Input
                    value={settingsForm.social_facebook || ''}
                    onChange={(e) => handleSettingChange('social_facebook', e.target.value)}
                    placeholder="https://facebook.com/diuic"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    LinkedIn Organization URL
                  </label>
                  <Input
                    value={settingsForm.social_linkedin || ''}
                    onChange={(e) => handleSettingChange('social_linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/diuic"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{updateSettingsMutation.isPending ? 'Saving...' : 'Save Club Info'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Financial Rules & Approval Thresholds (Admin Only) */}
      {activeTab === 'financial' && isAdmin && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span>Financial Rules & Approval Thresholds</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure accounting currency, fiscal period dates, and executive approval tiers without source code changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Default Currency Code
                  </label>
                  <Input
                    value={settingsForm.default_currency || 'BDT'}
                    onChange={(e) => handleSettingChange('default_currency', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Fiscal Year Start (MM-DD)
                  </label>
                  <Input
                    value={settingsForm.fiscal_year_start || '01-01'}
                    onChange={(e) => handleSettingChange('fiscal_year_start', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Fiscal Year End (MM-DD)
                  </label>
                  <Input
                    value={settingsForm.fiscal_year_end || '12-31'}
                    onChange={(e) => handleSettingChange('fiscal_year_end', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
                  Multi-Tier Financial Approval Thresholds (BDT)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tier 1: Single Approval Limit
                    </label>
                    <Input
                      type="number"
                      value={settingsForm.single_approval_threshold || 5000}
                      onChange={(e) => handleSettingChange('single_approval_threshold', Number(e.target.value))}
                      className="bg-slate-800 border-slate-700 text-white font-mono"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Up to this amount, Treasurer alone can approve</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tier 2: Dual Approval Limit
                    </label>
                    <Input
                      type="number"
                      value={settingsForm.dual_approval_threshold || 25000}
                      onChange={(e) => handleSettingChange('dual_approval_threshold', Number(e.target.value))}
                      className="bg-slate-800 border-slate-700 text-white font-mono"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Requires both Treasurer & GS approval</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tier 3: President Limit
                    </label>
                    <Input
                      type="number"
                      value={settingsForm.president_approval_threshold || 50000}
                      onChange={(e) => handleSettingChange('president_approval_threshold', Number(e.target.value))}
                      className="bg-slate-800 border-slate-700 text-white font-mono"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Expenses exceeding this require President sign-off</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{updateSettingsMutation.isPending ? 'Saving...' : 'Save Financial Rules'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: System Preferences (Admin Only) */}
      {activeTab === 'system' && isAdmin && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <Layers className="h-4 w-4 text-emerald-500" />
              <span>System & Notification Preferences</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Control background alerts, realtime dispatch toggles, and data retention rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700">
                  <div>
                    <p className="text-xs font-bold text-white">In-App Realtime Notifications</p>
                    <p className="text-[11px] text-slate-400">Deliver real-time alerts via Supabase Realtime channel</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.in_app_notifications ?? true}
                    onChange={(e) => handleSettingChange('in_app_notifications', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700">
                  <div>
                    <p className="text-xs font-bold text-white">Critical Approval Email Alerts</p>
                    <p className="text-[11px] text-slate-400">Send automated email notifications for pending high-value approvals</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.email_alerts ?? true}
                    onChange={(e) => handleSettingChange('email_alerts', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Audit Log Retention (Days)
                </label>
                <Input
                  type="number"
                  value={settingsForm.audit_retention_days || 365}
                  onChange={(e) => handleSettingChange('audit_retention_days', Number(e.target.value))}
                  className="bg-slate-800 border-slate-700 text-white font-mono max-w-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">Days to preserve high-fidelity immutable audit traces</p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{updateSettingsMutation.isPending ? 'Saving...' : 'Save System Preferences'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Security & Controls (Admin Only) */}
      {activeTab === 'security' && isAdmin && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>Security Controls & Session Rules</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure session inactivity duration and login throttling. Sensitive keys and database secrets are protected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Session Inactivity Timeout (Minutes)
                  </label>
                  <Input
                    type="number"
                    value={settingsForm.session_timeout_minutes || 60}
                    onChange={(e) => handleSettingChange('session_timeout_minutes', Number(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">User session auto-expires after period of inactivity</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Maximum Failed Login Attempts
                  </label>
                  <Input
                    type="number"
                    value={settingsForm.max_login_attempts || 5}
                    onChange={(e) => handleSettingChange('max_login_attempts', Number(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Account temporarily throttled after repeated failures</p>
                </div>
              </div>

              {/* Infrastructure Security Notice */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-white">Enterprise Zero-Trust Architecture</p>
                    <p className="text-slate-400 leading-relaxed">
                      Database connection secrets, Supabase Service Role keys, and JWT secrets are managed securely via protected environment containers and cannot be viewed or altered through standard administrative UI.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{updateSettingsMutation.isPending ? 'Saving...' : 'Save Security Rules'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
