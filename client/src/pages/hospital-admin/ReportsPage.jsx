import { useState, useEffect, useCallback } from 'react';
import reportService from '../../services/reportService';

function fmtCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

export default function ReportsPage() {
  // Global Filter State
  const [preset, setPreset] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active Report Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'patients' | 'appointments' | 'doctors' | 'ipd' | 'billing' | 'pharmacy' | 'laboratory' | 'eecp'

  // Tab Data States & Loaders
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [appointmentData, setAppointmentData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [departmentData, setDepartmentData] = useState(null);
  const [ipdData, setIpdData] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [pharmacyData, setPharmacyData] = useState(null);
  const [labData, setLabData] = useState(null);
  const [eecpData, setEecpData] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);

  // Fetch Handler based on activeTab
  const fetchCurrentReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { preset, page, limit: 15 };
      if (preset === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      switch (activeTab) {
        case 'overview': {
          const res = await reportService.getDashboardMetrics(params);
          setDashboardData(res.data);
          break;
        }
        case 'patients': {
          const res = await reportService.getPatientReport(params);
          setPatientData(res.data);
          break;
        }
        case 'appointments': {
          const res = await reportService.getAppointmentReport(params);
          setAppointmentData(res.data);
          break;
        }
        case 'doctors': {
          const [docRes, depRes] = await Promise.all([
            reportService.getDoctorPerformanceReport(params),
            reportService.getDepartmentReport(params),
          ]);
          setDoctorData(docRes.data);
          setDepartmentData(depRes.data);
          break;
        }
        case 'ipd': {
          const res = await reportService.getIpdReport(params);
          setIpdData(res.data);
          break;
        }
        case 'billing': {
          const res = await reportService.getBillingReport(params);
          setBillingData(res.data);
          break;
        }
        case 'pharmacy': {
          const res = await reportService.getPharmacyReport(params);
          setPharmacyData(res.data);
          break;
        }
        case 'laboratory': {
          const res = await reportService.getLaboratoryReport(params);
          setLabData(res.data);
          break;
        }
        case 'eecp': {
          const res = await reportService.getEecpReport(params);
          setEecpData(res.data);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch analytics report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, preset, startDate, endDate, page]);

  useEffect(() => {
    fetchCurrentReport();
  }, [fetchCurrentReport]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchCurrentReport();
  };

  const handleResetFilters = () => {
    setPreset('this_month');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      const exportType = activeTab === 'overview' ? 'patients' : activeTab;
      const params = { preset };
      if (preset === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const blob = await reportService.exportReportCsv(exportType, params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportType}-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Export failed for this report');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { id: 'overview', name: 'Executive Overview' },
    { id: 'patients', name: 'Patients & Visits' },
    { id: 'appointments', name: 'Appointments & OPD' },
    { id: 'doctors', name: 'Doctors & Departments' },
    { id: 'ipd', name: 'Inpatient (IPD) & Beds' },
    { id: 'billing', name: 'Billing & Revenue' },
    { id: 'pharmacy', name: 'Pharmacy Inventory' },
    { id: 'laboratory', name: 'Laboratory Diagnostics' },
    { id: 'eecp', name: 'EECP Therapy' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive hospital intelligence, clinical volumes, operational census & financial audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. Global Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date Preset:</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          )}

          <button
            onClick={handleApplyFilters}
            className="text-xs bg-slate-800 text-white font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-2 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-teal-600 mb-3" />
          <p className="text-sm">Calculating hospital intelligence...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && dashboardData && (
            <div className="space-y-6">
              {/* Financial & Clinical Top KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Collections"
                  value={fmtCurrency(dashboardData.kpis.revenue.totalCollected)}
                  sub={`Total Billed: ${fmtCurrency(dashboardData.kpis.revenue.totalBilled)}`}
                  colorClass="bg-emerald-50 text-emerald-600"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Outstanding Balance"
                  value={fmtCurrency(dashboardData.kpis.revenue.totalOutstanding)}
                  sub={`Refunded: ${fmtCurrency(dashboardData.kpis.revenue.totalRefunded)}`}
                  colorClass="bg-amber-50 text-amber-600"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Patient Visits"
                  value={dashboardData.kpis.patients.totalVisits}
                  sub={`New: ${dashboardData.kpis.patients.newPatients} | Ret: ${dashboardData.kpis.patients.returningPatients}`}
                  colorClass="bg-blue-50 text-blue-600"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  label="Bed Occupancy"
                  value={`${dashboardData.kpis.ipd.bedOccupancyRate}%`}
                  sub={`Occupied: ${dashboardData.kpis.ipd.occupiedBeds} / ${dashboardData.kpis.ipd.totalBeds} Beds`}
                  colorClass="bg-purple-50 text-purple-600"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  }
                />
              </div>

              {/* Module Operational Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Appointment Status */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                    Appointments Volume ({dashboardData.kpis.appointments.total})
                  </h3>
                  <div className="space-y-3">
                    {dashboardData.charts.appointmentStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">{item.status}</span>
                        <span className="font-bold text-slate-800">{item.count}</span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                      <span>Completion Rate</span>
                      <span>{dashboardData.kpis.appointments.completionRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Workload */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                    Clinical Operations
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">OPD Consultations</span>
                      <span className="font-bold text-slate-800">{dashboardData.kpis.opd.completedConsultations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Current IPD Inpatients</span>
                      <span className="font-bold text-slate-800">{dashboardData.kpis.ipd.currentAdmissions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Prescriptions Dispensed</span>
                      <span className="font-bold text-slate-800">{dashboardData.kpis.pharmacy.dispensingCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Lab Orders Processed</span>
                      <span className="font-bold text-slate-800">{dashboardData.kpis.laboratory.completedOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">EECP Sessions Completed</span>
                      <span className="font-bold text-slate-800">{dashboardData.kpis.eecp.sessionsCompleted}</span>
                    </div>
                  </div>
                </div>

                {/* Safety & Alerts */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                    Operational Alerts
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 text-rose-700">
                      <span>Abnormal / Critical Lab Tests</span>
                      <span className="font-bold">{dashboardData.kpis.laboratory.criticalResults}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-700">
                      <span>Low-Stock Medicines</span>
                      <span className="font-bold">{dashboardData.kpis.pharmacy.lowStockMedicines}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-slate-700">
                      <span>Expiring Batches (30 Days)</span>
                      <span className="font-bold">{dashboardData.kpis.pharmacy.expiringBatches}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ward Occupancy Census Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Ward Census & Real-time Occupancy
                  </h3>
                  <span className="text-xs text-slate-400">Total Wards: {dashboardData.charts.wardOccupancy.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/75 text-slate-500 uppercase font-semibold border-b border-slate-200/80">
                      <tr>
                        <th className="px-4 py-3">Ward Name</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Floor</th>
                        <th className="px-4 py-3">Total Beds</th>
                        <th className="px-4 py-3">Occupied</th>
                        <th className="px-4 py-3">Available</th>
                        <th className="px-4 py-3">Occupancy Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboardData.charts.wardOccupancy.map((w) => (
                        <tr key={w.wardId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{w.wardName}</td>
                          <td className="px-4 py-3 text-slate-500">{w.wardCode}</td>
                          <td className="px-4 py-3 text-slate-500">{w.floor || '1'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{w.totalBeds}</td>
                          <td className="px-4 py-3 text-rose-600 font-semibold">{w.occupiedBeds}</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">{w.availableBeds}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-bold ${
                              w.occupancyRate > 80 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {w.occupancyRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PATIENTS & VISITS */}
          {activeTab === 'patients' && patientData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <MetricCard
                  label="Registered In Range"
                  value={patientData.summary.totalPatients}
                  colorClass="bg-blue-50 text-blue-600"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                />
                <MetricCard label="Male Patients" value={patientData.summary.malePatients} colorClass="bg-slate-50 text-slate-600" />
                <MetricCard label="Female Patients" value={patientData.summary.femalePatients} colorClass="bg-slate-50 text-slate-600" />
                <MetricCard label="Other Genders" value={patientData.summary.otherPatients} colorClass="bg-slate-50 text-slate-600" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">UHID</th>
                        <th className="px-4 py-3">Full Name</th>
                        <th className="px-4 py-3">Gender</th>
                        <th className="px-4 py-3">Date of Birth</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">City</th>
                        <th className="px-4 py-3">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patientData.data.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-teal-700">{p.uhid}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{p.fullName}</td>
                          <td className="px-4 py-3 text-slate-600">{p.gender}</td>
                          <td className="px-4 py-3 text-slate-600">{p.dateOfBirth || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                          <td className="px-4 py-3 text-slate-600">{p.city || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtDate(p.registrationDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APPOINTMENTS & OPD */}
          {activeTab === 'appointments' && appointmentData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <MetricCard label="Total Appointments" value={appointmentData.summary.total} colorClass="bg-blue-50 text-blue-600" />
                <MetricCard label="Completed" value={appointmentData.summary.completed} colorClass="bg-emerald-50 text-emerald-600" />
                <MetricCard label="Cancelled" value={appointmentData.summary.cancelled} colorClass="bg-rose-50 text-rose-600" />
                <MetricCard label="Completion Rate" value={`${appointmentData.summary.completionRate}%`} colorClass="bg-teal-50 text-teal-600" />
              </div>

              {/* Breakdown by Doctor */}
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Doctor Appointment Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Specialization</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Cancelled</th>
                        <th className="px-4 py-3">No Show</th>
                        <th className="px-4 py-3">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appointmentData.byDoctor.map((d) => (
                        <tr key={d.doctorId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{d.doctorName}</td>
                          <td className="px-4 py-3 text-slate-500">{d.specialization}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{d.total}</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">{d.completed}</td>
                          <td className="px-4 py-3 text-rose-600 font-semibold">{d.cancelled}</td>
                          <td className="px-4 py-3 text-amber-600 font-semibold">{d.noShow}</td>
                          <td className="px-4 py-3 font-bold text-teal-700">{d.completionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCTORS & DEPARTMENTS */}
          {activeTab === 'doctors' && doctorData && departmentData && (
            <div className="space-y-6">
              {/* Doctor Performance */}
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Doctor Operational Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Doctor Name</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Specialization</th>
                        <th className="px-4 py-3">Appointments</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Consultations</th>
                        <th className="px-4 py-3">IPD Admissions</th>
                        <th className="px-4 py-3">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doctorData.data.map((doc) => (
                        <tr key={doc.doctorId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{doc.doctorName}</td>
                          <td className="px-4 py-3 text-slate-600">{doc.departmentName}</td>
                          <td className="px-4 py-3 text-slate-500">{doc.specialization}</td>
                          <td className="px-4 py-3 text-slate-700 font-semibold">{doc.totalAppointments}</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">{doc.completedAppointments}</td>
                          <td className="px-4 py-3 text-blue-600 font-semibold">{doc.consultations}</td>
                          <td className="px-4 py-3 text-purple-600 font-semibold">{doc.ipdAdmissions}</td>
                          <td className="px-4 py-3 font-bold text-teal-700">{doc.completionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Department Volume */}
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Department Volume Distribution</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Staff</th>
                        <th className="px-4 py-3">Appointments</th>
                        <th className="px-4 py-3">Consultations</th>
                        <th className="px-4 py-3">IPD Admissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {departmentData.data.map((dep) => (
                        <tr key={dep.departmentId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{dep.departmentName}</td>
                          <td className="px-4 py-3 text-slate-500">{dep.departmentCode}</td>
                          <td className="px-4 py-3 text-slate-600">{dep.staffCount}</td>
                          <td className="px-4 py-3 text-slate-700 font-semibold">{dep.appointments}</td>
                          <td className="px-4 py-3 text-blue-600 font-semibold">{dep.consultations}</td>
                          <td className="px-4 py-3 text-purple-600 font-semibold">{dep.admissions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: IPD & OCCUPANCY */}
          {activeTab === 'ipd' && ipdData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <MetricCard label="Total Admissions" value={ipdData.summary.totalAdmissions} colorClass="bg-purple-50 text-purple-600" />
                <MetricCard label="Discharges" value={ipdData.summary.discharges} colorClass="bg-emerald-50 text-emerald-600" />
                <MetricCard label="Avg Length of Stay" value={`${ipdData.summary.averageLengthOfStay} Days`} colorClass="bg-blue-50 text-blue-600" />
                <MetricCard label="Bed Occupancy" value={`${ipdData.summary.bedCensus.overallOccupancyRate}%`} colorClass="bg-teal-50 text-teal-600" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Admission #</th>
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Admitting Doctor</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Admitted</th>
                        <th className="px-4 py-3">Discharged</th>
                        <th className="px-4 py-3">Length of Stay</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ipdData.data.map((adm) => (
                        <tr key={adm.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-teal-700">{adm.admissionNumber}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{adm.patientName}</td>
                          <td className="px-4 py-3 text-slate-600">{adm.admittingDoctor}</td>
                          <td className="px-4 py-3 text-slate-600">{adm.wardName} - {adm.bedNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtDate(adm.admissionDate)}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtDate(adm.dischargedAt)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{adm.lengthOfStay || 'Ongoing'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {adm.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BILLING & REVENUE */}
          {activeTab === 'billing' && billingData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <MetricCard label="Total Billed" value={fmtCurrency(billingData.summary.totalBilled)} colorClass="bg-blue-50 text-blue-600" />
                <MetricCard label="Total Collected" value={fmtCurrency(billingData.summary.totalCollected)} colorClass="bg-emerald-50 text-emerald-600" />
                <MetricCard label="Outstanding" value={fmtCurrency(billingData.summary.totalOutstanding)} colorClass="bg-rose-50 text-rose-600" />
                <MetricCard label="Refunded" value={fmtCurrency(billingData.summary.totalRefunded)} colorClass="bg-purple-50 text-purple-600" />
              </div>

              {/* Payment Modes & Aging */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Payment Modes Collected</h3>
                  <div className="space-y-3">
                    {billingData.byPaymentMode.map((m) => (
                      <div key={m.modeName} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">{m.modeName} ({m.transactionsCount} txs)</span>
                        <span className="font-bold text-slate-800">{fmtCurrency(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Outstanding Aging Buckets</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">0 – 30 Days</span>
                      <span className="font-bold text-slate-800">{fmtCurrency(billingData.agingSummary.aging0To30)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">31 – 60 Days</span>
                      <span className="font-bold text-slate-800">{fmtCurrency(billingData.agingSummary.aging31To60)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">61 – 90 Days</span>
                      <span className="font-bold text-slate-800">{fmtCurrency(billingData.agingSummary.aging61To90)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">90+ Days</span>
                      <span className="font-bold text-rose-600">{fmtCurrency(billingData.agingSummary.aging90Plus)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PHARMACY */}
          {activeTab === 'pharmacy' && pharmacyData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <MetricCard label="Total Medicines" value={pharmacyData.summary.totalMedicines} colorClass="bg-blue-50 text-blue-600" />
                <MetricCard label="Dispensed Count" value={pharmacyData.summary.dispensing.totalDispensed} colorClass="bg-emerald-50 text-emerald-600" />
                <MetricCard label="Low Stock Batches" value={pharmacyData.summary.lowStockBatchesCount} colorClass="bg-amber-50 text-amber-600" />
                <MetricCard label="Expiring Soon" value={pharmacyData.summary.expiringBatchesCount} colorClass="bg-rose-50 text-rose-600" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Low Stock & Reorder Alerts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Medicine</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Batch Number</th>
                        <th className="px-4 py-3">Available Stock</th>
                        <th className="px-4 py-3">Reorder Level</th>
                        <th className="px-4 py-3">Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pharmacyData.lowStockAlerts.map((med) => (
                        <tr key={med.batchId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{med.medicineName}</td>
                          <td className="px-4 py-3 text-slate-600">{med.category}</td>
                          <td className="px-4 py-3 text-slate-600">{med.batchNumber}</td>
                          <td className="px-4 py-3 font-bold text-rose-600">{med.currentStock}</td>
                          <td className="px-4 py-3 text-slate-700">{med.reorderLevel}</td>
                          <td className="px-4 py-3 text-slate-600">{fmtDate(med.expiryDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: LABORATORY */}
          {activeTab === 'laboratory' && labData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <MetricCard label="Total Orders" value={labData.summary.totalOrders} colorClass="bg-blue-50 text-blue-600" />
                <MetricCard label="Completed" value={labData.summary.completedOrders} colorClass="bg-emerald-50 text-emerald-600" />
                <MetricCard label="Pending" value={labData.summary.pendingOrders} colorClass="bg-amber-50 text-amber-600" />
                <MetricCard label="Critical Results" value={labData.summary.criticalResults} colorClass="bg-rose-50 text-rose-600" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Order Number</th>
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Investigation</th>
                        <th className="px-4 py-3">Doctor</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Result Flag</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {labData.data.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-teal-700">{o.orderNumber}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{o.patientName}</td>
                          <td className="px-4 py-3 text-slate-800">{o.investigationName}</td>
                          <td className="px-4 py-3 text-slate-600">{o.doctorName}</td>
                          <td className="px-4 py-3 text-slate-600">{o.priority}</td>
                          <td className="px-4 py-3">
                            {o.abnormalFlag ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                                {o.abnormalFlag}
                              </span>
                            ) : (
                              <span className="text-slate-400">Normal</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{o.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: EECP */}
          {activeTab === 'eecp' && eecpData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <MetricCard label="Active Courses" value={eecpData.summary.activeCourses} colorClass="bg-blue-50 text-blue-600" />
                <MetricCard label="Completed Courses" value={eecpData.summary.completedCourses} colorClass="bg-emerald-50 text-emerald-600" />
                <MetricCard label="Sessions Completed" value={eecpData.summary.sessionsInRange.completed} colorClass="bg-teal-50 text-teal-600" />
                <MetricCard label="Sessions Scheduled" value={eecpData.summary.sessionsInRange.scheduled} colorClass="bg-purple-50 text-purple-600" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Course #</th>
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Package</th>
                        <th className="px-4 py-3">Planned</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Remaining</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {eecpData.data.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-teal-700">{c.courseNumber}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{c.patientName}</td>
                          <td className="px-4 py-3 text-slate-700">{c.packageName}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{c.totalPlanned}</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">{c.completed}</td>
                          <td className="px-4 py-3 text-slate-600">{c.remaining}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
