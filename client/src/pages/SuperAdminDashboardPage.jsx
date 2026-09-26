import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dashboardService from '../services/dashboardService';
import hospitalService from '../services/hospitalService';
import DashboardCard from '../components/common/DashboardCard';
import HospitalStatusBadge from '../components/hospitals/HospitalStatusBadge';
import HospitalModal from '../components/hospitals/HospitalModal';

export default function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Add Hospital modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAdminCredentials, setCreatedAdminCredentials] = useState(null);
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const stats = await dashboardService.getDashboardStats();
      setData(stats);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCreateHospital = async (formData) => {
    setIsSubmitting(true);
    try {
      const created = await hospitalService.createHospital(formData);
      setIsAddModalOpen(false);
      showToast(`✓ Hospital "${created.name}" created successfully.`);

      if (created.adminUser) {
        setCreatedAdminCredentials({
          hospitalName: created.name,
          slug: created.slug,
          adminName: created.adminUser.name,
          adminEmail: created.adminUser.email,
          initialPassword: created.adminUser.initialPassword,
        });
      }

      await fetchStats(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const metrics = data?.metrics || {
    totalHospitals: 0,
    activeHospitals: 0,
    inactiveHospitals: 0,
    addedThisMonth: 0,
  };

  const recentHospitals = data?.recentHospitals || [];

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global healthcare platform overview and tenant network distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchStats(true)}
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

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Hospital</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchStats(true)}
            className="underline font-semibold hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Summary Metric Cards: 2x2 on mobile, 4 in 1 line on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <DashboardCard
          title="Total Hospitals"
          value={metrics.totalHospitals}
          subtitle="Across all platform tenants"
          variant="blue"
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <DashboardCard
          title="Active Hospitals"
          value={metrics.activeHospitals}
          subtitle="Operational tenant accounts"
          variant="emerald"
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <DashboardCard
          title="Inactive Hospitals"
          value={metrics.inactiveHospitals}
          subtitle="Suspended or disabled tenants"
          variant="slate"
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />

        <DashboardCard
          title="Added This Month"
          value={metrics.addedThisMonth}
          subtitle="Registered in current calendar month"
          variant="indigo"
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Recent Hospitals Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Hospitals</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest 5 registered tenants ordered by creation date.
            </p>
          </div>
          <Link
            to="/super-admin/hospitals"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>View All</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600" />
            <p className="text-xs text-slate-500">Loading recent hospitals...</p>
          </div>
        ) : recentHospitals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hospitals registered yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Get started by registering your first hospital tenant on the platform.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
            >
              Add First Hospital
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Hospital</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentHospitals.map((hosp) => (
                  <tr
                    key={hosp.id}
                    onClick={() => navigate('/super-admin/hospitals')}
                    className="hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {hosp.logoUrl ? (
                          <img
                            src={hosp.logoUrl}
                            alt=""
                            className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {hosp.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">
                            {hosp.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {hosp.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-medium text-slate-700">
                      {hosp.city ? `${hosp.city}${hosp.state ? `, ${hosp.state}` : ''}` : '—'}
                    </td>

                    <td className="py-4 px-4">
                      <div>
                        <span className="text-slate-800 font-medium block">
                          {hosp.email || '—'}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {hosp.phone || ''}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <HospitalStatusBadge status={hosp.status} />
                    </td>

                    <td className="py-4 px-6 text-right text-slate-400 font-medium">
                      {hosp.createdAt ? new Date(hosp.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for adding hospital directly from dashboard */}
      <HospitalModal
        isOpen={isAddModalOpen}
        loading={isSubmitting}
        onSubmit={handleCreateHospital}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 p-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 z-50">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-2 font-bold hover:text-emerald-200">
            ✕
          </button>
        </div>
      )}

      {/* Hospital & Admin Provisioning Credentials Success Modal */}
      {createdAdminCredentials && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hospital & Admin Ready!</h3>
                <p className="text-xs text-slate-500">Tenant created with initial administrative access.</p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Hospital:</span>
                <span className="font-bold text-slate-900">{createdAdminCredentials.hospitalName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Tenant Slug:</span>
                <code className="font-mono text-blue-600 font-bold">{createdAdminCredentials.slug}</code>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Admin Name:</span>
                <span className="font-semibold text-slate-800">{createdAdminCredentials.adminName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Login Email:</span>
                <code className="font-mono font-bold text-slate-900">{createdAdminCredentials.adminEmail}</code>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Temporary Password:</span>
                <code className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                  {createdAdminCredentials.initialPassword}
                </code>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const text = `Hospital: ${createdAdminCredentials.hospitalName}\nSlug: ${createdAdminCredentials.slug}\nAdmin: ${createdAdminCredentials.adminName}\nEmail: ${createdAdminCredentials.adminEmail}\nPassword: ${createdAdminCredentials.initialPassword}`;
                  navigator.clipboard.writeText(text);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>{copiedText ? '✓ Copied to Clipboard!' : '📋 Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedAdminCredentials(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
