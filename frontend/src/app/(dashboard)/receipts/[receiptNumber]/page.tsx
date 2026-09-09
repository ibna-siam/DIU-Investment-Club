'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  CreditCard, 
  Download, 
  AlertCircle,
  FileCheck2,
  Hash
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import type { MemberPayment } from '@/types/financial';

export default function PrintableReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptNumber = params?.receiptNumber as string;

  const [payment, setPayment] = useState<MemberPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (receiptNumber) {
      loadReceipt();
    }
  }, [receiptNumber]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await membersService.getReceipt(receiptNumber);
      setPayment(res);
    } catch (err: any) {
      console.error('Failed to load receipt:', err);
      setError(err?.response?.data?.message || 'Receipt could not be located or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Fetching verified receipt details...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Receipt Not Available</h2>
        <p className="text-sm text-slate-400">{error || 'Unable to retrieve this receipt.'}</p>
        <Link
          href="/receipts"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Receipts Directory
        </Link>
      </div>
    );
  }

  const member = payment.member;
  const due = payment.due;
  const verifiedDate = payment.verified_at ? new Date(payment.verified_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date(payment.payment_date).toLocaleDateString();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar - Hidden in Print */}
      <div className="print:hidden flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Official Receipt Preview</h1>
            <p className="text-xs text-slate-400 font-mono">{payment.receipt_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-emerald-600/20 transition"
          >
            <Printer className="w-4 h-4" />
            Print Receipt / PDF
          </button>
        </div>
      </div>

      {/* Printable Receipt Paper Container */}
      <div className="bg-white text-slate-900 rounded-2xl p-8 sm:p-12 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:text-black">
        {/* Receipt Header */}
        <div className="border-b-2 border-emerald-600 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
                  DIU
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    DIU INVESTMENT CLUB
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Daffodil International University • Office of Financial Affairs
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Daffodil Smart City, Birulia, Savar, Dhaka-1216, Bangladesh
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block bg-emerald-100 text-emerald-800 text-xs uppercase px-3 py-1 rounded-full font-bold tracking-wider mb-1">
                Official Money Receipt
              </span>
              <div className="text-lg font-mono font-black text-slate-900">
                {payment.receipt_number}
              </div>
              <div className="text-xs text-slate-500">
                Payment Ref: <span className="font-mono">{payment.payment_number}</span>
              </div>
              <div className="text-xs text-slate-500">
                Date: {verifiedDate}
              </div>
            </div>
          </div>
        </div>

        {/* Member & Payment Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6 print:bg-slate-50 print:border-slate-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Received From (Member Details)
            </h3>
            <div className="text-base font-bold text-slate-900">
              {member?.full_name || 'DIU Investment Club Member'}
            </div>
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              <div>
                <span className="font-semibold text-slate-700">Member ID:</span>{' '}
                <span className="font-mono">{member?.member_code}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Student ID:</span>{' '}
                <span className="font-mono">{member?.student_id || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Department:</span>{' '}
                {member?.department || 'N/A'} ({member?.batch ? `Batch ${member.batch}` : 'N/A'})
              </div>
              <div>
                <span className="font-semibold text-slate-700">Email:</span> {member?.email}
              </div>
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-200 sm:pl-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Payment Method & Channel
            </h3>
            <div className="text-sm font-semibold text-slate-800">
              Method: <span className="text-emerald-700 font-bold">{payment.payment_method}</span>
            </div>
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              {payment.trx_id && (
                <div>
                  <span className="font-semibold text-slate-700">Transaction ID:</span>{' '}
                  <span className="font-mono">{payment.trx_id}</span>
                </div>
              )}
              {payment.financial_account && (
                <div>
                  <span className="font-semibold text-slate-700">Club Account:</span>{' '}
                  {payment.financial_account.account_name} ({payment.financial_account.account_number})
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-700">Received By:</span> Verified Official
              </div>
              <div>
                <span className="font-semibold text-slate-700">Verification Status:</span>{' '}
                <span className="font-bold text-emerald-600 uppercase">
                  {payment.status || payment.verification_status || 'VERIFIED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Particulars Breakdown Table */}
        <div className="mb-6">
          <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Item Description / Purpose</th>
                <th className="py-3 px-4">Due Reference</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-4 px-4 font-semibold text-slate-600">01</td>
                <td className="py-4 px-4">
                  <div className="font-bold text-slate-900">
                    {due?.due_type?.replace(/_/g, ' ') || 'Club Membership Due'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {due?.description || 'Club membership subscription and official dues'}
                  </div>
                </td>
                <td className="py-4 px-4 font-mono text-xs text-slate-600">
                  {due?.due_number || 'GEN-CREDIT'}
                </td>
                <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                  ৳{Number(payment.amount ?? payment.amount_paid ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right text-xs uppercase tracking-wider font-bold">
                  Total Amount Paid:
                </td>
                <td className="py-3 px-4 text-right font-mono text-base font-black text-emerald-700">
                  ৳{Number(payment.amount ?? payment.amount_paid ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Due Balance Status Banner */}
        {due && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs mb-8">
            <div className="text-slate-600">
              <span>Total Assessed Due: </span>
              <span className="font-semibold text-slate-800">৳{Number(due.amount).toFixed(2)}</span>
              <span className="mx-2">•</span>
              <span>Paid So Far: </span>
              <span className="font-semibold text-emerald-700">৳{Number(due.paid_amount).toFixed(2)}</span>
            </div>
            <div className="font-semibold">
              <span className="text-slate-600">Remaining Balance: </span>
              <span className={`font-mono font-bold ${Number(due.amount) - Number(due.paid_amount) > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                ৳{(Number(due.amount) - Number(due.paid_amount)).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Signatures & Seal Block */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 items-end text-center">
          <div>
            <div className="h-10 flex items-center justify-center">
              <div className="font-serif italic text-emerald-800 font-bold tracking-wider">
                Authorized System
              </div>
            </div>
            <div className="border-t border-slate-400 pt-1 text-xs font-semibold text-slate-700">
              System Verifier
            </div>
            <div className="text-[10px] text-slate-500">Financial Audit Engine</div>
          </div>

          <div className="hidden sm:block">
            <div className="w-20 h-20 mx-auto rounded-full border-2 border-dashed border-emerald-600 flex flex-col items-center justify-center text-emerald-800 p-1">
              <ShieldCheck className="w-5 h-5 mb-0.5" />
              <div className="text-[8px] font-black uppercase tracking-tighter">
                DIU INVEST
              </div>
              <div className="text-[7px] text-slate-500 font-semibold uppercase">
                Verified
              </div>
            </div>
          </div>

          <div>
            <div className="h-10" />
            <div className="border-t border-slate-400 pt-1 text-xs font-semibold text-slate-700">
              Treasurer / President
            </div>
            <div className="text-[10px] text-slate-500">DIU Investment Club</div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <p>This is a computer-generated official receipt issued by the DIU Investment Club Financial Management System.</p>
          <p className="mt-0.5 font-mono">Verification Key: {payment.id}</p>
        </div>
      </div>
    </div>
  );
}
