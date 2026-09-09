'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { accountingService } from '../../../services/accounting.service';
import { FinancialYear, AccountingPeriod } from '../../../types/accounting';

export default function FinancialYearsPage() {
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<AccountingPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPeriodId, setUpdatingPeriodId] = useState<string | null>(null);

  // New Year Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [yearList, curPeriod] = await Promise.all([
        accountingService.getFinancialYears(),
        accountingService.getCurrentPeriod(),
      ]);
      setYears(yearList);
      setCurrentPeriod(curPeriod);

      const activeYear = yearList.find((y) => y.status === 'ACTIVE') || yearList[0];
      if (activeYear) {
        setSelectedYearId(activeYear.id);
        const periodList = await accountingService.getAccountingPeriods({ financial_year_id: activeYear.id });
        setPeriods(periodList);
      }
    } catch (err) {
      console.error('Failed to load financial years', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectYear = async (yearId: string) => {
    setSelectedYearId(yearId);
    try {
      const periodList = await accountingService.getAccountingPeriods({ financial_year_id: yearId });
      setPeriods(periodList);
    } catch (err) {
      console.error('Failed to load periods for year', err);
    }
  };

  const handleStatusChange = async (periodId: string, status: 'OPEN' | 'CLOSED' | 'LOCKED') => {
    try {
      setUpdatingPeriodId(periodId);
      await accountingService.updatePeriodStatus(periodId, status);
      const periodList = await accountingService.getAccountingPeriods({ financial_year_id: selectedYearId });
      setPeriods(periodList);
      const cur = await accountingService.getCurrentPeriod();
      setCurrentPeriod(cur);
    } catch (err: any) {
      alert(`Failed to update period status: ${err.message}`);
    } finally {
      setUpdatingPeriodId(null);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await accountingService.createFinancialYear({
        name,
        start_date: startDate,
        end_date: endDate,
      });
      setShowModal(false);
      setName('');
      setStartDate('');
      setEndDate('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedYear = years.find((y) => y.id === selectedYearId);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400 ring-1 ring-inset ring-sky-500/20">
              Fiscal Calendar
            </span>
            <span className="text-xs font-medium text-slate-400">Period Locking & Year-End Closing</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Financial Years & Accounting Periods</h1>
          <p className="mt-1 text-sm text-slate-400">
            Control ledger posting windows. Closed and locked periods prevent retroactive transaction mutation.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 transition"
        >
          <Plus className="h-4 w-4" />
          Create Financial Year
        </button>
      </div>

      {/* Current Active Period Banner */}
      {currentPeriod && (
        <div className="flex items-center justify-between rounded-2xl border border-sky-500/30 bg-sky-950/20 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Current Active Accounting Period</h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  OPEN FOR POSTING
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentPeriod.name} ({currentPeriod.start_date} to {currentPeriod.end_date}) &bull; Period #{currentPeriod.period_number}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Financial Year Selector Tabs */}
      <div className="flex flex-wrap gap-3 border-b border-slate-800 pb-3">
        {years.map((y) => (
          <button
            key={y.id}
            onClick={() => handleSelectYear(y.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              selectedYearId === y.id
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                : 'bg-slate-900/80 text-slate-400 ring-1 ring-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {y.name}
            <span
              className={`rounded px-1.5 py-0.2 text-[10px] ${
                y.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {y.status}
            </span>
          </button>
        ))}
      </div>

      {/* Periods Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-xl">
          <div className="border-b border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-sm font-bold text-white">
              Accounting Periods for {selectedYear?.name} ({selectedYear?.start_date} to {selectedYear?.end_date})
            </h3>
          </div>

          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/20 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Period Name</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4">End Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {periods.map((p) => {
                const isCurrent = currentPeriod?.id === p.id;
                const isUpdating = updatingPeriodId === p.id;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isCurrent ? 'bg-sky-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">
                      P{p.period_number.toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{p.name}</span>
                        {isCurrent && (
                          <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-500/20">
                            CURRENT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">{p.start_date}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">{p.end_date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          p.status === 'OPEN'
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                            : p.status === 'CLOSED'
                            ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                        }`}
                      >
                        {p.status === 'OPEN' ? (
                          <Unlock className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {p.status !== 'OPEN' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(p.id, 'OPEN')}
                            className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Open Period
                          </button>
                        )}
                        {p.status === 'OPEN' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(p.id, 'CLOSED')}
                            className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            Close Period
                          </button>
                        )}
                        {p.status !== 'LOCKED' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(p.id, 'LOCKED')}
                            className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            Lock Period
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create Financial Year</h3>
            <p className="mt-1 text-xs text-slate-400">
              Defines a 12-month fiscal calendar. All 12 monthly accounting periods will be provisioned automatically.
            </p>

            {errorMsg && (
              <div className="mt-4 rounded-lg bg-rose-950/50 p-3 text-xs text-rose-300 border border-rose-800">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateYear} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Financial Year Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FY 2027-2028"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? 'Generating 12 Periods...' : 'Create Fiscal Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
