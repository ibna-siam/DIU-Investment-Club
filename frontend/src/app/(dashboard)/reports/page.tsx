'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  PieChart,
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
  HeartHandshake,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Camera,
  Layers,
  History,
} from 'lucide-react';
import { financialReportsService } from '../../../services/financial-reports.service';
import { formatBDT } from '../../../lib/export-utils';
import { ReportSnapshot } from '../../../types/financial-reports';

export default function ReportingCenterPage() {
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snaps = await financialReportsService.getSnapshots();
        setSnapshots(snaps);
      } catch (err) {
        console.error('Failed to load snapshots:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const coreReports = [
    {
      title: 'Income Statement',
      subtitle: 'Statement of Activities & Operating Surplus',
      desc: 'Real posted revenues against expenditures, net operating surplus or deficit, and period-over-period variance analysis.',
      href: '/income-statement',
      icon: TrendingUp,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      badge: 'GAAP / IFRS Core',
    },
    {
      title: 'Balance Sheet',
      subtitle: 'Statement of Financial Position',
      desc: 'Complete asset holdings (cash, bank, MFS), zero-unrecorded liabilities, and accumulated Club Fund reconciliation.',
      href: '/balance-sheet',
      icon: Layers,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      badge: 'Reconciled: Assets = Liab + Equity',
    },
    {
      title: 'Statement of Cash Flows',
      subtitle: 'Cash Inflows, Outflows & Liquidity Position',
      desc: 'Three-category analysis (Operating, Investing, Financing) directly reconciled to posted cash and bank journal balances.',
      href: '/cash-flow-statement',
      icon: History,
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400',
      badge: 'Cash Reconciliation',
    },
  ];

  const specializedReports = [
    {
      title: 'Budget vs Actual Analysis',
      subtitle: 'Variance & Burn Rate Tracking',
      desc: 'Track approved budget allocations against actual posted expenses by event and category with automated over-budget alerts.',
      href: '/budget-vs-actual',
      icon: BarChart3,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    },
    {
      title: 'Event Financial Reports',
      subtitle: 'Event Profitability & ROI',
      desc: 'Event-by-event breakdown of ticket sales, sponsorships, direct costs, and net contribution to club surplus.',
      href: '/event-financial-reports',
      icon: Calendar,
      color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400',
    },
    {
      title: 'Member Revenue Reports',
      subtitle: 'Membership Dues & Collection Rates',
      desc: 'Collection performance across membership tiers, outstanding dues aging, and historical monthly subscription receipts.',
      href: '/member-revenue-reports',
      icon: Users,
      color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400',
    },
    {
      title: 'Donation Reports',
      subtitle: 'Philanthropic Contributions & Alumni Giving',
      desc: 'Verified donation receipts categorized by purpose, donor type, and contribution channels with audit-ready summaries.',
      href: '/donation-reports',
      icon: HeartHandshake,
      color: 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400',
    },
    {
      title: 'Sponsorship Reports',
      subtitle: 'Corporate Partnerships & Receivables',
      desc: 'Corporate sponsorship contracts, agreed amounts, received cash flow, and outstanding partner receivables ledger.',
      href: '/sponsorship-reports',
      icon: Award,
      color: 'from-indigo-500/20 to-cyan-500/20 border-indigo-500/30 text-indigo-400',
    },
    {
      title: 'Financial Analytics Intelligence',
      subtitle: 'Executive Intelligence & Decision Metrics',
      desc: 'Interactive KPI dashboards, monthly growth trends, expenditure concentration, burn rate, and runway forecasting.',
      href: '/financial-analytics',
      icon: Sparkles,
      color: 'from-amber-400/20 to-yellow-500/20 border-yellow-500/30 text-yellow-400',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Financial Reporting Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Financial Statements & Executive Analytics
          </h1>
          <p className="text-slate-300 mt-2 text-sm sm:text-base leading-relaxed">
            Centralized hub for verified, double-entry accounting reports. All statements derive strictly
            from posted journal entries with zero unverified or manual estimates, ensuring GAAP compliance and audit readiness.
          </p>
        </div>
      </div>

      {/* Core Financial Statements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Primary Financial Statements</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Audited general ledger outputs following international non-profit accounting standards
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coreReports.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.href}
                href={report.href}
                className="group relative flex flex-col justify-between p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-200 shadow-md hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${report.color} border`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {report.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">{report.subtitle}</p>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">{report.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                  <span>Generate Statement</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Specialized Analytical Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Operational & Revenue Reports</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed tracking across events, member dues, corporate sponsors, and philanthropic donations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specializedReports.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.href}
                href={report.href}
                className="group relative flex flex-col justify-between p-6 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${report.color} border`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-[11px] text-slate-400">{report.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{report.desc}</p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-blue-400">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Saved Audit Snapshots */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Permanent Audit Snapshots Archive</h2>
              <p className="text-xs text-slate-400">
                Immutable, timestamped snapshots saved by executive officers for official AGMs and audits
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {snapshots.length} Archival Records
          </span>
        </div>

        {snapshots.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            No audit snapshots have been captured yet. Use the "Audit Snapshot" button inside any financial statement to archive an immutable record.
          </p>
        ) : (
          <div className="divide-y divide-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-800">
                  <th className="py-2.5 px-3">Snapshot Title</th>
                  <th className="py-2.5 px-3">Report Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Primary Amount</th>
                  <th className="py-2.5 px-3">Date Archived</th>
                  <th className="py-2.5 px-3">Summary Key Totals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {snapshots.map((snap) => {
                  const summary = snap.data_summary || {};
                  const primaryAmount =
                    summary.net_operating_surplus !== undefined
                      ? summary.net_operating_surplus
                      : summary.total_assets !== undefined
                      ? summary.total_assets
                      : summary.net_cash_flow !== undefined
                      ? summary.net_cash_flow
                      : summary.total_revenue !== undefined
                      ? summary.total_revenue
                      : Object.values(summary)[0] || 0;

                  return (
                    <tr key={snap.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-white">{snap.title}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                          {snap.report_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold font-sans">
                          FINALIZED & AUDITED
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold font-sans">
                        ৳{Number(primaryAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">
                        {new Date(snap.created_at).toLocaleString('en-GB')}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-300 font-sans">
                        {Object.entries(snap.data_summary || {})
                          .slice(0, 3)
                          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ৳${Number(v).toLocaleString()}`)
                          .join(' • ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
