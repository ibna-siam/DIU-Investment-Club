import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
          button: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30',
          bgIcon: 'bg-rose-500/10 border-rose-500/20',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          button: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30',
          bgIcon: 'bg-amber-500/10 border-amber-500/20',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
          button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30',
          bgIcon: 'bg-emerald-500/10 border-emerald-500/20',
        };
      default:
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-indigo-400" />,
          button: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30',
          bgIcon: 'bg-indigo-500/10 border-indigo-500/20',
        };
    }
  };

  const currentVariant = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/80">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-xl border ${currentVariant.bgIcon} flex-shrink-0`}>
            {currentVariant.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-sm font-medium rounded-xl shadow-lg transition-all flex items-center gap-2 ${currentVariant.button} ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
