'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  DollarSign,
  Layers,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { accountingService } from '../../../services/accounting.service';
import { Voucher } from '../../../types/accounting';
import { formatCurrency, formatDate } from '../../../lib/utils';

const TYPE_CONFIG: Record<string, { label: string; short: string; color: string; bg: string; border: string }> = {
  PAYMENT_VOUCHER: { label: 'Payment Voucher (PV)', short: 'PV', color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-800/60' },
  RECEIPT_VOUCHER: { label: 'Receipt Voucher (RV)', short: 'RV', color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60' },
  JOURNAL_VOUCHER: { label: 'Journal Voucher (JV)', short: 'JV', color: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-800/60' },
  CONTRA_VOUCHER: { label: 'Contra Voucher (CV)', short: 'CV', color: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-800/60' },
  PAYMENT: { label: 'Payment Voucher (PV)', short: 'PV', color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-800/60' },
  RECEIPT: { label: 'Receipt Voucher (RV)', short: 'RV', color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60' },
  JOURNAL: { label: 'Journal Voucher (JV)', short: 'JV', color: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-800/60' },
  CONTRA: { label: 'Contra Voucher (CV)', short: 'CV', color: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-800/60' },
};

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (typeFilter !== 'ALL') params.voucher_type = typeFilter;
      const data = await accountingService.getVouchers(params);
      setVouchers(data);
    } catch (err: any) {
      console.error('Failed to load vouchers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, [typeFilter]);

  const filteredVouchers = vouchers.filter((v) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.voucher_number?.toLowerCase().includes(term) ||
      v.party_name?.toLowerCase().includes(term) ||
      v.narration?.toLowerCase().includes(term) ||
      v.description?.toLowerCase().includes(term)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Accounting Vouchers</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-800/60">
              Official Books
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Payment (PV), Receipt (RV), Journal (JV), and Contra (CV) vouchers generated from posted entries
          </p>
        </div>
        <button
          onClick={loadVouchers}
          className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Type Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'ALL', label: 'All Vouchers', count: vouchers.length },
          { id: 'PAYMENT_VOUCHER', label: 'Payment (PV)', count: vouchers.filter((v) => v.voucher_type.includes('PAYMENT')).length },
          { id: 'RECEIPT_VOUCHER', label: 'Receipt (RV)', count: vouchers.filter((v) => v.voucher_type.includes('RECEIPT')).length },
          { id: 'JOURNAL_VOUCHER', label: 'Journal (JV)', count: vouchers.filter((v) => v.voucher_type.includes('JOURNAL')).length },
          { id: 'CONTRA_VOUCHER', label: 'Contra (CV)', count: vouchers.filter((v) => v.voucher_type.includes('CONTRA')).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              typeFilter === tab.id
                ? 'bg-gray-800/90 border-cyan-500/50 shadow-md shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                : 'bg-gray-900/40 border-gray-800 hover:bg-gray-800/40'
            }`}
          >
            <div className="text-xs text-gray-400 font-medium">{tab.label}</div>
            <div className="text-xl font-bold mt-1 text-white">{tab.count}</div>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by voucher #, payee, or narration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Voucher #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payee / Party</th>
                <th className="px-4 py-3">Narration</th>
                <th className="px-4 py-3 text-right">Amount (BDT)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                    Loading financial vouchers...
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    No vouchers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const cfg = TYPE_CONFIG[v.voucher_type] || {
                    label: v.voucher_type,
                    color: 'text-gray-400',
                    bg: 'bg-gray-800',
                    border: 'border-gray-700',
                  };
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVoucher(v)}
                      className="hover:bg-gray-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-cyan-400">
                        {v.voucher_number}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}
                        >
                          {v.voucher_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(v.voucher_date || v.transaction_date)}</td>
                      <td className="px-4 py-3 font-medium text-white">{v.party_name || 'Internal Club Operation'}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate" title={v.narration || v.description || ''}>
                        {v.narration || v.description}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {formatCurrency(v.amount ?? v.journal_entry?.total_debit ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-emerald-950/40 border border-emerald-800/50 text-emerald-400">
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVoucher(v);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-gray-800 hover:bg-cyan-900/40 text-cyan-400 border border-gray-700 hover:border-cyan-800 transition-colors"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Print Slip Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
                Official Accounting Slip
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip Area */}
            <div className="bg-white text-gray-900 p-8 rounded-xl space-y-6 shadow-inner" id="printable-voucher">
              {/* Slip Header */}
              <div className="text-center border-b-2 border-gray-900 pb-4">
                <h2 className="text-xl font-black uppercase tracking-wide text-gray-900">
                  DAFFODIL INTERNATIONAL UNIVERSITY
                </h2>
                <h3 className="text-sm font-bold tracking-wider text-cyan-800">
                  DIU INVESTMENT CLUB - FINANCE & AUDIT DIVISION
                </h3>
                <div className="mt-2 inline-block px-3 py-1 bg-gray-900 text-white font-mono text-xs uppercase font-bold tracking-wider rounded">
                  {selectedVoucher.voucher_type} VOUCHER
                </div>
              </div>

              {/* Top Details */}
              <div className="grid grid-cols-2 text-xs gap-4">
                <div>
                  <span className="text-gray-500 uppercase font-semibold">Voucher Number:</span>
                  <div className="font-mono font-bold text-sm text-gray-900">{selectedVoucher.voucher_number}</div>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 uppercase font-semibold">Date of Record:</span>
                  <div className="font-bold text-sm text-gray-900">{formatDate(selectedVoucher.voucher_date || selectedVoucher.transaction_date)}</div>
                </div>
                <div>
                  <span className="text-gray-500 uppercase font-semibold">Paid To / Received From:</span>
                  <div className="font-bold text-sm text-gray-900">
                    {selectedVoucher.party_name || 'DIU Investment Club'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 uppercase font-semibold">Amount:</span>
                  <div className="font-mono font-black text-base text-gray-900">
                    {formatCurrency(selectedVoucher.amount ?? selectedVoucher.journal_entry?.total_debit ?? 0)} BDT
                  </div>
                </div>
              </div>

              {/* Narration */}
              <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs space-y-1">
                <span className="text-gray-500 uppercase font-semibold block">Particulars / Narration:</span>
                <p className="text-gray-900 leading-relaxed font-medium">
                  {selectedVoucher.narration || selectedVoucher.description || 'No specific particulars recorded.'}
                </p>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-4 gap-4 pt-12 text-center text-xs border-t border-gray-200">
                <div>
                  <div className="border-t border-gray-400 pt-1 font-medium text-gray-600">Prepared By</div>
                  <div className="text-[10px] text-gray-400">Accountant</div>
                </div>
                <div>
                  <div className="border-t border-gray-400 pt-1 font-medium text-gray-600">Verified By</div>
                  <div className="text-[10px] text-gray-400">Treasurer</div>
                </div>
                <div>
                  <div className="border-t border-gray-400 pt-1 font-medium text-gray-600">Approved By</div>
                  <div className="text-[10px] text-gray-400">President</div>
                </div>
                <div>
                  <div className="border-t border-gray-400 pt-1 font-medium text-gray-600">Received By</div>
                  <div className="text-[10px] text-gray-400">Payee Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
