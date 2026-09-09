import React from 'react';

interface StatusBadgeProps {
  status?: string | null;
  type?: 'status' | 'transaction' | 'account';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status', className = '' }) => {
  const s = (status || '').toUpperCase();

  let styles = 'bg-slate-800 text-slate-200 border-slate-700';
  let dotColor = 'bg-slate-400';
  let label = status;

  if (type === 'transaction' || ['CREDIT', 'DEBIT', 'INCOME', 'EXPENSE', 'OPENING_BALANCE', 'TRANSFER'].includes(s)) {
    if (s === 'CREDIT' || s === 'INCOME' || s === 'OPENING_BALANCE') {
      styles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/50';
      dotColor = 'bg-emerald-400';
      label = s === 'OPENING_BALANCE' ? 'Opening' : s === 'INCOME' ? 'Income' : 'Credit';
    } else if (s === 'DEBIT' || s === 'EXPENSE') {
      styles = 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/50';
      dotColor = 'bg-rose-400';
      label = s === 'EXPENSE' ? 'Expense' : 'Debit';
    } else if (s === 'TRANSFER') {
      styles = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40';
      dotColor = 'bg-indigo-400';
      label = 'Transfer';
    }
  } else {
    switch (s) {
      case 'ACTIVE':
        styles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
        dotColor = 'bg-emerald-400';
        label = 'Active';
        break;
      case 'INACTIVE':
        styles = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
        dotColor = 'bg-amber-400';
        label = 'Inactive';
        break;
      case 'CLOSED':
        styles = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
        dotColor = 'bg-rose-400';
        label = 'Closed';
        break;
      case 'DRAFT':
        styles = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
        dotColor = 'bg-amber-400';
        label = 'Draft';
        break;
      case 'SUBMITTED':
        styles = 'bg-sky-500/15 text-sky-300 border-sky-500/40';
        dotColor = 'bg-sky-400';
        label = 'Submitted';
        break;
      case 'COMPLETED':
        styles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
        dotColor = 'bg-emerald-400';
        label = 'Completed';
        break;
      case 'PENDING':
      case 'PENDING_APPROVAL':
        styles = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
        dotColor = 'bg-amber-400';
        label = 'Pending Approval';
        break;
      case 'UNDER_REVIEW':
        styles = 'bg-blue-500/15 text-blue-300 border-blue-500/40';
        dotColor = 'bg-blue-400';
        label = 'Under Review';
        break;
      case 'CHANGES_REQUESTED':
        styles = 'bg-orange-500/15 text-orange-300 border-orange-500/40';
        dotColor = 'bg-orange-400';
        label = 'Changes Requested';
        break;
      case 'APPROVED':
        styles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
        dotColor = 'bg-emerald-400';
        label = 'Approved';
        break;
      case 'REJECTED':
        styles = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
        dotColor = 'bg-rose-400';
        label = 'Rejected';
        break;
      case 'TRANSFER_IN':
        styles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
        dotColor = 'bg-emerald-400';
        label = 'Transfer In';
        break;
      case 'TRANSFER_OUT':
        styles = 'bg-purple-500/15 text-purple-300 border-purple-500/40';
        dotColor = 'bg-purple-400';
        label = 'Transfer Out';
        break;
      case 'PAID':
        styles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
        dotColor = 'bg-emerald-400';
        label = 'Paid';
        break;
      case 'CANCELLED':
        styles = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
        dotColor = 'bg-rose-400';
        label = 'Cancelled';
        break;
      case 'PLANNED':
        styles = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
        dotColor = 'bg-cyan-400';
        label = 'Planned';
        break;
      case 'ONGOING':
        styles = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40';
        dotColor = 'bg-indigo-400';
        label = 'Ongoing';
        break;
      case 'FINANCIAL_REVIEW':
        styles = 'bg-purple-500/15 text-purple-300 border-purple-500/40';
        dotColor = 'bg-purple-400';
        label = 'Financial Review';
        break;
      case 'POSTPONED':
        styles = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
        dotColor = 'bg-amber-400';
        label = 'Postponed';
        break;
      case 'EXCEEDED':
        styles = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
        dotColor = 'bg-rose-400';
        label = 'Exceeded';
        break;
      case 'VERIFIED':
        styles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
        dotColor = 'bg-emerald-400';
        label = 'Verified';
        break;
      case 'VERIFICATION_REQUIRED':
        styles = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
        dotColor = 'bg-amber-400';
        label = 'Verification Required';
        break;
      case 'PARTIALLY_PAID':
        styles = 'bg-sky-500/15 text-sky-300 border-sky-500/40';
        dotColor = 'bg-sky-400';
        label = 'Partially Paid';
        break;
      case 'OVERDUE':
        styles = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
        dotColor = 'bg-rose-400';
        label = 'Overdue';
        break;
      case 'WAIVED':
        styles = 'bg-slate-500/15 text-slate-300 border-slate-500/40';
        dotColor = 'bg-slate-400';
        label = 'Waived';
        break;
      case 'SUSPENDED':
        styles = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
        dotColor = 'bg-rose-400';
        label = 'Suspended';
        break;
      case 'GRADUATED':
        styles = 'bg-blue-500/15 text-blue-300 border-blue-500/40';
        dotColor = 'bg-blue-400';
        label = 'Graduated';
        break;
      case 'LEFT':
      case 'ARCHIVED':
        styles = 'bg-slate-500/15 text-slate-300 border-slate-500/40';
        dotColor = 'bg-slate-400';
        label = s === 'LEFT' ? 'Left' : 'Archived';
        break;
      case 'PROSPECT':
        styles = 'bg-sky-500/15 text-sky-300 border-sky-500/40';
        dotColor = 'bg-sky-400';
        label = 'Prospect';
        break;
      case 'NEGOTIATION':
        styles = 'bg-purple-500/15 text-purple-300 border-purple-500/40';
        dotColor = 'bg-purple-400';
        label = 'In Negotiation';
        break;
      case 'AGREED':
        styles = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40';
        dotColor = 'bg-indigo-400';
        label = 'Agreed';
        break;
      case 'PARTIALLY_RECEIVED':
        styles = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
        dotColor = 'bg-cyan-400';
        label = 'Partially Received';
        break;
      case 'RECEIVED':
        styles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
        dotColor = 'bg-emerald-400';
        label = 'Received';
        break;
      default:
        label = status;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};

export default StatusBadge;
