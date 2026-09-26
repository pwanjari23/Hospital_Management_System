import React, { useEffect, useRef } from 'react';

/**
 * Accessible Modal Confirmation Dialog
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Main message/description
 * @param {string} [props.detailNote] - Secondary explicit notice (e.g. data preservation guarantee)
 * @param {string} [props.confirmText='Confirm'] - Confirmation button label
 * @param {string} [props.cancelText='Cancel'] - Cancel button label
 * @param {'danger'|'primary'|'emerald'} [props.confirmVariant='danger'] - Visual style of confirm button
 * @param {boolean} [props.loading=false] - Pending operation state
 * @param {Function} props.onConfirm - Action callback
 * @param {Function} props.onClose - Dismiss callback
 */
export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  detailNote,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus confirm button when opened
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const confirmBtnStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
  }[confirmVariant] || 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-elevated border border-slate-200 transform transition-all animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              confirmVariant === 'emerald'
                ? 'bg-emerald-100 text-emerald-600'
                : confirmVariant === 'danger'
                ? 'bg-red-100 text-red-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {confirmVariant === 'emerald' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <h3 id="dialog-title" className="text-lg font-bold text-slate-900">
              {title}
            </h3>
            <p id="dialog-description" className="text-sm text-slate-600 mt-2">
              {message}
            </p>

            {detailNote && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
                {detailNote}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:opacity-50 ${confirmBtnStyles}`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
