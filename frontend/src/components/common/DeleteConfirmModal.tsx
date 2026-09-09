'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  recordName?: string;
  itemType?: string;
  impactWarning?: string;
  relatedRecordsWarning?: string;
  isHighRisk?: boolean; // If true, requires typing 'DELETE'
  confirmButtonText?: string;
  loading?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  recordName,
  itemType = 'item',
  impactWarning,
  relatedRecordsWarning,
  isHighRisk = false,
  confirmButtonText = 'Delete',
  loading = false,
}: DeleteConfirmModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = !isHighRisk || confirmInput.trim() === 'DELETE';

  const handleConfirm = async () => {
    if (!canConfirm) {
      setError('Please type DELETE exactly to confirm.');
      return;
    }
    setError(null);
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Danger Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {title || `Delete ${itemType}`}
              </h3>
              <p className="text-xs text-slate-400">
                This action requires administrative confirmation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3 my-4 text-xs text-slate-300">
          {recordName && (
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
              <span className="text-slate-400 font-medium">Target Record: </span>
              <span className="text-white font-semibold">{recordName}</span>
            </div>
          )}

          <p className="text-slate-300">
            {impactWarning ||
              `Are you sure you want to permanently delete this ${itemType.toLowerCase()}? This cannot be undone.`}
          </p>

          {relatedRecordsWarning && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{relatedRecordsWarning}</span>
            </div>
          )}

          {isHighRisk && (
            <div className="mt-4 pt-2 border-t border-slate-800">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Type <span className="text-red-400 font-bold">DELETE</span> in capital letters to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE"
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-950 border border-red-500/30 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-red-500 text-sm font-mono tracking-wider"
              />
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all ${
              canConfirm && !loading
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                : 'bg-red-950/40 text-red-500/40 border border-red-900/30 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? 'Deleting...' : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
