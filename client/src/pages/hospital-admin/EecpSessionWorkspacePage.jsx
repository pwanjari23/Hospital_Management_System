import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eecpService from '../../services/eecpService';
import useAuth from '../../hooks/useAuth';

const SESSION_STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  PRE_ASSESSMENT: { label: 'Pre-Assessment', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  PAUSED: { label: 'Paused', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function EecpSessionWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');

  // Pre-session assessment form
  const [preAssessment, setPreAssessment] = useState({
    systolicBp: '',
    diastolicBp: '',
    pulseRate: '',
    spo2: '',
    weightKg: '',
    patientReadiness: 'GOOD',
    symptoms: '',
    notes: '',
  });
  const [savingPre, setSavingPre] = useState(false);

  // New Intra-session reading form
  const [newReading, setNewReading] = useState({
    treatmentPressure: '260',
    systolicBp: '',
    diastolicBp: '',
    pulseRate: '',
    spo2: '',
    symptoms: '',
    notes: '',
  });
  const [addingReading, setAddingReading] = useState(false);

  // Post-session completion form
  const [postAssessment, setPostAssessment] = useState({
    systolicBp: '',
    diastolicBp: '',
    pulseRate: '',
    spo2: '',
    patientTolerance: 'TOLERATED_WELL',
    adverseEvent: false,
    adverseEventNotes: '',
    postSessionNotes: '',
  });
  const [completingSession, setCompletingSession] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  // Cancel dialog
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const fetchSessionData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sessRes, readRes] = await Promise.all([
        eecpService.getSessionById(id),
        eecpService.getSessionReadings(id),
      ]);

      if (sessRes.success) {
        const s = sessRes.data;
        setSession(s);
        if (s.preAssessment) {
          setPreAssessment({
            systolicBp: s.preAssessment.systolicBp || '',
            diastolicBp: s.preAssessment.diastolicBp || '',
            pulseRate: s.preAssessment.pulseRate || '',
            spo2: s.preAssessment.spo2 || '',
            weightKg: s.preAssessment.weightKg || '',
            patientReadiness: s.preAssessment.patientReadiness || 'GOOD',
            symptoms: s.preAssessment.symptoms || '',
            notes: s.preAssessment.notes || '',
          });
        }
        if (s.postAssessment) {
          setPostAssessment({
            systolicBp: s.postAssessment.systolicBp || '',
            diastolicBp: s.postAssessment.diastolicBp || '',
            pulseRate: s.postAssessment.pulseRate || '',
            spo2: s.postAssessment.spo2 || '',
            patientTolerance: s.postAssessment.patientTolerance || 'TOLERATED_WELL',
            adverseEvent: !!s.adverseEvent,
            adverseEventNotes: s.adverseEventNotes || '',
            postSessionNotes: s.postSessionNotes || '',
          });
        }
      }
      if (readRes.success) {
        setReadings(readRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Handle Save Pre-Assessment
  const handleSavePreAssessment = async (e) => {
    e.preventDefault();
    setSavingPre(true);
    try {
      const res = await eecpService.recordPreAssessment(id, {
        systolicBp: preAssessment.systolicBp ? Number(preAssessment.systolicBp) : undefined,
        diastolicBp: preAssessment.diastolicBp ? Number(preAssessment.diastolicBp) : undefined,
        pulseRate: preAssessment.pulseRate ? Number(preAssessment.pulseRate) : undefined,
        spo2: preAssessment.spo2 ? Number(preAssessment.spo2) : undefined,
        weightKg: preAssessment.weightKg ? Number(preAssessment.weightKg) : undefined,
        patientReadiness: preAssessment.patientReadiness,
        symptoms: preAssessment.symptoms,
        notes: preAssessment.notes,
      });

      if (res.success) {
        setToastMessage('Pre-session assessment recorded successfully.');
        setSession(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save pre-session assessment');
    } finally {
      setSavingPre(false);
    }
  };

  // Status transitions
  const handleTransitionStatus = async (newStatus, extraData = {}) => {
    try {
      const res = await eecpService.updateSessionStatus(id, {
        status: newStatus,
        ...extraData,
      });

      if (res.success) {
        setToastMessage(`Session transitioned to ${newStatus}`);
        setSession(res.data);
        if (newStatus === 'COMPLETED') {
          setCompleteModalOpen(false);
        }
        if (newStatus === 'CANCELLED') {
          setCancelModalOpen(false);
        }
        fetchSessionData();
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to transition to ${newStatus}`);
    }
  };

  // Add Telemetry Reading
  const handleAddReading = async (e) => {
    e.preventDefault();
    setAddingReading(true);
    try {
      const res = await eecpService.addSessionReading(id, {
        treatmentPressure: newReading.treatmentPressure ? Number(newReading.treatmentPressure) : undefined,
        systolicBp: newReading.systolicBp ? Number(newReading.systolicBp) : undefined,
        diastolicBp: newReading.diastolicBp ? Number(newReading.diastolicBp) : undefined,
        pulseRate: newReading.pulseRate ? Number(newReading.pulseRate) : undefined,
        spo2: newReading.spo2 ? Number(newReading.spo2) : undefined,
        symptoms: newReading.symptoms || undefined,
        notes: newReading.notes || undefined,
      });

      if (res.success) {
        setToastMessage('Telemetry reading logged.');
        setReadings((prev) => [...prev, res.data]);
        setNewReading({
          treatmentPressure: '260',
          systolicBp: '',
          diastolicBp: '',
          pulseRate: '',
          spo2: '',
          symptoms: '',
          notes: '',
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record session reading');
    } finally {
      setAddingReading(false);
    }
  };

  // Complete Session Execution
  const handleExecuteComplete = async (e) => {
    e.preventDefault();
    setCompletingSession(true);
    try {
      await handleTransitionStatus('COMPLETED', {
        postAssessment: {
          systolicBp: postAssessment.systolicBp ? Number(postAssessment.systolicBp) : undefined,
          diastolicBp: postAssessment.diastolicBp ? Number(postAssessment.diastolicBp) : undefined,
          pulseRate: postAssessment.pulseRate ? Number(postAssessment.pulseRate) : undefined,
          spo2: postAssessment.spo2 ? Number(postAssessment.spo2) : undefined,
          patientTolerance: postAssessment.patientTolerance,
        },
        postSessionNotes: postAssessment.postSessionNotes,
        adverseEvent: postAssessment.adverseEvent,
        adverseEventNotes: postAssessment.adverseEvent ? postAssessment.adverseEventNotes : null,
      });
    } finally {
      setCompletingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
        <p className="font-semibold">{error || 'Session not found'}</p>
        <button
          onClick={() => navigate('/hospital-admin/eecp')}
          className="mt-3 text-sm text-teal-600 hover:underline"
        >
          ← Return to EECP Dashboard
        </button>
      </div>
    );
  }

  const isCompleted = session.status === 'COMPLETED';
  const isCancelled = session.status === 'CANCELLED';
  const isLocked = isCompleted || isCancelled;
  const patient = session.patient || {};
  const course = session.course || {};
  const statusCfg = SESSION_STATUS_CONFIG[session.status] || SESSION_STATUS_CONFIG.SCHEDULED;

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

      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(`/hospital-admin/eecp/courses/${session.courseId}`)}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            ← Back to Course #{course.courseNumber}
          </button>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Session Workspace: #{session.sessionNumber}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Action Controls for Staff */}
        <div className="flex flex-wrap items-center gap-2">
          {session.status === 'SCHEDULED' && (
            <button
              onClick={() => handleTransitionStatus('PRE_ASSESSMENT')}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              Start Pre-Assessment
            </button>
          )}

          {session.status === 'PRE_ASSESSMENT' && (
            <button
              onClick={() => handleTransitionStatus('IN_PROGRESS')}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              Start Treatment (Bed Therapy)
            </button>
          )}

          {session.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => handleTransitionStatus('PAUSED')}
                className="px-3 py-2 bg-white border border-slate-300 text-orange-700 hover:bg-orange-50 rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                Pause Therapy
              </button>
              <button
                onClick={() => setCompleteModalOpen(true)}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                Finish & Complete Session
              </button>
            </>
          )}

          {session.status === 'PAUSED' && (
            <>
              <button
                onClick={() => handleTransitionStatus('IN_PROGRESS')}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                Resume Therapy
              </button>
              <button
                onClick={() => setCompleteModalOpen(true)}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                Complete Session
              </button>
            </>
          )}

          {!isLocked && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              Cancel Session
            </button>
          )}

          {isCompleted && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <svg className="w-4 h-4 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Session Verified & Locked
            </span>
          )}
        </div>
      </div>

      {/* Patient & Session Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
              <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Session #{session.sessionNumber} of {course.plannedSessions || 35}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Course: <span className="font-mono font-medium text-slate-700">{course.courseNumber}</span> •
              Supervising: {session.doctor ? `Dr. ${session.doctor.firstName} ${session.doctor.lastName}` : 'Supervising Doctor'} •
              Staff: {session.staff ? `${session.staff.firstName} ${session.staff.lastName}` : (user?.name || 'Assigned Staff')}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Scheduled:</div>
          <div className="text-xs font-semibold text-slate-800">
            {session.scheduledDate ? new Date(session.scheduledDate).toLocaleString() : '—'}
          </div>
          {session.startedAt && (
            <div className="text-[11px] text-teal-600 font-mono mt-0.5">
              Started: {new Date(session.startedAt).toLocaleTimeString()}
            </div>
          )}
          {session.completedAt && (
            <div className="text-[11px] text-emerald-600 font-mono">
              Completed: {new Date(session.completedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Pre-Assessment & Telemetry Readings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: PRE-SESSION ASSESSMENT */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Pre-Session Assessment</h3>
            </div>
            {isLocked ? (
              <span className="text-xs text-slate-400 font-medium">Read Only</span>
            ) : (
              <span className="text-xs text-amber-600 font-medium">Pre-Therapy Check</span>
            )}
          </div>

          <form onSubmit={handleSavePreAssessment} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Systolic BP</label>
                <div className="relative">
                  <input
                    type="number"
                    disabled={isLocked}
                    value={preAssessment.systolicBp}
                    onChange={(e) => setPreAssessment({ ...preAssessment, systolicBp: e.target.value })}
                    placeholder="120"
                    className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400">mmHg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Diastolic BP</label>
                <div className="relative">
                  <input
                    type="number"
                    disabled={isLocked}
                    value={preAssessment.diastolicBp}
                    onChange={(e) => setPreAssessment({ ...preAssessment, diastolicBp: e.target.value })}
                    placeholder="80"
                    className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400">mmHg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pulse Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    disabled={isLocked}
                    value={preAssessment.pulseRate}
                    onChange={(e) => setPreAssessment({ ...preAssessment, pulseRate: e.target.value })}
                    placeholder="72"
                    className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400">bpm</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">SpO₂</label>
                <div className="relative">
                  <input
                    type="number"
                    disabled={isLocked}
                    value={preAssessment.spo2}
                    onChange={(e) => setPreAssessment({ ...preAssessment, spo2: e.target.value })}
                    placeholder="98"
                    className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Weight</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    disabled={isLocked}
                    value={preAssessment.weightKg}
                    onChange={(e) => setPreAssessment({ ...preAssessment, weightKg: e.target.value })}
                    placeholder="70"
                    className="w-full text-sm border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400">kg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Readiness</label>
                <select
                  disabled={isLocked}
                  value={preAssessment.patientReadiness}
                  onChange={(e) => setPreAssessment({ ...preAssessment, patientReadiness: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
                >
                  <option value="GOOD">Good / Ready</option>
                  <option value="FAIR">Fair</option>
                  <option value="MILD_FATIGUE">Mild Fatigue</option>
                  <option value="DEFERRED">Deferred</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Current Pre-Session Symptoms</label>
              <input
                type="text"
                disabled={isLocked}
                value={preAssessment.symptoms}
                onChange={(e) => setPreAssessment({ ...preAssessment, symptoms: e.target.value })}
                placeholder="e.g. Asymptomatic, no angina, rested well"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pre-Session Staff Notes</label>
              <textarea
                rows="2"
                disabled={isLocked}
                value={preAssessment.notes}
                onChange={(e) => setPreAssessment({ ...preAssessment, notes: e.target.value })}
                placeholder="Bladder emptied, cuffs secured, baseline ECG synchronized."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
              />
            </div>

            {!isLocked && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPre}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {savingPre ? 'Saving...' : 'Save Pre-Assessment'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* CARD 2: LIVE INTRA-SESSION MONITORING READINGS */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Intra-Session Telemetry Readings</h3>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">
                {readings.length} readings
              </span>
            </div>

            {/* Readings Table */}
            <div className="mt-3 overflow-x-auto max-h-[220px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-2 px-2.5">Time</th>
                    <th className="py-2 px-2.5">Pressure</th>
                    <th className="py-2 px-2.5">BP</th>
                    <th className="py-2 px-2.5">Pulse</th>
                    <th className="py-2 px-2.5">SpO₂</th>
                    <th className="py-2 px-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {readings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-400 font-sans italic">
                        No telemetry readings recorded during this session yet.
                      </td>
                    </tr>
                  ) : (
                    readings.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 text-slate-600">
                          {new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-teal-600">
                          {r.treatmentPressure ? `${r.treatmentPressure} mmHg` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-800">
                          {r.systolicBp && r.diastolicBp ? `${r.systolicBp}/${r.diastolicBp}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-700">{r.pulseRate || '—'}</td>
                        <td className="py-2 px-2.5 text-slate-700">{r.spo2 ? `${r.spo2}%` : '—'}</td>
                        <td className="py-2 px-2.5 font-sans text-slate-500 truncate max-w-[120px]">
                          {r.notes || r.symptoms || 'Stable'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Reading Entry Form */}
          {!isLocked && (session.status === 'IN_PROGRESS' || session.status === 'PAUSED') && (
            <form onSubmit={handleAddReading} className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-xs font-bold text-slate-700">Log Instant Telemetry Reading</div>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500">Pressure</label>
                  <input
                    type="number"
                    value={newReading.treatmentPressure}
                    onChange={(e) => setNewReading({ ...newReading, treatmentPressure: e.target.value })}
                    placeholder="260"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Sys BP</label>
                  <input
                    type="number"
                    value={newReading.systolicBp}
                    onChange={(e) => setNewReading({ ...newReading, systolicBp: e.target.value })}
                    placeholder="120"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Dia BP</label>
                  <input
                    type="number"
                    value={newReading.diastolicBp}
                    onChange={(e) => setNewReading({ ...newReading, diastolicBp: e.target.value })}
                    placeholder="80"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Pulse</label>
                  <input
                    type="number"
                    value={newReading.pulseRate}
                    onChange={(e) => setNewReading({ ...newReading, pulseRate: e.target.value })}
                    placeholder="70"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">SpO₂</label>
                  <input
                    type="number"
                    value={newReading.spo2}
                    onChange={(e) => setNewReading({ ...newReading, spo2: e.target.value })}
                    placeholder="99"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newReading.notes}
                  onChange={(e) => setNewReading({ ...newReading, notes: e.target.value })}
                  placeholder="Patient comfort, augmentation ratio, notes..."
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={addingReading}
                  className="px-3 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition shadow-2xs disabled:opacity-50"
                >
                  {addingReading ? 'Logging...' : '+ Log'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* CARD 3: POST-SESSION SUMMARY (When Completed or Locked) */}
      {(isCompleted || session.postAssessment) && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Post-Session Clinical Assessment & Tolerance</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Post Vitals:</span>
              <span className="font-semibold text-slate-800">
                {postAssessment.systolicBp && postAssessment.diastolicBp ? `${postAssessment.systolicBp}/${postAssessment.diastolicBp} mmHg` : 'Not recorded'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Pulse / SpO₂:</span>
              <span className="font-semibold text-slate-800">
                {postAssessment.pulseRate ? `${postAssessment.pulseRate} bpm` : '—'} • {postAssessment.spo2 ? `${postAssessment.spo2}%` : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Tolerance:</span>
              <span className="font-semibold text-emerald-700">
                {postAssessment.patientTolerance.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Adverse Events:</span>
              <span className={`font-semibold ${session.adverseEvent ? 'text-rose-600' : 'text-slate-600'}`}>
                {session.adverseEvent ? 'Reported' : 'None Reported'}
              </span>
            </div>
          </div>

          {session.adverseEventNotes && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <span className="font-bold">Adverse Event Notes:</span> {session.adverseEventNotes}
            </div>
          )}

          {session.postSessionNotes && (
            <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
              <span className="font-semibold">Notes:</span> {session.postSessionNotes}
            </p>
          )}
        </div>
      )}

      {/* COMPLETE SESSION MODAL */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">Finalize & Complete Session #{session.sessionNumber}</h3>
              <button onClick={() => setCompleteModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleExecuteComplete} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Post Sys BP</label>
                  <input
                    type="number"
                    value={postAssessment.systolicBp}
                    onChange={(e) => setPostAssessment({ ...postAssessment, systolicBp: e.target.value })}
                    placeholder="120"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Post Dia BP</label>
                  <input
                    type="number"
                    value={postAssessment.diastolicBp}
                    onChange={(e) => setPostAssessment({ ...postAssessment, diastolicBp: e.target.value })}
                    placeholder="80"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Post Pulse</label>
                  <input
                    type="number"
                    value={postAssessment.pulseRate}
                    onChange={(e) => setPostAssessment({ ...postAssessment, pulseRate: e.target.value })}
                    placeholder="72"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Post SpO₂</label>
                  <input
                    type="number"
                    value={postAssessment.spo2}
                    onChange={(e) => setPostAssessment({ ...postAssessment, spo2: e.target.value })}
                    placeholder="98"
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Tolerance</label>
                <select
                  value={postAssessment.patientTolerance}
                  onChange={(e) => setPostAssessment({ ...postAssessment, patientTolerance: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="TOLERATED_WELL">Tolerated Well (Comfortable)</option>
                  <option value="MODERATE_DISCOMFORT">Moderate Discomfort</option>
                  <option value="MILD_LEG_PAIN">Mild Leg / Cuff Pain</option>
                  <option value="EARLY_INTERRUPTION">Early Interruption</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="adverseEventCheck"
                  checked={postAssessment.adverseEvent}
                  onChange={(e) => setPostAssessment({ ...postAssessment, adverseEvent: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <label htmlFor="adverseEventCheck" className="text-xs font-bold text-rose-700">
                  Record Adverse Event / Clinical Concern
                </label>
              </div>

              {postAssessment.adverseEvent && (
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    Adverse Event Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows="2"
                    required
                    value={postAssessment.adverseEventNotes}
                    onChange={(e) => setPostAssessment({ ...postAssessment, adverseEventNotes: e.target.value })}
                    placeholder="Describe any skin breakdown, paresthesia, headache, arrhythmias..."
                    className="w-full text-sm border border-rose-200 rounded-xl px-3 py-2 bg-rose-50/50 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Post-Session Notes</label>
                <textarea
                  rows="2"
                  value={postAssessment.postSessionNotes}
                  onChange={(e) => setPostAssessment({ ...postAssessment, postSessionNotes: e.target.value })}
                  placeholder="Patient rested 10 mins post deflation, ambulated without complaints."
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Completing this session will increment completed course sessions and lock this session against modification.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completingSession}
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {completingSession ? 'Finalizing...' : 'Confirm & Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel Session #{session.sessionNumber}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Please provide the reason for session cancellation.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cancellation Reason</label>
              <textarea
                rows="2"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Patient unwell, machine calibration, schedule conflict..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleTransitionStatus('CANCELLED', { cancellationReason: cancelReason })}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50"
              >
                Cancel Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
