import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ipdService from '../../services/ipdService';

function BedStatusBadge({ status }) {
  const map = {
    AVAILABLE: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Available'],
    OCCUPIED: ['bg-blue-50 text-blue-700 border-blue-200', 'Occupied'],
    RESERVED: ['bg-purple-50 text-purple-700 border-purple-200', 'Reserved'],
    MAINTENANCE: ['bg-amber-50 text-amber-700 border-amber-200', 'Maintenance'],
    BLOCKED: ['bg-rose-50 text-rose-700 border-rose-200', 'Blocked'],
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

export default function IpdDashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [bedBoard, setBedBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'bed-board'

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mRes, bRes] = await Promise.all([
        ipdService.getDashboardMetrics(),
        ipdService.getBedBoard(),
      ]);
      setMetrics(mRes.data);
      setBedBoard(bRes.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load IPD dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">IPD & Bed Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time inpatient occupancy, ward census, and live bed allocations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/hospital-admin/ipd/admissions')}
            className="px-3.5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Admit Patient
          </button>
          <button
            onClick={() => navigate('/hospital-admin/ipd/beds')}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            Manage Beds
          </button>
          <button
            onClick={() => navigate('/hospital-admin/ipd/wards')}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            Manage Wards
          </button>
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline font-medium hover:text-rose-800">
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Overview & Census
        </button>
        <button
          onClick={() => setActiveTab('bed-board')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'bed-board'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Live Bed Board
          <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {metrics?.totalBeds || 0}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'overview' ? (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Beds"
              value={metrics?.totalBeds || 0}
              sub="Configured active beds"
              colorClass="bg-blue-50 text-blue-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
            />
            <MetricCard
              label="Available Beds"
              value={metrics?.availableBeds || 0}
              sub="Ready for admission"
              colorClass="bg-emerald-50 text-emerald-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Occupied Beds"
              value={metrics?.occupiedBeds || 0}
              sub={`${metrics?.currentAdmissions || 0} current admissions`}
              colorClass="bg-indigo-50 text-indigo-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <MetricCard
              label="Under Maintenance / Blocked"
              value={(metrics?.maintenanceBeds || 0) + (metrics?.blockedBeds || 0)}
              sub={`${metrics?.maintenanceBeds || 0} maint, ${metrics?.blockedBeds || 0} blocked`}
              colorClass="bg-amber-50 text-amber-600"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>

          {/* Daily Operations Quick Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Admissions</span>
                <div className="text-3xl font-bold text-slate-800 mt-1">{metrics?.todayAdmissions || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Newly admitted patients today</p>
              </div>
              <button
                onClick={() => navigate('/hospital-admin/ipd/admissions')}
                className="text-xs font-medium text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                View →
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Discharges</span>
                <div className="text-3xl font-bold text-slate-800 mt-1">{metrics?.todayDischarges || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Patients discharged today</p>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                Bed Released
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discharge Pending</span>
                <div className="text-3xl font-bold text-slate-800 mt-1">{metrics?.dischargePending || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Awaiting final medical release</p>
              </div>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg">
                In Review
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfers Today</span>
                <div className="text-3xl font-bold text-slate-800 mt-1">{metrics?.transfersToday || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Inter-ward bed movements</p>
              </div>
              <button
                onClick={() => navigate('/hospital-admin/ipd/beds')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Beds →
              </button>
            </div>
          </div>

          {/* Ward-Wise Occupancy Bars */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Ward Occupancy Census</h2>
                <p className="text-xs text-slate-500 mt-0.5">Capacity breakdown per active hospital ward</p>
              </div>
              <button
                onClick={() => navigate('/hospital-admin/ipd/wards')}
                className="text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                Manage Wards →
              </button>
            </div>

            {(!metrics?.wardOccupancy || metrics.wardOccupancy.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No active wards configured. Click &ldquo;Manage Wards&rdquo; to set up wards.
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.wardOccupancy.map((ward) => (
                  <div key={ward.wardId} className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{ward.wardName}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                          {ward.wardCode}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">({ward.wardType.toLowerCase()})</span>
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        <span className="font-semibold text-slate-800">{ward.occupiedBeds}</span> / {ward.totalBeds} occupied ({ward.occupancyRate}%)
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          ward.occupancyRate >= 90
                            ? 'bg-rose-500'
                            : ward.occupancyRate >= 70
                            ? 'bg-amber-500'
                            : 'bg-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, ward.occupancyRate)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{ward.availableBeds} beds available</span>
                      <span>{ward.totalBeds - ward.occupiedBeds - ward.availableBeds} other (maintenance/blocked)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Live Bed Board View */
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Maintenance
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Blocked
              </span>
            </div>
            <span>Click on occupied bed to view admission details</span>
          </div>

          {bedBoard.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
              No wards or beds configured.
            </div>
          ) : (
            bedBoard.map((ward) => (
              <div key={ward.id} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-base">{ward.wardName}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Code: {ward.wardCode} {ward.floor && `• Floor: ${ward.floor}`}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {ward.beds.length} beds
                  </span>
                </div>

                {ward.beds.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No beds assigned to this ward.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {ward.beds.map((bed) => {
                      const isOccupied = bed.status === 'OCCUPIED';
                      const p = bed.currentAdmission?.patient;
                      return (
                        <div
                          key={bed.id}
                          onClick={() => {
                            if (isOccupied && bed.currentAdmission?.id) {
                              navigate(`/hospital-admin/ipd/admissions/${bed.currentAdmission.id}`);
                            }
                          }}
                          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            isOccupied
                              ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400 cursor-pointer shadow-xs'
                              : bed.status === 'AVAILABLE'
                              ? 'bg-emerald-50/30 border-emerald-200'
                              : bed.status === 'MAINTENANCE'
                              ? 'bg-amber-50/30 border-amber-200'
                              : 'bg-rose-50/30 border-rose-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-sm">{bed.bedNumber}</span>
                            <BedStatusBadge status={bed.status} />
                          </div>
                          <div className="mt-2 text-xs">
                            <span className="text-slate-400 text-[10px] uppercase font-mono block">
                              {bed.bedType}
                            </span>
                            {isOccupied && p ? (
                              <div className="mt-1">
                                <p className="font-medium text-slate-800 truncate">
                                  {p.firstName} {p.lastName}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">{p.uhid}</p>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 mt-1 italic capitalize">
                                {bed.status.toLowerCase()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
