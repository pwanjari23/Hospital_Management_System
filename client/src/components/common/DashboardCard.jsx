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
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    teal: 'bg-teal-50 text-teal-600',
  }[variant] || 'bg-blue-50 text-blue-600';

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-3.5 bg-slate-200 rounded w-24" />
          <div className="w-8 h-8 bg-slate-200 rounded-lg" />
        </div>
        <div className="mt-3">
          <div className="h-7 bg-slate-200 rounded w-16 mb-1" />
          <div className="h-3 bg-slate-100 rounded w-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between shadow-xs transition-shadow duration-150">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-lg shrink-0 ${variantStyles}`}>
          {icon}
        </div>
      </div>

      <div className="mt-2">
        <span className="text-2xl font-bold text-slate-800 tracking-tight">
          {value ?? 0}
        </span>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
