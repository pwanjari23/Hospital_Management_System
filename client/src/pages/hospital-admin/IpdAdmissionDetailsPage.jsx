import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ipdService from '../../services/ipdService';

function AdmissionStatusBadge({ status }) {
  const map = {
    ADMITTED: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Admitted'],
    TRANSFER_PENDING: ['bg-amber-50 text-amber-700 border-amber-200', 'Transfer Pending'],
    DISCHARGE_PENDING: ['bg-indigo-50 text-indigo-700 border-indigo-200', 'Discharge Pending'],
    DISCHARGED: ['bg-slate-100 text-slate-700 border-slate-200', 'Discharged'],
    CANCELLED: ['bg-rose-50 text-rose-700 border-rose-200', 'Cancelled'],
  };
  const [cls, label] = map[status] || ['bg-slate-50 text-slate-600 border-slate-200', status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

export default function IpdAdmissionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active workspace tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'vitals' | 'progress' | 'nursing' | 'medications' | 'investigations' | 'timeline' | 'discharge'

  // Tab Data States
  const [vitals, setVitals] = useState([]);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const [progressNotes, setProgressNotes] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [nursingNotes, setNursingNotes] = useState([]);
  const [loadingNursing, setLoadingNursing] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [investigations, setInvestigations] = useState([]);
  const [loadingInvestigations, setLoadingInvestigations] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [dischargeSummary, setDischargeSummary] = useState(null);
  const [loadingDischarge, setLoadingDischarge] = useState(false);

  // Operational Modals
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [wards, setWards] = useState([]);
  const [transferBeds, setTransferBeds] = useState([]);
  const [loadingTransferBeds, setLoadingTransferBeds] = useState(false);
  const [transferForm, setTransferForm] = useState({
    toWardId: '',
    toBedId: '',
    transferReason: '',
    notes: '',
  });
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Clinical Modals
  // 1. Vital Modal
  const [vitalModalOpen, setVitalModalOpen] = useState(false);
  const [vitalForm, setVitalForm] = useState({
    temperature: '',
    pulseRate: '',
    respiratoryRate: '',
    systolicBp: '',
    diastolicBp: '',
    spo2: '',
    weightKg: '',
    heightCm: '',
    bloodGlucose: '',
    painScore: '',
    notes: '',
  });
  const [savingVital, setSavingVital] = useState(false);
  const [vitalError, setVitalError] = useState(null);

  // 2. Doctor Progress Note Modal
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressForm, setProgressForm] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    notes: '',
    status: 'DRAFT',
  });
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState(null);

  // 3. Nursing Note Modal
  const [nursingModalOpen, setNursingModalOpen] = useState(false);
  const [nursingForm, setNursingForm] = useState({
    observations: '',
    painScale: '',
    mobility: 'Independent',
    diet: 'Regular',
    intakeOutput: '',
    nursingInterventions: '',
    safetyObservations: 'Side rails up, call bell within reach',
    doctorNotificationNotes: '',
    notes: '',
    status: 'FINALIZED',
  });
  const [savingNursing, setSavingNursing] = useState(false);
  const [nursingError, setNursingError] = useState(null);

  // 4. Discharge Summary Modal
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({
    finalDiagnosis: '',
    hospitalCourse: '',
    significantFindings: '',
    investigationSummary: '',
    treatmentGiven: '',
    complications: '',
    conditionAtDischarge: 'Stable',
    disposition: 'HOME',
    dischargeInstructions: '',
    dietInstructions: '',
    activityInstructions: '',
    warningSigns: '',
    followUpDate: '',
    followUpInstructions: '',
    doctorRemarks: '',
    medications: [],
  });
  const [newMed, setNewMed] = useState({
    medicineName: '',
    dosage: '',
    frequency: 'Once daily (OD)',
    route: 'ORAL',
    duration: '5 days',
    instructions: 'After food',
  });
  const [savingDischarge, setSavingDischarge] = useState(false);
  const [dischargeError, setDischargeError] = useState(null);

  // 5. Finalize Discharge Confirmation Modal
  const [confirmDischargeModalOpen, setConfirmDischargeModalOpen] = useState(false);
  const [finalizingDischarge, setFinalizingDischarge] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);

  // Fetch Core Admission
  const fetchAdmission = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ipdService.getAdmissionById(id);
      setAdmission(res.data);
      const summary = res.data?.dischargeSummaryRecord || res.data?.dischargeSummary;
      if (summary) {
        setDischargeSummary(summary);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load admission details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAdmission();
  }, [fetchAdmission]);

  // Tab Loaders
  const loadVitals = useCallback(async () => {
    setLoadingVitals(true);
    try {
      const res = await ipdService.getAdmissionVitals(id);
      setVitals(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingVitals(false);
    }
  }, [id]);

  const loadProgressNotes = useCallback(async () => {
    setLoadingProgress(true);
    try {
      const res = await ipdService.getProgressNotes(id);
      setProgressNotes(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingProgress(false);
    }
  }, [id]);

  const loadNursingNotes = useCallback(async () => {
    setLoadingNursing(true);
    try {
      const res = await ipdService.getNursingNotes(id);
      setNursingNotes(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingNursing(false);
    }
  }, [id]);

  const loadPrescriptions = useCallback(async () => {
    setLoadingPrescriptions(true);
    try {
      const res = await ipdService.getAdmissionPrescriptions(id);
      setPrescriptions(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingPrescriptions(false);
    }
  }, [id]);

  const loadInvestigations = useCallback(async () => {
    setLoadingInvestigations(true);
    try {
      const res = await ipdService.getAdmissionInvestigations(id);
      setInvestigations(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingInvestigations(false);
    }
  }, [id]);

  const loadTimeline = useCallback(async () => {
    setLoadingTimeline(true);
    try {
      const res = await ipdService.getAdmissionTimeline(id);
      setTimeline(res.data || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingTimeline(false);
    }
  }, [id]);

  const loadDischargeSummary = useCallback(async () => {
    setLoadingDischarge(true);
    try {
      const res = await ipdService.getDischargeSummary(id);
      setDischargeSummary(res.data);
    } catch {
      // Non-blocking
    } finally {
      setLoadingDischarge(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'vitals') loadVitals();
    else if (activeTab === 'progress') loadProgressNotes();
    else if (activeTab === 'nursing') loadNursingNotes();
    else if (activeTab === 'medications') loadPrescriptions();
    else if (activeTab === 'investigations') loadInvestigations();
    else if (activeTab === 'timeline') loadTimeline();
    else if (activeTab === 'discharge') loadDischargeSummary();
    else if (activeTab === 'overview') {
      loadVitals();
      loadProgressNotes();
      loadNursingNotes();
    }
  }, [
    activeTab,
    loadVitals,
    loadProgressNotes,
    loadNursingNotes,
    loadPrescriptions,
    loadInvestigations,
    loadTimeline,
    loadDischargeSummary,
  ]);

  // Load Transfer Destination Beds
  useEffect(() => {
    if (!transferForm.toWardId) {
      setTransferBeds([]);
      return;
    }
    const loadTransferBeds = async () => {
      setLoadingTransferBeds(true);
      try {
        const res = await ipdService.getBeds({
          wardId: transferForm.toWardId,
          status: 'AVAILABLE',
          isActive: true,
        });
        setTransferBeds(res.data || []);
      } catch {
        setTransferBeds([]);
      } finally {
        setLoadingTransferBeds(false);
      }
    };
    loadTransferBeds();
  }, [transferForm.toWardId]);

  // Handlers for Operational Actions
  const openTransferModal = async () => {
    try {
      const res = await ipdService.getWards({ isActive: true });
      setWards(res.data || []);
      setTransferForm({
        toWardId: res.data?.[0]?.id || '',
        toBedId: '',
        transferReason: '',
        notes: '',
      });
      setTransferError(null);
      setTransferModalOpen(true);
    } catch {
      alert('Failed to load wards for transfer');
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferForm.toBedId) {
      setTransferError('Please select a destination bed');
      return;
    }
    setTransferring(true);
    setTransferError(null);
    try {
      await ipdService.transferBed(id, transferForm);
      setTransferModalOpen(false);
      fetchAdmission();
    } catch (err) {
      setTransferError(err?.response?.data?.message || 'Failed to transfer bed');
    } finally {
      setTransferring(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setCancelling(true);
    setCancelError(null);
    try {
      await ipdService.cancelAdmission(id, { reason: cancelReason });
      setCancelModalOpen(false);
      fetchAdmission();
    } catch (err) {
      setCancelError(err?.response?.data?.message || 'Failed to cancel admission');
    } finally {
      setCancelling(false);
    }
  };

  // Handlers for Clinical Vitals
  const handleSaveVital = async (e) => {
    e.preventDefault();
    setSavingVital(true);
    setVitalError(null);
    try {
      await ipdService.createInpatientVital(id, vitalForm);
      setVitalModalOpen(false);
      setVitalForm({
        temperature: '',
        pulseRate: '',
        respiratoryRate: '',
        systolicBp: '',
        diastolicBp: '',
        spo2: '',
        weightKg: '',
        heightCm: '',
        bloodGlucose: '',
        painScore: '',
        notes: '',
      });
      loadVitals();
    } catch (err) {
      setVitalError(err?.response?.data?.message || 'Failed to record vital');
    } finally {
      setSavingVital(false);
    }
  };

  // Handlers for Doctor Progress Notes
  const handleSaveProgress = async (e) => {
    e.preventDefault();
    setSavingProgress(true);
    setProgressError(null);
    try {
      await ipdService.createProgressNote(id, progressForm);
      setProgressModalOpen(false);
      setProgressForm({
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        notes: '',
        status: 'DRAFT',
      });
      loadProgressNotes();
    } catch (err) {
      setProgressError(err?.response?.data?.message || 'Failed to save progress note');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleFinalizeProgress = async (noteId) => {
    if (!window.confirm('Finalize this progress note? Once finalized, it becomes part of the permanent medical record and cannot be edited.')) {
      return;
    }
    try {
      await ipdService.finalizeProgressNote(noteId);
      loadProgressNotes();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to finalize progress note');
    }
  };

  // Handlers for Nursing Notes
  const handleSaveNursing = async (e) => {
    e.preventDefault();
    setSavingNursing(true);
    setNursingError(null);
    try {
      await ipdService.createNursingNote(id, nursingForm);
      setNursingModalOpen(false);
      setNursingForm({
        observations: '',
        painScale: '',
        mobility: 'Independent',
        diet: 'Regular',
        intakeOutput: '',
        nursingInterventions: '',
        safetyObservations: 'Side rails up, call bell within reach',
        doctorNotificationNotes: '',
        notes: '',
        status: 'FINALIZED',
      });
      loadNursingNotes();
    } catch (err) {
      setNursingError(err?.response?.data?.message || 'Failed to save nursing note');
    } finally {
      setSavingNursing(false);
    }
  };

  const handleFinalizeNursing = async (noteId) => {
    if (!window.confirm('Finalize this nursing note? Once finalized, it cannot be modified.')) {
      return;
    }
    try {
      await ipdService.finalizeNursingNote(noteId);
      loadNursingNotes();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to finalize nursing note');
    }
  };

  // Handlers for Discharge
  const openPrepareDischargeModal = () => {
    const existing = dischargeSummary || admission?.dischargeSummary;
    setDischargeForm({
      finalDiagnosis: existing?.finalDiagnosis || admission.provisionalDiagnosis || '',
      hospitalCourse: existing?.hospitalCourse || '',
      significantFindings: existing?.significantFindings || '',
      investigationSummary: existing?.investigationSummary || '',
      treatmentGiven: existing?.treatmentGiven || '',
      complications: existing?.complications || '',
      conditionAtDischarge: existing?.conditionAtDischarge || 'Stable',
      disposition: existing?.disposition || 'HOME',
      dischargeInstructions: existing?.dischargeInstructions || 'Take prescribed medications regularly. Maintain proper hydration and rest.',
      dietInstructions: existing?.dietInstructions || 'Normal diet, avoid spicy and excessively oily food.',
      activityInstructions: existing?.activityInstructions || 'Light physical activity as tolerated.',
      warningSigns: existing?.warningSigns || 'Report immediately if fever > 101°F, severe pain, or shortness of breath.',
      followUpDate: existing?.followUpDate || '',
      followUpInstructions: existing?.followUpInstructions || `Follow up in 7 days with Dr. ${admission.admittingDoctor?.name || 'Attending Doctor'}`,
      doctorRemarks: existing?.doctorRemarks || '',
      medications: existing?.medications?.length ? [...existing.medications] : [],
    });
    setDischargeError(null);
    setDischargeModalOpen(true);
  };

  const handleAddDischargeMedication = () => {
    if (!newMed.medicineName || !newMed.dosage) {
      alert('Please enter medicine name and dosage');
      return;
    }
    setDischargeForm({
      ...dischargeForm,
      medications: [...dischargeForm.medications, { ...newMed }],
    });
    setNewMed({
      medicineName: '',
      dosage: '',
      frequency: 'Once daily (OD)',
      route: 'ORAL',
      duration: '5 days',
      instructions: 'After food',
    });
  };

  const handleRemoveDischargeMedication = (index) => {
    const updated = [...dischargeForm.medications];
    updated.splice(index, 1);
    setDischargeForm({ ...dischargeForm, medications: updated });
  };

  const handleSaveDischargeDraft = async (e) => {
    e.preventDefault();
    if (!dischargeForm.finalDiagnosis.trim()) {
      setDischargeError('Final diagnosis is required');
      return;
    }
    setSavingDischarge(true);
    setDischargeError(null);
    try {
      const res = await ipdService.createOrUpdateDischargeSummary(id, dischargeForm);
      setDischargeSummary(res.data);
      setDischargeModalOpen(false);
      fetchAdmission();
    } catch (err) {
      setDischargeError(err?.response?.data?.message || 'Failed to save discharge summary');
    } finally {
      setSavingDischarge(false);
    }
  };

  const handleFinalizeDischargeSubmit = async () => {
    setFinalizingDischarge(true);
    setFinalizeError(null);
    try {
      const payload = {
        finalDiagnosis: dischargeForm.finalDiagnosis || dischargeSummary?.finalDiagnosis || admission.provisionalDiagnosis,
        conditionAtDischarge: dischargeForm.conditionAtDischarge || dischargeSummary?.conditionAtDischarge || 'Stable',
        disposition: dischargeForm.disposition || dischargeSummary?.disposition || 'HOME',
        dischargeInstructions: dischargeForm.dischargeInstructions || dischargeSummary?.dischargeInstructions,
        followUpDate: dischargeForm.followUpDate || dischargeSummary?.followUpDate,
        followUpInstructions: dischargeForm.followUpInstructions || dischargeSummary?.followUpInstructions,
        medications: dischargeForm.medications?.length ? dischargeForm.medications : dischargeSummary?.medications,
      };
      await ipdService.finalizeDischarge(id, payload);
      setConfirmDischargeModalOpen(false);
      setDischargeModalOpen(false);
      await fetchAdmission();
      loadDischargeSummary();
      setActiveTab('discharge');
    } catch (err) {
      setFinalizeError(err?.response?.data?.message || 'Failed to finalize discharge');
    } finally {
      setFinalizingDischarge(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !admission) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/hospital-admin/ipd/admissions')}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          ← Back to Admissions
        </button>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error || 'Admission not found'}
        </div>
      </div>
    );
  }

  const p = admission.patient;
  const isDischarged = admission.status === 'DISCHARGED';
  const isCancelled = admission.status === 'CANCELLED';
  const isActiveStay = !isDischarged && !isCancelled;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header with Breadcrumb & Quick Operational Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/hospital-admin/ipd/admissions')}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            ← Back to Admissions
          </button>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Inpatient Workspace: <span className="font-mono text-teal-700">{admission.admissionNumber}</span>
            </h1>
            <AdmissionStatusBadge status={admission.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isActiveStay && (
            <>
              <button
                onClick={() => {
                  setVitalError(null);
                  setVitalModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1"
              >
                + Record Vitals
              </button>
              <button
                onClick={() => {
                  setProgressError(null);
                  setProgressModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1"
              >
                + Doctor Progress
              </button>
              <button
                onClick={() => {
                  setNursingError(null);
                  setNursingModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors flex items-center gap-1"
              >
                + Nursing Note
              </button>
              <button
                onClick={openTransferModal}
                className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1"
              >
                Transfer Bed
              </button>
              <button
                onClick={openPrepareDischargeModal}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors flex items-center gap-1"
              >
                Discharge Workflow
              </button>
            </>
          )}

          {isDischarged && (
            <button
              onClick={() => {
                setActiveTab('discharge');
                setTimeout(() => window.print(), 200);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Discharge Summary
            </button>
          )}

          {isActiveStay && (
            <button
              onClick={() => {
                setCancelReason('');
                setCancelError(null);
                setCancelModalOpen(true);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
            >
              Cancel Stay
            </button>
          )}
        </div>
      </div>

      {/* 2. Patient Clinical Context Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-bold text-lg flex items-center justify-center">
            {p?.firstName?.[0] || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                {p?.firstName} {p?.lastName}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                UHID: {p?.uhid}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="capitalize">{p?.gender?.toLowerCase()}</span>
              <span>•</span>
              <span>DOB: {p?.dateOfBirth || '—'}</span>
              <span>•</span>
              <span>Phone: {p?.phone || '—'}</span>
              <span>•</span>
              <span>Ward: <strong className="text-slate-700">{admission.ward?.wardName}</strong></span>
              <span>•</span>
              <span>Bed: <strong className="font-mono text-slate-800">Bed {admission.bed?.bedNumber}</strong></span>
              <span>•</span>
              <span>Doctor: <strong className="text-slate-700">{admission.admittingDoctor?.name || '—'}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {admission.emergencyCase && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
              Emergency Admission
            </span>
          )}
          {dischargeSummary?.dischargeSummaryNumber && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 font-mono">
              {dischargeSummary.dischargeSummaryNumber}
            </span>
          )}
        </div>
      </div>

      {/* 3. Inpatient Workspace Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-sm font-medium">
        {[
          { key: 'overview', label: 'Stay Overview' },
          { key: 'vitals', label: `Vitals (${vitals.length})` },
          { key: 'progress', label: `Doctor SOAP (${progressNotes.length})` },
          { key: 'nursing', label: `Nursing Care (${nursingNotes.length})` },
          { key: 'medications', label: `Medications (${prescriptions.length})` },
          { key: 'investigations', label: `Investigations (${investigations.length})` },
          { key: 'timeline', label: 'Clinical Timeline' },
          { key: 'discharge', label: isDischarged ? 'Discharge Summary' : 'Discharge Planning' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-teal-600 text-teal-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. TAB CONTENTS */}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Location & Stay Stats */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bed & Room</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                  {admission.bed?.bedType}
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-800 font-mono">
                  Bed {admission.bed?.bedNumber || '—'}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {admission.ward?.wardName} ({admission.ward?.wardCode}) • Floor: {admission.ward?.floor || '—'}
                </p>
              </div>
              <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Admission Type:</span>
                  <span className="font-medium text-slate-700">{admission.admissionType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admitted At:</span>
                  <span className="text-slate-700">{admission.admissionDate} {admission.admissionTime}</span>
                </div>
                {admission.dischargeDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Discharged At:</span>
                    <span className="font-semibold text-purple-700">{admission.dischargeDate} {admission.dischargeTime}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Attending Doctor:</span>
                  <span className="font-semibold text-slate-800">{admission.admittingDoctor?.name}</span>
                </div>
              </div>
            </div>

            {/* Diagnosis & Clinical Summary */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical Reason & Diagnosis</span>
                {admission.department?.name && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {admission.department.name}
                  </span>
                )}
              </div>
              <div className="text-xs space-y-3 pt-1">
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Reason for Admission</span>
                  <p className="text-slate-800 text-sm mt-0.5 font-medium">{admission.reasonForAdmission || 'Clinical admission'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Provisional Diagnosis</span>
                  <p className="text-slate-700 mt-0.5">{admission.provisionalDiagnosis || 'Under medical observation'}</p>
                </div>
                {dischargeSummary?.finalDiagnosis && (
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-purple-700 font-semibold uppercase tracking-wider text-[10px] block">Final Discharge Diagnosis</span>
                    <p className="text-purple-900 font-medium mt-0.5">{dischargeSummary.finalDiagnosis}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Snapshot: Latest Vitals, Latest Doctor Note, Latest Nursing Note */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Latest Vitals Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-700">Latest Recorded Vitals</span>
                <button
                  onClick={() => setActiveTab('vitals')}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  View All →
                </button>
              </div>
              {vitals.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">No inpatient vitals recorded yet.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Blood Pressure:</span>
                    <span className="font-semibold text-slate-800">
                      {vitals[0].systolicBp && vitals[0].diastolicBp ? `${vitals[0].systolicBp}/${vitals[0].diastolicBp} mmHg` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Pulse Rate:</span>
                    <span className="font-semibold text-slate-800">{vitals[0].pulseRate ? `${vitals[0].pulseRate} bpm` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">SpO2:</span>
                    <span className="font-semibold text-slate-800">{vitals[0].spo2 ? `${vitals[0].spo2}%` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Temperature:</span>
                    <span className="font-semibold text-slate-800">{vitals[0].temperature ? `${vitals[0].temperature}°F` : '—'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    Logged by {vitals[0].recorder?.name || 'Staff'} on {new Date(vitals[0].recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            {/* Latest Doctor SOAP */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-700">Latest Doctor Round</span>
                <button
                  onClick={() => setActiveTab('progress')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Notes →
                </button>
              </div>
              {progressNotes.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">No physician rounds documented.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{progressNotes[0].doctor?.name || 'Attending Physician'}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      progressNotes[0].status === 'FINALIZED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {progressNotes[0].status}
                    </span>
                  </div>
                  <p className="text-slate-600 line-clamp-3 italic">
                    &ldquo;{progressNotes[0].assessment || progressNotes[0].subjective || 'Clinical evaluation completed.'}&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    Date: {progressNotes[0].progressDate} {progressNotes[0].progressTime}
                  </p>
                </div>
              )}
            </div>

            {/* Latest Nursing Note */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-700">Latest Nursing Note</span>
                <button
                  onClick={() => setActiveTab('nursing')}
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  View Care →
                </button>
              </div>
              {nursingNotes.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic">No nursing entries documented.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{nursingNotes[0].nurse?.name || 'Staff Nurse'}</span>
                    <span className="text-slate-400 text-[11px]">{nursingNotes[0].noteDate}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-3">
                    {nursingNotes[0].observations}
                  </p>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Pain: {nursingNotes[0].painScale !== null ? `${nursingNotes[0].painScale}/10` : '0/10'}</span>
                    <span>•</span>
                    <span>Diet: {nursingNotes[0].diet || 'Regular'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Inpatient Vitals */}
      {activeTab === 'vitals' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Inpatient Vitals Chart</h3>
              <p className="text-xs text-slate-500">Chronological vital observation entries during inpatient stay</p>
            </div>
            {isActiveStay && (
              <button
                onClick={() => {
                  setVitalError(null);
                  setVitalModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
              >
                + Record Vitals
              </button>
            )}
          </div>

          {loadingVitals ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading vitals...</div>
          ) : vitals.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              No inpatient vitals recorded yet. Click &ldquo;Record Vitals&rdquo; to add observations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Date & Time</th>
                    <th className="px-3 py-2.5">BP (mmHg)</th>
                    <th className="px-3 py-2.5">Pulse (bpm)</th>
                    <th className="px-3 py-2.5">SpO2</th>
                    <th className="px-3 py-2.5">Temp (°F)</th>
                    <th className="px-3 py-2.5">Resp Rate</th>
                    <th className="px-3 py-2.5">Weight / BMI</th>
                    <th className="px-3 py-2.5">Pain Score</th>
                    <th className="px-3 py-2.5">Recorded By</th>
                    <th className="px-3 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vitals.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 text-slate-600 font-mono">
                        {new Date(v.recordedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {v.systolicBp && v.diastolicBp ? `${v.systolicBp}/${v.diastolicBp}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{v.pulseRate || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {v.spo2 ? (
                          <span className={v.spo2 < 95 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                            {v.spo2}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {v.temperature ? (
                          <span className={v.temperature > 99.5 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                            {v.temperature}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{v.respiratoryRate || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {v.weightKg ? `${v.weightKg} kg` : '—'}
                        {v.bmi && <span className="text-[10px] text-slate-400 block font-mono">BMI: {v.bmi}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{v.painScore !== null ? `${v.painScore}/10` : '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{v.recorder?.name || 'Staff'}</td>
                      <td className="px-3 py-2.5 text-slate-500 italic max-w-xs truncate">{v.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Doctor Progress Notes (SOAP) */}
      {activeTab === 'progress' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Daily Doctor Progress Notes (SOAP)</h3>
              <p className="text-xs text-slate-500">Physician rounds, clinical evaluations, and treatment plans</p>
            </div>
            {isActiveStay && (
              <button
                onClick={() => {
                  setProgressError(null);
                  setProgressModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                + Add Progress Note
              </button>
            )}
          </div>

          {loadingProgress ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading progress notes...</div>
          ) : progressNotes.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              No doctor progress notes documented yet.
            </div>
          ) : (
            <div className="space-y-4">
              {progressNotes.map((note) => (
                <div key={note.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{note.doctor?.name || 'Doctor'}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {note.progressDate} {note.progressTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        note.status === 'FINALIZED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {note.status === 'FINALIZED' ? 'Locked (Finalized)' : 'Draft'}
                      </span>
                      {note.status === 'DRAFT' && isActiveStay && (
                        <button
                          onClick={() => handleFinalizeProgress(note.id)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          Finalize Note
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {note.subjective && (
                      <div className="p-3 bg-white rounded-lg border border-slate-100">
                        <strong className="text-blue-700 font-bold block mb-1">Subjective (S):</strong>
                        <p className="text-slate-700 whitespace-pre-wrap">{note.subjective}</p>
                      </div>
                    )}
                    {note.objective && (
                      <div className="p-3 bg-white rounded-lg border border-slate-100">
                        <strong className="text-indigo-700 font-bold block mb-1">Objective (O):</strong>
                        <p className="text-slate-700 whitespace-pre-wrap">{note.objective}</p>
                      </div>
                    )}
                    {note.assessment && (
                      <div className="p-3 bg-white rounded-lg border border-slate-100">
                        <strong className="text-teal-700 font-bold block mb-1">Assessment (A):</strong>
                        <p className="text-slate-700 whitespace-pre-wrap">{note.assessment}</p>
                      </div>
                    )}
                    {note.plan && (
                      <div className="p-3 bg-white rounded-lg border border-slate-100">
                        <strong className="text-purple-700 font-bold block mb-1">Plan (P):</strong>
                        <p className="text-slate-700 whitespace-pre-wrap">{note.plan}</p>
                      </div>
                    )}
                  </div>

                  {note.notes && (
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                      <strong>Remarks:</strong> {note.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Nursing Notes */}
      {activeTab === 'nursing' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Nursing Daily Care & Observations</h3>
              <p className="text-xs text-slate-500">Shift handovers, patient condition, pain levels, and nursing interventions</p>
            </div>
            {isActiveStay && (
              <button
                onClick={() => {
                  setNursingError(null);
                  setNursingModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-xs transition-colors"
              >
                + Add Nursing Note
              </button>
            )}
          </div>

          {loadingNursing ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading nursing notes...</div>
          ) : nursingNotes.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              No nursing notes documented yet.
            </div>
          ) : (
            <div className="space-y-4">
              {nursingNotes.map((note) => (
                <div key={note.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{note.nurse?.name || 'Staff Nurse'}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {note.noteDate} {note.noteTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        note.status === 'FINALIZED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {note.status}
                      </span>
                      {note.status === 'DRAFT' && isActiveStay && (
                        <button
                          onClick={() => handleFinalizeNursing(note.id)}
                          className="px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          Finalize
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="p-3 bg-white rounded-lg border border-slate-100">
                      <strong className="text-slate-700 block mb-1">Observations:</strong>
                      <p className="text-slate-800 whitespace-pre-wrap">{note.observations}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
                      <div className="p-2 bg-white rounded border border-slate-100">
                        <span className="text-slate-400 block">Pain Scale:</span>
                        <span className="font-semibold">{note.painScale !== null ? `${note.painScale}/10` : '0/10'}</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-100">
                        <span className="text-slate-400 block">Mobility:</span>
                        <span className="font-semibold">{note.mobility || 'Independent'}</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-100">
                        <span className="text-slate-400 block">Diet:</span>
                        <span className="font-semibold">{note.diet || 'Regular'}</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-100">
                        <span className="text-slate-400 block">Safety:</span>
                        <span className="font-semibold truncate">{note.safetyObservations || 'Standard precautions'}</span>
                      </div>
                    </div>

                    {note.nursingInterventions && (
                      <div className="p-2 bg-white rounded border border-slate-100 text-[11px] text-slate-600">
                        <strong>Interventions:</strong> {note.nursingInterventions}
                      </div>
                    )}
                    {note.doctorNotificationNotes && (
                      <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800">
                        <strong>Doctor Escalation:</strong> {note.doctorNotificationNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Medications */}
      {activeTab === 'medications' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Inpatient Prescriptions & Medication Orders</h3>
              <p className="text-xs text-slate-500">Live integration with pharmacy dispensing records</p>
            </div>
          </div>

          {loadingPrescriptions ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading prescriptions...</div>
          ) : prescriptions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              No prescriptions found for this patient during this admission.
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <div>
                      <span className="font-bold text-slate-800 text-xs">Prescription #{rx.id.slice(0, 8)}</span>
                      <span className="text-slate-400 text-xs ml-2">by Dr. {rx.doctor?.name || 'Physician'}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-2 py-1.5">Medicine</th>
                          <th className="px-2 py-1.5">Dosage</th>
                          <th className="px-2 py-1.5">Frequency</th>
                          <th className="px-2 py-1.5">Route</th>
                          <th className="px-2 py-1.5">Duration</th>
                          <th className="px-2 py-1.5">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(rx.items || []).map((item) => (
                          <tr key={item.id}>
                            <td className="px-2 py-1.5 font-semibold text-slate-800">
                              {item.medicine?.name || item.customMedicineName || 'Medicine'}
                            </td>
                            <td className="px-2 py-1.5 text-slate-700">{item.dosage}</td>
                            <td className="px-2 py-1.5 text-slate-700">{item.frequency}</td>
                            <td className="px-2 py-1.5 text-slate-700">{item.route}</td>
                            <td className="px-2 py-1.5 text-slate-700">{item.duration}</td>
                            <td className="px-2 py-1.5 text-slate-500 italic">{item.instructions || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Investigations */}
      {activeTab === 'investigations' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Laboratory & Diagnostic Investigations</h3>
              <p className="text-xs text-slate-500">Live integration with hospital laboratory test results</p>
            </div>
          </div>

          {loadingInvestigations ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading lab investigations...</div>
          ) : investigations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              No laboratory investigation orders found for this admission.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Test Name</th>
                    <th className="px-3 py-2.5">Sample Type</th>
                    <th className="px-3 py-2.5">Ordered Doctor</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Result</th>
                    <th className="px-3 py-2.5">Normal Range</th>
                    <th className="px-3 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {investigations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {inv.investigation?.name || 'Lab Test'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{inv.investigation?.sampleType || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{inv.doctor?.name || 'Physician'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          inv.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {inv.result?.resultValue ? `${inv.result.resultValue} ${inv.investigation?.unit || ''}` : 'Pending'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono">{inv.investigation?.normalRange || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Unified Clinical Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Unified Inpatient Clinical Timeline</h3>
              <p className="text-xs text-slate-500">Comprehensive chronological stay events</p>
            </div>
            <button
              onClick={loadTimeline}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Refresh Timeline
            </button>
          </div>

          {loadingTimeline ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading timeline...</div>
          ) : timeline.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">No timeline events recorded yet.</div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.map((ev) => (
                <div key={ev.id} className="relative text-xs">
                  <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-teal-600 border-2 border-white ring-2 ring-teal-100" />
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm">{ev.title}</span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700">{ev.description}</p>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Recorded by: {ev.actor}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Discharge Summary & Execution */}
      {activeTab === 'discharge' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Discharge Summary & Medical Release</h3>
              <p className="text-xs text-slate-500">Formal discharge documentation, medications, instructions, and follow-up</p>
            </div>
            <div className="flex items-center gap-2">
              {isDischarged ? (
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  Print Summary
                </button>
              ) : (
                <>
                  <button
                    onClick={openPrepareDischargeModal}
                    className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                  >
                    Edit Discharge Summary
                  </button>
                  <button
                    onClick={() => {
                      setFinalizeError(null);
                      setConfirmDischargeModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors"
                  >
                    Finalize Discharge & Release Bed
                  </button>
                </>
              )}
            </div>
          </div>

          {loadingDischarge ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading discharge data...</div>
          ) : !dischargeSummary && !admission.dischargeSummary ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
              <p className="text-sm text-slate-600">Discharge summary has not been prepared for this patient stay yet.</p>
              {isActiveStay && (
                <button
                  onClick={openPrepareDischargeModal}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors"
                >
                  Prepare Discharge Summary Now
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6 text-xs text-slate-700">
              {/* Printable Discharge Header */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6 shadow-xs">
                <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">HOSPITAL DISCHARGE SUMMARY</h2>
                    <p className="text-xs text-slate-500">Official Clinical Records & Release Protocol</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-purple-700 px-3 py-1 bg-purple-50 rounded-full border border-purple-200">
                      {(dischargeSummary || admission.dischargeSummary)?.dischargeSummaryNumber}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-1">
                      Status: <strong>{(dischargeSummary || admission.dischargeSummary)?.status}</strong>
                    </span>
                  </div>
                </div>

                {/* Patient & Stay Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block">Patient Name:</span>
                    <strong className="text-slate-800">{p?.firstName} {p?.lastName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">UHID:</span>
                    <strong className="font-mono text-slate-800">{p?.uhid}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Admission Date:</span>
                    <strong className="text-slate-800">{admission.admissionDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Discharge Date:</span>
                    <strong className="text-purple-700">{(dischargeSummary || admission.dischargeSummary)?.dischargeDate || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Ward & Bed:</span>
                    <strong className="text-slate-800">{admission.ward?.wardName} (Bed {admission.bed?.bedNumber})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Discharging Doctor:</span>
                    <strong className="text-slate-800">
                      {(dischargeSummary || admission.dischargeSummary)?.dischargingDoctor?.name || admission.admittingDoctor?.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Condition at Discharge:</span>
                    <strong className="text-emerald-700">{(dischargeSummary || admission.dischargeSummary)?.conditionAtDischarge || 'Stable'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Disposition:</span>
                    <strong className="text-indigo-700">{(dischargeSummary || admission.dischargeSummary)?.disposition || 'HOME'}</strong>
                  </div>
                </div>

                {/* Clinical Notes Breakdown */}
                <div className="space-y-4 pt-2">
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                    <strong className="text-purple-800 uppercase tracking-wider text-[11px] block">Final Diagnosis:</strong>
                    <p className="text-slate-800 font-semibold text-sm mt-0.5">
                      {(dischargeSummary || admission.dischargeSummary)?.finalDiagnosis}
                    </p>
                  </div>

                  {(dischargeSummary || admission.dischargeSummary)?.hospitalCourse && (
                    <div>
                      <strong className="text-slate-700 block">Hospital Course & Clinical Progress:</strong>
                      <p className="text-slate-600 mt-1 whitespace-pre-wrap">{(dischargeSummary || admission.dischargeSummary).hospitalCourse}</p>
                    </div>
                  )}

                  {(dischargeSummary || admission.dischargeSummary)?.treatmentGiven && (
                    <div>
                      <strong className="text-slate-700 block">Procedures & Treatment Given:</strong>
                      <p className="text-slate-600 mt-1 whitespace-pre-wrap">{(dischargeSummary || admission.dischargeSummary).treatmentGiven}</p>
                    </div>
                  )}

                  {/* Discharge Medications Table */}
                  <div>
                    <strong className="text-slate-700 block mb-2">Discharge Medications:</strong>
                    {(!((dischargeSummary || admission.dischargeSummary)?.medications) || (dischargeSummary || admission.dischargeSummary).medications.length === 0) ? (
                      <p className="text-slate-400 italic">No specific discharge medications prescribed.</p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2">Medicine</th>
                              <th className="px-3 py-2">Dosage</th>
                              <th className="px-3 py-2">Frequency</th>
                              <th className="px-3 py-2">Route</th>
                              <th className="px-3 py-2">Duration</th>
                              <th className="px-3 py-2">Instructions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(dischargeSummary || admission.dischargeSummary).medications.map((m, i) => (
                              <tr key={m.id || i}>
                                <td className="px-3 py-2 font-bold text-slate-800">{m.medicineName}</td>
                                <td className="px-3 py-2 text-slate-700">{m.dosage}</td>
                                <td className="px-3 py-2 text-slate-700">{m.frequency}</td>
                                <td className="px-3 py-2 text-slate-700">{m.route}</td>
                                <td className="px-3 py-2 text-slate-700">{m.duration}</td>
                                <td className="px-3 py-2 text-slate-500 italic">{m.instructions || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Instructions & Warning Signs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-700 block mb-1">Discharge Instructions & Diet:</strong>
                      <p className="text-slate-600 whitespace-pre-wrap">
                        {(dischargeSummary || admission.dischargeSummary)?.dischargeInstructions || 'Standard post-discharge care.'}
                      </p>
                      {(dischargeSummary || admission.dischargeSummary)?.dietInstructions && (
                        <p className="text-slate-500 mt-2"><strong>Diet:</strong> {(dischargeSummary || admission.dischargeSummary).dietInstructions}</p>
                      )}
                    </div>
                    <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 text-rose-800">
                      <strong className="block mb-1">Emergency Warning Signs:</strong>
                      <p className="whitespace-pre-wrap">
                        {(dischargeSummary || admission.dischargeSummary)?.warningSigns || 'Report to emergency immediately in case of acute distress, high fever, or unexpected symptoms.'}
                      </p>
                    </div>
                  </div>

                  {/* Follow-up Section */}
                  <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200 text-teal-900 flex justify-between items-center">
                    <div>
                      <strong>Next Follow-up Visit:</strong>
                      <p className="text-xs mt-0.5 font-medium">
                        {(dischargeSummary || admission.dischargeSummary)?.followUpInstructions || 'Follow up with physician as advised.'}
                      </p>
                    </div>
                    {(dischargeSummary || admission.dischargeSummary)?.followUpDate && (
                      <span className="font-mono text-sm font-bold bg-white px-3 py-1 rounded-lg border border-teal-300">
                        {(dischargeSummary || admission.dischargeSummary).followUpDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MODALS */}

      {/* Modal: Record Vital */}
      {vitalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Record Inpatient Vitals</h3>
              <button onClick={() => setVitalModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            {vitalError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{vitalError}</div>}
            <form onSubmit={handleSaveVital} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={vitalForm.systolicBp}
                    onChange={(e) => setVitalForm({ ...vitalForm, systolicBp: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={vitalForm.diastolicBp}
                    onChange={(e) => setVitalForm({ ...vitalForm, diastolicBp: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="72"
                    value={vitalForm.pulseRate}
                    onChange={(e) => setVitalForm({ ...vitalForm, pulseRate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={vitalForm.spo2}
                    onChange={(e) => setVitalForm({ ...vitalForm, spo2: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={vitalForm.temperature}
                    onChange={(e) => setVitalForm({ ...vitalForm, temperature: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Respiratory Rate</label>
                  <input
                    type="number"
                    placeholder="18"
                    value={vitalForm.respiratoryRate}
                    onChange={(e) => setVitalForm({ ...vitalForm, respiratoryRate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={vitalForm.weightKg}
                    onChange={(e) => setVitalForm({ ...vitalForm, weightKg: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="175"
                    value={vitalForm.heightCm}
                    onChange={(e) => setVitalForm({ ...vitalForm, heightCm: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Pain Score (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    placeholder="0"
                    value={vitalForm.painScore}
                    onChange={(e) => setVitalForm({ ...vitalForm, painScore: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Blood Glucose (mg/dL)</label>
                  <input
                    type="number"
                    placeholder="110"
                    value={vitalForm.bloodGlucose}
                    onChange={(e) => setVitalForm({ ...vitalForm, bloodGlucose: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={vitalForm.notes}
                  onChange={(e) => setVitalForm({ ...vitalForm, notes: e.target.value })}
                  placeholder="Clinical notes regarding observations..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setVitalModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={savingVital} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium">
                  {savingVital ? 'Saving...' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Doctor Progress Note */}
      {progressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Add Doctor Progress Note (SOAP)</h3>
              <button onClick={() => setProgressModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            {progressError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{progressError}</div>}
            <form onSubmit={handleSaveProgress} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Subjective (Symptoms, patient complaints, overnight events)</label>
                <textarea
                  rows="2"
                  value={progressForm.subjective}
                  onChange={(e) => setProgressForm({ ...progressForm, subjective: e.target.value })}
                  placeholder="Patient reports restful sleep, mild headache..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Objective (Examination findings, observations)</label>
                <textarea
                  rows="2"
                  value={progressForm.objective}
                  onChange={(e) => setProgressForm({ ...progressForm, objective: e.target.value })}
                  placeholder="Chest clear bilaterally, abdomen soft..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Assessment (Current clinical evaluation, diagnosis update)</label>
                <textarea
                  rows="2"
                  value={progressForm.assessment}
                  onChange={(e) => setProgressForm({ ...progressForm, assessment: e.target.value })}
                  placeholder="Improving acute bronchitis..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Plan (Medications, labs, monitoring)</label>
                <textarea
                  rows="2"
                  value={progressForm.plan}
                  onChange={(e) => setProgressForm({ ...progressForm, plan: e.target.value })}
                  placeholder="Continue current antibiotics, repeat CBC tomorrow..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={progressForm.status === 'FINALIZED'}
                    onChange={(e) => setProgressForm({ ...progressForm, status: e.target.checked ? 'FINALIZED' : 'DRAFT' })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Finalize note now (Cannot be modified once finalized)</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setProgressModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={savingProgress} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
                  {savingProgress ? 'Saving...' : progressForm.status === 'FINALIZED' ? 'Finalize Progress Note' : 'Save as Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Nursing Note */}
      {nursingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Add Nursing Note</h3>
              <button onClick={() => setNursingModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            {nursingError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{nursingError}</div>}
            <form onSubmit={handleSaveNursing} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Observations <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  value={nursingForm.observations}
                  onChange={(e) => setNursingForm({ ...nursingForm, observations: e.target.value })}
                  placeholder="Patient oriented to time and place, IV cannula site clean and patent..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Pain Scale (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={nursingForm.painScale}
                    onChange={(e) => setNursingForm({ ...nursingForm, painScale: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mobility</label>
                  <select
                    value={nursingForm.mobility}
                    onChange={(e) => setNursingForm({ ...nursingForm, mobility: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Independent">Independent</option>
                    <option value="Assisted">Assisted</option>
                    <option value="Bedbound">Bedbound</option>
                    <option value="Wheelchair">Wheelchair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Diet</label>
                  <select
                    value={nursingForm.diet}
                    onChange={(e) => setNursingForm({ ...nursingForm, diet: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Soft">Soft</option>
                    <option value="Diabetic">Diabetic</option>
                    <option value="Liquid">Liquid</option>
                    <option value="NPO">NPO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Intake / Output</label>
                  <input
                    type="text"
                    placeholder="e.g. In: 1200ml, Out: 1000ml"
                    value={nursingForm.intakeOutput}
                    onChange={(e) => setNursingForm({ ...nursingForm, intakeOutput: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Interventions & Actions Taken</label>
                <input
                  type="text"
                  placeholder="Oral medications administered on schedule, repositioned every 2 hours"
                  value={nursingForm.nursingInterventions}
                  onChange={(e) => setNursingForm({ ...nursingForm, nursingInterventions: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Doctor Notifications / Escalations</label>
                <input
                  type="text"
                  placeholder="Informed Dr. Smith regarding BP reading at 14:00"
                  value={nursingForm.doctorNotificationNotes}
                  onChange={(e) => setNursingForm({ ...nursingForm, doctorNotificationNotes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setNursingModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={savingNursing} className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-medium">
                  {savingNursing ? 'Saving...' : 'Save Nursing Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Prepare / Edit Discharge Summary */}
      {dischargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Prepare Discharge Summary</h3>
                <p className="text-xs text-slate-500">Draft discharge instructions and medications for admission {admission.admissionNumber}</p>
              </div>
              <button onClick={() => setDischargeModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            {dischargeError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{dischargeError}</div>}
            <form onSubmit={handleSaveDischargeDraft} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Final Diagnosis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={dischargeForm.finalDiagnosis}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                  placeholder="e.g. Acute bacterial pneumonia, resolved"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Condition at Discharge</label>
                  <input
                    type="text"
                    value={dischargeForm.conditionAtDischarge}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, conditionAtDischarge: e.target.value })}
                    placeholder="Stable, afebrile"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Disposition</label>
                  <select
                    value={dischargeForm.disposition}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, disposition: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="HOME">HOME</option>
                    <option value="TRANSFERRED">TRANSFERRED</option>
                    <option value="LAMA">LAMA (Against Medical Advice)</option>
                    <option value="ABSCONDED">ABSCONDED</option>
                    <option value="REFERRED">REFERRED</option>
                    <option value="DECEASED">DECEASED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Hospital Course & Clinical Summary</label>
                <textarea
                  rows="2"
                  value={dischargeForm.hospitalCourse}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, hospitalCourse: e.target.value })}
                  placeholder="Patient was admitted with productive cough and fever. Started on IV ceftriaxone with prompt defervescence..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Treatment & Procedures Given</label>
                <textarea
                  rows="2"
                  value={dischargeForm.treatmentGiven}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, treatmentGiven: e.target.value })}
                  placeholder="IV fluids, antibiotic therapy, respiratory nebulization..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Discharge Medications Builder */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
                <span className="font-bold text-slate-700 block">Discharge Medications</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Medicine name"
                    value={newMed.medicineName}
                    onChange={(e) => setNewMed({ ...newMed, medicineName: e.target.value })}
                    className="px-2 py-1.5 border rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 500mg)"
                    value={newMed.dosage}
                    onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                    className="px-2 py-1.5 border rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Frequency (e.g. TDS)"
                    value={newMed.frequency}
                    onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                    className="px-2 py-1.5 border rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 5 days)"
                    value={newMed.duration}
                    onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                    className="px-2 py-1.5 border rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Instructions (e.g. after food)"
                    value={newMed.instructions}
                    onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                    className="px-2 py-1.5 border rounded bg-white sm:col-span-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddDischargeMedication}
                  className="px-3 py-1 bg-slate-700 text-white rounded text-xs font-medium"
                >
                  + Add Medication
                </button>

                {dischargeForm.medications.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {dischargeForm.medications.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border text-[11px]">
                        <span><strong>{m.medicineName}</strong> — {m.dosage} ({m.frequency}) for {m.duration}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDischargeMedication(idx)}
                          className="text-rose-600 font-bold hover:text-rose-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={dischargeForm.followUpDate}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Follow-up Instructions</label>
                  <input
                    type="text"
                    value={dischargeForm.followUpInstructions}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, followUpInstructions: e.target.value })}
                    placeholder="Review in OPD in 7 days"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Discharge & Diet Instructions</label>
                <textarea
                  rows="2"
                  value={dischargeForm.dischargeInstructions}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeInstructions: e.target.value })}
                  placeholder="Rest at home, light diet..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setDischargeModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={savingDischarge} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">
                  {savingDischarge ? 'Saving...' : 'Save Discharge Summary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Finalize Discharge & Release Bed */}
      {confirmDischargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Finalize Medical Discharge</h3>
              <button onClick={() => setConfirmDischargeModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            {finalizeError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{finalizeError}</div>}

            <div className="text-xs text-slate-600 space-y-3">
              <div className="p-3 bg-purple-50 text-purple-900 rounded-xl border border-purple-200 font-medium">
                Finalizing discharge will close this stay, lock the discharge summary permanently, and immediately release Bed {admission.bed?.bedNumber} back to AVAILABLE status.
              </div>
              <p>
                <strong>Patient:</strong> {p?.firstName} {p?.lastName} ({p?.uhid})<br />
                <strong>Admission:</strong> {admission.admissionNumber}<br />
                <strong>Assigned Bed:</strong> Bed {admission.bed?.bedNumber} ({admission.ward?.wardName})<br />
                <strong>Discharge Diagnosis:</strong> {dischargeForm.finalDiagnosis || dischargeSummary?.finalDiagnosis || admission.provisionalDiagnosis}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setConfirmDischargeModalOpen(false)}
                className="px-4 py-2 text-sm border rounded-lg text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalizeDischargeSubmit}
                disabled={finalizingDischarge}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs"
              >
                {finalizingDischarge ? 'Releasing Bed...' : 'Confirm & Finalize Discharge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transfer Bed */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Transfer Patient Bed</h3>
                <p className="text-xs text-slate-500">
                  Current: {admission.ward?.wardName} • Bed {admission.bed?.bedNumber}
                </p>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            {transferError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Destination Ward <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={transferForm.toWardId}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, toWardId: e.target.value, toBedId: '' })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">Select Ward</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.wardName} ({w.wardCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Destination Available Bed <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  disabled={loadingTransferBeds || !transferForm.toWardId}
                  value={transferForm.toBedId}
                  onChange={(e) => setTransferForm({ ...transferForm, toBedId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-50"
                >
                  <option value="">
                    {loadingTransferBeds ? 'Loading available beds...' : 'Select Available Bed'}
                  </option>
                  {transferBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bed {b.bedNumber} ({b.bedType})
                    </option>
                  ))}
                </select>
                {transferForm.toWardId && transferBeds.length === 0 && !loadingTransferBeds && (
                  <p className="text-[11px] text-rose-500 mt-1">No available beds in this ward.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for Transfer <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical step-down, Isolation request"
                  value={transferForm.transferReason}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, transferReason: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Clinical handover notes..."
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {transferring ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Stay */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Cancel Admission</h3>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4 text-sm">
              <p className="text-xs text-slate-600">
                Are you sure you want to cancel admission <strong>{admission.admissionNumber}</strong>?
                This will release bed <strong>{admission.bed?.bedNumber}</strong> back to AVAILABLE status.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cancellation Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patient declined admission, Clerical entry error"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
