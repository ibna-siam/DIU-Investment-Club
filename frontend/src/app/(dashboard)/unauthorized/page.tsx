'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
      <div className="rounded-full bg-rose-100 p-4 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 mb-6">
        <ShieldAlert className="h-12 w-12 text-rose-600 dark:text-rose-400" />
      </div>

      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">403</h1>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-2">
        Access Denied
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        You do not have permission to access this page or perform this action. If you believe this is an error, please contact the club Treasurer or Super Administrator.
      </p>

      <div className="mt-8 flex items-center space-x-3">
        <Link href="/dashboard">
          <Button variant="primary" className="gap-2">
            <Home className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
