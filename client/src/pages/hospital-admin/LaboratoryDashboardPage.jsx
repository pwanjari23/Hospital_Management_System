import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import laboratoryService from '../../services/laboratoryService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function age(dob) {
  if (!dob) return '—';
  const y = new Date().getFullYear() - new Date(dob).getFullYear();
  return `${y}y`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SampleStatusBadge({ sample }) {
  if (!sample) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        No Sample
      </span>
    );
  }
  const map = {
    PENDING_COLLECTION: ['bg-amber-50 text-amber-700 border-amber-200', 'Pending Collection'],
    COLLECTED:          ['bg-blue-50 text-blue-700 border-blue-200', 'Collected'],
    RECEIVED:           ['bg-indigo-50 text-indigo-700 border-indigo-200', 'Received'],
    PROCESSING:         ['bg-violet-50 text-violet-700 border-violet-200', 'Processing'],
    COMPLETED:          ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Completed'],
    REJECTED:           ['bg-rose-50 text-rose-700 border-rose-200', 'Rejected'],
  };
  const [cls, label] = map[sample.status] || ['bg-slate-50 text-slate-600 border-slate-200', sample.status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

function ResultStatusBadge({ result }) {
  if (!result) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        No Result
      </span>
    );
  }
  const map = {
    IN_PROGRESS:    ['bg-blue-50 text-blue-700 border-blue-200', 'In Progress'],
    RESULT_ENTERED: ['bg-amber-50 text-amber-700 border-amber-200', 'Awaiting Verification'],
    VERIFIED:       ['bg-indigo-50 text-indigo-700 border-indigo-200', 'Verified'],
    FINALIZED:      ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Finalized'],
    CANCELLED:      ['bg-rose-50 text-rose-700 border-rose-200', 'Cancelled'],
  };
  const [cls, label] = map[result.status] || ['bg-slate-50 text-slate-600 border-slate-200', result.status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

function AbnormalBadge({ flag }) {
  if (!flag || flag === 'NORMAL') return null;
  const cls = flag === 'CRITICAL'
    ? 'bg-red-100 text-red-700 border-red-300'
    : flag === 'ABNORMAL_HIGH' || flag === 'ABNORMAL_LOW'
    ? 'bg-amber-100 text-amber-700 border-amber-300'
    : 'bg-orange-100 text-orange-700 border-orange-300';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${cls} ml-1`}>
      {flag === 'CRITICAL' ? '⚠ CRIT' : flag.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return priority === 'URGENT'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">URGENT</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">Routine</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric card
// ─────────────────────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, colorClass, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        {icon && <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-slate-800 tracking-tight">{value ?? 0}</span>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function LaboratoryDashboardPage() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    pendingOrders: 0,
    samplesPending: 0,
    processing: 0,
    awaitingVerification: 0,
    criticalResults: 0,
    resultsFinalizedToday: 0,
  });
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [resultStatus, setResultStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsRes, queueRes] = await Promise.all([
        laboratoryService.getDashboardMetrics(),
        laboratoryService.getLaboratoryQueue({
          search: search || undefined,
          priority: priority || undefined,
          status: resultStatus || undefined,
          date: date || undefined,
          page,
          limit: 20,
        }),
      ]);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (queueRes?.data) {
        setOrders(queueRes.data.orders || []);
        setPagination({
          total: queueRes.data.total,
          page: queueRes.data.page,
          totalPages: queueRes.data.totalPages,
        });
      }
    } catch (err) {
      console.error('Lab dashboard load error:', err);
      setError(err?.response?.data?.message || 'Failed to load laboratory data');
    } finally {
      setLoading(false);
    }
  }, [search, priority, resultStatus, date, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); loadData(); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Laboratory Operations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Process investigation orders, collect samples, enter and verify results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh"
            className="p-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="text-xs font-semibold text-rose-700 underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Pending Orders"
          value={metrics.pendingOrders}
          sub="Awaiting lab action"
          colorClass="bg-amber-50 text-amber-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <MetricCard
          label="Sample Pending"
          value={metrics.samplesPending}
          sub="Not yet collected"
          colorClass="bg-blue-50 text-blue-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
        />
        <MetricCard
          label="In Processing"
          value={metrics.processing}
          sub="Received or analyzing"
          colorClass="bg-violet-50 text-violet-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          label="Awaiting Verify"
          value={metrics.awaitingVerification}
          sub="Results entered"
          colorClass="bg-indigo-50 text-indigo-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          label="Critical Results"
          value={metrics.criticalResults}
          sub="Needs urgent review"
          colorClass="bg-red-50 text-red-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <MetricCard
          label="Finalized Today"
          value={metrics.resultsFinalizedToday}
          sub="Completed results"
          colorClass="bg-emerald-50 text-emerald-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
        />
      </div>

      {/* Orders Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search patient name, UHID, order #..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="ROUTINE">Routine</option>
            </select>

            <select
              value={resultStatus}
              onChange={(e) => { setResultStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            >
              <option value="">All Result Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESULT_ENTERED">Awaiting Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="FINALIZED">Finalized</option>
            </select>

            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Loading laboratory queue...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="w-14 h-14 mx-auto text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className="text-base font-medium text-slate-600">No investigation orders in queue</p>
            <p className="text-sm text-slate-400 mt-1">Finalized doctor investigation orders will appear here for processing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Investigation</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Sample</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Ordered</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const patient = order.patient;
                  const latestSample = order.samples?.[0];
                  const result = order.result;
                  const patientName = patient
                    ? `${patient.firstName} ${patient.lastName || ''}`.trim()
                    : 'Unknown';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{order.orderNumber || '—'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{patientName}</div>
                        <div className="text-xs text-slate-400">
                          UHID: {patient?.uhid || '—'} • {patient?.gender || '—'} {age(patient?.dateOfBirth)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700">
                          {order.investigationName || order.investigation?.name || '—'}
                          {result && <AbnormalBadge flag={result.abnormalFlag} />}
                        </div>
                        <div className="text-xs text-slate-400">{order.investigation?.code || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {order.doctor?.name || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={order.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        <SampleStatusBadge sample={latestSample} />
                        {latestSample?.sampleNumber && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{latestSample.sampleNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <ResultStatusBadge result={result} />
                        {result?.resultNumber && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{result.resultNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {fmtDate(order.orderedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          id={`lab-workspace-btn-${order.id}`}
                          onClick={() => navigate(`/hospital-admin/laboratory/workspace/${order.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {result?.status === 'FINALIZED' ? 'View Result' : 'Process'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Showing {orders.length} of {pagination.total} orders
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                Previous
              </button>
              <span className="text-slate-600 font-medium">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
