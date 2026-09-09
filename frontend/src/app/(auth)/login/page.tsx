'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ShieldCheck, AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Left Feature Column (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-r border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-extrabold text-white text-xl shadow-lg shadow-emerald-950">
              DIU
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide leading-none">
                DIU Investment Club
              </h2>
              <p className="text-xs text-emerald-400 font-medium mt-1">Financial Management System</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-auto py-12">
          <div className="inline-flex items-center space-x-2 rounded-full border border-emerald-800/80 bg-emerald-950/60 px-3 py-1 text-xs text-emerald-300 mb-6">
            <ShieldCheck className="h-4 w-4" />
            <span>Role-Based Financial Governance</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Centralized, transparent club accounting.
          </h1>

          <p className="mt-4 text-base text-slate-400 max-w-lg leading-relaxed">
            A specialized platform empowering club executives, treasurers, and auditors with real-time balance visibility, double-entry ledgers, and multi-tier approval workflows.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
            <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">100%</p>
              <p className="text-xs text-slate-400 mt-1">Audit Trail Accountability</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">Multi-Tier</p>
              <p className="text-xs text-slate-400 mt-1">Expense Approval Engine</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} DIU Investment Club
        </div>
      </div>

      {/* Right Login Form Column */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="flex lg:hidden items-center space-x-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white text-lg">
                DIU
              </div>
              <div>
                <h2 className="text-base font-bold text-white">DIU Investment Club</h2>
                <p className="text-xs text-emerald-400">Financial Management System</p>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter your credentials to access the financial portal.
            </p>
          </div>

          {authError && (
            <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4 text-sm text-rose-300 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Authentication Failed</p>
                <p className="mt-0.5 text-xs text-rose-300/90">{authError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="admin@diu-invest.club"
                  {...register('email')}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  {...register('password')}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full h-11 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500"
            >
              <span>Sign In to System</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
