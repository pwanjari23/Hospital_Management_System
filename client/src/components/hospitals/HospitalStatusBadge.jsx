import React from 'react';

/**
 * Accessible Hospital Status Badge
 * @param {Object} props
 * @param {'ACTIVE'|'INACTIVE'} props.status - Hospital status
 * @param {string} [props.className=''] - Optional extra classes
 */
export default function HospitalStatusBadge({ status, className = '' }) {
  const isActive = status === 'ACTIVE';

  return (
    <span
      role="status"
      aria-label={`Status: ${status}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border transition-colors ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-700 border-slate-300'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-emerald-500' : 'bg-slate-500'
        }`}
      />
      <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
    </span>
  );
}
