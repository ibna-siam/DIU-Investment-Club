'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit reset request. Please try again.');
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
            <p className="text-xs text-emerald-400">Password Recovery</p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Reset Link Sent</h3>
            <p className="text-sm text-slate-400">
              If an account with that email exists, we have sent instructions to reset your password.
            </p>
            <div className="pt-4">
              <Link href="/login">
                <Button variant="primary" className="w-full">
                  Return to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Reset your password</h2>
              <p className="mt-1 text-sm text-slate-400">
                Enter your registered club email address to receive password reset instructions.
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
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="user@diu-invest.club"
                    {...register('email')}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
              </div>

              <Button type="submit" loading={loading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-500">
                Send Reset Instructions
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
