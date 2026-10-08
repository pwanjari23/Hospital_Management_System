import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Link } from 'react-router-dom';
import patientService from '../../services/patientService';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import PatientModal from '../../components/patients/PatientModal';
import HospitalStatusBadge from '../../components/hospitals/HospitalStatusBadge';
import useAuth from '../../hooks/useAuth';
import { calculateAge } from '../../utils/age';

const GENDER_OPTIONS = [
  { value: '', label: 'All Genders' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer Not to Say' },
];

const BLOOD_GROUPS = [
  { value: '', label: 'All Blood Groups' },
  { value: 'A_POSITIVE', label: 'A+' },
  { value: 'A_NEGATIVE', label: 'A-' },
  { value: 'B_POSITIVE', label: 'B+' },
  { value: 'B_NEGATIVE', label: 'B-' },
  { value: 'AB_POSITIVE', label: 'AB+' },
  { value: 'AB_NEGATIVE', label: 'AB-' },
  { value: 'O_POSITIVE', label: 'O+' },
  { value: 'O_NEGATIVE', label: 'O-' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
];

export default function PatientsPage() {
  const { user } = useAuth();
  const [, startTransition] = useTransition();

  // State
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Filters & Search
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  // Status toggle confirmation modal
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    patient: null,
    targetActive: false,
    loading: false,
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(searchInput);
        setPage(1);
      });
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch patients
  const fetchPatients = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const params = {
          page,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        };
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (genderFilter) params.gender = genderFilter;
        if (bloodGroupFilter) params.bloodGroup = bloodGroupFilter;
        if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

        const res = await patientService.getPatients(params);
        if (res.success) {
          setPatients(res.data.patients || []);
          setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch patients directory.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, debouncedSearch, genderFilter, bloodGroupFilter, statusFilter]
  );

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Permissions
  const canRegister = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(user?.role);
  const canEdit = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(user?.role);
  const canChangeStatus = user?.role === 'HOSPITAL_ADMIN';
  const isReceptionist = user?.role === 'RECEPTIONIST';

  // Handle modal submit
  const handleModalSubmit = async (payload) => {
    setIsModalSubmitting(true);
    try {
      if (selectedPatient) {
        await patientService.updatePatient(selectedPatient.id, payload);
        showToast(`✓ Patient "${payload.firstName} ${payload.lastName}" updated successfully.`);
      } else {
        const res = await patientService.createPatient(payload);
        showToast(`✓ Patient "${payload.firstName} ${payload.lastName}" registered with UHID: ${res.data?.uhid}`);
      }
      setIsModalOpen(false);
      setSelectedPatient(null);
      await fetchPatients(true);
    } finally {
      setIsModalSubmitting(false);
    }
  };

  // Handle status toggle dialog
  const handleOpenStatusModal = (patient) => {
    setStatusModal({
      isOpen: true,
      patient,
      targetActive: !patient.isActive,
      loading: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModal.patient) return;
    setStatusModal((prev) => ({ ...prev, loading: true }));
    try {
      await patientService.updatePatientStatus(statusModal.patient.id, statusModal.targetActive);
      const actionWord = statusModal.targetActive ? 'activated' : 'deactivated';
      showToast(`✓ Patient "${statusModal.patient.firstName} ${statusModal.patient.lastName}" successfully ${actionWord}.`);
      setStatusModal({ isOpen: false, patient: null, targetActive: false, loading: false });
      fetchPatients(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update patient status.');
      setStatusModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const formatGender = (g) => {
    if (!g) return '';
    return g.charAt(0) + g.slice(1).toLowerCase();
  };

  const isFilterActive = debouncedSearch || genderFilter || bloodGroupFilter || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setGenderFilter('');
    setBloodGroupFilter('');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-elevated border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="ml-2 text-slate-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Patients
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Directory of admitted and registered patients in your hospital.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchPatients(true)}
            disabled={loading || refreshing}
            title={refreshing ? 'Refreshing...' : 'Refresh directory'}
            aria-label="Refresh directory"
            className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {canRegister && (
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Register Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchPatients(true)}
            className="text-xs font-bold underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row gap-3 sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by Patient Name, UHID, Phone, or Email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={bloodGroupFilter}
            onChange={(e) => {
              setBloodGroupFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          >
            {BLOOD_GROUPS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {isFilterActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Patients Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          /* Empty States */
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            {isFilterActive ? (
              <>
                <h3 className="text-base font-bold text-slate-800">No patients match your search</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search criteria or resetting filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Clear All Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-800">No patients registered yet</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Register your first patient to begin admitting patients to your hospital.
                </p>
                {canRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setIsModalOpen(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-xs transition-colors"
                  >
                    <span>+ Register First Patient</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-6">PATIENT</th>
                    <th className="py-3.5 px-6">UHID</th>
                    <th className="py-3.5 px-6">AGE / GENDER</th>
                    <th className="py-3.5 px-6">CONTACT</th>
                    <th className="py-3.5 px-6">STATUS</th>
                    <th className="py-3.5 px-6">REGISTERED</th>
                    <th className="py-3.5 px-6 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient) => {
                    const fullName = `${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`.trim();
                    const age = calculateAge(patient.dateOfBirth);
                    const initial = patient.firstName.charAt(0).toUpperCase();

                    return (
                      <tr key={patient.id} className="hover:bg-slate-50/80 transition">
                        {/* Patient Cell with Avatar */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {initial}
                            </div>
                            <div>
                              <Link
                                to={`/hospital-admin/patients/${patient.id}`}
                                className="font-bold text-slate-900 hover:text-blue-600 transition block truncate max-w-[180px]"
                              >
                                {fullName}
                              </Link>
                              {patient.email ? (
                                <span className="text-xs text-slate-400 block truncate max-w-[180px]">
                                  {patient.email}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 block">—</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* UHID Monospace Pill */}
                        <td className="py-3.5 px-6">
                          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {patient.uhid}
                          </span>
                        </td>

                        {/* Age / Gender */}
                        <td className="py-3.5 px-6 text-slate-600 text-xs">
                          {age ? `${age} yrs` : '—'} &bull; {formatGender(patient.gender)}
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-6 text-slate-700 text-xs font-medium">
                          {patient.phone}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-6">
                          <HospitalStatusBadge status={patient.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </td>

                        {/* Registered */}
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          {new Date(patient.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              to={`/hospital-admin/patients/${patient.id}`}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            >
                              Details
                            </Link>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setIsModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              >
                                Edit
                              </button>
                            )}

                            {canChangeStatus && (
                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(patient)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                  patient.isActive
                                    ? 'text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {patient.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card / List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {patients.map((patient) => {
                const fullName = `${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`.trim();
                const age = calculateAge(patient.dateOfBirth);
                const initial = patient.firstName.charAt(0).toUpperCase();

                return (
                  <div key={patient.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {initial}
                        </div>
                        <div>
                          <Link
                            to={`/hospital-admin/patients/${patient.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 text-sm block"
                          >
                            {fullName}
                          </Link>
                          <span className="font-mono text-xs font-semibold text-blue-700">
                            {patient.uhid}
                          </span>
                        </div>
                      </div>
                      <HospitalStatusBadge status={patient.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Age / Gender</span>
                        <span>{age ? `${age} yrs` : '—'} &bull; {formatGender(patient.gender)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone</span>
                        <span>{patient.phone}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Link
                        to={`/hospital-admin/patients/${patient.id}`}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg"
                      >
                        Details
                      </Link>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
                        >
                          Edit
                        </button>
                      )}
                      {canChangeStatus && (
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(patient)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                            patient.isActive
                              ? 'text-amber-700 bg-amber-50'
                              : 'text-emerald-700 bg-emerald-50'
                          }`}
                        >
                          {patient.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls - Consistent with HospitalsPage */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Showing{' '}
                <span className="font-semibold text-slate-900">
                  {(pagination.page - 1) * pagination.limit + (patients.length > 0 ? 1 : 0)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{pagination.total}</span> patients
              </div>

              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition shadow-2xs"
                >
                  Previous
                </button>
                <span className="px-2 font-semibold text-slate-800">
                  {pagination.page} / {Math.max(1, pagination.totalPages)}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition shadow-2xs"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Patient Register / Edit Modal - Styled like Screenshot 2 */}
      <PatientModal
        isOpen={isModalOpen}
        patient={selectedPatient}
        loading={isModalSubmitting}
        isReceptionist={isReceptionist}
        onSubmit={handleModalSubmit}
        onClose={() => {
          if (!isModalSubmitting) {
            setIsModalOpen(false);
            setSelectedPatient(null);
          }
        }}
      />

      {/* Confirmation Dialog for Status Change */}
      <ConfirmationDialog
        isOpen={statusModal.isOpen}
        title={statusModal.targetActive ? 'Activate Patient?' : 'Deactivate Patient?'}
        message={
          statusModal.targetActive
            ? `Re-activate ${statusModal.patient?.firstName} ${statusModal.patient?.lastName}. Patient records will be available for new admissions and consultations.`
            : `This patient will remain in the system, but will be marked inactive.`
        }
        detailNote={
          !statusModal.targetActive
            ? 'Existing records and medical history are safely preserved and not deleted.'
            : undefined
        }
        confirmText={statusModal.targetActive ? 'Activate Patient' : 'Deactivate Patient'}
        confirmVariant={statusModal.targetActive ? 'emerald' : 'danger'}
        loading={statusModal.loading}
        onConfirm={handleConfirmStatusChange}
        onClose={() =>
          !statusModal.loading &&
          setStatusModal({ isOpen: false, patient: null, targetActive: false, loading: false })
        }
      />
    </div>
  );
}
