'use client';

import React from 'react';
import { Printer, Download, FileSpreadsheet, FileText, Camera } from 'lucide-react';
import { triggerPrint } from '../../lib/export-utils';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  periodText?: string;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  onSaveSnapshot?: () => void;
  isSavingSnapshot?: boolean;
  children?: React.ReactNode;
}

export function ReportHeader({
  title,
  subtitle = 'Daffodil International University Investment Club Financial Reporting System',
  periodText,
  onExportExcel,
  onExportCSV,
  onSaveSnapshot,
  isSavingSnapshot = false,
  children,
}: ReportHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Action Toolbar (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSaveSnapshot && (
            <button
              onClick={onSaveSnapshot}
              disabled={isSavingSnapshot}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
              title="Save snapshot to permanent audit archive"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              {isSavingSnapshot ? 'Archiving...' : 'Audit Snapshot'}
            </button>
          )}

          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              title="Export as CSV"
            >
              <FileText className="w-4 h-4 mr-1.5 text-blue-400" />
              CSV
            </button>
          )}

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
              title="Export as Excel"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Excel
            </button>
          )}

          <button
            onClick={() => triggerPrint()}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Filter / Param bar if provided */}
      {children && (
        <div className="print:hidden bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          {children}
        </div>
      )}

      {/* Official Printable Header (Visible on screen and when printing) */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg print:border-none print:shadow-none print:p-0 print:m-0">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-md">
              DIU
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                DAFFODIL INTERNATIONAL UNIVERSITY INVESTMENT CLUB
              </h2>
              <p className="text-xs text-slate-400">
                Official Financial Statement & Accounting Records Archive
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 text-xs font-bold uppercase rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
              AUDITED / POSTED
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Generated on: {new Date().toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-1">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            {periodText && (
              <p className="text-xs font-medium text-blue-400 mt-0.5">{periodText}</p>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-2 sm:mt-0 font-mono">
            Reporting Currency: <strong className="text-slate-200">BDT (৳)</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportSignatures() {
  return (
    <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-3 gap-8 text-center text-xs text-slate-400 print:mt-16">
      <div>
        <div className="border-b border-slate-700 w-3/4 mx-auto mb-2 h-10"></div>
        <p className="font-semibold text-slate-200">Prepared By</p>
        <p className="text-[11px] text-slate-500">Finance Secretary / Accountant</p>
      </div>
      <div>
        <div className="border-b border-slate-700 w-3/4 mx-auto mb-2 h-10"></div>
        <p className="font-semibold text-slate-200">Verified By</p>
        <p className="text-[11px] text-slate-500">Treasurer, DIU Investment Club</p>
      </div>
      <div>
        <div className="border-b border-slate-700 w-3/4 mx-auto mb-2 h-10"></div>
        <p className="font-semibold text-slate-200">Approved By</p>
        <p className="text-[11px] text-slate-500">President, DIU Investment Club</p>
      </div>
    </div>
  );
}
