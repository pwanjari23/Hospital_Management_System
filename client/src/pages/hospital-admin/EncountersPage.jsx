import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import encounterService from '../../services/encounterService';
import staffService from '../../services/staffService';
import departmentService from '../../services/departmentService';
import DashboardCard from '../../components/common/DashboardCard';
import useAuth from '../../hooks/useAuth';

const STATUS_CONFIG = {
  VITALS_PENDING: { label: 'Vitals Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  READY_FOR_DOCTOR: { label: 'Ready for Doctor', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_CONSULTATION: { label: 'In Consultation', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  OPEN: { label: 'Open', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export default function EncountersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  const isDoctor = user?.role === 'DOCTOR';
  const isNurse = user?.role === 'NURSE';

  const [encounters, setEncounters] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Dropdown options
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [doctorFilter, setDoctorFilter] = useState(isDoctor ? user?.id : 'ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  // Quick Vitals Modal for Nurses
  const [vitalsModal, setVitalsModal] = useState({
    isOpen: false,
    encounter: null,
    submitting: false,
    error: '',
    data: {
      temperature: '',
      pulseRate: '',
      respiratoryRate: '',
      systolicBp: '',
      diastolicBp: '',
      spo2: '',
      weightKg: '',
      heightCm: '',
      bloodGlucose: '',
      painScore: '',
      notes: '',
    },
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(searchInput);
        setPage(1);
      });
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load filter metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [docRes, deptRes] = await Promise.all([
          staffService.getStaff({ role: 'DOCTOR', limit: 100, status: 'ACTIVE' }),
          departmentService.getDepartments({ limit: 100, status: 'ACTIVE' }),
        ]);
        if (docRes.success) setDoctors(docRes.data.staff || []);
        if (deptRes.success) setDepartments(deptRes.data.departments || []);
      } catch (err) {
        console.error('Failed to load encounters metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Encounters List
  const fetchEncounters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter,
        encounterType: typeFilter,
      };

      if (doctorFilter !== 'ALL') params.doctorId = doctorFilter;
      if (departmentFilter !== 'ALL') params.departmentId = departmentFilter;
      if (dateFilter) params.date = dateFilter;

      const res = await encounterService.getEncounters(params);
      if (res.success) {
        setEncounters(res.data.encounters || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clinical encounters');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, statusFilter, typeFilter, doctorFilter, departmentFilter, dateFilter]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  // Metric counts
  const vitalsPendingCount = encounters.filter((e) => e.status === 'VITALS_PENDING').length;
  const readyForDoctorCount = encounters.filter((e) => e.status === 'READY_FOR_DOCTOR').length;
  const inConsultationCount = encounters.filter((e) => e.status === 'IN_CONSULTATION').length;
  const completedCount = encounters.filter((e) => e.status === 'COMPLETED').length;

  // Open Vitals Entry Modal
  const handleOpenVitalsModal = (enc) => {
    setVitalsModal({
      isOpen: true,
      encounter: enc,
      submitting: false,
      error: '',
      data: {
        temperature: '',
        pulseRate: '',
        respiratoryRate: '',
        systolicBp: '',
        diastolicBp: '',
        spo2: '',
        weightKg: '',
        heightCm: '',
        bloodGlucose: '',
        painScore: '',
        notes: '',
      },
    });
  };

  // Submit Vitals
  const handleSaveVitals = async (e) => {
    e.preventDefault();
    const { encounter, data } = vitalsModal;
    if (!encounter) return;

    setVitalsModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const res = await encounterService.recordVital(encounter.id, data);
      if (res.success) {
        setVitalsModal({ isOpen: false, encounter: null, submitting: false, error: '', data: {} });
        fetchEncounters();
      }
    } catch (err) {
      setVitalsModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to record vitals. Check values.',
      }));
    }
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {isDoctor ? "Doctor's Consultation Worklist" : isNurse ? 'Nursing Vitals Intake Queue' : 'Clinical Encounters'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track patient consultations, triage vitals intake, and conduct clinical encounters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchEncounters();
            }}
            disabled={refreshing}
            className="p-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Vitals Pending"
          value={vitalsPendingCount}
          subtitle="Waiting for triage/intake"
          color="amber"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
        />
        <DashboardCard
          title="Ready for Doctor"
          value={readyForDoctorCount}
          subtitle="Vitals done, in queue"
          color="blue"
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <DashboardCard
          title="In Consultation"
          value={inConsultationCount}
          subtitle="Doctor evaluating patient"
          color="purple"
          icon={
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <DashboardCard
          title="Completed"
          value={completedCount}
          subtitle="Encounter closed"
          color="emerald"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {/* Patient Search */}
          <div className="relative lg:col-span-2">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by patient, UHID or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="VITALS_PENDING">Vitals Pending</option>
              <option value="READY_FOR_DOCTOR">Ready for Doctor</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="OPD">OPD Consultation</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="EECP_CONSULTATION">EECP Consultation</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Filter */}
          <div>
            <select
              disabled={isDoctor}
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchEncounters} className="font-semibold underline ml-2">
            Try again
          </button>
        </div>
      )}

      {/* Encounters List Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading clinical encounters...</p>
          </div>
        ) : encounters.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No Clinical Encounters Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Encounters are created when patients check in for their scheduled appointments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Encounter No.</th>
                  <th className="px-4 py-3.5">Patient Details</th>
                  <th className="px-4 py-3.5">Doctor & Dept</th>
                  <th className="px-4 py-3.5">Appointment Ref</th>
                  <th className="px-4 py-3.5">Latest Vitals</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {encounters.map((enc) => {
                  const patientName = `${enc.patient?.firstName || ''} ${enc.patient?.lastName || ''}`.trim();
                  const latestVital = enc.vitals?.[0] || null;
                  const statusConf = STATUS_CONFIG[enc.status] || STATUS_CONFIG.OPEN;

                  return (
                    <tr key={enc.id} className="hover:bg-slate-50/60 transition">
                      {/* Encounter No */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 font-mono text-[11px]">
                          {enc.encounterNumber}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {enc.encounterType}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{patientName || 'Patient'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-mono">{enc.patient?.uhid}</span>
                          <span>&bull;</span>
                          <span>{enc.patient?.gender}</span>
                          <span>&bull;</span>
                          <span>{enc.patient?.phone}</span>
                        </div>
                      </td>

                      {/* Doctor & Dept */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{enc.doctor?.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {enc.department?.name || enc.doctor?.specialization || 'Clinical'}
                        </div>
                      </td>

                      {/* Appointment */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {enc.appointment ? (
                          <>
                            <div className="font-mono text-slate-800 text-[11px]">
                              {enc.appointment.appointmentNumber}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {enc.appointment.appointmentDate} ({enc.appointment.startTime})
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400">Direct / Walk-in</span>
                        )}
                      </td>

                      {/* Latest Vitals preview */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {latestVital ? (
                          <div className="text-[11px] space-y-0.5">
                            <span className="font-semibold text-slate-800">
                              BP: {latestVital.systolicBp}/{latestVital.diastolicBp || '—'}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              Pulse: {latestVital.pulseRate || '—'} &bull; SpO₂: {latestVital.spo2 ? `${latestVital.spo2}%` : '—'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                            No Vitals Recorded
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusConf.color}`}
                        >
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Record / View Vitals Button */}
                          {enc.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleOpenVitalsModal(enc)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                              title="Record Vitals"
                            >
                              Vitals
                            </button>
                          )}

                          {/* Open Consultation Button */}
                          <button
                            onClick={() => navigate(`/hospital-admin/consultation/${enc.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition"
                          >
                            <span>{enc.status === 'COMPLETED' ? 'View Encounter' : 'Consultation'}</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
              <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* QUICK VITALS RECORDING MODAL */}
      {/* ============================================================== */}
      {vitalsModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Patient Vitals</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {vitalsModal.encounter?.encounterNumber} &bull; {vitalsModal.encounter?.patient?.firstName} {vitalsModal.encounter?.patient?.lastName}
                </p>
              </div>
              <button
                onClick={() => setVitalsModal({ isOpen: false, encounter: null, submitting: false, error: '', data: {} })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {vitalsModal.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {vitalsModal.error}
              </div>
            )}

            <form onSubmit={handleSaveVitals} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={vitalsModal.data.systolicBp}
                    onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, systolicBp: e.target.value } }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={vitalsModal.data.diastolicBp}
                    onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, diastolicBp: e.target.value } }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="72"
                    value={vitalsModal.data.pulseRate}
                    onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, pulseRate: e.target.value } }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={vitalsModal.data.spo2}
                    onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, spo2: e.target.value } }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={vitalsModal.data.temperature}
                    onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, temperature: e.target.value } }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Respiratory Rate</label>
                  <input
                    type="number"
                    placeholder="18"
                    value={vitalsModal.data.respiratoryRate}
                    onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, respiratoryRate: e.target.value } }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={vitalsModal.data.weightKg}
                    onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, weightKg: e.target.value } }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="170"
                    value={vitalsModal.data.heightCm}
                    onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, heightCm: e.target.value } }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Clinical Notes / Observations</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Patient feels mild shortness of breath upon exertion..."
                  value={vitalsModal.data.notes}
                  onChange={(e) => setVitalsModal((prev) => ({ ...prev, data: { ...prev.data, notes: e.target.value } }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVitalsModal({ isOpen: false, encounter: null, submitting: false, error: '', data: {} })}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vitalsModal.submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {vitalsModal.submitting ? 'Saving Vitals...' : 'Save & Ready for Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
