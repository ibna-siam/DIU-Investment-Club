'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Printer,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Hash,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Check,
} from 'lucide-react';

interface ReceiptData {
  receiptNumber: string;
  paymentNumber: string;
  status: string;
  paymentDate: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  paymentMethod: string;
  referenceNumber: string | null;
  transactionReference: string | null;
  member: {
    fullName: string;
    memberCode: string;
    studentId: string | null;
    department: string | null;
    batch: string | null;
  };
  purpose: string;
  verifiedAt: string;
  club: {
    name: string;
    institution: string;
    officialDomain: string;
    supportEmail: string;
  };
}

export default function PublicReceiptPage() {
  const params = useParams();
  const token = params?.token as string;

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!token) return;

    const fetchReceipt = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.invesmentclub.top/api/v1';
        const res = await fetch(`${apiUrl}/public/receipts/${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setReceipt(json.data);
        } else {
          setError(json.error?.message || 'The requested digital receipt could not be found or has expired.');
        }
      } catch (err: any) {
        setError('Unable to load receipt data. Please verify your connection or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [token]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-lg shadow-emerald-500/20" />
          <p className="text-sm font-medium text-slate-400 animate-pulse">
            Verifying digital receipt security token...
          </p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="h-16 w-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Receipt Not Found</h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            {error || 'This digital receipt token is invalid, expired, or has not yet been verified by the club administration.'}
          </p>
          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
            <a
              href="https://invesmentclub.top"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Return to DIU Investment Club
            </a>
            <p className="text-xs text-slate-500">
              Need assistance? Email{' '}
              <a href="mailto:contact@invesmentclub.top" className="text-emerald-400 hover:underline">
                contact@invesmentclub.top
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <a
          href="https://invesmentclub.top"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> DIU Investment Club
        </a>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Copy Public Link"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied Link' : 'Share'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Receipt / PDF</span>
          </button>
        </div>
      </div>

      {/* Official Receipt Card */}
      <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 print:border-gray-300">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-emerald-950 print:shadow-none">
              DIU
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white print:text-black tracking-tight">
                DIU Investment Club
              </h1>
              <p className="text-xs text-emerald-400 print:text-emerald-700 font-medium">
                Daffodil International University • Office of the Treasurer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-start bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 print:text-emerald-800 print:border-emerald-600 px-3 py-1.5 rounded-full text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-400 print:text-emerald-800" />
            <span>Official Verified Receipt</span>
          </div>
        </div>

        {/* Receipt Identity & Timestamp */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-800/80 print:border-gray-200">
          <div>
            <span className="block text-[11px] uppercase font-bold text-slate-400 print:text-gray-500 tracking-wider">
              Receipt No
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-white print:text-black mt-0.5 block">
              {receipt.receiptNumber}
            </span>
          </div>

          <div>
            <span className="block text-[11px] uppercase font-bold text-slate-400 print:text-gray-500 tracking-wider">
              Payment Date
            </span>
            <span className="text-sm sm:text-base font-semibold text-slate-200 print:text-black mt-0.5 block">
              {new Date(receipt.paymentDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <div>
            <span className="block text-[11px] uppercase font-bold text-slate-400 print:text-gray-500 tracking-wider">
              Payment Method
            </span>
            <span className="text-sm sm:text-base font-semibold text-slate-200 print:text-black mt-0.5 block">
              {receipt.paymentMethod}
            </span>
          </div>

          <div>
            <span className="block text-[11px] uppercase font-bold text-slate-400 print:text-gray-500 tracking-wider">
              Status
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 print:text-emerald-700 bg-emerald-500/10 print:bg-transparent px-2 py-0.5 rounded-md mt-0.5">
              <CheckCircle2 className="h-3 w-3" />
              CONFIRMED
            </span>
          </div>
        </div>

        {/* Member Details */}
        <div className="py-6 border-b border-slate-800/80 print:border-gray-200">
          <span className="block text-[11px] uppercase font-bold text-slate-400 print:text-gray-500 tracking-wider mb-3">
            Received From Member
          </span>
          <div className="bg-slate-800/50 print:bg-gray-50 p-4 rounded-2xl border border-slate-800 print:border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-white print:text-black">{receipt.member.fullName}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400 print:text-gray-600">
                <span className="font-mono bg-slate-900 print:bg-gray-200 px-2 py-0.5 rounded">
                  {receipt.member.memberCode}
                </span>
                {receipt.member.studentId && (
                  <span>Student ID: <strong className="text-slate-300 print:text-black">{receipt.member.studentId}</strong></span>
                )}
                {receipt.member.department && <span>• {receipt.member.department}</span>}
                {receipt.member.batch && <span>• Batch {receipt.member.batch}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Line Item & Total */}
        <div className="py-6 border-b border-slate-800/80 print:border-gray-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase font-bold text-slate-400 print:text-gray-500 border-b border-slate-800 print:border-gray-200">
                <th className="pb-2">Description / Purpose</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
              <tr>
                <td className="py-3 pr-4">
                  <p className="font-medium text-white print:text-black">{receipt.purpose}</p>
                  <p className="text-xs text-slate-400 print:text-gray-500 mt-0.5">
                    Official Voucher Reference: {receipt.paymentNumber}
                  </p>
                  {receipt.referenceNumber && (
                    <p className="text-xs text-slate-400 print:text-gray-500">
                      Transaction/Reference ID: <span className="font-mono text-slate-300 print:text-black">{receipt.referenceNumber}</span>
                    </p>
                  )}
                </td>
                <td className="py-3 text-right font-mono font-bold text-white print:text-black text-base whitespace-nowrap">
                  ৳ {receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Grand Total Callout */}
          <div className="mt-4 p-4 rounded-2xl bg-emerald-950/20 print:bg-gray-100 border border-emerald-800/30 print:border-gray-300 flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-300 print:text-black tracking-wide">
              Total Amount Paid
            </span>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 print:text-emerald-800 font-mono">
                ৳ {receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-emerald-500 print:text-gray-600 block">BDT Bangladeshi Taka</span>
            </div>
          </div>
        </div>

        {/* Verification Footer & Authenticity Seal */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 print:text-gray-600">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-slate-300 print:text-black">
              Digitally Verified & Sealed
            </p>
            <p className="text-[11px] text-slate-500 print:text-gray-500 mt-0.5">
              Verified: {new Date(receipt.verifiedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} • Stored securely on DIU Investment Club ERP
            </p>
            <p className="text-[10px] text-slate-600 print:text-gray-400 mt-1 font-mono">
              Public Token: {token.slice(0, 16)}...{token.slice(-8)}
            </p>
          </div>

          <div className="text-center sm:text-right">
            <div className="inline-block p-2 rounded-xl bg-slate-800/60 print:bg-transparent border border-slate-700/60 print:border-gray-400 text-[11px]">
              <p className="font-bold text-slate-200 print:text-black">DIU Investment Club</p>
              <p className="text-[10px] text-emerald-400 print:text-emerald-700">Official Financial Record</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="max-w-2xl mx-auto mt-8 text-center text-xs text-slate-500 print:hidden">
        <p>© {new Date().getFullYear()} DIU Investment Club • Daffodil International University</p>
        <p className="mt-1">
          Official Portal:{' '}
          <a href="https://invesmentclub.top" className="text-emerald-400 hover:underline">
            https://invesmentclub.top
          </a>
        </p>
      </footer>
    </div>
  );
}
