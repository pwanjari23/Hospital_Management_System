import React, { useState, useEffect, useCallback, useTransition } from 'react';
import staffService from '../../services/staffService';
import departmentService from '../../services/departmentService';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import DashboardCard from '../../components/common/DashboardCard';
import useAuth from '../../hooks/useAuth';

const ROLES = [
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_STAFF', label: 'Lab Staff' },
  { value: 'HOSPITAL_ADMIN', label: 'Hospital Admin' },
];

export default function StaffPage() {
  const { user } = useAuth();
  const [, startTransition] = useTransition();

  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [viewStaffModal, setViewStaffModal] = useState({ isOpen: false, staff: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DOCTOR',
    departmentId: '',
    phone: '',
    qualification: '',
    specialization: '',
    licenseNumber: '',
    experienceYears: '',
    consultationFee: '',
    status: 'ACTIVE',
  });
  const [formErrors, setFormErrors] = useState({});

  // Status toggle confirmation
  const [statusDialog, setStatusDialog] = useState({
    isOpen: false,
    staff: null,
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

  // Load departments for selector
  useEffect(() => {
    departmentService
      .getDepartments({ limit: 100, status: 'ACTIVE' })
      .then((res) => {
        if (res.success) setDepartments(res.data.departments || []);
      })
      .catch(() => {});
  }, []);

  const fetchStaff = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = { page, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (roleFilter && roleFilter !== 'ALL') params.role = roleFilter;
      if (deptFilter && deptFilter !== 'ALL') params.departmentId = deptFilter;
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;

      const res = await staffService.getStaff(params);
      if (res.success) {
        setStaffList(res.data.staff || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, roleFilter, deptFilter, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenAdd = () => {
    setModalMode('create');
    setSelectedStaff(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'DOCTOR',
      departmentId: '',
      phone: '',
      qualification: '',
      specialization: '',
      licenseNumber: '',
      experienceYears: '',
      consultationFee: '',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff) => {
    setModalMode('edit');
    setSelectedStaff(staff);
    const primaryRole = staff.roles?.[0]?.name || 'DOCTOR';
    setFormData({
      name: staff.name || '',
      email: staff.email || '',
      password: '',
      role: primaryRole,
      departmentId: staff.departmentId || '',
      phone: staff.phone || '',
      qualification: staff.qualification || '',
      specialization: staff.specialization || '',
      licenseNumber: staff.licenseNumber || '',
      experienceYears: staff.experienceYears !== null ? String(staff.experienceYears) : '',
      consultationFee: staff.consultationFee !== null ? String(staff.consultationFee) : '',
      status: staff.status || 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }

    if (modalMode === 'create') {
      if (!formData.password) errors.password = 'Initial password is required';
      else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.role === 'DOCTOR' && formData.consultationFee !== '') {
      const fee = parseFloat(formData.consultationFee);
      if (isNaN(fee) || fee < 0) errors.consultationFee = 'Consultation fee cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        departmentId: formData.departmentId || null,
        experienceYears: formData.experienceYears !== '' ? parseInt(formData.experienceYears, 10) : null,
        consultationFee: formData.consultationFee !== '' ? parseFloat(formData.consultationFee) : 0,
      };
      if (modalMode === 'edit' && !payload.password) {
        delete payload.password;
      }

      if (modalMode === 'create') {
        await staffService.createStaff(payload);
        showToast(`✓ Staff member "${formData.name}" added successfully.`);
      } else {
        await staffService.updateStaff(selectedStaff.id, payload);
        showToast(`✓ Staff member "${formData.name}" updated successfully.`);
      }
      setIsModalOpen(false);
      await fetchStaff(true);
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors) {
        setFormErrors(respData.errors);
      } else {
        setFormErrors({ general: respData?.message || 'Failed to save staff record. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusDialog.staff) return;
    setStatusDialog((prev) => ({ ...prev, loading: true }));
    try {
      await staffService.updateStaffStatus(statusDialog.staff.id, statusDialog.targetStatus);
      showToast(`✓ ${statusDialog.staff.name} is now ${statusDialog.targetStatus.toLowerCase()}.`);
      setStatusDialog({ isOpen: false, staff: null, targetStatus: 'ACTIVE', loading: false });
      await fetchStaff(true);
    } catch (err) {
      showToast(`✗ Failed to update status: ${err.response?.data?.message || err.message}`);
      setStatusDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Helper count metrics from current view
  const doctorsCount = staffList.filter((s) => s.roles?.some((r) => r.name === 'DOCTOR')).length;
  const nursesCount = staffList.filter((s) => s.roles?.some((r) => r.name === 'NURSE')).length;
  const activeCount = staffList.filter((s) => s.status === 'ACTIVE').length;

  const formatRoleLabel = (role) => {
    switch (role) {
      case 'DOCTOR':
        return 'Doctor';
      case 'NURSE':
        return 'Nurse';
      case 'RECEPTIONIST':
        return 'Receptionist';
      case 'PHARMACIST':
        return 'Pharmacist';
      case 'LAB_STAFF':
        return 'Lab Staff';
      case 'HOSPITAL_ADMIN':
        return 'Hospital Admin';
      default:
        return role || 'Staff';
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'DOCTOR':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'NURSE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RECEPTIONIST':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PHARMACIST':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LAB_STAFF':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'HOSPITAL_ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Doctors & Staff
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Directory of medical professionals and healthcare staff in your hospital.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchStaff(true)}
            disabled={loading || refreshing}
            title={refreshing ? 'Refreshing...' : 'Refresh roster'}
            aria-label="Refresh roster"
            className="p-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
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

          {isHospitalAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Staff / Doctor</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Registered Staff"
          value={pagination.total}
          subtitle="All hospital roles"
          variant="slate"
          loading={loading && !refreshing}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <DashboardCard
          title="Doctors & Specialists"
          value={doctorsCount}
          subtitle="Consultants on roster"
          variant="blue"
          loading={loading && !refreshing}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <DashboardCard
          title="Nursing Staff"
          value={nursesCount}
          subtitle="Clinical support"
          variant="emerald"
          loading={loading && !refreshing}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <DashboardCard
          title="Active Personnel"
          value={activeCount}
          subtitle="Available for duty"
          variant="indigo"
          loading={loading && !refreshing}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
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
            onClick={() => fetchStaff(true)}
            className="text-xs font-bold underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3">
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
            placeholder="Search by name, email, phone, or doctor specialization..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading && !refreshing ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading roster...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No staff members found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your doctors, nurses, receptionists, and administrative staff to start configuring your team.
            </p>
            {isHospitalAdmin && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition"
              >
                Add First Staff Member
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4 sm:px-6">Name</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Contact</th>
                    <th className="py-3.5 px-4 hidden lg:table-cell">Specialization / Qualification</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {staffList.map((member) => {
                    const primaryRole = member.roles?.[0]?.name || 'STAFF';
                    const isDoctor = primaryRole === 'DOCTOR';
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate">
                                {member.name}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {member.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getRoleBadgeStyle(
                              primaryRole
                            )}`}
                          >
                            {formatRoleLabel(primaryRole)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {member.department ? (
                            <span className="text-slate-800 font-medium">
                              {member.department.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Assigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell text-xs text-slate-600 whitespace-nowrap">
                          {member.phone || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell text-xs text-slate-600 max-w-xs truncate">
                          {isDoctor ? (
                            <div>
                              <span className="font-medium text-slate-800">
                                {member.specialization || 'General Practitioner'}
                              </span>
                              {member.qualification && (
                                <span className="text-slate-500 block text-[11px]">
                                  {member.qualification}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              member.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewStaffModal({ isOpen: true, staff: member })}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
                            >
                              View
                            </button>
                            {isHospitalAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(member)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50/50 border border-blue-200 hover:bg-blue-50 transition shadow-2xs"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStatusDialog({
                                      isOpen: true,
                                      staff: member,
                                      targetStatus: member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                      loading: false,
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition shadow-2xs ${
                                    member.status === 'ACTIVE'
                                      ? 'text-red-700 bg-red-50/50 border-red-200 hover:bg-red-50'
                                      : 'text-emerald-700 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                                  }`}
                                >
                                  {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing Page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
                  <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total} staff members)
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

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === 'create' ? 'Add New Staff / Doctor' : `Edit Profile: ${selectedStaff?.name}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign role, department, contact information, and credentials.
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
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Dr. Rajesh Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  />
                  {formErrors.name && (
                    <p className="text-red-600 text-[11px] mt-1 font-medium">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  />
                  {formErrors.email && (
                    <p className="text-red-600 text-[11px] mt-1 font-medium">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {modalMode === 'create' ? 'Password *' : 'Reset Password (Optional)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={modalMode === 'create' ? 'Min 6 characters' : 'Leave empty to keep unchanged'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  />
                  {formErrors.password && (
                    <p className="text-red-600 text-[11px] mt-1 font-medium">{formErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hospital Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department Assignment
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white"
                  >
                    <option value="">None / Floating Staff</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Doctor Credentials Section */}
              {formData.role === 'DOCTOR' && (
                <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Doctor Clinical Profile & Credentials
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Qualification
                      </label>
                      <input
                        type="text"
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        placeholder="e.g., MBBS, MD, DM (Cardiology)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Specialization
                      </label>
                      <input
                        type="text"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        placeholder="e.g., Interventional Cardiology, EECP"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Medical License / Registration No.
                      </label>
                      <input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        placeholder="e.g., MCI-2018-98432"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="70"
                        value={formData.experienceYears}
                        onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                        placeholder="e.g., 12"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Default Consultation Fee (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={formData.consultationFee}
                          onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                          placeholder="800"
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      {formErrors.consultationFee && (
                        <p className="text-red-600 text-[11px] mt-1 font-medium">{formErrors.consultationFee}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white"
                >
                  <option value="ACTIVE">Active (Can sign in & operate)</option>
                  <option value="INACTIVE">Inactive (Suspended)</option>
                </select>
              </div>

              {/* Actions */}
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Provision Staff Member' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Staff Details Drawer / Modal */}
      {viewStaffModal.isOpen && viewStaffModal.staff && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewStaffModal({ isOpen: false, staff: null });
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {viewStaffModal.staff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{viewStaffModal.staff.name}</h2>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeStyle(
                      viewStaffModal.staff.roles?.[0]?.name
                    )}`}
                  >
                    {formatRoleLabel(viewStaffModal.staff.roles?.[0]?.name)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewStaffModal({ isOpen: false, staff: null })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-800">
                    {viewStaffModal.staff.department?.name || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span
                    className={`font-semibold ${
                      viewStaffModal.staff.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-600'
                    }`}
                  >
                    {viewStaffModal.staff.status}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {viewStaffModal.staff.email}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                  <span className="font-semibold text-slate-800">
                    {viewStaffModal.staff.phone || '—'}
                  </span>
                </div>
              </div>

              {viewStaffModal.staff.roles?.[0]?.name === 'DOCTOR' && (
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                    Clinical Qualifications
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Qualification:</span>
                      <strong className="text-slate-800">{viewStaffModal.staff.qualification || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Specialization:</span>
                      <strong className="text-slate-800">{viewStaffModal.staff.specialization || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">License No:</span>
                      <strong className="text-slate-800 font-mono">{viewStaffModal.staff.licenseNumber || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Experience:</span>
                      <strong className="text-slate-800">
                        {viewStaffModal.staff.experienceYears ? `${viewStaffModal.staff.experienceYears} Years` : '—'}
                      </strong>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-blue-100/60">
                      <span className="text-slate-500 block">Consultation Fee:</span>
                      <strong className="text-slate-900 text-xs">
                        ₹ {viewStaffModal.staff.consultationFee || '0.00'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewStaffModal({ isOpen: false, staff: null })}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Status Change */}
      <ConfirmationDialog
        isOpen={statusDialog.isOpen}
        title={statusDialog.targetStatus === 'INACTIVE' ? 'Deactivate Staff Member' : 'Activate Staff Member'}
        message={
          statusDialog.targetStatus === 'INACTIVE'
            ? `Are you sure you want to deactivate account for "${statusDialog.staff?.name}"? They will no longer be able to log in.`
            : `Are you sure you want to activate account for "${statusDialog.staff?.name}"?`
        }
        detailNote="All past patient consults, notes, and records associated with this user remain preserved."
        confirmText={statusDialog.targetStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={statusDialog.targetStatus === 'INACTIVE' ? 'danger' : 'emerald'}
        loading={statusDialog.loading}
        onConfirm={handleConfirmStatusToggle}
        onClose={() =>
          !statusDialog.loading &&
          setStatusDialog({ isOpen: false, staff: null, targetStatus: 'ACTIVE', loading: false })
        }
      />
    </div>
  );
}
