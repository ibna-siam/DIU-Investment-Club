'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { ApprovalRequest, ApprovalActionType } from '../../../../types/financial';
import { formatBDT, formatDate, formatDateTime } from '../../../../lib/formatters';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  Building,
  Calendar,
  ExternalLink,
  MessageSquare,
  FileText,
  AlertTriangle,
  RefreshCw,
  Send,
} from 'lucide-react';
import Link from 'next/link';

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;

  const [actionType, setActionType] = useState<ApprovalActionType | null>(null);
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch current user
  const { data: userResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['current-user-profile'],
    queryFn: () => api.get('/auth/me'),
  });

  const currentUser = userResponse?.data;

  // Fetch Approval Request
  const { data, isLoading, isError, refetch } = useQuery<{
    success: boolean;
    data: ApprovalRequest;
  }>({
    queryKey: ['approval-request', id],
    queryFn: () => api.get(`/approvals/${id}`),
    enabled: !!id,
  });

  const request = data?.data;

  // Process Action Mutation
  const actionMutation = useMutation({
    mutationFn: async ({
      action,
      comment,
    }: {
      action: ApprovalActionType;
      comment?: string;
    }) => {
      return api.post<{ success: boolean; data: any }>(`/approvals/${id}/action`, {
        action,
        comment,
      });
    },
    onSuccess: () => {
      setModalOpen(false);
      setComment('');
      setActionType(null);
      queryClient.invalidateQueries({ queryKey: ['approval-request', id] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      refetch();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to process approval action');
    },
  });

  const handleOpenActionModal = (type: ApprovalActionType) => {
    setActionType(type);
    setComment('');
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionType) return;
    if (
      (actionType === 'REJECTED' || actionType === 'CHANGES_REQUESTED') &&
      !comment.trim()
    ) {
      setErrorMessage(`A comment explaining the decision is required for ${actionType}`);
      return;
    }

    actionMutation.mutate({
      action: actionType,
      comment: comment.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span>Loading approval request...</span>
        </div>
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 w-fit mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Approval Request Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested approval pipeline record does not exist or has been removed.
        </p>
        <Link
          href="/approvals"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Approvals
        </Link>
      </div>
    );
  }

  const isRequester = currentUser && currentUser.id === request.requested_by;
  const isFinalized = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status);
  const currentStep = request.steps?.find((s) => s.step_number === request.current_step);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/approvals"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                {request.title}
              </h1>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-sm text-slate-400">
              Pipeline Request ID: <span className="font-mono">{request.id}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Multi-Tier Progress Stepper */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Authorization Pipeline Steps
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1: Initial Submission */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400">
                STEP 0: SUBMISSION
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              Submitted by Requester
            </p>
            <p className="text-xs text-slate-400">
              {request.requester_name || 'DIU Executive'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              {formatDate(request.created_at)}
            </p>
          </div>

          {/* Dynamic Steps */}
          {request.steps?.map((step) => {
            const isCompleted = step.status === 'APPROVED';
            const isChanges = step.status === 'CHANGES_REQUESTED';
            const isRejected = step.status === 'REJECTED';
            const isCurrent =
              !isCompleted &&
              !isRejected &&
              request.current_step === step.step_number &&
              request.status !== 'APPROVED';

            let borderClass = 'border-slate-800';
            let statusText = 'Pending';
            let statusColor = 'text-slate-500';

            if (isCompleted) {
              borderClass = 'border-emerald-500/40 bg-emerald-950/10';
              statusText = 'Approved';
              statusColor = 'text-emerald-400';
            } else if (isChanges) {
              borderClass = 'border-orange-500/40 bg-orange-950/10';
              statusText = 'Changes Requested';
              statusColor = 'text-orange-400';
            } else if (isRejected) {
              borderClass = 'border-rose-500/40 bg-rose-950/10';
              statusText = 'Rejected';
              statusColor = 'text-rose-400';
            } else if (isCurrent) {
              borderClass = 'border-amber-500/50 bg-amber-950/10 animate-pulse';
              statusText = 'In Review';
              statusColor = 'text-amber-400';
            }

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl bg-slate-950/70 border ${borderClass} space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    STEP {step.step_number}: {step.required_role}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isChanges ? (
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                  ) : isRejected ? (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-sm font-medium text-slate-200">{step.step_name}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className={statusColor}>{statusText}</span>
                  {step.completed_at && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatDate(step.completed_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Box */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Request Information & Reference Details
          </h3>
          {request.amount && (
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatBDT(request.amount)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400">Requester:</span>
            <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {request.requester_name || 'DIU Executive'} ({request.requester_email || 'No email'})
            </p>
          </div>
          <div>
            <span className="text-slate-400">Request Type:</span>
            <p className="text-sm font-medium text-slate-200 mt-0.5">
              {request.request_type}
            </p>
          </div>
          {request.description && (
            <div className="sm:col-span-2">
              <span className="text-slate-400">Description / Justification:</span>
              <p className="text-sm text-slate-300 mt-0.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                {request.description}
              </p>
            </div>
          )}
        </div>

        {/* Expense Link */}
        {request.request_type === 'EXPENSE' && (
          <div className="pt-2">
            <Link
              href={`/expenses/${request.reference_id}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>View Associated Expense Record</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Action Box or Alert */}
      {isFinalized ? (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <p className="text-xs text-slate-300">
            This approval request has been finalized as{' '}
            <span className="font-semibold text-slate-100">{request.status}</span>. No
            further approval actions are required.
          </p>
        </div>
      ) : isRequester ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <h4 className="text-sm font-semibold text-amber-200">
              Self-Approval Policy Restriction
            </h4>
            <p className="text-xs text-amber-300/90 mt-0.5">
              You submitted this request. To ensure organizational integrity and financial
              compliance, DIU Investment Club policy strictly prohibits requesters from approving
              their own requests. An authorized Treasurer or President must complete this review.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Authorization Decision
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Acting on: <span className="font-semibold text-slate-200">{currentStep?.step_name || 'Current Step'}</span>{' '}
                (Requires <span className="font-mono text-amber-400">{currentStep?.required_role}</span> role)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleOpenActionModal('APPROVED')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950/40 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Step
            </button>
            <button
              onClick={() => handleOpenActionModal('CHANGES_REQUESTED')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-orange-200 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 rounded-xl transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              Request Changes
            </button>
            <button
              onClick={() => handleOpenActionModal('REJECTED')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject Request
            </button>
          </div>
        </div>
      )}

      {/* Immutable History Timeline */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Audit Trail & Actions History
        </h3>

        {!request.actions || request.actions.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            No actions recorded yet. Waiting for executive review.
          </p>
        ) : (
          <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {request.actions.map((act) => (
              <div key={act.id} className="relative pl-8 space-y-1">
                <span className="absolute left-2.5 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    {act.actor_name || 'Executive'}
                    <span className="text-[11px] font-normal text-slate-400">
                      ({act.actor_email})
                    </span>
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {formatDateTime(act.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={act.action} />
                  {act.comment && (
                    <p className="text-xs text-slate-300 italic bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                      "{act.comment}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">
              Confirm Action: <span className="text-amber-400">{actionType}</span>
            </h3>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <p className="text-xs text-slate-400">
              {actionType === 'APPROVED'
                ? 'Are you sure you want to approve this step? Once all required steps are approved, the expense will be eligible for disbursement.'
                : actionType === 'CHANGES_REQUESTED'
                ? 'Please provide specific instructions for what the requester needs to change or provide (e.g. tax invoice, breakdown).'
                : 'Please explain the reason for rejecting this request.'}
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Comments / Notes {actionType !== 'APPROVED' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    actionType === 'APPROVED'
                      ? 'e.g. Verified against club budget.'
                      : 'Provide clear rationale...'
                  }
                  required={actionType !== 'APPROVED'}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors disabled:opacity-50"
                >
                  {actionMutation.isPending ? 'Processing...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
