import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import eecpService from '../../services/eecpService';
import patientService from '../../services/patientService';
import staffService from '../../services/staffService';
import clinicalMasterService from '../../services/clinicalMasterService';
import DashboardCard from '../../components/common/DashboardCard';
import useAuth from '../../hooks/useAuth';

const SESSION_STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  PRE_ASSESSMENT: { label: 'Pre-Assessment', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  PAUSED: { label: 'Paused', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const COURSE_STATUS_CONFIG = {
  PLANNED: { label: 'Planned', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  ACTIVE: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAUSED: { label: 'Paused', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  COMPLETED: { label: 'Completed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function EecpDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'HOSPITAL_ADMIN';

  const [activeTab, setActiveTab] = useState('TODAY_SESSIONS'); // 'TODAY_SESSIONS' | 'COURSES'
  const [metrics, setMetrics] = useState({
    todaySessions: 0,
    scheduled: 0,
    preAssessment: 0,
    inProgress: 0,
    completedToday: 0,
    cancelledToday: 0,
    activeCourses: 0,
  });

  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');

  // Filtering
  const [sessionStatusFilter, setSessionStatusFilter] = useState('ALL');
  const [courseStatusFilter, setCourseStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);

  // Metadata for forms
  const [patients, setPatients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // New Course Form State
  const [newCourse, setNewCourse] = useState({
    patientId: '',
    doctorId: '',
    packageId: '',
    plannedSessions: 35,
    startDate: new Date().toISOString().split('T')[0],
    treatmentPlan: 'Standard EECP Protocol (1 hr/day, 5-6 days/week)',
    notes: '',
  });

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load metrics & list data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsRes, sessionsRes, coursesRes] = await Promise.all([
        eecpService.getDashboardMetrics(),
        eecpService.getTodaySessions({
          status: sessionStatusFilter !== 'ALL' ? sessionStatusFilter : undefined,
        }),
        eecpService.getCourses({
          status: courseStatusFilter !== 'ALL' ? courseStatusFilter : undefined,
          search: searchQuery || undefined,
        }),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (sessionsRes.success) setSessions(sessionsRes.data || []);
      if (coursesRes.success) setCourses(coursesRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load EECP operational data');
    } finally {
      setLoading(false);
    }
  }, [sessionStatusFilter, courseStatusFilter, searchQuery]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Load modal dropdown data when needed
  useEffect(() => {
    const fetchFormMetadata = async () => {
      try {
        const [patRes, pkgRes, docRes] = await Promise.all([
          patientService.getPatients({ limit: 100 }),
          clinicalMasterService.getEecpPackages({ status: 'ACTIVE', limit: 50 }),
          staffService.getStaff({ role: 'DOCTOR', status: 'ACTIVE', limit: 50 }),
        ]);

        if (patRes.success) setPatients(patRes.data?.patients || []);
        if (pkgRes.success) setPackages(pkgRes.data?.packages || []);
        if (docRes.success) setDoctors(docRes.data?.staff || []);
      } catch (e) {
        console.error('Failed to load metadata for EECP form', e);
      }
    };
    fetchFormMetadata();
  }, []);

  const handlePackageChange = (pkgId) => {
    const selected = packages.find((p) => p.id === pkgId);
    setNewCourse((prev) => ({
      ...prev,
      packageId: pkgId,
      plannedSessions: selected?.totalSessions || prev.plannedSessions,
    }));
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.patientId) {
      alert('Please select a patient.');
      return;
    }
    setSubmittingCourse(true);
    try {
      const res = await eecpService.createCourse({
        patientId: newCourse.patientId,
        doctorId: newCourse.doctorId || undefined,
        packageId: newCourse.packageId || undefined,
        plannedSessions: Number(newCourse.plannedSessions),
        startDate: newCourse.startDate || undefined,
        treatmentPlan: newCourse.treatmentPlan,
        notes: newCourse.notes,
      });

      if (res.success) {
        setToastMessage(`Course created successfully: ${res.data.courseNumber}`);
        setCourseModalOpen(false);
        setNewCourse({
          patientId: '',
          doctorId: '',
          packageId: '',
          plannedSessions: 35,
          startDate: new Date().toISOString().split('T')[0],
          treatmentPlan: 'Standard EECP Protocol (1 hr/day, 5-6 days/week)',
          notes: '',
        });
        loadDashboardData();
        navigate(`/hospital-admin/eecp/courses/${res.data.id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create EECP course');
    } finally {
      setSubmittingCourse(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 text-sm flex items-center space-x-2 animate-fade-in">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            EECP Clinical Therapy Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enhanced External Counterpulsation — Treatment Courses & Daily Therapy Queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDoctor && (
            <button
              onClick={() => setCourseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Treatment Course
            </button>
          )}
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <DashboardCard
          title="Today's Sessions"
          value={metrics.todaySessions}
          subtitle="Scheduled today"
          variant="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <DashboardCard
          title="Scheduled"
          value={metrics.scheduled}
          subtitle="Awaiting arrival"
          variant="indigo"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <DashboardCard
          title="Pre-Assessment"
          value={metrics.preAssessment}
          subtitle="Vitals check"
          variant="slate"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <DashboardCard
          title="In Progress"
          value={metrics.inProgress}
          subtitle="On EECP bed"
          variant="emerald"
          icon={
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <DashboardCard
          title="Completed"
          value={metrics.completedToday}
          subtitle="Delivered today"
          variant="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <DashboardCard
          title="Active Courses"
          value={metrics.activeCourses}
          subtitle="In treatment plan"
          variant="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center space-x-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('TODAY_SESSIONS')}
            className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'TODAY_SESSIONS'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Today&apos;s Sessions Queue ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('COURSES')}
            className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'COURSES'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Treatment Courses ({courses.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: Today's Sessions Queue */}
      {activeTab === 'TODAY_SESSIONS' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status:</span>
              <select
                value={sessionStatusFilter}
                onChange={(e) => setSessionStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PRE_ASSESSMENT">Pre-Assessment</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <p className="text-xs text-slate-400">
              Showing {sessions.length} sessions for today
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Patient / UHID</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Scheduled Time</th>
                  <th className="py-3 px-4">Doctor / Staff</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-slate-500 font-medium">No EECP sessions scheduled for today</p>
                        <p className="text-xs text-slate-400">Sessions can be scheduled from active treatment courses.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sessions.map((sess) => {
                    const statusCfg = SESSION_STATUS_CONFIG[sess.status] || SESSION_STATUS_CONFIG.SCHEDULED;
                    const courseNum = sess.course?.courseNumber || 'Course';
                    const totalPlanned = sess.course?.plannedSessions || '?';

                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {sess.patient?.firstName} {sess.patient?.lastName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {sess.patient?.uhid} • {sess.patient?.gender}, {sess.patient?.age}y
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800">
                            #{sess.sessionNumber} / {totalPlanned}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => navigate(`/hospital-admin/eecp/courses/${sess.courseId}`)}
                            className="text-xs font-mono font-medium text-teal-600 hover:text-teal-800 hover:underline"
                          >
                            {courseNum}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {sess.scheduledDate ? new Date(sess.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {sess.doctor ? `Dr. ${sess.doctor.firstName} ${sess.doctor.lastName}` : 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => navigate(`/hospital-admin/eecp/sessions/${sess.id}`)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition shadow-2xs"
                          >
                            {sess.status === 'SCHEDULED' ? 'Start Pre-Assessment' : 'Session Workspace'}
                            <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Treatment Courses */}
      {activeTab === 'COURSES' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search patient or course #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 w-60"
              />
              <select
                value={courseStatusFilter}
                onChange={(e) => setCourseStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">All Course Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PLANNED">Planned</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <p className="text-xs text-slate-400">
              Showing {courses.length} treatment courses
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Course #</th>
                  <th className="py-3 px-4">Patient / UHID</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="text-slate-500 font-medium">No treatment courses found</p>
                        <p className="text-xs text-slate-400">Create a new course to begin patient therapy.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  courses.map((crs) => {
                    const statusCfg = COURSE_STATUS_CONFIG[crs.status] || COURSE_STATUS_CONFIG.PLANNED;
                    const completed = crs.completedSessions || 0;
                    const planned = crs.plannedSessions || 35;
                    const percent = Math.min(100, Math.round((completed / planned) * 100));

                    return (
                      <tr key={crs.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                          {crs.courseNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {crs.patient?.firstName} {crs.patient?.lastName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {crs.patient?.uhid}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          {crs.package?.packageName || 'Standard EECP Protocol'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {crs.doctor ? `Dr. ${crs.doctor.firstName} ${crs.doctor.lastName}` : 'Assigned Doctor'}
                        </td>
                        <td className="py-3.5 px-4 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">{completed} / {planned}</span>
                            <span className="text-slate-500 font-mono">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-teal-500 h-2 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {crs.startDate ? new Date(crs.startDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => navigate(`/hospital-admin/eecp/courses/${crs.id}`)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            Course Details
                            <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW COURSE MODAL */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Initiate New EECP Treatment Course</h3>
              </div>
              <button
                onClick={() => setCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Patient <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={newCourse.patientId}
                  onChange={(e) => setNewCourse({ ...newCourse, patientId: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.uhid}) — {p.phone || 'No phone'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    EECP Package (Phase 5 Master)
                  </label>
                  <select
                    value={newCourse.packageId}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Custom / Standard --</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.packageName} ({pkg.totalSessions} sessions)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supervising Doctor
                  </label>
                  <select
                    value={newCourse.doctorId}
                    onChange={(e) => setNewCourse({ ...newCourse, doctorId: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Assign Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.firstName} {d.lastName} ({d.department?.departmentName || 'Cardiology'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Planned Sessions <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newCourse.plannedSessions}
                    onChange={(e) => setNewCourse({ ...newCourse, plannedSessions: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[11px] text-slate-400">Standard course is 35 sessions.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newCourse.startDate}
                    onChange={(e) => setNewCourse({ ...newCourse, startDate: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Treatment Protocol & Clinical Notes
                </label>
                <textarea
                  rows="2"
                  value={newCourse.treatmentPlan}
                  onChange={(e) => setNewCourse({ ...newCourse, treatmentPlan: e.target.value })}
                  placeholder="e.g. Standard 35-hour protocol, 5 sessions weekly, monitoring for refractor angina."
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCourse}
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {submittingCourse ? 'Creating Course...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
