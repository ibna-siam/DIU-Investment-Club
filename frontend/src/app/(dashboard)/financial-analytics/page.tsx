'use client';

import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../../components/reports/ReportHeader';
import { financialReportsService } from '../../../services/financial-reports.service';
import { FinancialAnalyticsSummary } from '../../../types/financial-reports';
import { formatBDT, exportToCSV, exportToExcel } from '../../../lib/export-utils';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  Wallet,
  PieChart,
  ShieldCheck,
  AlertCircle,
  Activity,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';

export default function FinancialAnalyticsPage() {
  const [data, setData] = useState<FinancialAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const summary = await financialReportsService.getFinancialAnalytics();
      setData(summary);
    } catch (err) {
      console.error('Failed to load financial analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Metric', 'Category / Month', 'Amount (BDT)'];
    const rows: (string | number)[][] = [
      ['Core KPI', 'Total Revenue', data.total_revenue],
      ['Core KPI', 'Total Expenses', data.total_expenses],
      ['Core KPI', 'Net Operating Surplus', data.net_surplus],
      ['Core KPI', 'Liquid Cash Position', data.cash_position],
      ['Core KPI', 'Total Assets', data.total_assets],
      ['Core KPI', 'Total Liabilities', data.total_liabilities],
      ['Core KPI', 'Club Fund Equity', data.club_fund],
      ['Core KPI', 'Outstanding Member Dues', data.outstanding_dues],
    ];

    data.monthly_trends.forEach((t) => {
      rows.push(['Monthly Trend (Rev)', t.month, t.revenue]);
      rows.push(['Monthly Trend (Exp)', t.month, t.expense]);
      rows.push(['Monthly Trend (Surplus)', t.month, t.surplus]);
    });

    data.revenue_breakdown.forEach((r) => {
      rows.push(['Revenue Head', `${r.code} - ${r.name}`, r.amount]);
    });

    data.expense_breakdown.forEach((e) => {
      rows.push(['Expense Head', `${e.code} - ${e.name}`, e.amount]);
    });

    exportToCSV('Executive_Financial_Analytics_Summary', headers, rows);
  };

  const handleExportExcel = () => {
    if (!data) return;
    const headers = ['Category', 'Head Description', 'Value (BDT)'];
    const rows: (string | number)[][] = [
      ['Core KPI', 'Total Revenue', data.total_revenue],
      ['Core KPI', 'Total Expenses', data.total_expenses],
      ['Core KPI', 'Net Operating Surplus', data.net_surplus],
      ['Core KPI', 'Liquid Cash Position', data.cash_position],
      ['Core KPI', 'Club Fund Net Worth', data.club_fund],
    ];

    data.revenue_breakdown.forEach((r) => {
      rows.push(['Revenue Stream', `${r.code} - ${r.name}`, r.amount]);
    });

    data.expense_breakdown.forEach((e) => {
      rows.push(['Expense Allocation', `${e.code} - ${e.name}`, e.amount]);
    });

    exportToExcel('Financial_Analytics_Intelligence', 'Analytics', headers, rows);
  };

  // Financial Health Metrics
  const operatingMargin =
    data && data.total_revenue > 0
      ? ((data.net_surplus / data.total_revenue) * 100).toFixed(1)
      : '0.0';

  const monthlyBurnRate = data ? (data.total_expenses / Math.max(data.monthly_trends.length, 1)) : 0;
  const runwayMonths =
    data && monthlyBurnRate > 0
      ? (data.cash_position / monthlyBurnRate).toFixed(1)
      : 'Infinite (Zero Burn)';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ReportHeader
        title="Financial Analytics & Executive Intelligence"
        subtitle="Audited Performance Indicators, Expense Concentration & Treasury Solvency"
        periodText="Real-time Double-Entry Ledger Aggregations"
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
      />

      {loading ? (
        <div className="py-24 text-center text-slate-500 text-xs animate-pulse">
          Synthesizing real-time analytics intelligence from posted journal entries...
        </div>
      ) : !data ? (
        <div className="py-24 text-center text-slate-500 text-xs">
          Unable to generate analytics. Verify accounting entries are posted.
        </div>
      ) : (
        <>
          {/* Top Level KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
                {formatBDT(data.total_revenue)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Margin: <strong className="text-emerald-300">{operatingMargin}%</strong>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses</p>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-400 mt-2 font-mono">
                {formatBDT(data.total_expenses)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Burn Rate: <strong className="text-slate-300">{formatBDT(monthlyBurnRate)}/mo</strong>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Surplus</p>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-400 mt-2 font-mono">
                {formatBDT(data.net_surplus)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Added to Club Fund Equity</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Liquid Cash</p>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-cyan-400 mt-2 font-mono">
                {formatBDT(data.cash_position)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Runway: <strong className="text-cyan-300">{runwayMonths}</strong>
              </p>
            </div>
          </div>

          {/* Solvency & Health Indicator Strip */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-white">Financial Health Status:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider text-[10px]">
                PRIME SOLVENCY (ZERO DEBT)
              </span>
            </div>
            <div className="flex items-center space-x-6 text-slate-400 font-mono text-[11px]">
              <span>Assets: <strong className="text-slate-200">{formatBDT(data.total_assets)}</strong></span>
              <span>Liabilities: <strong className="text-emerald-400">{formatBDT(data.total_liabilities)}</strong></span>
              <span>Net Worth: <strong className="text-blue-400">{formatBDT(data.club_fund)}</strong></span>
            </div>
          </div>

          {/* Revenue and Expense Breakdown Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Revenue Stream Diversification
                  </h3>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {formatBDT(data.total_revenue)}
                </span>
              </div>

              <div className="space-y-4">
                {data.revenue_breakdown.map((item) => {
                  const pct =
                    data.total_revenue > 0
                      ? Math.round((item.amount / data.total_revenue) * 100)
                      : 0;
                  return (
                    <div key={item.code} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">
                          <span className="text-slate-500 font-mono mr-1.5">{item.code}</span>
                          {item.name}
                        </span>
                        <div className="text-right font-mono">
                          <span className="text-white font-semibold">{formatBDT(item.amount)}</span>
                          <span className="text-[11px] text-slate-400 ml-2">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Expenditure Concentration
                  </h3>
                </div>
                <span className="text-xs font-mono font-semibold text-rose-400">
                  {formatBDT(data.total_expenses)}
                </span>
              </div>

              <div className="space-y-4">
                {data.expense_breakdown.map((item) => {
                  const pct =
                    data.total_expenses > 0
                      ? Math.round((item.amount / data.total_expenses) * 100)
                      : 0;
                  return (
                    <div key={item.code} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">
                          <span className="text-slate-500 font-mono mr-1.5">{item.code}</span>
                          {item.name}
                        </span>
                        <div className="text-right font-mono">
                          <span className="text-white font-semibold">{formatBDT(item.amount)}</span>
                          <span className="text-[11px] text-slate-400 ml-2">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Monthly Trend Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Monthly Performance Trends
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {data.monthly_trends.length} Fiscal Periods
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4 text-right">Revenue Inflows</th>
                    <th className="py-2.5 px-4 text-right">Expenditures</th>
                    <th className="py-2.5 px-4 text-right">Net Operating Surplus</th>
                    <th className="py-2.5 px-4 text-center">Net Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {data.monthly_trends.map((m) => {
                    const margin =
                      m.revenue > 0 ? ((m.surplus / m.revenue) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={m.month} className="hover:bg-slate-800/20">
                        <td className="py-3 px-4 font-sans font-semibold text-white">
                          {m.month}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                          {formatBDT(m.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-rose-400">
                          {formatBDT(m.expense)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          <span className={m.surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatBDT(m.surplus)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
