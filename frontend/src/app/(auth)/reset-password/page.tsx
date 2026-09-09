'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(8, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isAccountSetup, setIsAccountSetup] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const isSetup = searchParams.get('setup') === 'true';
      setIsAccountSetup(isSetup);

      // Check query param for custom token
      const queryToken = searchParams.get('token');
      if (queryToken) {
        setToken(queryToken);
        localStorage.setItem('diu_auth_token', queryToken);
      }

      // Check URL hash for Supabase auth tokens (#access_token=...&type=recovery)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          setToken(accessToken);
          localStorage.setItem('diu_auth_token', accessToken);
        }
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        ...data,
        token: token || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. The link may have expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white text-lg">
            DIU
          </div>
          <div>
            <h2 className="text-base font-bold text-white">DIU Investment Club</h2>
            <p className="text-xs text-emerald-400">
              {isAccountSetup ? 'Initial Account Activation' : 'Secure Password Reset'}
            </p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {isAccountSetup ? 'Account Activated!' : 'Password Updated!'}
            </h3>
            <p className="text-sm text-slate-400">
              {isAccountSetup
                ? 'Your account password has been established. Redirecting to login...'
                : 'Your password has been successfully updated. Redirecting to login...'}
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="primary" className="w-full">
                  Go to Login Now
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {isAccountSetup ? 'Set Up Your Account' : 'Create New Password'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {isAccountSetup
                  ? 'Please establish your confidential password with at least 8 characters to complete your DIU Investment Club account registration.'
                  : 'Please enter a secure password with at least 8 characters.'}
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    {...register('password')}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {errors.password && <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    {...register('confirmPassword')}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 flex items-start space-x-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  Never share your password. DIU Investment Club administrators will never ask for your confidential credentials.
                </span>
              </div>

              <Button type="submit" loading={loading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-500">
                {isAccountSetup ? 'Activate Account' : 'Update Password'}
              </Button>
            </form>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Login</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
