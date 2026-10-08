import React, { useState, useEffect, useCallback } from 'react';
import { doctorScheduleService } from '../../services/doctorScheduleService';
import staffService from '../../services/staffService';
import departmentService from '../../services/departmentService';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import useAuth from '../../hooks/useAuth';

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export default function DoctorRosterPage() {
  const { user } = useAuth();

  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN';

  // State tabs: 'schedules' or 'leaves'
  const [activeTab, setActiveTab] = useState('schedules');

  // Data
  const [schedules, setSchedules] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');


  // Schedule Filter
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');

  // Modals
  const [scheduleModal, setScheduleModal] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    scheduleId: null,
    doctorId: '',
    departmentId: '',
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '13:00',
    breakStartTime: '',
    breakEndTime: '',
    slotDurationMinutes: 30,
    maxAppointmentsPerSlot: 1,
    consultationType: 'OPD Consultation',
    submitting: false,
    error: '',
  });

  const [leaveModal, setLeaveModal] = useState({
    isOpen: false,
    doctorId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    notes: '',
    submitting: false,
    error: '',
  });

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    type: '', // 'schedule' | 'leave'
    id: null,
    title: '',
    message: '',
  });

  // Auto-clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load Doctors and Departments
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
        console.error('Failed to load roster metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Schedules & Leaves
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const scheduleParams = {};
      if (selectedDoctorFilter !== 'ALL') scheduleParams.doctorId = selectedDoctorFilter;
      if (selectedDayFilter !== 'ALL') scheduleParams.dayOfWeek = selectedDayFilter;

      const [schedRes, leaveRes] = await Promise.all([
        doctorScheduleService.getSchedules(scheduleParams),
        doctorScheduleService.getLeaves(selectedDoctorFilter !== 'ALL' ? { doctorId: selectedDoctorFilter } : {}),
      ]);

      if (schedRes.success) setSchedules(schedRes.data || []);
      if (leaveRes.success) setLeaves(leaveRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load doctor roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDoctorFilter, selectedDayFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create / Edit Schedule Submit
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setScheduleModal((prev) => ({ ...prev, submitting: true, error: '' }));

    const payload = {
      doctorId: scheduleModal.doctorId,
      departmentId: scheduleModal.departmentId || undefined,
      dayOfWeek: scheduleModal.dayOfWeek,
      startTime: scheduleModal.startTime,
      endTime: scheduleModal.endTime,
      breakStartTime: scheduleModal.breakStartTime || null,
      breakEndTime: scheduleModal.breakEndTime || null,
      slotDurationMinutes: Number(scheduleModal.slotDurationMinutes) || 30,
      maxAppointmentsPerSlot: Number(scheduleModal.maxAppointmentsPerSlot) || 1,
      consultationType: scheduleModal.consultationType || 'OPD Consultation',
    };

    try {
      if (scheduleModal.mode === 'create') {
        const res = await doctorScheduleService.createSchedule(payload);
        if (res.success) {
          setToastMessage('Doctor schedule created successfully');
          setScheduleModal((prev) => ({ ...prev, isOpen: false }));
          fetchData();
        }
      } else {
        const res = await doctorScheduleService.updateSchedule(scheduleModal.scheduleId, payload);
        if (res.success) {
          setToastMessage('Doctor schedule updated successfully');
          setScheduleModal((prev) => ({ ...prev, isOpen: false }));
          fetchData();
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save schedule. Check hours and conflicts.';
      setScheduleModal((prev) => ({ ...prev, error: errMsg, submitting: false }));
    }
  };

  // Toggle Schedule Active Status
  const handleToggleSchedule = async (id) => {
    try {
      const res = await doctorScheduleService.toggleScheduleStatus(id);
      if (res.success) {
        setToastMessage('Schedule status updated');
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update schedule status.');
    }
  };

  // Save Leave Submit
  const handleSaveLeave = async (e) => {
    e.preventDefault();
    setLeaveModal((prev) => ({ ...prev, submitting: true, error: '' }));

    const payload = {
      doctorId: leaveModal.doctorId,
      startDate: leaveModal.startDate,
      endDate: leaveModal.endDate,
      reason: leaveModal.reason,
      notes: leaveModal.notes || null,
    };

    try {
      const res = await doctorScheduleService.createLeave(payload);
      if (res.success) {
        setToastMessage('Doctor leave recorded successfully. Slots will be blocked.');
        setLeaveModal((prev) => ({ ...prev, isOpen: false }));
        fetchData();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to record leave.';
      setLeaveModal((prev) => ({ ...prev, error: errMsg, submitting: false }));
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    const { type, id } = deleteDialog;
    try {
      if (type === 'schedule') {
        await doctorScheduleService.deleteSchedule(id);
        setToastMessage('Schedule removed');
      } else if (type === 'leave') {
        await doctorScheduleService.deleteLeave(id);
        setToastMessage('Leave record removed');
      }
      setDeleteDialog({ isOpen: false, type: '', id: null, title: '', message: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Toast */}
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Doctor Roster & Availability</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure weekly clinic working hours, breaks, slot generation durations, and mark doctor leaves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {isHospitalAdmin && (
            <>
              <button
                onClick={() =>
                  setLeaveModal({
                    isOpen: true,
                    doctorId: doctors[0]?.id || '',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    reason: '',
                    notes: '',
                    submitting: false,
                    error: '',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Add Doctor Leave</span>
              </button>

              <button
                onClick={() =>
                  setScheduleModal({
                    isOpen: true,
                    mode: 'create',
                    scheduleId: null,
                    doctorId: doctors[0]?.id || '',
                    departmentId: doctors[0]?.departmentId || '',
                    dayOfWeek: 'MONDAY',
                    startTime: '09:00',
                    endTime: '13:00',
                    breakStartTime: '',
                    breakEndTime: '',
                    slotDurationMinutes: 30,
                    maxAppointmentsPerSlot: 1,
                    consultationType: 'OPD Consultation',
                    submitting: false,
                    error: '',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Schedule</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="font-semibold underline ml-2">
            Try again
          </button>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'schedules'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Weekly Doctor Schedules ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'leaves'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Doctor Leaves & Blockouts ({leaves.length})
          </button>
        </nav>
      </div>

      {/* SCHEDULES TAB */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-64">
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="ALL">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-48">
              <select
                value={selectedDayFilter}
                onChange={(e) => setSelectedDayFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="ALL">All Days of Week</option>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedules Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-16 text-center px-4">
                <h3 className="text-sm font-semibold text-slate-800">No Doctor Schedules Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  There are no weekly schedules configured yet. Add a doctor schedule to allow patient appointment slot booking.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3.5">Doctor</th>
                      <th className="px-4 py-3.5">Day</th>
                      <th className="px-4 py-3.5">Working Hours</th>
                      <th className="px-4 py-3.5">Break</th>
                      <th className="px-4 py-3.5">Slot / Cap</th>
                      <th className="px-4 py-3.5">Status</th>
                      {isHospitalAdmin && <th className="px-4 py-3.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedules.map((sc) => (
                      <tr key={sc.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{sc.doctor?.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {sc.department?.name || sc.doctor?.specialization || 'Consultant'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-800">
                          {sc.dayOfWeek}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-700">
                          {sc.startTime} - {sc.endTime}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-500">
                          {sc.breakStartTime && sc.breakEndTime ? `${sc.breakStartTime} - ${sc.breakEndTime}` : 'None'}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                          {sc.slotDurationMinutes} min ({sc.maxAppointmentsPerSlot}/slot)
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              sc.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            {sc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {isHospitalAdmin && (
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleSchedule(sc.id)}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                              >
                                {sc.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() =>
                                  setScheduleModal({
                                    isOpen: true,
                                    mode: 'edit',
                                    scheduleId: sc.id,
                                    doctorId: sc.doctorId,
                                    departmentId: sc.departmentId || '',
                                    dayOfWeek: sc.dayOfWeek,
                                    startTime: sc.startTime,
                                    endTime: sc.endTime,
                                    breakStartTime: sc.breakStartTime || '',
                                    breakEndTime: sc.breakEndTime || '',
                                    slotDurationMinutes: sc.slotDurationMinutes,
                                    maxAppointmentsPerSlot: sc.maxAppointmentsPerSlot,
                                    consultationType: sc.consultationType,
                                    submitting: false,
                                    error: '',
                                  })
                                }
                                className="p-1 rounded text-slate-400 hover:text-blue-600"
                                title="Edit schedule"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteDialog({
                                    isOpen: true,
                                    type: 'schedule',
                                    id: sc.id,
                                    title: 'Delete Doctor Schedule?',
                                    message: `Are you sure you want to remove ${sc.doctor?.name}'s schedule for ${sc.dayOfWeek}?`,
                                  })
                                }
                                className="p-1 rounded text-slate-400 hover:text-rose-600"
                                title="Delete schedule"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEAVES TAB */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading doctor leaves...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="py-16 text-center px-4">
              <h3 className="text-sm font-semibold text-slate-800">No Doctor Leaves Recorded</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No leave or unavailabilities exist in the records. When a doctor is on leave, their appointment booking slots are blocked automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Doctor</th>
                    <th className="px-4 py-3.5">Date Range</th>
                    <th className="px-4 py-3.5">Reason</th>
                    <th className="px-4 py-3.5">Notes</th>
                    <th className="px-4 py-3.5">Status</th>
                    {isHospitalAdmin && <th className="px-4 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((lv) => (
                    <tr key={lv.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-800">
                        {lv.doctor?.name}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-700">
                        {lv.startDate} &rarr; {lv.endDate}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-amber-800">
                        {lv.reason}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                        {lv.notes || '—'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {lv.isActive ? 'Active Leave' : 'Cancelled'}
                        </span>
                      </td>
                      {isHospitalAdmin && (
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                type: 'leave',
                                id: lv.id,
                                title: 'Remove Doctor Leave?',
                                message: `Are you sure you want to remove the leave record for ${lv.doctor?.name}? This will re-enable slot bookings.`,
                              })
                            }
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                            title="Remove leave"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SCHEDULE MODAL (Create / Edit) */}
      {/* ============================================================== */}
      {scheduleModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {scheduleModal.mode === 'create' ? 'Add Doctor Schedule' : 'Edit Schedule'}
              </h3>
              <button
                onClick={() => setScheduleModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {scheduleModal.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {scheduleModal.error}
              </div>
            )}

            <form onSubmit={handleSaveSchedule} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Doctor</label>
                <select
                  disabled={scheduleModal.mode === 'edit'}
                  value={scheduleModal.doctorId}
                  onChange={(e) => setScheduleModal((prev) => ({ ...prev, doctorId: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization || 'Doctor'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Day of Week</label>
                  <select
                    value={scheduleModal.dayOfWeek}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, dayOfWeek: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Department</label>
                  <select
                    value={scheduleModal.departmentId}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Assigned Dept --</option>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Start Time (24h)</label>
                  <input
                    type="time"
                    value={scheduleModal.startTime}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">End Time (24h)</label>
                  <input
                    type="time"
                    value={scheduleModal.endTime}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Break Start (Optional)</label>
                  <input
                    type="time"
                    value={scheduleModal.breakStartTime}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, breakStartTime: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Break End (Optional)</label>
                  <input
                    type="time"
                    value={scheduleModal.breakEndTime}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, breakEndTime: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Slot Duration (Min)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={scheduleModal.slotDurationMinutes}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, slotDurationMinutes: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Max Patients / Slot</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={scheduleModal.maxAppointmentsPerSlot}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, maxAppointmentsPerSlot: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setScheduleModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleModal.submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {scheduleModal.submitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LEAVE MODAL */}
      {/* ============================================================== */}
      {leaveModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Doctor Leave / Unavailability</h3>
              <button
                onClick={() => setLeaveModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {leaveModal.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {leaveModal.error}
              </div>
            )}

            <form onSubmit={handleSaveLeave} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Doctor</label>
                <select
                  value={leaveModal.doctorId}
                  onChange={(e) => setLeaveModal((prev) => ({ ...prev, doctorId: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={leaveModal.startDate}
                    onChange={(e) => setLeaveModal((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">End Date</label>
                  <input
                    type="date"
                    value={leaveModal.endDate}
                    onChange={(e) => setLeaveModal((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Reason</label>
                <input
                  type="text"
                  value={leaveModal.reason}
                  onChange={(e) => setLeaveModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Medical Conference, Personal Leave, Emergency..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Notes (Optional)</label>
                <textarea
                  rows="2"
                  value={leaveModal.notes}
                  onChange={(e) => setLeaveModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes for clinic staff..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLeaveModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveModal.submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {leaveModal.submitting ? 'Recording...' : 'Record Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        title={deleteDialog.title}
        message={deleteDialog.message}
        confirmText="Confirm Delete"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, type: '', id: null, title: '', message: '' })}
      />
    </div>
  );
}
