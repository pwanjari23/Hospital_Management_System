import React, { useState, useEffect, useCallback, useTransition } from 'react';
import departmentService from '../../services/departmentService';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import useAuth from '../../hooks/useAuth';

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [, startTransition] = useTransition();

  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Filters & Search
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedDept, setSelectedDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', status: 'ACTIVE' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status toggle confirmation
  const [statusDialog, setStatusDialog] = useState({
    isOpen: false,
    department: null,
    targetStatus: 'ACTIVE',
    loading: false,
  });

  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(searchInput);
        setPage(1);
      });
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const fetchDepartments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = { page, limit: 10 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;

      const res = await departmentService.getDepartments(params);
      if (res.success) {
        setDepartments(res.data.departments || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenAdd = () => {
    setModalMode('create');
    setSelectedDept(null);
    setFormData({ name: '', code: '', description: '', status: 'ACTIVE' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setModalMode('edit');
    setSelectedDept(dept);
    setFormData({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      status: dept.status || 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Department name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Department name must be at least 2 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await departmentService.createDepartment(formData);
        showToast(`✓ Department "${formData.name}" created successfully.`);
      } else {
        await departmentService.updateDepartment(selectedDept.id, formData);
        showToast(`✓ Department "${formData.name}" updated successfully.`);
      }
      setIsModalOpen(false);
      await fetchDepartments(true);
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors) {
        setFormErrors(respData.errors);
      } else {
        setFormErrors({ general: respData?.message || 'Failed to save department. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusDialog.department) return;
    setStatusDialog((prev) => ({ ...prev, loading: true }));
    try {
      await departmentService.updateDepartmentStatus(
        statusDialog.department.id,
        statusDialog.targetStatus
      );
      showToast(
        `✓ Department "${statusDialog.department.name}" marked as ${statusDialog.targetStatus.toLowerCase()}.`
      );
      setStatusDialog({ isOpen: false, department: null, targetStatus: 'ACTIVE', loading: false });
      await fetchDepartments(true);
    } catch (err) {
      showToast(`✗ Failed to update department status: ${err.response?.data?.message || err.message}`);
      setStatusDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200"
        >
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Departments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage hospital departments, specialties, and staff assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchDepartments(true)}
            disabled={loading || refreshing}
            title={refreshing ? 'Refreshing...' : 'Refresh directory'}
            aria-label="Refresh directory"
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

          {isHospitalAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Department</span>
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
            onClick={() => fetchDepartments(true)}
            className="text-xs font-bold underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search departments by name, code, or description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading && !refreshing ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading departments...</p>
          </div>
        ) : departments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No departments added yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your first department (e.g., Cardiology, General Medicine, Nursing) to start organizing hospital staff.
            </p>
            {isHospitalAdmin && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                Add First Department
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Department Name</th>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Description</th>
                    <th className="py-3.5 px-4 text-center">Doctors</th>
                    <th className="py-3.5 px-4 text-center">Total Staff</th>
                    <th className="py-3.5 px-4">Status</th>
                    {isHospitalAdmin && <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                        {dept.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {dept.code ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {dept.code}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-500 text-xs max-w-xs truncate">
                        {dept.description || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {dept.doctorCount || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {dept.staffCount || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            dept.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              dept.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {dept.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isHospitalAdmin && (
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(dept)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setStatusDialog({
                                  isOpen: true,
                                  department: dept,
                                  targetStatus: dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                  loading: false,
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition shadow-2xs ${
                                dept.status === 'ACTIVE'
                                  ? 'text-red-700 bg-red-50/50 border-red-200 hover:bg-red-50'
                                  : 'text-emerald-700 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                              }`}
                            >
                              {dept.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing Page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
                  <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total} departments)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-medium"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Department Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add New Department' : 'Edit Department'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalMode === 'create'
                    ? 'Configure a new department for doctors and staff assignments.'
                    : `Updating details for "${selectedDept?.name}".`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                &times;
              </button>
            </div>

            {formErrors.general && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formErrors.general}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="e.g., Cardiology, General Medicine, Laboratory"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 transition ${
                    formErrors.name
                      ? 'border-red-300 focus:ring-red-200 bg-red-50/30'
                      : 'border-slate-300 focus:ring-blue-200 focus:border-blue-500'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-red-600 text-[11px] mt-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Code <span className="text-slate-400 font-normal">(Optional short code)</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., CARD, GEN_MED, LAB"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Specialty details, consultation days, or responsibilities..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white"
                >
                  <option value="ACTIVE">Active (Available for doctor & staff assignment)</option>
                  <option value="INACTIVE">Inactive (Archived)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Department' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Status Change */}
      <ConfirmationDialog
        isOpen={statusDialog.isOpen}
        title={statusDialog.targetStatus === 'INACTIVE' ? 'Deactivate Department' : 'Activate Department'}
        message={
          statusDialog.targetStatus === 'INACTIVE'
            ? `Are you sure you want to deactivate "${statusDialog.department?.name}"? Assigned doctors and staff records will be preserved.`
            : `Are you sure you want to activate "${statusDialog.department?.name}"?`
        }
        detailNote="This setting affects staff assignment filters across the hospital."
        confirmText={statusDialog.targetStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={statusDialog.targetStatus === 'INACTIVE' ? 'danger' : 'emerald'}
        loading={statusDialog.loading}
        onConfirm={handleConfirmStatusToggle}
        onClose={() =>
          !statusDialog.loading &&
          setStatusDialog({ isOpen: false, department: null, targetStatus: 'ACTIVE', loading: false })
        }
      />
    </div>
  );
}
