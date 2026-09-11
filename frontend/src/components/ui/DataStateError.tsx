'use client';

import React from 'react';
import { AlertCircle, ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface DataStateErrorProps {
  error: any;
  onRetry?: () => void;
  title?: string;
  moduleName?: string;
}

export function DataStateError({ error, onRetry, title, moduleName }: DataStateErrorProps) {
  const isForbidden = error?.status === 403 || error?.code === 'FORBIDDEN' || error?.message?.toLowerCase().includes('permission');
  const isNetwork = error?.status === 0 || error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT';
  const errorMessage = error?.message || 'An unexpected error occurred while communicating with the server.';

  if (isForbidden) {
    return (
      <div className="p-8 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-xl shadow-black/20 text-center max-w-xl mx-auto my-8">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {title || 'Access Restricted'}
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {errorMessage || `You do not have the necessary permissions to access ${moduleName || 'this module'}.`}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-900 border border-rose-500/30 rounded-2xl shadow-xl shadow-black/20 text-center max-w-xl mx-auto my-8">
      <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        {title || (isNetwork ? 'Connection Timeout or Network Error' : 'Failed to Load Data')}
      </h3>
      <p className="text-sm text-slate-300 leading-relaxed mb-2">
        {errorMessage}
      </p>
      {isNetwork && (
        <p className="text-xs text-slate-400 mb-6">
          The API server may be undergoing cold-start initialization or maintenance. Please click Retry below.
        </p>
      )}
      {!isNetwork && (
        <p className="text-xs text-slate-400 mb-6 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-left overflow-x-auto">
          {error?.code ? `Code: ${error.code}` : ''} {error?.status ? `| HTTP ${error.status}` : ''}
        </p>
      )}
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-rose-600/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}
