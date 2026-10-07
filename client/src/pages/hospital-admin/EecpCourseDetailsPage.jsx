import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eecpService from '../../services/eecpService';
import staffService from '../../services/staffService';
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

export default function EecpCourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');

  // Schedule Session Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [submittingSession, setSubmittingSession] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [sessionFormData, setSessionFormData] = useState({
    scheduledDate: new Date().toISOString().slice(0, 16),
    sessionNumber: '',
    staffId: '',
    doctorId: '',
    preSessionNotes: '',
  });

  // Course status dialog
  const [statusDialog, setStatusDialog] = useState({
    isOpen: false,
    newStatus: '',
    notes: '',
    submitting: false,
  });

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const fetchCourseData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [courseRes, sessionsRes, progressRes] = await Promise.all([
        eecpService.getCourseById(id),
        eecpService.getCourseSessions(id),
        eecpService.getCourseProgress(id),
      ]);

      if (courseRes.success) setCourse(courseRes.data);
      if (sessionsRes.success) setSessions(sessionsRes.data || []);
      if (progressRes.success) setProgress(progressRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load EECP course details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Load staff list for assignment
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await staffService.getStaff({ status: 'ACTIVE', limit: 50 });
        if (res.success) setStaffList(res.data?.staff || []);
      } catch (e) {
        console.error('Failed to load staff list', e);
      }
    };
    fetchStaff();
  }, []);

  const openScheduleModal = () => {
    const nextSessionNum = progress ? progress.nextSessionNumber : (sessions.length + 1);
    setSessionFormData({
      scheduledDate: new Date().toISOString().slice(0, 16),
      sessionNumber: nextSessionNum,
      staffId: user?.id || '',
      doctorId: course?.doctorId || '',
      preSessionNotes: '',
    });
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSession(true);
    try {
      const res = await eecpService.scheduleSession(id, {
        scheduledDate: sessionFormData.scheduledDate,
        sessionNumber: Number(sessionFormData.sessionNumber) || undefined,
        staffId: sessionFormData.staffId || undefined,
        doctorId: sessionFormData.doctorId || undefined,
        preSessionNotes: sessionFormData.preSessionNotes || undefined,
      });

      if (res.success) {
        setToastMessage(`Session #${res.data.sessionNumber} scheduled successfully!`);
        setScheduleModalOpen(false);
        fetchCourseData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule session');
    } finally {
      setSubmittingSession(false);
    }
  };

  const handleUpdateCourseStatus = async () => {
    setStatusDialog((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await eecpService.updateCourseStatus(id, statusDialog.newStatus, statusDialog.notes);
      if (res.success) {
        setToastMessage(`Course status updated to ${statusDialog.newStatus}`);
        setStatusDialog({ isOpen: false, newStatus: '', notes: '', submitting: false });
        fetchCourseData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update course status');
      setStatusDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
        <p className="font-semibold">{error || 'Course not found'}</p>
        <button
          onClick={() => navigate('/hospital-admin/eecp')}
          className="mt-3 text-sm text-teal-600 hover:underline"
        >
          ← Return to EECP Dashboard
        </button>
      </div>
    );
  }

  const courseCfg = COURSE_STATUS_CONFIG[course.status] || COURSE_STATUS_CONFIG.PLANNED;
  const patient = course.patient || {};
  const progressPct = progress?.progressPercentage ?? Math.round(((course.completedSessions || 0) / course.plannedSessions) * 100);

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

      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/hospital-admin/eecp')}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to EECP Dashboard
        </button>

        <div className="flex items-center space-x-2">
          {course.status === 'ACTIVE' && (
            <button
              onClick={() => setStatusDialog({ isOpen: true, newStatus: 'PAUSED', notes: '', submitting: false })}
              className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
            >
              Pause Course
            </button>
          )}
          {course.status === 'PAUSED' && (
            <button
              onClick={() => setStatusDialog({ isOpen: true, newStatus: 'ACTIVE', notes: '', submitting: false })}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
            >
              Resume Course
            </button>
          )}
          {course.status !== 'COMPLETED' && course.status !== 'CANCELLED' && (
            <button
              onClick={() => setStatusDialog({ isOpen: true, newStatus: 'CANCELLED', notes: '', submitting: false })}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
            >
              Cancel Course
            </button>
          )}
        </div>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
            {patient.firstName?.[0] || 'P'}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-bold text-slate-900">
                {patient.firstName} {patient.lastName}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                {patient.uhid}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${courseCfg.color}`}>
                {courseCfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {patient.gender} • {patient.age ? `${patient.age} yrs` : 'Age N/A'} • Blood: {patient.bloodGroup || 'N/A'} • Phone: {patient.phone || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openScheduleModal}
            disabled={course.status === 'COMPLETED' || course.status === 'CANCELLED'}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition shadow-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Schedule Next Session
          </button>
        </div>
      </div>

      {/* Course Info & Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Course Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Course Number:</span>
              <span className="font-mono font-bold text-slate-900">{course.courseNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Package:</span>
              <span className="font-medium text-slate-800">{course.package?.packageName || 'Standard EECP'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Supervising Doctor:</span>
              <span className="font-medium text-slate-800">
                {course.doctor ? `Dr. ${course.doctor.firstName} ${course.doctor.lastName}` : 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Start Date:</span>
              <span className="text-slate-700">{course.startDate ? new Date(course.startDate).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Therapy Progress</h3>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-2xl font-black text-slate-900">
                {course.completedSessions || 0} <span className="text-sm font-medium text-slate-400">/ {course.plannedSessions}</span>
              </div>
              <span className="text-lg font-bold text-teal-600 font-mono">{progressPct}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-3">
              <div
                className="bg-teal-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
            <div>
              <span className="text-slate-400">Remaining:</span>
              <p className="font-bold text-slate-800">{progress?.remainingSessions ?? (course.plannedSessions - (course.completedSessions || 0))} sessions</p>
            </div>
            <div>
              <span className="text-slate-400">Next Up:</span>
              <p className="font-bold text-teal-600">Session #{progress?.nextSessionNumber ?? ((course.completedSessions || 0) + 1)}</p>
            </div>
          </div>
        </div>

        {/* Treatment Plan & Clinical Notes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Protocol & Clinical Notes</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">
              {course.treatmentPlan || 'Standard EECP clinical counterpulsation therapy.'}
            </p>
            {course.notes && (
              <p className="text-xs text-slate-500 mt-2 italic border-t border-slate-100 pt-2">
                Note: {course.notes}
              </p>
            )}
          </div>
          {course.initiatingEncounterId && (
            <button
              onClick={() => navigate(`/hospital-admin/consultation/${course.initiatingEncounterId}`)}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline text-left mt-3"
            >
              View Initiating Clinical Consultation →
            </button>
          )}
        </div>
      </div>

      {/* Sessions Timeline & Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">Treatment Sessions History & Schedule</h3>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">
              {sessions.length} recorded
            </span>
          </div>
          <button
            onClick={openScheduleModal}
            disabled={course.status === 'COMPLETED' || course.status === 'CANCELLED'}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-40"
          >
            + Add Session
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Session #</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Started / Completed</th>
                <th className="py-3 px-4">Pre-Vitals Summary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <p className="font-medium">No sessions scheduled yet for this course.</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;Schedule Next Session&quot; above to begin scheduling therapy.</p>
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const statusCfg = SESSION_STATUS_CONFIG[sess.status] || SESSION_STATUS_CONFIG.SCHEDULED;
                  const pre = sess.preAssessment || {};
                  const hasVitals = pre.systolicBp || pre.pulseRate || pre.spo2;

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        Session #{sess.sessionNumber}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {sess.scheduledDate ? new Date(sess.scheduledDate).toLocaleString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {sess.startedAt ? new Date(sess.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        {sess.completedAt && ` → ${new Date(sess.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {hasVitals ? (
                          <span>
                            BP: {pre.systolicBp}/{pre.diastolicBp} • Pulse: {pre.pulseRate} • SpO₂: {pre.spo2}%
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending pre-check</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/hospital-admin/eecp/sessions/${sess.id}`)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition"
                        >
                          Workspace
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* SCHEDULE SESSION MODAL */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">Schedule Session #{sessionFormData.sessionNumber}</h3>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Session Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={course.plannedSessions}
                    required
                    value={sessionFormData.sessionNumber}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, sessionNumber: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={sessionFormData.scheduledDate}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, scheduledDate: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Staff / Therapist
                </label>
                <select
                  value={sessionFormData.staffId}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, staffId: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Assign Staff --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pre-Session Instructions
                </label>
                <textarea
                  rows="2"
                  value={sessionFormData.preSessionNotes}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, preSessionNotes: e.target.value })}
                  placeholder="e.g. Ensure empty bladder before session, verify blood pressure."
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSession}
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {submittingSession ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS DIALOG */}
      {statusDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Update Course Status to {statusDialog.newStatus}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to mark this course as {statusDialog.newStatus}?
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Clinical Notes
              </label>
              <textarea
                rows="2"
                value={statusDialog.notes}
                onChange={(e) => setStatusDialog({ ...statusDialog, notes: e.target.value })}
                placeholder="Enter notes..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setStatusDialog({ isOpen: false, newStatus: '', notes: '', submitting: false })}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCourseStatus}
                disabled={statusDialog.submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs disabled:opacity-50"
              >
                {statusDialog.submitting ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
