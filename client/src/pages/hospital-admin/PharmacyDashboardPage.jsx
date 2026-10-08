import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import pharmacyService from '../../services/pharmacyService';

export default function PharmacyDashboardPage() {
  const navigate = useNavigate();

  // State
  const [metrics, setMetrics] = useState({
    pendingPrescriptions: 0,
    partiallyDispensed: 0,
    dispensedToday: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    outOfStockCount: 0,
  });

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, queueRes] = await Promise.all([
        pharmacyService.getDashboardMetrics(),
        pharmacyService.getPrescriptionQueue({
          search: searchTerm || undefined,
          dispensingStatus: statusFilter || undefined,
        }),
      ]);

      if (metricsRes.data) {
        setMetrics(metricsRes.data);
      }

      if (queueRes.data) {
        setPrescriptions(queueRes.data.prescriptions || []);
      }
    } catch (err) {
      console.error('Failed to load pharmacy dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load pharmacy data');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pharmacy Operations & Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review finalized doctor prescriptions, manage medicine batches, and track stock dispensing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/hospital-admin/pharmacy/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Manage Inventory
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="text-xs font-semibold text-rose-700 underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Rx</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{metrics.pendingPrescriptions}</div>
          <div className="text-xs text-slate-400 mt-1">Awaiting review</div>
        </div>

        {/* Partially Dispensed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Partial Dispense</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.partiallyDispensed}</div>
          <div className="text-xs text-slate-400 mt-1">Incomplete fulfillment</div>
        </div>

        {/* Dispensed Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dispensed Today</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.dispensedToday}</div>
          <div className="text-xs text-slate-400 mt-1">Completed runs</div>
        </div>

        {/* Low Stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Low Stock</div>
          <div className="text-2xl font-bold text-amber-500 mt-1">{metrics.lowStockCount}</div>
          <div className="text-xs text-slate-400 mt-1">Below reorder level</div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expiring Soon</div>
          <div className="text-2xl font-bold text-rose-500 mt-1">{metrics.expiringSoonCount}</div>
          <div className="text-xs text-slate-400 mt-1">Within 30 days</div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Out of Stock</div>
          <div className="text-2xl font-bold text-slate-600 mt-1">{metrics.outOfStockCount}</div>
          <div className="text-xs text-slate-400 mt-1">Zero quantity batches</div>
        </div>
      </div>

      {/* Prescription Queue Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50/50">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search by Rx #, Patient Name, UHID, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">All Dispensing Statuses</option>
              <option value="PENDING">Pending (Not Started)</option>
              <option value="PARTIALLY_DISPENSED">Partially Dispensed</option>
              <option value="FULLY_DISPENSED">Fully Dispensed</option>
            </select>
          </div>
        </div>

        {/* Table / Queue List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Loading pharmacy prescription queue...
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base font-medium text-slate-600">No prescriptions in queue</p>
            <p className="text-sm text-slate-400 mt-1">Finalized doctor prescriptions will appear here for review and dispensing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rx Number</th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Doctor & Encounter</th>
                  <th className="py-3 px-4">Items / Total Qty</th>
                  <th className="py-3 px-4">Prescribed Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescriptions.map((rx) => {
                  const patientName = rx.patient ? `${rx.patient.firstName} ${rx.patient.lastName || ''}`.trim() : 'Unknown';
                  const itemsCount = rx.items?.length || 0;

                  return (
                    <tr key={rx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{rx.prescriptionNumber}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{patientName}</div>
                        <div className="text-xs text-slate-400">
                          UHID: {rx.patient?.uhid || 'N/A'} {rx.patient?.phone ? `• ${rx.patient.phone}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 font-medium">{rx.doctor?.name || 'Assigned Doctor'}</div>
                        <div className="text-xs text-slate-400">
                          Enc: {rx.encounter?.encounterNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-medium">{itemsCount} med{itemsCount !== 1 ? 's' : ''}</span>
                        <div className="text-xs text-slate-400">
                          Dispensed: {rx.totalDispensedQty} / {rx.totalPrescribedQty}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(rx.prescribedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {rx.dispensingStatus === 'FULLY_DISPENSED' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Fully Dispensed
                          </span>
                        ) : rx.dispensingStatus === 'PARTIALLY_DISPENSED' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Partially Dispensed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/hospital-admin/pharmacy/dispense/${rx.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {rx.dispensingStatus === 'FULLY_DISPENSED' ? 'View Details' : 'Review & Dispense'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
