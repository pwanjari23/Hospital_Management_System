import React, { useState, useEffect, useCallback } from 'react';
import hospitalService from '../services/hospitalService';
import HospitalStatusBadge from '../components/hospitals/HospitalStatusBadge';
import HospitalModal from '../components/hospitals/HospitalModal';
import HospitalDetailsDrawer from '../components/hospitals/HospitalDetailsDrawer';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals & Drawers state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [drawerHospital, setDrawerHospital] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    hospital: null,
    targetStatus: 'INACTIVE',
    loading: false,
  });

  const [createdAdminCredentials, setCreatedAdminCredentials] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  const loadHospitals = useCallback(
    async (
      page = pagination.page,
      limit = pagination.limit,
      search = debouncedSearch,
      status = statusFilter
    ) => {
      setLoading(true);
      setError('');
      try {
        const data = await hospitalService.getHospitals({
          page,
          limit,
          search: search !== undefined ? search : debouncedSearch,
          status: status === 'ALL' ? undefined : status,
        });

        setHospitals(data?.hospitals || []);
        if (data?.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load hospitals');
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statusFilter, pagination.page, pagination.limit]
  );

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setSelectedHospital(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (hosp) => {
    setSelectedHospital(hosp);
    setIsModalOpen(true);
  };

  // Open Details Drawer
  const handleOpenDetails = async (hosp) => {
    try {
      // Fetch full details with settings
      const detailed = await hospitalService.getHospitalById(hosp.id);
      setDrawerHospital(detailed);
      setIsDrawerOpen(true);
    } catch {
      // Fallback to table row object
      setDrawerHospital(hosp);
      setIsDrawerOpen(true);
    }
  };

  // Submit Modal (Create or Update)
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (selectedHospital) {
        // Edit flow
        const updated = await hospitalService.updateHospital(selectedHospital.id, formData);
        showToast(`✓ Hospital "${updated.name}" updated successfully.`);
        if (drawerHospital?.id === selectedHospital.id) {
          setDrawerHospital(updated);
        }
        setHospitals((prev) => prev.map((h) => (h.id === updated.id ? { ...h, ...updated } : h)));
        setIsModalOpen(false);
        await loadHospitals();
      } else {
        // Create flow
        const created = await hospitalService.createHospital(formData);
        showToast(`✓ Hospital "${created.name}" registered successfully.`);

        // Clear search filters and optimistically prepend newly created hospital
        setSearchTerm('');
        setDebouncedSearch('');
        setStatusFilter('ALL');
        setHospitals((prev) => [created, ...prev.filter((h) => h.id !== created.id)]);
        setPagination((prev) => ({
          ...prev,
          page: 1,
          total: (prev.total || 0) + 1,
        }));

        if (created.adminUser) {
          setCreatedAdminCredentials({
            hospitalName: created.name,
            slug: created.slug,
            adminName: created.adminUser.name,
            adminEmail: created.adminUser.email,
            initialPassword: created.adminUser.initialPassword,
          });
        }

        setIsModalOpen(false);
        // Refresh authoritative list at page 1 with all filters cleared
        await loadHospitals(1, pagination.limit, '', 'ALL');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Status Confirmation
  const handlePromptStatusChange = (hosp) => {
    const targetStatus = hosp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmDialog({
      isOpen: true,
      hospital: hosp,
      targetStatus,
      loading: false,
    });
  };

  // Confirm Status Change
  const handleConfirmStatusChange = async () => {
    const { hospital, targetStatus } = confirmDialog;
    if (!hospital) return;

    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      const updated = await hospitalService.updateHospitalStatus(hospital.id, targetStatus);
      showToast(
        `✓ Hospital "${updated.name}" is now marked as ${targetStatus}. No data was removed.`
      );
      if (drawerHospital?.id === hospital.id) {
        setDrawerHospital(updated);
      }
      setConfirmDialog({ isOpen: false, hospital: null, targetStatus: 'INACTIVE', loading: false });
      await loadHospitals();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Hospital Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage hospital tenants, contact directories, and operational states across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadHospitals()}
            disabled={loading}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            title="Refresh list"
            aria-label="Refresh list"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : 'text-slate-500'}`}
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
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Register Hospital</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => loadHospitals()} className="underline font-semibold hover:text-red-900">
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by hospital name, slug, or city..."
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status Filters & Per Page */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="hidden sm:inline">Rows:</span>
            <select
              value={pagination.limit}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10);
                setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
              }}
              className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600" />
            <p className="text-xs text-slate-500">Fetching hospitals from PostgreSQL database...</p>
          </div>
        ) : hospitals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hospitals found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? `No hospitals match your criteria "${searchTerm || statusFilter}". Try adjusting your filters.`
                : 'There are no hospital tenants registered on this platform yet.'}
            </p>
            {searchTerm || statusFilter !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear all filters
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                Register First Hospital
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6">Hospital & Slug</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hospitals.map((hosp) => (
                    <tr key={hosp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {hosp.logoUrl ? (
                            <img
                              src={hosp.logoUrl}
                              alt=""
                              className="w-9 h-9 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                              {hosp.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(hosp)}
                              className="font-bold text-slate-900 block text-sm hover:text-blue-600 transition text-left"
                            >
                              {hosp.name}
                            </button>
                            <span className="font-mono text-[11px] text-slate-400 block">
                              {hosp.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-medium text-slate-700">
                        {hosp.city ? (
                          <span>
                            {hosp.city}
                            {hosp.state ? `, ${hosp.state}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                        <span className="block text-[11px] text-slate-400">{hosp.country || 'India'}</span>
                      </td>

                      <td className="py-4 px-4">
                        <div>
                          <span className="text-slate-800 font-medium block">
                            {hosp.email || <span className="text-slate-400 italic">—</span>}
                          </span>
                          <span className="text-slate-400 text-[11px] block">
                            {hosp.phone || ''}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <HospitalStatusBadge status={hosp.status} />
                      </td>

                      <td className="py-4 px-4 text-slate-400 font-medium">
                        {hosp.createdAt ? new Date(hosp.createdAt).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(hosp)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition"
                            title="View details"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(hosp)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition"
                            title="Edit hospital"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptStatusChange(hosp)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                              hosp.status === 'ACTIVE'
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {hosp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {hospitals.map((hosp) => (
                <div key={hosp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                        {hosp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{hosp.name}</h3>
                        <span className="font-mono text-xs text-slate-400">{hosp.slug}</span>
                      </div>
                    </div>
                    <HospitalStatusBadge status={hosp.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block">City</span>
                      <span className="font-medium">{hosp.city || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Email</span>
                      <span className="font-medium truncate block">{hosp.email || '—'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(hosp)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(hosp)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePromptStatusChange(hosp)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        hosp.status === 'ACTIVE'
                          ? 'border-red-200 text-red-600 bg-red-50'
                          : 'border-emerald-200 text-emerald-600 bg-emerald-50'
                      }`}
                    >
                      {hosp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing{' '}
                <strong className="text-slate-800">
                  {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </strong>{' '}
                of <strong className="text-slate-800">{pagination.total}</strong> hospitals
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className="px-2 font-medium">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Hospital Modal */}
      <HospitalModal
        isOpen={isModalOpen}
        hospital={selectedHospital}
        loading={isSubmitting}
        onSubmit={handleFormSubmit}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Details Slide-Over Drawer */}
      <HospitalDetailsDrawer
        isOpen={isDrawerOpen}
        hospital={drawerHospital}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={(hosp) => {
          setIsDrawerOpen(false);
          handleOpenEdit(hosp);
        }}
        onToggleStatus={(hosp) => {
          setIsDrawerOpen(false);
          handlePromptStatusChange(hosp);
        }}
      />

      {/* Confirmation Dialog for Status Change */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.targetStatus === 'INACTIVE'
            ? 'Deactivate Hospital?'
            : 'Activate Hospital?'
        }
        message={
          confirmDialog.targetStatus === 'INACTIVE'
            ? `Are you sure you want to deactivate "${confirmDialog.hospital?.name}"?`
            : `Are you sure you want to activate "${confirmDialog.hospital?.name}"? Operational access will be restored.`
        }
        detailNote={
          confirmDialog.targetStatus === 'INACTIVE'
            ? 'This will mark the hospital as inactive. No hospital data, tenant settings, users, or records will be deleted.'
            : undefined
        }
        confirmText={confirmDialog.targetStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmDialog.targetStatus === 'INACTIVE' ? 'danger' : 'emerald'}
        loading={confirmDialog.loading}
        onConfirm={handleConfirmStatusChange}
        onClose={() =>
          setConfirmDialog({ isOpen: false, hospital: null, targetStatus: 'INACTIVE', loading: false })
        }
      />

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
