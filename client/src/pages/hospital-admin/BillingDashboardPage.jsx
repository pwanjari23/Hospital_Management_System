import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import billingService from '../../services/billingService';

function fmtCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    DRAFT: ['bg-slate-100 text-slate-700 border-slate-200', 'Draft'],
    ISSUED: ['bg-blue-50 text-blue-700 border-blue-200', 'Issued'],
    CANCELLED: ['bg-rose-50 text-rose-700 border-rose-200', 'Cancelled'],
  };
  const [cls, label] = map[status] || ['bg-slate-50 text-slate-600 border-slate-200', status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const map = {
    UNPAID: ['bg-rose-50 text-rose-700 border-rose-200', 'Unpaid'],
    PARTIALLY_PAID: ['bg-amber-50 text-amber-700 border-amber-200', 'Partially Paid'],
    PAID: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Paid'],
    REFUNDED: ['bg-purple-50 text-purple-700 border-purple-200', 'Refunded'],
    PARTIALLY_REFUNDED: ['bg-indigo-50 text-indigo-700 border-indigo-200', 'Partially Refunded'],
  };
  const [cls, label] = map[status] || ['bg-slate-50 text-slate-600 border-slate-200', status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function MetricCard({ label, value, sub, colorClass, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-slate-800 tracking-tight">{value}</span>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function BillingDashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await billingService.getDashboardMetrics();
      setMetrics(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load billing metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Financial Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time hospital revenue, invoice tracking, payments collection, and outstanding balances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hospital-admin/billing/services')}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition shadow-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Service Catalog
          </button>
          <button
            onClick={() => navigate('/hospital-admin/billing/invoices')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Invoices Workspace
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchMetrics} className="underline font-medium hover:text-rose-800">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading billing metrics...</div>
      ) : metrics ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <MetricCard
              label="Today's Revenue"
              value={fmtCurrency(metrics.todayRevenue)}
              sub="Net collections today"
              colorClass="bg-emerald-50 text-emerald-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Today's Invoices"
              value={metrics.todayInvoicesCount}
              sub="Billed today"
              colorClass="bg-blue-50 text-blue-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <MetricCard
              label="Today's Payments"
              value={metrics.todayPaymentsCount}
              sub="Transactions"
              colorClass="bg-indigo-50 text-indigo-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Total Outstanding"
              value={fmtCurrency(metrics.totalOutstanding)}
              sub="Uncollected balance"
              colorClass="bg-amber-50 text-amber-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Unpaid Invoices"
              value={metrics.unpaidInvoicesCount}
              sub="Awaiting first payment"
              colorClass="bg-rose-50 text-rose-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <MetricCard
              label="Partial Payments"
              value={metrics.partialPaymentsCount}
              sub="Partially settled"
              colorClass="bg-violet-50 text-violet-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <MetricCard
              label="Cancelled"
              value={metrics.cancelledInvoicesCount}
              sub="Voided invoices"
              colorClass="bg-slate-100 text-slate-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            />
          </div>

          {/* Tables and breakdown section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Invoices (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Recent Invoices</h2>
                  <p className="text-xs text-slate-500">Latest invoices created across the hospital</p>
                </div>
                <button
                  onClick={() => navigate('/hospital-admin/billing/invoices')}
                  className="text-xs text-indigo-600 font-medium hover:underline"
                >
                  View All &rarr;
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Patient</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 text-right">Due</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {metrics.recentInvoices && metrics.recentInvoices.length > 0 ? (
                      metrics.recentInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-medium text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800">
                              {inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : '—'}
                            </span>
                            <span className="block text-xs text-slate-400">{inv.patient?.uhid}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">{fmtDate(inv.invoiceDate)}</td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900">
                            {fmtCurrency(inv.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-amber-600">
                            {fmtCurrency(inv.dueAmount)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <StatusBadge status={inv.status} />
                              <PaymentStatusBadge status={inv.paymentStatus} />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => navigate(`/hospital-admin/billing/invoices/${inv.id}`)}
                              className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-400 text-sm">
                          No recent invoices found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Method Breakdown & Recent Payments (1 col) */}
            <div className="space-y-6">
              {/* Payment Methods */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
                <h2 className="text-base font-semibold text-slate-800">Today&apos;s Collections by Mode</h2>
                <p className="text-xs text-slate-500 mb-3">Volume and value breakdown</p>
                <div className="space-y-3">
                  {metrics.paymentModeBreakdown && metrics.paymentModeBreakdown.length > 0 ? (
                    metrics.paymentModeBreakdown.map((pm, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-slate-800">{pm.name}</span>
                          <span className="block text-xs text-slate-400">{pm.count} payment(s)</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{fmtCurrency(pm.total)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">No payment modes recorded today.</div>
                  )}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
                <h2 className="text-base font-semibold text-slate-800">Recent Transactions</h2>
                <p className="text-xs text-slate-500 mb-3">Latest collected receipts</p>
                <div className="divide-y divide-slate-100">
                  {metrics.recentPayments && metrics.recentPayments.length > 0 ? (
                    metrics.recentPayments.map((p) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-slate-800">{p.paymentNumber}</span>
                          <span className="block text-xs text-slate-400">
                            {p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : '—'} • {p.paymentMode?.name || 'Cash'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-emerald-600">{fmtCurrency(p.amount)}</span>
                          <span className="block text-[10px] text-slate-400">{fmtDate(p.paymentDate)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">No payments collected yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
