'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Calendar,
  Search,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { accountingService } from '../../../services/accounting.service';
import { SubsidiaryLedgerItem } from '../../../types/accounting';
import { formatCurrency, formatDate } from '../../../lib/utils';

export default function SubsidiaryLedgerPage() {
  const [subType, setSubType] = useState<'MEMBER' | 'SPONSOR' | 'EVENT'>('MEMBER');
  const [items, setItems] = useState<SubsidiaryLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSubledger = async () => {
    try {
      setLoading(true);
      const data = await accountingService.getSubsidiaryLedger(subType);
      setItems(data);
    } catch (err) {
      console.error('Failed to load subsidiary ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubledger();
  }, [subType]);

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.code?.toLowerCase().includes(term) ||
      item.subledger_id?.toLowerCase().includes(term)
    );
  });

  const totalDebit = items.reduce((sum, i) => sum + (i.total_debit || 0), 0);
  const totalCredit = items.reduce((sum, i) => sum + (i.total_credit || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Subsidiary Ledgers</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-900/40 text-cyan-400 border border-cyan-800/60">
              Entity Accounting
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Subledger schedules by club member, corporate sponsor, and club event
          </p>
        </div>
        <button
          onClick={loadSubledger}
          className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Subledger Entity Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            id: 'MEMBER',
            label: 'Member Dues & Accounts',
            icon: Users,
            desc: 'Dues collections, registrations & fees',
          },
          {
            id: 'SPONSOR',
            label: 'Sponsor Receivables',
            icon: Building2,
            desc: 'Corporate sponsorship pledges & payouts',
          },
          {
            id: 'EVENT',
            label: 'Event Cost & Revenue Centers',
            icon: Calendar,
            desc: 'Individual event budget & ticket collections',
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubType(tab.id as any)}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                isActive
                  ? 'bg-gray-800/90 border-cyan-500/60 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                  : 'bg-gray-900/40 border-gray-800 hover:bg-gray-800/40'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{tab.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{tab.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by entity name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="text-xs text-gray-400 font-medium hidden md:block">
          Showing {filteredItems.length} subledger records
        </div>
      </div>

      {/* Subledger Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Entity Name</th>
                <th className="px-4 py-3">Account Head</th>
                <th className="px-4 py-3 text-center">Tx Count</th>
                <th className="px-4 py-3 text-right">Total Debit (BDT)</th>
                <th className="px-4 py-3 text-right">Total Credit (BDT)</th>
                <th className="px-4 py-3 text-right">Net Balance (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                    Loading subsidiary ledger accounts...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    No subsidiary ledger balances recorded for {subType.toLowerCase()}s.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      {item.name || (item as any).entity_name || 'Subledger Account'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400 font-mono">
                        {item.code ? `${item.code}` : item.subledger_id?.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-gray-400">
                      {item.last_transaction_date ? formatDate(item.last_transaction_date) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                      {item.total_debit > 0 ? formatCurrency(item.total_debit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-blue-400">
                      {item.total_credit > 0 ? formatCurrency(item.total_credit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                      {formatCurrency(item.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer */}
            <tfoot className="border-t border-gray-700 bg-gray-800/60 font-medium">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase font-bold text-gray-300">
                  Subledger Totals:
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-blue-400">
                  {formatCurrency(totalCredit)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-cyan-300">
                  {formatCurrency(totalDebit - totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
