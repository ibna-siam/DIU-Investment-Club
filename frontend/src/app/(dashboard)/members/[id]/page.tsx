'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  CreditCard,
  Calendar,
  Building2,
  Mail,
  Phone,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Receipt,
  PlusCircle,
  Archive,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import { membersService } from '../../../../services/members.service';
import { Member, MemberDue, MemberPayment, FinancialAccount } from '../../../../types/financial';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { DepartmentSelect } from '../../../../components/ui/DepartmentSelect';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [dues, setDues] = useState<MemberDue[]>([]);
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'membership' | 'payments' | 'dues' | 'activity'>('overview');

  // Modal States
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<MemberDue | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'>('BKASH');
  const [payAccount, setPayAccount] = useState<string>('');
  const [payRef, setPayRef] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Waive Modal
  const [waiveModalOpen, setWaiveModalOpen] = useState(false);
  const [waiveDue, setWaiveDue] = useState<MemberDue | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveLoading, setWaiveLoading] = useState(false);

  // Edit Member Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    student_id: '',
    email: '',
    phone: '',
    department: '',
    batch: '',
    semester: '',
    notes: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const handleOpenEditModal = () => {
    if (!member) return;
    setEditFormData({
      full_name: member.full_name || '',
      student_id: member.student_id || '',
      email: member.email || '',
      phone: member.phone || '',
      department: member.department || '',
      batch: member.batch || '',
      semester: member.semester || '',
      notes: member.notes || '',
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      await membersService.updateMember(memberId, editFormData);
      setEditModalOpen(false);
      await fetchMemberData();
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || 'Failed to update member');
    } finally {
      setEditLoading(false);
    }
  };

  const fetchMemberData = async () => {
    setLoading(true);
    try {
      const [m, dRes, pRes, accs] = await Promise.all([
        membersService.getMemberById(memberId),
        membersService.getDues({ member_id: memberId, limit: 100 }),
        membersService.getPayments({ member_id: memberId, limit: 100 }),
        api.get<any>('/accounts?status=ACTIVE').then((res) => res.data || res || []).catch(() => []),
      ]);

      setMember(m);
      setDues(dRes.data || []);
      setPayments(pRes.data || []);
      setAccounts(accs || []);
      if (accs && accs.length > 0) setPayAccount(accs[0].id);
      if (m) setNewStatus(m.membership_status);
    } catch (err) {
      console.error('Failed to load member data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) fetchMemberData();
  }, [memberId]);

  const handleOpenPayModal = (due: MemberDue) => {
    setSelectedDue(due);
    setPayAmount(Number(due.remaining_amount));
    setPayError('');
    setPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue || !payAccount) return;
    setPayLoading(true);
    setPayError('');

    try {
      await membersService.createPayment({
        member_id: memberId,
        due_id: selectedDue.id,
        amount: Number(payAmount),
        payment_method: payMethod,
        financial_account_id: payAccount,
        reference_number: payRef || undefined,
      });

      setPayModalOpen(false);
      await fetchMemberData();
    } catch (err: any) {
      setPayError(err.response?.data?.error?.message || err.message || 'Failed to record payment');
    } finally {
      setPayLoading(false);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusLoading(true);
    try {
      await membersService.updateStatus(memberId, newStatus, statusReason);
      setStatusModalOpen(false);
      await fetchMemberData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleWaiveDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiveDue) return;
    setWaiveLoading(true);
    try {
      await membersService.waiveDue(waiveDue.id, waiveReason);
      setWaiveModalOpen(false);
      await fetchMemberData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to waive due');
    } finally {
      setWaiveLoading(false);
    }
  };

  if (loading || !member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p>Loading member workspace...</p>
      </div>
    );
  }

  const totalPaid = payments.filter((p) => p.status === 'VERIFIED').reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOutstanding = dues.filter((d) => ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(d.status)).reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/members"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{member.full_name}</h1>
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {member.member_code}
              </span>
              <StatusBadge status={member.membership_status} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Student ID: {member.student_id} • {member.department || 'General'} {member.batch ? `• Batch ${member.batch}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {member.membership_status === 'ARCHIVED' ? (
            <button
              onClick={async () => {
                if (confirm('Reactivate this member back to ACTIVE directory?')) {
                  await membersService.reactivateMember(member.id);
                  fetchMemberData();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition-colors shadow-sm"
              title="Reactivate Member"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reactivate Member
            </button>
          ) : (
            <>
              <button
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
                title="Edit Member Information"
              >
                <Edit className="w-3.5 h-3.5 text-emerald-400" />
                Edit Details
              </button>
              <button
                onClick={() => setStatusModalOpen(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Change Status
              </button>
              <button
                onClick={async () => {
                  if (confirm('Archive this member? They will be deactivated from active directory.')) {
                    await membersService.archiveMember(member.id);
                    fetchMemberData();
                  }
                }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                title="Archive Member"
              >
                <Archive className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Membership Tier</div>
          <div className="mt-2 text-xl font-bold text-white">
            {member.membership_type ? member.membership_type.name.replace(/_/g, ' ') : 'Standard Tier'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Joined: {member.joined_date}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Verified Payments</div>
          <div className="mt-2 text-xl font-bold text-emerald-400">৳{totalPaid.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">{payments.filter((p) => p.status === 'VERIFIED').length} verified transactions</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current Outstanding Dues</div>
          <div className={`mt-2 text-xl font-bold ${totalOutstanding > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            ৳{totalOutstanding.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">{dues.filter((d) => d.status !== 'PAID' && d.status !== 'WAIVED').length} pending obligations</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'dues', label: `Dues (${dues.length})` },
          { key: 'payments', label: `Payments & Receipts (${payments.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 transition-colors relative ${
              activeTab === tab.key ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3">
              Academic & Contact Profile
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Student ID</span>
                <span className="text-slate-200 font-medium">{member.student_id}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Email Address</span>
                <span className="text-slate-200">{member.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Phone</span>
                <span className="text-slate-200">{member.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Department</span>
                <span className="text-slate-200">{member.department || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Batch</span>
                <span className="text-slate-200">{member.batch || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Semester</span>
                <span className="text-slate-200">{member.semester || 'N/A'}</span>
              </div>
            </div>
            {member.notes && (
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-xs text-slate-500 block mb-1">Notes & Remarks</span>
                <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {member.notes}
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3">
              Membership Information
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Membership Tier</span>
                <span className="text-white font-medium">{member.membership_type?.name.replace(/_/g, ' ') || 'General Member'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Joining Date</span>
                <span className="text-slate-200">{member.joined_date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Annual Renewal Fee</span>
                <span className="text-slate-200">৳{member.membership_type?.renewal_fee || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Billing Cycle</span>
                <span className="text-slate-200">{member.membership_type?.billing_cycle || 'YEARLY'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Registered By</span>
                <span className="text-slate-200">{member.creator_name || 'System Admin'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Dues */}
      {activeTab === 'dues' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white">Assessed Dues & Fee Obligations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Due Number</th>
                  <th className="px-6 py-4">Title / Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Paid</th>
                  <th className="px-6 py-4">Remaining</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dues.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      No dues assessed for this member.
                    </td>
                  </tr>
                ) : (
                  dues.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono font-medium text-emerald-400">{d.due_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{d.title}</div>
                        <div className="text-xs text-slate-500">{d.due_type.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">৳{d.amount}</td>
                      <td className="px-6 py-4 text-emerald-400">৳{d.paid_amount}</td>
                      <td className="px-6 py-4 font-semibold text-rose-400">৳{d.remaining_amount}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{d.due_date}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {Number(d.remaining_amount) > 0 && d.status !== 'WAIVED' && (
                            <>
                              <button
                                onClick={() => handleOpenPayModal(d)}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium"
                              >
                                Record Payment
                              </button>
                              <button
                                onClick={() => {
                                  setWaiveDue(d);
                                  setWaiveReason('');
                                  setWaiveModalOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs"
                              >
                                Waive
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white">Payment Collections & Official Receipts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Payment #</th>
                  <th className="px-6 py-4">Receipt #</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      No payment records found for this member.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-mono font-medium text-slate-300">{p.payment_number}</td>
                      <td className="px-6 py-4 font-mono text-xs text-emerald-400">
                        {p.receipt_number || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">৳{p.amount}</td>
                      <td className="px-6 py-4 text-xs text-slate-300">{p.payment_method}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{p.account_name || 'Operating Account'}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{p.payment_date}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.receipt_number && (
                          <Link
                            href={`/receipts/${p.receipt_number}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            View Receipt
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payModalOpen && selectedDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Record Member Payment
            </h2>
            <p className="text-xs text-slate-400">
              Due: <strong className="text-white">{selectedDue.title}</strong> (Remaining: ৳{selectedDue.remaining_amount})
            </p>

            {payError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {payError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Amount (৳) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={Number(selectedDue.remaining_amount)}
                  min={1}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="CASH">Cash at Desk</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Financial Account</label>
                <select
                  value={payAccount}
                  onChange={(e) => setPayAccount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_type}) - Balance: ৳{acc.current_balance}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reference / Trx ID</label>
                <input
                  type="text"
                  placeholder="e.g. BK-TRX-10294 or Cash Memo #"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs"
                >
                  {payLoading ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Change Membership Status</h2>
            <form onSubmit={handleStatusChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="GRADUATED">GRADUATED</option>
                  <option value="LEFT">LEFT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Reason for lifecycle transition..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusLoading}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl text-xs"
                >
                  {statusLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waive Modal */}
      {waiveModalOpen && waiveDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Waive Due Obligation
            </h2>
            <p className="text-xs text-slate-400">
              Waiving: <strong className="text-white">{waiveDue.title}</strong> (Amount: ৳{waiveDue.remaining_amount})
            </p>

            <form onSubmit={handleWaiveDue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Waiver Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Executive Committee approval rationale..."
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWaiveModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={waiveLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl text-xs"
                >
                  {waiveLoading ? 'Waiving...' : 'Confirm Waiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" />
                Edit Member Information
              </h2>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Student ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.student_id}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, student_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Official DIU Department <span className="text-rose-400">*</span>
                </label>
                <DepartmentSelect
                  value={editFormData.department}
                  onChange={(val) => setEditFormData((prev) => ({ ...prev, department: val }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Batch</label>
                  <input
                    type="text"
                    value={editFormData.batch}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, batch: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Semester</label>
                  <input
                    type="text"
                    value={editFormData.semester}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, semester: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
