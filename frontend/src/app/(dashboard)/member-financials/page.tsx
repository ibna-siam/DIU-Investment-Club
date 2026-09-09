'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CreditCard, 
  HeartHandshake, 
  Handshake, 
  Receipt, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  RefreshCw,
  PieChart,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { membersService } from '@/services/members.service';
import { MemberFinancialMetrics, ClubRevenueOverview } from '@/types/financial';

export default function MemberFinancialsPage() {
  const [metrics, setMetrics] = useState<MemberFinancialMetrics | null>(null);
  const [revenue, setRevenue] = useState<ClubRevenueOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metRes, revRes] = await Promise.all([
        membersService.getMemberFinancialMetrics(),
        membersService.getClubRevenueOverview(),
      ]);
      setMetrics(metRes);
      setRevenue(revRes);
    } catch (err) {
      console.error('Failed to load revenue analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Aggregating club revenue and member financial metrics...</p>
      </div>
    );
  }

  const totalRev = Number(revenue?.total_club_revenue || 0);
  const memberRev = Number(revenue?.membership_revenue || metrics?.total_membership_revenue || 0);
  const sponsorRev = Number(revenue?.sponsorship_revenue || 0);
  const donationRev = Number(revenue?.donation_revenue || 0);
  const eventRev = Number(revenue?.event_ticket_revenue || 0);
  const otherRev = Number(revenue?.other_revenue || 0);

  const getPercent = (val: number) => {
    if (totalRev <= 0) return 0;
    return Math.round((val / totalRev) * 100);
  };

  const activeMembers = metrics?.active_members || 0;
  const totalMembers = metrics?.total_members || 0;
  const memberActivationRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Club Revenue & Member Financials</h1>
              <p className="text-sm text-slate-400">
                Consolidated financial intelligence across membership subscriptions, corporate sponsorships, and philanthropic donations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <Link
            href="/member-dues"
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            Manage Dues
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Top Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Club Verified Revenue */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Realized Revenue</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">
            ৳{totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified & Credited to Accounts
          </div>
        </div>

        {/* Member Dues Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Member Dues Revenue</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">
            ৳{memberRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            This Month: <span className="text-blue-400 font-semibold">৳{Number(metrics?.collected_this_month || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Outstanding & Overdue Dues */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Outstanding Dues</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
            ৳{Number(metrics?.total_outstanding_dues || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Overdue: <span className="text-rose-400 font-semibold">৳{Number(metrics?.overdue_amount || 0).toFixed(2)}</span> ({metrics?.overdue_dues_count || 0} overdue)
          </div>
        </div>

        {/* Active Member Roster */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Member Base</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">
            {activeMembers} <span className="text-sm font-normal text-slate-400">/ {totalMembers}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Activation Ratio: <span className="text-purple-400 font-semibold">{memberActivationRate}%</span>
          </div>
        </div>
      </div>

      {/* Revenue Streams Breakdown & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream Breakdown Progress Bars */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Club Revenue Streams Breakdown</h2>
            </div>
            <span className="text-xs text-slate-400">
              Total Inflow: <strong className="text-white font-mono">৳{totalRev.toFixed(2)}</strong>
            </span>
          </div>

          <div className="space-y-5">
            {/* Membership Subscriptions */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-semibold text-white">Membership Subscriptions & Dues</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-xs">{getPercent(memberRev)}%</span>
                  <span className="font-mono font-bold text-white">
                    ৳{memberRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${getPercent(memberRev)}%` }} />
              </div>
            </div>

            {/* Corporate Sponsorships */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="font-semibold text-white">Corporate Sponsorships & Partnerships</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-xs">{getPercent(sponsorRev)}%</span>
                  <span className="font-mono font-bold text-white">
                    ৳{sponsorRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${getPercent(sponsorRev)}%` }} />
              </div>
            </div>

            {/* Philanthropic Donations */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="font-semibold text-white">Alumni & Patron Donations</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-xs">{getPercent(donationRev)}%</span>
                  <span className="font-mono font-bold text-white">
                    ৳{donationRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${getPercent(donationRev)}%` }} />
              </div>
            </div>

            {/* Event Ticketing */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="font-semibold text-white">Event Registrations & Competitions</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-xs">{getPercent(eventRev)}%</span>
                  <span className="font-mono font-bold text-white">
                    ৳{eventRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${getPercent(eventRev)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Channels Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Payment Inflow Channels</h2>
          </div>

          <div className="space-y-3">
            {metrics?.payment_methods && metrics.payment_methods.length > 0 ? (
              metrics.payment_methods.map((pm) => (
                <div key={pm.method} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">
                      {pm.method}
                    </div>
                    <div className="text-xs text-slate-400">
                      {pm.count} verified transactions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      ৳{Number(pm.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                No verified payments recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Direct Module Fast Access Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <Link
          href="/members"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
          </div>
          <div className="font-bold text-white text-sm">Members Directory</div>
          <div className="text-xs text-slate-400 mt-0.5">Manage roster, batches, academic profiles</div>
        </Link>

        <Link
          href="/member-dues"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
          </div>
          <div className="font-bold text-white text-sm">Member Dues</div>
          <div className="text-xs text-slate-400 mt-0.5">Track dues, overdue penalties & waivers</div>
        </Link>

        <Link
          href="/receipts"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
          </div>
          <div className="font-bold text-white text-sm">Official Receipts</div>
          <div className="text-xs text-slate-400 mt-0.5">View and print official money receipts</div>
        </Link>

        <Link
          href="/sponsorships"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <Handshake className="w-5 h-5 text-amber-400" />
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
          </div>
          <div className="font-bold text-white text-sm">Corporate Sponsorships</div>
          <div className="text-xs text-slate-400 mt-0.5">Agreements, installments & deliverables</div>
        </Link>
      </div>
    </div>
  );
}
