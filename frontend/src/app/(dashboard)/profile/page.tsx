'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../lib/api';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function PersonalProfilePage() {
  const { user, refreshUser } = useAuth();

  // Profile Form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Status Alerts
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with auth user on mount/update
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setStudentId(user.student_id || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      await api.patch('/auth/profile', {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        student_id: studentId.trim() || null,
      });

      await refreshUser();
      setProfileMessage({ type: 'success', text: 'Personal profile updated successfully!' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update personal profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match. Please re-enter.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setPasswordMessage({ type: 'success', text: 'Password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 4000);
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to change password. Please check your current password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const userRoles = user?.roles || [];
  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Your Personal Profile</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly confidential personal information and security credentials for your account.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-950/80 shrink-0 border border-emerald-400/30">
            {initials}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-lg font-bold text-white">{user?.full_name || 'DIU Club Member'}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 self-center sm:self-auto">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Active Account
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {user?.email}
              </span>
              {user?.student_id && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                  ID: {user.student_id}
                </span>
              )}
              {user?.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Member since {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            {/* Role Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-2">
              {userRoles.map((role) => (
                <span
                  key={role.id || role.slug}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/50"
                >
                  <Shield className="w-3 h-3 text-indigo-400" />
                  {role.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Contact & Identity Details</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Update your display name and contact numbers.
            </p>
          </div>

          {profileMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                profileMessage.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
              }`}
            >
              {profileMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Email Address <span className="text-slate-500 font-normal lowercase">(read-only)</span>
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full rounded-xl border border-slate-800/60 bg-slate-950/60 px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed opacity-80"
              />
              <p className="text-[10px] text-slate-500 mt-1">Official communication address linked to club authentication.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Student ID
              </label>
              <input
                type="text"
                placeholder="e.g. 211-15-4001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. +8801700000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-md shadow-emerald-950 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{profileSaving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Password & Security Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span>Password & Security</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Securely update your portal password credentials.
            </p>
          </div>

          {passwordMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                passwordMessage.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
              }`}
            >
              {passwordMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-950 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{passwordSaving ? 'Verifying & Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
