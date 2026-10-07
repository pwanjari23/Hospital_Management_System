import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService';
import encounterService from '../../services/encounterService';
import departmentService from '../../services/departmentService';
import patientService from '../../services/patientService';
import staffService from '../../services/staffService';
import DashboardCard from '../../components/common/DashboardCard';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import useAuth from '../../hooks/useAuth';


const APPOINTMENT_TYPES = [
  'OPD Consultation',
  'Follow-up',
  'EECP Consultation',
  'EECP Session',
  'Emergency',
  'Other',
];

const STATUS_BADGE_CLASSES = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CHECKED_IN: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-purple-50 text-purple-700 border-purple-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  NO_SHOW: 'bg-slate-50 text-slate-600 border-slate-200',
  RESCHEDULED: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN';
  const isReceptionist = user?.role === 'RECEPTIONIST';
  const isDoctor = user?.role === 'DOCTOR';
  const canBook = isHospitalAdmin || isReceptionist;

  const handleStartEncounter = async (apt) => {
    try {
      setRefreshing(true);
      const res = await encounterService.createEncounter({ appointmentId: apt.id });
      const encounter = res.data;
      navigate(`/hospital-admin/consultation/${encounter.id}`);
    } catch (err) {
      console.error('Failed to create/open encounter:', err);
      alert(err?.response?.data?.message || 'Failed to start clinical encounter');
    } finally {
      setRefreshing(false);
    }
  };

  // Appointments and statistics state
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    checkedIn: 0,
    completed: 0,
    cancelled: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Dropdown options
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Table Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState(isDoctor ? user?.id : 'ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // View Details Modal
  const [viewModal, setViewModal] = useState({ isOpen: false, appointment: null });

  // Status Change Dialog
  const [statusDialog, setStatusDialog] = useState({
    isOpen: false,
    appointment: null,
    targetStatus: '',
    notes: '',
  });

  // Cancellation Dialog
  const [cancelDialog, setCancelDialog] = useState({
    isOpen: false,
    appointment: null,
    reason: '',
  });

  // Reschedule Modal
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    appointment: null,
    newDate: '',
    selectedSlot: null,
    availableSlots: [],
    loadingSlots: false,
    slotError: '',
    submitting: false,
  });

  // 9-Step Booking Modal Flow
  const [bookingModal, setBookingModal] = useState({
    isOpen: false,
    currentStep: 1,
    submitting: false,
    // Step 1: Patient Search
    patientSearchInput: '',
    patientSearchResults: [],
    searchingPatients: false,
    selectedPatient: null,
    // Step 2: Department
    selectedDepartmentId: '',
    // Step 3: Doctor
    selectedDoctorId: '',
    // Step 4: Date
    selectedDate: new Date().toISOString().split('T')[0],
    // Step 5: Slots
    slots: [],
    loadingSlots: false,
    slotError: '',
    selectedSlot: null,
    // Step 6: Type
    appointmentType: 'OPD Consultation',
    // Step 7: Reason / Notes / Fee
    reason: '',
    notes: '',
    consultationFee: '',
    // Step 9: Confirmed appointment response
    confirmedAppointment: null,
  });

  // Toast notification timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch filter dropdown options (Doctors & Departments)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptRes, staffRes] = await Promise.all([
          departmentService.getDepartments({ limit: 100, status: 'ACTIVE' }),
          staffService.getStaff({ limit: 100, role: 'DOCTOR', status: 'ACTIVE' }),
        ]);
        if (deptRes.success) setDepartments(deptRes.data.departments || []);
        if (staffRes.success) setDoctors(staffRes.data.staff || []);
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch Appointments List & Summary Stats
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter,
        appointmentType: typeFilter,
      };

      if (dateFilter) params.date = dateFilter;
      if (doctorFilter !== 'ALL') params.doctorId = doctorFilter;
      if (deptFilter !== 'ALL') params.departmentId = deptFilter;

      const [res, statsRes] = await Promise.all([
        appointmentService.getAppointments(params),
        appointmentService.getStats(dateFilter || undefined),
      ]);

      if (res.success) {
        setAppointments(res.data.appointments);
        setPagination(res.data.pagination);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointments. Please check connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, dateFilter, doctorFilter, deptFilter, statusFilter, typeFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Patient Search for Step 1 of Booking Flow
  const handleSearchPatient = async (query) => {
    setBookingModal((prev) => ({
      ...prev,
      patientSearchInput: query,
      searchingPatients: true,
    }));
    try {
      if (!query.trim()) {
        setBookingModal((prev) => ({
          ...prev,
          patientSearchResults: [],
          searchingPatients: false,
        }));
        return;
      }
      const res = await patientService.getPatients({ search: query, limit: 10, status: 'ACTIVE' });
      if (res.success) {
        setBookingModal((prev) => ({
          ...prev,
          patientSearchResults: res.data.patients || [],
          searchingPatients: false,
        }));
      }
    } catch {
      setBookingModal((prev) => ({ ...prev, searchingPatients: false }));
    }
  };

  // Fetch slots for Booking Flow
  const handleFetchSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setBookingModal((prev) => ({ ...prev, loadingSlots: true, slotError: '', slots: [], selectedSlot: null }));
    try {
      const res = await appointmentService.getSlots(doctorId, date);
      if (res.success) {
        setBookingModal((prev) => ({
          ...prev,
          slots: res.data.slots || [],
          slotError: res.data.isAvailable ? '' : res.data.reason || 'No available slots for this date.',
          consultationFee: prev.consultationFee || res.data.consultationFee || '',
          loadingSlots: false,
        }));
      }
    } catch (err) {
      setBookingModal((prev) => ({
        ...prev,
        slotError: err.response?.data?.message || 'Failed to load available slots.',
        loadingSlots: false,
      }));
    }
  };

  // Open Booking Modal Flow
  const handleOpenBooking = () => {
    setBookingModal({
      isOpen: true,
      currentStep: 1,
      submitting: false,
      patientSearchInput: '',
      patientSearchResults: [],
      searchingPatients: false,
      selectedPatient: null,
      selectedDepartmentId: '',
      selectedDoctorId: '',
      selectedDate: new Date().toISOString().split('T')[0],
      slots: [],
      loadingSlots: false,
      slotError: '',
      selectedSlot: null,
      appointmentType: 'OPD Consultation',
      reason: '',
      notes: '',
      consultationFee: '',
      confirmedAppointment: null,
    });
  };

  // Submit Booking
  const handleConfirmBooking = async () => {
    const {
      selectedPatient,
      selectedDoctorId,
      selectedDepartmentId,
      selectedDate,
      selectedSlot,
      appointmentType,
      reason,
      notes,
      consultationFee,
    } = bookingModal;

    if (!selectedPatient || !selectedDoctorId || !selectedSlot) {
      return;
    }

    setBookingModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await appointmentService.bookAppointment({
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        departmentId: selectedDepartmentId || undefined,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        appointmentType,
        reason,
        notes,
        consultationFee: consultationFee ? Number(consultationFee) : 0,
      });

      if (res.success) {
        setBookingModal((prev) => ({
          ...prev,
          currentStep: 9, // Success confirmation step
          confirmedAppointment: res.data,
          submitting: false,
        }));
        setToastMessage(`Appointment ${res.data.appointmentNumber} booked successfully!`);
        fetchAppointments();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete appointment booking.';
      alert(msg);
      setBookingModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Reschedule Slots Handler
  const handleFetchRescheduleSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setRescheduleModal((prev) => ({
      ...prev,
      loadingSlots: true,
      slotError: '',
      availableSlots: [],
      selectedSlot: null,
    }));
    try {
      const res = await appointmentService.getSlots(doctorId, date);
      if (res.success) {
        setRescheduleModal((prev) => ({
          ...prev,
          availableSlots: res.data.slots || [],
          slotError: res.data.isAvailable ? '' : res.data.reason || 'No available slots.',
          loadingSlots: false,
        }));
      }
    } catch (err) {
      setRescheduleModal((prev) => ({
        ...prev,
        slotError: err.response?.data?.message || 'Failed to load slots.',
        loadingSlots: false,
      }));
    }
  };

  const handleConfirmReschedule = async () => {
    const { appointment, newDate, selectedSlot } = rescheduleModal;
    if (!appointment || !newDate || !selectedSlot) return;

    setRescheduleModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await appointmentService.rescheduleAppointment(appointment.id, {
        appointmentDate: newDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });

      if (res.success) {
        setToastMessage(`Appointment ${appointment.appointmentNumber} rescheduled to ${newDate} ${selectedSlot.startTime}`);
        setRescheduleModal({ isOpen: false, appointment: null, newDate: '', selectedSlot: null, availableSlots: [] });
        fetchAppointments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reschedule appointment.');
      setRescheduleModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Status Change Confirmation
  const handleExecuteStatusChange = async () => {
    const { appointment, targetStatus, notes } = statusDialog;
    if (!appointment || !targetStatus) return;
    try {
      const res = await appointmentService.updateStatus(appointment.id, {
        status: targetStatus,
        notes,
      });
      if (res.success) {
        setToastMessage(`Appointment status updated to ${targetStatus}`);
        setStatusDialog({ isOpen: false, appointment: null, targetStatus: '', notes: '' });
        fetchAppointments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update appointment status.');
    }
  };

  // Cancellation Execution
  const handleExecuteCancellation = async () => {
    const { appointment, reason } = cancelDialog;
    if (!appointment) return;
    if (!reason.trim()) {
      alert('Please provide a reason for cancelling this appointment.');
      return;
    }
    try {
      const res = await appointmentService.cancelAppointment(appointment.id, {
        cancellationReason: reason,
      });
      if (res.success) {
        setToastMessage(`Appointment ${appointment.appointmentNumber} cancelled.`);
        setCancelDialog({ isOpen: false, appointment: null, reason: '' });
        fetchAppointments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    }
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom duration-200">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Appointments Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule patient consultations, view live rosters, manage check-ins, and track appointments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchAppointments();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {canBook && (
            <button
              onClick={handleOpenBooking}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Book Appointment</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title="Today's Total"
          value={stats.today}
          subtitle="Scheduled for today"
          color="blue"
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <DashboardCard
          title="Upcoming"
          value={stats.upcoming}
          subtitle="Confirmed future visits"
          color="indigo"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <DashboardCard
          title="Checked In"
          value={stats.checkedIn}
          subtitle="Waiting in reception"
          color="amber"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <DashboardCard
          title="Completed"
          value={stats.completed}
          subtitle="Consultation finished"
          color="emerald"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <DashboardCard
          title="Cancelled"
          value={stats.cancelled}
          subtitle="Patient / clinic cancelled"
          color="rose"
          icon={
            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Patient Search */}
          <div className="relative lg:col-span-2">
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by patient, UHID or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Doctor Filter (only for admin/receptionist) */}
          <div>
            <select
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value);
                setPage(1);
              }}
              disabled={isDoctor}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:bg-slate-50"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.specialization || 'Doctor'})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Reset */}
        {(dateFilter || doctorFilter !== (isDoctor ? user?.id : 'ALL') || deptFilter !== 'ALL' || statusFilter !== 'ALL' || searchInput) && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">Active filters applied</span>
            <button
              onClick={() => {
                setDateFilter('');
                if (!isDoctor) setDoctorFilter('ALL');
                setDeptFilter('ALL');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setSearchInput('');
                setPage(1);
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAppointments} className="font-semibold underline ml-2">
            Try again
          </button>
        </div>
      )}

      {/* Appointments List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No appointments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no appointments matching the selected filters. Use the &quot;Book Appointment&quot; button to schedule a patient consultation.
            </p>
            {canBook && (
              <button
                onClick={handleOpenBooking}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Book First Appointment</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Appointment No.</th>
                  <th className="px-4 py-3.5">Patient</th>
                  <th className="px-4 py-3.5">Doctor & Dept</th>
                  <th className="px-4 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => {
                  const patientFullName = `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.trim();
                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/60 transition">
                      {/* Appointment Number */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 font-mono text-[11px]">
                          {apt.appointmentNumber}
                        </span>
                        {apt.paymentStatus === 'PAID' && (
                          <span className="ml-1.5 inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PAID
                          </span>
                        )}
                      </td>

                      {/* Patient Details */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{patientFullName || 'Patient'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-mono">{apt.patient?.uhid}</span>
                          <span>&bull;</span>
                          <span>{apt.patient?.phone}</span>
                        </div>
                      </td>

                      {/* Doctor & Department */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{apt.doctor?.name || 'Assigned Doctor'}</div>
                        <div className="text-[11px] text-slate-500">
                          {apt.department?.name || apt.doctor?.specialization || 'Clinical'}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{apt.appointmentDate}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {apt.startTime} - {apt.endTime}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-medium text-slate-700 bg-slate-100 border border-slate-200 text-[11px]">
                          {apt.appointmentType}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            STATUS_BADGE_CLASSES[apt.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {apt.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setViewModal({ isOpen: true, appointment: apt })}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            title="View appointment details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Check-In Action (Receptionist/Admin) */}
                          {['SCHEDULED', 'CONFIRMED'].includes(apt.status) && (
                            <button
                              onClick={() =>
                                setStatusDialog({
                                  isOpen: true,
                                  appointment: apt,
                                  targetStatus: 'CHECKED_IN',
                                  notes: '',
                                })
                              }
                              className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-semibold hover:bg-amber-100 transition"
                              title="Check In patient at clinic"
                            >
                              Check In
                            </button>
                          )}

                          {/* Start / Open Encounter Action */}
                          {['CHECKED_IN', 'IN_PROGRESS'].includes(apt.status) && (
                            <button
                              onClick={() => handleStartEncounter(apt)}
                              className="px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-[11px] font-semibold hover:bg-teal-100 transition inline-flex items-center gap-1"
                              title="Start or open clinical encounter"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Encounter
                            </button>
                          )}

                          {/* Complete Action (Doctor/Admin) */}
                          {['CHECKED_IN', 'IN_PROGRESS'].includes(apt.status) && (
                            <button
                              onClick={() =>
                                setStatusDialog({
                                  isOpen: true,
                                  appointment: apt,
                                  targetStatus: 'COMPLETED',
                                  notes: '',
                                })
                              }
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold hover:bg-emerald-100 transition"
                            >
                              Complete
                            </button>
                          )}

                          {/* Reschedule (Admin / Receptionist) */}
                          {canBook && !['COMPLETED', 'CANCELLED'].includes(apt.status) && (
                            <button
                              onClick={() => {
                                setRescheduleModal({
                                  isOpen: true,
                                  appointment: apt,
                                  newDate: apt.appointmentDate,
                                  selectedSlot: null,
                                  availableSlots: [],
                                  loadingSlots: false,
                                  slotError: '',
                                  submitting: false,
                                });
                                handleFetchRescheduleSlots(apt.doctorId, apt.appointmentDate);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Reschedule slot"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}

                          {/* Cancel (Admin / Receptionist) */}
                          {canBook && !['COMPLETED', 'CANCELLED'].includes(apt.status) && (
                            <button
                              onClick={() => setCancelDialog({ isOpen: true, appointment: apt, reason: '' })}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Cancel appointment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
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
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
              <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 9-STEP BOOKING MODAL */}
      {/* ============================================================== */}
      {bookingModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Book Patient Appointment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step {bookingModal.currentStep} of 8 &bull; Cardiac & EECP Roster
                </p>
              </div>
              <button
                onClick={() => setBookingModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* STEP 1: Select Patient */}
            {bookingModal.currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Find Patient by Name, UHID or Phone</label>
                  <input
                    type="text"
                    value={bookingModal.patientSearchInput}
                    onChange={(e) => handleSearchPatient(e.target.value)}
                    placeholder="Type patient name, phone, or UHID..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                {/* Patient Search Results */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {bookingModal.searchingPatients ? (
                    <div className="p-4 text-center text-xs text-slate-400">Searching patients...</div>
                  ) : bookingModal.patientSearchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      {bookingModal.patientSearchInput ? 'No patients found matching query' : 'Type above to search patient database'}
                    </div>
                  ) : (
                    bookingModal.patientSearchResults.map((pt) => {
                      const isSelected = bookingModal.selectedPatient?.id === pt.id;
                      return (
                        <div
                          key={pt.id}
                          onClick={() => setBookingModal((prev) => ({ ...prev, selectedPatient: pt }))}
                          className={`p-3 cursor-pointer text-xs transition flex items-center justify-between ${
                            isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-800">
                              {pt.firstName} {pt.lastName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              UHID: {pt.uhid} &bull; Phone: {pt.phone} &bull; Gender: {pt.gender}
                            </div>
                          </div>
                          {isSelected && (
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    disabled={!bookingModal.selectedPatient}
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 2 }))}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Next: Select Department &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Select Department */}
            {bookingModal.currentStep === 2 && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl text-xs border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600">
                    Patient: <strong>{bookingModal.selectedPatient?.firstName} {bookingModal.selectedPatient?.lastName}</strong> ({bookingModal.selectedPatient?.uhid})
                  </span>
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 1 }))}
                    className="text-blue-600 underline font-medium text-[11px]"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Select Clinical Department</label>
                  <select
                    value={bookingModal.selectedDepartmentId}
                    onChange={(e) => setBookingModal((prev) => ({ ...prev, selectedDepartmentId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- All Departments / Direct Doctor Selection --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 1 }))}
                    className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 3 }))}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Next: Select Doctor &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Select Doctor */}
            {bookingModal.currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Select Doctor</label>
                  <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto">
                    {doctors
                      .filter((doc) =>
                        !bookingModal.selectedDepartmentId || doc.departmentId === bookingModal.selectedDepartmentId
                      )
                      .map((doc) => {
                        const isSelected = bookingModal.selectedDoctorId === doc.id;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => {
                              setBookingModal((prev) => ({
                                ...prev,
                                selectedDoctorId: doc.id,
                                consultationFee: doc.consultationFee || prev.consultationFee,
                              }));
                            }}
                            className={`p-3 rounded-xl border cursor-pointer text-xs transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-900">{doc.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {doc.specialization || 'Consultant'} &bull; Fee: ₹{Number(doc.consultationFee || 0).toFixed(2)}
                              </div>
                            </div>
                            {isSelected && (
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 2 }))}
                    className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                  >
                    &larr; Back
                  </button>
                  <button
                    disabled={!bookingModal.selectedDoctorId}
                    onClick={() => {
                      setBookingModal((prev) => ({ ...prev, currentStep: 4 }));
                      handleFetchSlots(bookingModal.selectedDoctorId, bookingModal.selectedDate);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Next: Choose Date &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 & 5: Choose Date & Available Slots */}
            {(bookingModal.currentStep === 4 || bookingModal.currentStep === 5) && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Consultation Date</label>
                  <input
                    type="date"
                    value={bookingModal.selectedDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setBookingModal((prev) => ({ ...prev, selectedDate: newDate }));
                      handleFetchSlots(bookingModal.selectedDoctorId, newDate);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Available Slots Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Available Time Slots</label>
                  {bookingModal.loadingSlots ? (
                    <div className="p-8 text-center text-xs text-slate-400">Checking doctor schedule...</div>
                  ) : bookingModal.slotError ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      {bookingModal.slotError}
                    </div>
                  ) : bookingModal.slots.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                      No slots generated for this date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                      {bookingModal.slots.map((slot) => {
                        const isSelected = bookingModal.selectedSlot?.startTime === slot.startTime;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={!slot.isAvailable}
                            onClick={() => setBookingModal((prev) => ({ ...prev, selectedSlot: slot }))}
                            className={`p-2 rounded-xl text-xs font-medium border text-center transition ${
                              !slot.isAvailable
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                : isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            <div>{slot.startTime}</div>
                            <div className="text-[10px] opacity-80">{slot.endTime}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 3 }))}
                    className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                  >
                    &larr; Back
                  </button>
                  <button
                    disabled={!bookingModal.selectedSlot}
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 6 }))}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Next: Appointment Details &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6 & 7: Appointment Type & Notes */}
            {(bookingModal.currentStep === 6 || bookingModal.currentStep === 7) && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Appointment Type</label>
                  <select
                    value={bookingModal.appointmentType}
                    onChange={(e) => setBookingModal((prev) => ({ ...prev, appointmentType: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {APPOINTMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bookingModal.consultationFee}
                    onChange={(e) => setBookingModal((prev) => ({ ...prev, consultationFee: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Reason / Chief Complaint (Optional)</label>
                  <textarea
                    rows="2"
                    value={bookingModal.reason}
                    onChange={(e) => setBookingModal((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Chest discomfort, Angina follow-up, routine checkup..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 4 }))}
                    className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 8 }))}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Review Summary &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 8: Summary & Confirm */}
            {bookingModal.currentStep === 8 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Patient:</span>
                    <strong className="text-slate-900">
                      {bookingModal.selectedPatient?.firstName} {bookingModal.selectedPatient?.lastName} ({bookingModal.selectedPatient?.uhid})
                    </strong>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Doctor:</span>
                    <strong className="text-slate-900">
                      {doctors.find((d) => d.id === bookingModal.selectedDoctorId)?.name}
                    </strong>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Date & Slot:</span>
                    <strong className="text-slate-900">
                      {bookingModal.selectedDate} &bull; {bookingModal.selectedSlot?.startTime} - {bookingModal.selectedSlot?.endTime}
                    </strong>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Type:</span>
                    <strong className="text-slate-900">{bookingModal.appointmentType}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consultation Fee:</span>
                    <strong className="text-emerald-700 font-bold">
                      ₹{Number(bookingModal.consultationFee || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, currentStep: 6 }))}
                    className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                  >
                    &larr; Back
                  </button>
                  <button
                    disabled={bookingModal.submitting}
                    onClick={handleConfirmBooking}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    {bookingModal.submitting ? 'Confirming...' : 'Confirm & Book Appointment'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 9: Success Confirmation Screen */}
            {bookingModal.currentStep === 9 && bookingModal.confirmedAppointment && (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-slate-900">Appointment Booked Successfully!</h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs max-w-sm mx-auto text-left space-y-1 font-mono">
                  <div>Ref Number: <strong>{bookingModal.confirmedAppointment.appointmentNumber}</strong></div>
                  <div>Date: <strong>{bookingModal.confirmedAppointment.appointmentDate}</strong></div>
                  <div>Time: <strong>{bookingModal.confirmedAppointment.startTime} - {bookingModal.confirmedAppointment.endTime}</strong></div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setBookingModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                  >
                    Close Window
                  </button>
                  <button
                    onClick={handleOpenBooking}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs"
                  >
                    Book Another Appointment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW DETAILS MODAL */}
      {/* ============================================================== */}
      {viewModal.isOpen && viewModal.appointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Appointment {viewModal.appointment.appointmentNumber}
                </h3>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    STATUS_BADGE_CLASSES[viewModal.appointment.status]
                  }`}
                >
                  {viewModal.appointment.status}
                </span>
              </div>
              <button
                onClick={() => setViewModal({ isOpen: false, appointment: null })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[11px]">Patient Name</span>
                  <strong className="text-slate-900">
                    {viewModal.appointment.patient?.firstName} {viewModal.appointment.patient?.lastName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">UHID</span>
                  <strong className="text-slate-900 font-mono">{viewModal.appointment.patient?.uhid}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Doctor</span>
                  <strong className="text-slate-900">{viewModal.appointment.doctor?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Department</span>
                  <strong className="text-slate-900">{viewModal.appointment.department?.name || 'General'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Scheduled Date</span>
                  <strong className="text-slate-900">{viewModal.appointment.appointmentDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Slot Time</span>
                  <strong className="text-slate-900 font-mono">
                    {viewModal.appointment.startTime} - {viewModal.appointment.endTime}
                  </strong>
                </div>
              </div>

              {viewModal.appointment.reason && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Reason / Complaint</span>
                  <p className="text-slate-700 mt-0.5">{viewModal.appointment.reason}</p>
                </div>
              )}

              {viewModal.appointment.notes && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Clinical Notes & History</span>
                  <pre className="text-slate-700 bg-slate-50 p-2 rounded-lg font-sans whitespace-pre-wrap mt-0.5">
                    {viewModal.appointment.notes}
                  </pre>
                </div>
              )}

              {viewModal.appointment.cancellationReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                  <span className="font-semibold block text-[11px]">Cancellation Reason</span>
                  {viewModal.appointment.cancellationReason}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {['CHECKED_IN', 'IN_PROGRESS'].includes(viewModal.appointment.status) && (
                <button
                  onClick={() => {
                    const apt = viewModal.appointment;
                    setViewModal({ isOpen: false, appointment: null });
                    handleStartEncounter(apt);
                  }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Open Clinical Encounter
                </button>
              )}
              <button
                onClick={() => setViewModal({ isOpen: false, appointment: null })}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RESCHEDULE MODAL */}
      {/* ============================================================== */}
      {rescheduleModal.isOpen && rescheduleModal.appointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reschedule Appointment</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {rescheduleModal.appointment.appointmentNumber}
                </p>
              </div>
              <button
                onClick={() => setRescheduleModal({ isOpen: false, appointment: null, newDate: '', selectedSlot: null, availableSlots: [] })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Choose New Date</label>
                <input
                  type="date"
                  value={rescheduleModal.newDate}
                  onChange={(e) => {
                    const d = e.target.value;
                    setRescheduleModal((prev) => ({ ...prev, newDate: d }));
                    handleFetchRescheduleSlots(rescheduleModal.appointment.doctorId, d);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Select Available Slot</label>
                {rescheduleModal.loadingSlots ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading slots...</div>
                ) : rescheduleModal.slotError ? (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                    {rescheduleModal.slotError}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                    {rescheduleModal.availableSlots.map((slot) => {
                      const isSelected = rescheduleModal.selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => setRescheduleModal((prev) => ({ ...prev, selectedSlot: slot }))}
                          className={`p-2 rounded-xl text-xs font-medium border text-center transition ${
                            !slot.isAvailable
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRescheduleModal({ isOpen: false, appointment: null, newDate: '', selectedSlot: null, availableSlots: [] })}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={!rescheduleModal.selectedSlot || rescheduleModal.submitting}
                onClick={handleConfirmReschedule}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {rescheduleModal.submitting ? 'Updating...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STATUS CHANGE CONFIRMATION */}
      {/* ============================================================== */}
      <ConfirmationDialog
        isOpen={statusDialog.isOpen}
        title={`Change Status to ${statusDialog.targetStatus}?`}
        message={`Are you sure you want to mark appointment ${statusDialog.appointment?.appointmentNumber} as ${statusDialog.targetStatus}?`}
        confirmText="Confirm Change"
        confirmVariant={statusDialog.targetStatus === 'COMPLETED' ? 'primary' : 'primary'}
        onConfirm={handleExecuteStatusChange}
        onCancel={() => setStatusDialog({ isOpen: false, appointment: null, targetStatus: '', notes: '' })}
      />

      {/* ============================================================== */}
      {/* CANCELLATION MODAL */}
      {/* ============================================================== */}
      {cancelDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Cancel Appointment</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel appointment <strong>{cancelDialog.appointment?.appointmentNumber}</strong>?
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Cancellation Reason (Required)</label>
              <textarea
                rows="2"
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for cancellation..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelDialog({ isOpen: false, appointment: null, reason: '' })}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
              >
                Go Back
              </button>
              <button
                disabled={!cancelDialog.reason.trim()}
                onClick={handleExecuteCancellation}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
