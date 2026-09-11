'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Lock, CheckCircle2, AlertCircle, ShieldCheck, Loader2, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const setupPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(8, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SetupPasswordFormValues = z.infer<typeof setupPasswordSchema>;

export default function AccountSetupPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email?: string; full_name?: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const rawToken = searchParams.get('token');

      if (!rawToken) {
        setValidating(false);
        setTokenValid(false);
        setValidationError('No activation token provided. Please click the exact link sent to your email.');
        return;
      }

      setToken(rawToken);

      // Validate token with backend
      api
        .get<any>(`/auth/setup/validate?token=${encodeURIComponent(rawToken)}`)
        .then((res) => {
          if (res.success && res.data?.valid) {
            setTokenValid(true);
            setUserInfo(res.data);
          } else {
            setTokenValid(false);
            setValidationError(res.error?.message || 'This invitation link is invalid, expired, or has already been used.');
          }
        })
        .catch((err: any) => {
          setTokenValid(false);
          setValidationError(err.message || 'This invitation link is invalid, expired, or has already been used.');
        })
        .finally(() => {
          setValidating(false);
        });
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetupPasswordFormValues>({
    resolver: zodResolver(setupPasswordSchema),
  });

  const passwordValue = watch('password', '');
  const hasMinLength = passwordValue.length >= 8;
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(passwordValue);

  const onSubmit = async (data: SetupPasswordFormValues) => {
    if (!token) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      await api.post('/auth/setup/confirm', {
        token,
        password: data.password,
      });

      // Clear any outdated cached tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('diu_auth_token');
        localStorage.removeItem('diu_auth_user');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?setup=success');
      }, 2500);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to establish your password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Header Branding */}
        <div className="flex items-center space-x-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white text-lg shadow-lg shadow-emerald-900/30">
            DIU
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">DIU Investment Club</h2>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Account Activation & Password Setup
            </p>
          </div>
        </div>

        {validating ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm text-slate-400">Verifying your security credentials...</p>
          </div>
        ) : !tokenValid ? (
          <div className="space-y-5 text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-950/80 border border-rose-800 text-rose-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Invalid or Expired Link</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {validationError || 'This activation link is no longer valid or has already been used to set up an account.'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Need help?</p>
              <p>Please contact an executive member or system administrator to generate a new invitation for you.</p>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Return to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 shadow-lg shadow-emerald-900/40">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Account Password Established!</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your confidential password has been securely configured. You can now access all DIU Investment Club operations and services.
            </p>
            <p className="text-xs text-emerald-400 font-medium animate-pulse">
              Redirecting to login portal in a moment...
            </p>
            <div className="pt-3">
              <Link href="/login?setup=success">
                <Button variant="primary" className="w-full bg-emerald-600 hover:bg-emerald-500">
                  Go to Login Now
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Welcome to the Club!</h2>
              <p className="mt-1 text-xs text-slate-400">
                Please establish your private account password to activate your access.
              </p>
            </div>

            {/* Recipient Card */}
            {userInfo && (
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3.5 flex items-center space-x-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-900/60 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{userInfo.full_name || 'Member'}</p>
                  <p className="text-xs text-emerald-300/80 truncate">{userInfo.email}</p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Establish Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Enter at least 8 characters"
                    {...register('password')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                    placeholder="Re-enter your password"
                    {...register('confirmPassword')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Security requirements list */}
              <div className="space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      hasMinLength ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-700'
                    }`}
                  />
                  <span className={hasMinLength ? 'text-slate-200' : 'text-slate-500'}>
                    At least 8 characters long
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      hasNumberOrSpecial ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-700'
                    }`}
                  />
                  <span className={hasNumberOrSpecial ? 'text-slate-200' : 'text-slate-500'}>
                    Contains number or special character
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Configuring Password...</span>
                  </span>
                ) : (
                  'Complete Account Setup'
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center space-x-2 border-t border-slate-800/80 pt-4 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Protected by Enterprise TLS & SHA-256 Encryption</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
