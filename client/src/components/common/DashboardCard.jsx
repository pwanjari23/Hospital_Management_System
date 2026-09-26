import React from 'react';

/**
 * Reusable Metric Summary Card
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {number|string} props.value - Numeric count or value
 * @param {string} props.subtitle - Descriptive context (no fabricated trends)
 * @param {React.ReactNode} props.icon - SVG icon
 * @param {'blue'|'emerald'|'slate'|'indigo'} [props.variant='blue'] - Accent color scheme
 * @param {boolean} [props.loading=false] - Loading skeleton state
 */
export default function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'blue',
  loading = false,
}) {
  const variantStyles = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      badgeBg: 'bg-blue-50/50 text-blue-700',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      badgeBg: 'bg-emerald-50/50 text-emerald-700',
    },
    slate: {
      iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
      badgeBg: 'bg-slate-100/50 text-slate-700',
    },
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      badgeBg: 'bg-indigo-50/50 text-indigo-700',
    },
  }[variant] || {
    iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
    badgeBg: 'bg-blue-50/50 text-blue-700',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-soft animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-slate-200 rounded w-20 sm:w-28" />
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-7 sm:h-8 bg-slate-200 rounded w-12 sm:w-16 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-28 sm:w-40" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-soft hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
            {title}
          </span>
          <div className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {value ?? 0}
          </div>
        </div>
        <div
          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border shadow-xs shrink-0 ${variantStyles.iconBg}`}
        >
          {icon}
        </div>
      </div>

      {subtitle && (
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center text-[11px] sm:text-xs text-slate-500 font-medium">
          <span className="truncate">{subtitle}</span>
        </div>
      )}
    </div>
  );
}
