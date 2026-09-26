import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import hospitalAdminService from '../../services/hospitalAdminService';
import patientService from '../../services/patientService';
import DashboardCard from '../../components/common/DashboardCard';
import HospitalStatusBadge from '../../components/hospitals/HospitalStatusBadge';
import PatientModal from '../../components/patients/PatientModal';
import useAuth from '../../hooks/useAuth';

export default function HospitalAdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Register Patient Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await hospitalAdminService.getDashboard();
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load hospital dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleCreatePatient = async (payload) => {
    setIsModalSubmitting(true);
    try {
      const res = await patientService.createPatient(payload);
      showToast(`✓ Patient "${payload.firstName} ${payload.lastName}" registered with UHID: ${res.data?.uhid}`);
      setIsModalOpen(false);
      await fetchDashboardData(true);
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const canRegister = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(user?.role);
  const isReceptionist = user?.role === 'RECEPTIONIST';
  const hospitalName = data?.hospital?.name || user?.hospitalName || 'Hospital Workspace';

  return (
    <div className="space-y-8">
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

      {/* Top Banner & Header - Exactly matching Super Admin Dashboard (Screenshot 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {hospitalName} Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === 'DOCTOR'
              ? `Welcome, Dr. ${user?.name || 'Doctor'} • Clinical consultations, patient records, and medical intake.`
              : user?.role === 'RECEPTIONIST'
              ? `Welcome, ${user?.name || 'Staff'} • Front desk patient registration and active directory.`
              : 'Clinical operations census, registered patient demographics, and staff roster.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={loading || refreshing}
            title={refreshing ? 'Refreshing...' : 'Refresh metrics'}
            aria-label="Refresh metrics"
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 transition shadow-2xs disabled:opacity-50 flex items-center justify-center"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
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
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition"
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
            onClick={() => fetchDashboardData(true)}
            className="text-xs font-bold underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section 1: Patient Demographics & Census */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <DashboardCard
            title="TOTAL PATIENTS"
            value={data?.patientStats?.totalPatients}
            subtitle="Across all platform records"
            loading={loading}
            variant="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />
          <DashboardCard
            title="ACTIVE PATIENTS"
            value={data?.patientStats?.activePatients}
            subtitle="Operational patient accounts"
            loading={loading}
            variant="emerald"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <DashboardCard
            title="INACTIVE PATIENTS"
            value={data?.patientStats?.inactivePatients}
            subtitle="Suspended or archived records"
            loading={loading}
            variant="slate"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            }
          />
          <DashboardCard
            title="ADDED THIS MONTH"
            value={data?.patientStats?.newThisMonth}
            subtitle="Registered in current calendar month"
            loading={loading}
            variant="indigo"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />
        </div>
      </div>

      {/* Section 2: Hospital Staffing Capacity */}
      <div className="space-y-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Staff Capacity
        </span>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <DashboardCard
            title="TOTAL STAFF"
            value={data?.staffStats?.totalStaff}
            subtitle="Hospital personnel"
            loading={loading}
            variant="slate"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <DashboardCard
            title="DOCTORS"
            value={data?.staffStats?.doctors}
            subtitle="Clinical physicians"
            loading={loading}
            variant="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <DashboardCard
            title="NURSES"
            value={data?.staffStats?.nurses}
            subtitle="Patient care & triage"
            loading={loading}
            variant="emerald"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
          />
          <DashboardCard
            title="RECEPTIONISTS"
            value={data?.staffStats?.receptionists}
            subtitle="Front desk & intake"
            loading={loading}
            variant="indigo"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Recent Patients Table - Exactly matching Screenshot 1 Recent Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Registrations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest 5 registered patients ordered by admission date.</p>
          </div>
          <Link
            to="/hospital-admin/patients"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
          >
            <span>View All &gt;</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data?.recentPatients?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6">PATIENT</th>
                  <th className="py-3 px-6">UHID</th>
                  <th className="py-3 px-6">CONTACT</th>
                  <th className="py-3 px-6">STATUS</th>
                  <th className="py-3 px-6 text-right">REGISTERED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentPatients.map((patient) => {
                  const fullName = `${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`.trim();
                  const initial = patient.firstName.charAt(0).toUpperCase();

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition">
                      {/* Patient Avatar + Name */}
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
                            {patient.email && (
                              <span className="text-xs text-slate-400 block truncate max-w-[180px]">
                                {patient.email}
                              </span>
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

                      {/* Contact */}
                      <td className="py-3.5 px-6 text-slate-600 text-xs">
                        {patient.phone}
                      </td>

                      {/* Status Badge with Glowing Dot */}
                      <td className="py-3.5 px-6">
                        <HospitalStatusBadge status={patient.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      {/* Registered Date & Detail Link */}
                      <td className="py-3.5 px-6 text-right">
                        <Link
                          to={`/hospital-admin/patients/${patient.id}`}
                          className="text-xs text-slate-500 hover:text-blue-600 transition"
                        >
                          {new Date(patient.createdAt).toLocaleDateString()}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 px-4 text-slate-500">
            <div className="w-12 h-12 mx-auto mb-3 text-slate-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800">No patients registered yet</p>
            <p className="text-xs text-slate-500 mt-1">Admit your first patient to begin clinical intake workflows.</p>
            {canRegister && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-block mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                + Register First Patient
              </button>
            )}
          </div>
        )}
      </div>

      {/* Patient Register Modal - Exactly styled like Screenshot 2 */}
      <PatientModal
        isOpen={isModalOpen}
        patient={null}
        loading={isModalSubmitting}
        isReceptionist={isReceptionist}
        onSubmit={handleCreatePatient}
        onClose={() => {
          if (!isModalSubmitting) setIsModalOpen(false);
        }}
      />
    </div>
  );
}
