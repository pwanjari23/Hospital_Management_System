import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import encounterService from '../../services/encounterService';
import prescriptionService from '../../services/prescriptionService';
import investigationOrderService from '../../services/investigationOrderService';
import { clinicalMasterService } from '../../services/clinicalMasterService';
import eecpService from '../../services/eecpService';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import useAuth from '../../hooks/useAuth';

export default function ConsultationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'HOSPITAL_ADMIN';

  const [encounter, setEncounter] = useState(null);
  const [patientTimeline, setPatientTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Active consultation consultation form state
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    surgicalHistory: '',
    familyHistory: '',
    socialHistory: '',
    clinicalExamination: '',
    assessment: '',
    treatmentPlan: '',
    followUpDate: '',
    followUpNotes: '',
  });

  // Diagnoses state
  const [diagnoses, setDiagnoses] = useState([]);
  const [diagnosisModal, setDiagnosisModal] = useState({
    isOpen: false,
    diagnosisName: '',
    diagnosisCode: '',
    diagnosisType: 'PRIMARY',
    notes: '',
    isPrimary: false,
    submitting: false,
  });

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicineModal, setMedicineModal] = useState({
    isOpen: false,
    medicineId: '',
    selectedMed: null,
    dosage: '1 tablet',
    frequency: 'Once Daily',
    route: 'ORAL',
    durationValue: 5,
    durationUnit: 'DAYS',
    foodInstruction: 'AFTER_FOOD',
    instructions: '',
    notes: '',
    submitting: false,
    search: '',
    searchResults: [],
    searching: false,
  });

  // Investigation orders state
  const [investigationOrders, setInvestigationOrders] = useState([]);
  const [investigationModal, setInvestigationModal] = useState({
    isOpen: false,
    investigationId: '',
    selectedInv: null,
    priority: 'ROUTINE',
    clinicalIndication: '',
    notes: '',
    submitting: false,
    search: '',
    searchResults: [],
    searching: false,
  });

  // Vitals state
  const [vitals, setVitals] = useState([]);
  const [vitalsModal, setVitalsModal] = useState({
    isOpen: false,
    submitting: false,
    data: {
      temperature: '',
      pulseRate: '',
      respiratoryRate: '',
      systolicBp: '',
      diastolicBp: '',
      spo2: '',
      weightKg: '',
      heightCm: '',
      notes: '',
    },
  });

  // Complete consultation confirmation dialog
  const [confirmCompleteDialog, setConfirmCompleteDialog] = useState(false);

  // EECP Clinical Assessment State
  const [eecpAssessment, setEecpAssessment] = useState(null);
  const [eecpExpanded, setEecpExpanded] = useState(false);
  const [savingEecp, setSavingEecp] = useState(false);
  const [eecpForm, setEecpForm] = useState({
    indication: 'Refractory Angina / Ischemic Heart Disease',
    cardiacHistory: '',
    previousInterventions: '',
    currentSymptoms: '',
    functionalStatus: 'CCS_CLASS_II',
    baselineAssessment: '',
    suitabilityAssessment: 'SUITABLE',
    contraindicationNotes: 'No severe aortic regurgitation, no deep vein thrombosis, no severe peripheral vascular disease.',
    recommendedSessions: 35,
    doctorNotes: '',
  });

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load encounter details, vitals, diagnoses & patient clinical timeline
  const fetchEncounterData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await encounterService.getEncounterById(id);
      if (res.success) {
        const enc = res.data;
        setEncounter(enc);
        setDiagnoses(enc.diagnoses || []);
        setVitals(enc.vitals || []);
        setPrescriptions(enc.prescriptions || []);
        setInvestigationOrders(enc.investigationOrders || []);
        setFormData({
          chiefComplaint: enc.chiefComplaint || enc.appointment?.reason || '',
          historyOfPresentIllness: enc.historyOfPresentIllness || '',
          pastMedicalHistory: enc.pastMedicalHistory || enc.patient?.medicalNotes || '',
          surgicalHistory: enc.surgicalHistory || '',
          familyHistory: enc.familyHistory || '',
          socialHistory: enc.socialHistory || '',
          clinicalExamination: enc.clinicalExamination || '',
          assessment: enc.assessment || '',
          treatmentPlan: enc.treatmentPlan || '',
          followUpDate: enc.followUpDate || '',
          followUpNotes: enc.followUpNotes || '',
        });

        // Load timeline
        if (enc.patientId) {
          const timelineRes = await encounterService.getPatientTimeline(enc.patientId);
          if (timelineRes.success) {
            setPatientTimeline(timelineRes.data || []);
          }
        }

        // Load EECP Assessment if exists
        try {
          const eecpRes = await eecpService.getEncounterAssessment(id);
          if (eecpRes.success && eecpRes.data) {
            const ea = eecpRes.data;
            setEecpAssessment(ea);
            setEecpForm({
              indication: ea.indication || 'Refractory Angina / Ischemic Heart Disease',
              cardiacHistory: ea.cardiacHistory || '',
              previousInterventions: ea.previousInterventions || '',
              currentSymptoms: ea.currentSymptoms || '',
              functionalStatus: ea.functionalStatus || 'CCS_CLASS_II',
              baselineAssessment: ea.baselineAssessment || '',
              suitabilityAssessment: ea.suitabilityAssessment || 'SUITABLE',
              contraindicationNotes: ea.contraindicationNotes || '',
              recommendedSessions: ea.recommendedSessions || 35,
              doctorNotes: ea.doctorNotes || '',
            });
            setEecpExpanded(true);
          } else if (enc.encounterType === 'EECP_CONSULTATION') {
            setEecpExpanded(true);
          }
        } catch {
          if (enc.encounterType === 'EECP_CONSULTATION') {
            setEecpExpanded(true);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clinical encounter details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEncounterData();
  }, [fetchEncounterData]);

  // Handle Save EECP Assessment
  const handleSaveEecpAssessment = async (e) => {
    e.preventDefault();
    setSavingEecp(true);
    try {
      const res = await eecpService.saveEncounterAssessment(id, eecpForm);
      if (res.success) {
        setEecpAssessment(res.data);
        setToastMessage('EECP Assessment & Suitability saved successfully.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save EECP assessment');
    } finally {
      setSavingEecp(false);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await encounterService.updateConsultation(id, formData);
      if (res.success) {
        setToastMessage('Consultation notes saved as draft.');
        setEncounter(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save draft consultation.');
    } finally {
      setSaving(false);
    }
  };

  // Complete Consultation
  const handleExecuteComplete = async () => {
    setCompleting(true);
    try {
      const res = await encounterService.completeEncounter(id, formData);
      if (res.success) {
        setToastMessage('Consultation completed successfully! Clinical records locked.');
        setEncounter(res.data);
        setConfirmCompleteDialog(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete consultation.');
    } finally {
      setCompleting(false);
    }
  };

  // Add Diagnosis
  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    setDiagnosisModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await encounterService.addDiagnosis(id, {
        diagnosisName: diagnosisModal.diagnosisName,
        diagnosisCode: diagnosisModal.diagnosisCode || null,
        diagnosisType: diagnosisModal.diagnosisType,
        notes: diagnosisModal.notes || null,
        isPrimary: diagnosisModal.isPrimary || diagnosisModal.diagnosisType === 'PRIMARY',
      });
      if (res.success) {
        setDiagnoses((prev) => [...prev, res.data]);
        setDiagnosisModal({
          isOpen: false,
          diagnosisName: '',
          diagnosisCode: '',
          diagnosisType: 'PRIMARY',
          notes: '',
          isPrimary: false,
          submitting: false,
        });
        setToastMessage('Diagnosis recorded.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record diagnosis.');
      setDiagnosisModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Delete Diagnosis
  const handleDeleteDiagnosis = async (diagId) => {
    try {
      await encounterService.deleteDiagnosis(id, diagId);
      setDiagnoses((prev) => prev.filter((d) => d.id !== diagId));
      setToastMessage('Diagnosis removed.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove diagnosis.');
    }
  };

  // -------------------------------------------------------------
  // Prescription Handlers
  // -------------------------------------------------------------
  const handleSearchMedicines = async (term) => {
    setMedicineModal((prev) => ({ ...prev, search: term, searching: true }));
    try {
      const res = await clinicalMasterService.getMedicines({ search: term, status: 'ACTIVE', limit: 12 });
      setMedicineModal((prev) => ({
        ...prev,
        searchResults: res.data?.medicines || [],
        searching: false,
      }));
    } catch {
      setMedicineModal((prev) => ({ ...prev, searching: false }));
    }
  };

  const handleSelectMedicine = (med) => {
    setMedicineModal((prev) => ({
      ...prev,
      selectedMed: med,
      medicineId: med.id,
      dosage: med.dosageForm ? `1 ${med.dosageForm.toLowerCase()}` : '1 tablet',
      searchResults: [],
      search: med.name,
    }));
  };

  const handleAddMedicineSubmit = async (e) => {
    e.preventDefault();
    if (!medicineModal.medicineId) {
      alert('Please select a valid medicine from the catalog.');
      return;
    }
    setMedicineModal((prev) => ({ ...prev, submitting: true }));

    const itemData = {
      medicineId: medicineModal.medicineId,
      dosage: medicineModal.dosage,
      frequency: medicineModal.frequency,
      route: medicineModal.route,
      durationValue: Number(medicineModal.durationValue) || 5,
      durationUnit: medicineModal.durationUnit,
      foodInstruction: medicineModal.foodInstruction,
      instructions: medicineModal.instructions,
      notes: medicineModal.notes,
    };

    try {
      const activeRx = prescriptions.find((p) => p.status === 'DRAFT');
      if (activeRx) {
        const res = await prescriptionService.addItem(activeRx.id, itemData);
        if (res.success) {
          setPrescriptions((prev) =>
            prev.map((p) =>
              p.id === activeRx.id
                ? { ...p, items: [...(p.items || []), res.data] }
                : p
            )
          );
          setToastMessage('Medicine added to prescription.');
        }
      } else {
        const res = await prescriptionService.createPrescription(id, { items: [itemData] });
        if (res.success) {
          setPrescriptions((prev) => [res.data, ...prev]);
          setToastMessage('Prescription created with new medication.');
        }
      }
      setMedicineModal({
        isOpen: false,
        medicineId: '',
        selectedMed: null,
        dosage: '1 tablet',
        frequency: 'Once Daily',
        route: 'ORAL',
        durationValue: 5,
        durationUnit: 'DAYS',
        foodInstruction: 'AFTER_FOOD',
        instructions: '',
        notes: '',
        submitting: false,
        search: '',
        searchResults: [],
        searching: false,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medicine.');
      setMedicineModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDeletePrescriptionItem = async (prescriptionId, itemId) => {
    try {
      await prescriptionService.deleteItem(prescriptionId, itemId);
      setPrescriptions((prev) =>
        prev.map((p) =>
          p.id === prescriptionId
            ? { ...p, items: (p.items || []).filter((i) => i.id !== itemId) }
            : p
        )
      );
      setToastMessage('Medicine removed from prescription.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove medicine.');
    }
  };

  const handleFinalizePrescription = async (prescriptionId) => {
    try {
      const res = await prescriptionService.finalizePrescription(prescriptionId);
      if (res.success) {
        setPrescriptions((prev) =>
          prev.map((p) => (p.id === prescriptionId ? res.data : p))
        );
        setToastMessage('Prescription finalized and locked.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize prescription.');
    }
  };

  // -------------------------------------------------------------
  // Investigation Order Handlers
  // -------------------------------------------------------------
  const handleSearchInvestigations = async (term) => {
    setInvestigationModal((prev) => ({ ...prev, search: term, searching: true }));
    try {
      const res = await clinicalMasterService.getInvestigations({ search: term, status: 'ACTIVE', limit: 12 });
      setInvestigationModal((prev) => ({
        ...prev,
        searchResults: res.data?.investigations || [],
        searching: false,
      }));
    } catch {
      setInvestigationModal((prev) => ({ ...prev, searching: false }));
    }
  };

  const handleSelectInvestigation = (inv) => {
    setInvestigationModal((prev) => ({
      ...prev,
      selectedInv: inv,
      investigationId: inv.id,
      searchResults: [],
      search: inv.name,
    }));
  };

  const handleAddInvestigationSubmit = async (e) => {
    e.preventDefault();
    if (!investigationModal.investigationId) {
      alert('Please select an investigation from the catalog.');
      return;
    }
    setInvestigationModal((prev) => ({ ...prev, submitting: true }));

    const orderData = {
      investigationId: investigationModal.investigationId,
      priority: investigationModal.priority,
      clinicalIndication: investigationModal.clinicalIndication,
      notes: investigationModal.notes,
    };

    try {
      const res = await investigationOrderService.createOrder(id, orderData);
      if (res.success) {
        setInvestigationOrders((prev) => [res.data, ...prev]);
        setToastMessage('Investigation order placed.');
        setInvestigationModal({
          isOpen: false,
          investigationId: '',
          selectedInv: null,
          priority: 'ROUTINE',
          clinicalIndication: '',
          notes: '',
          submitting: false,
          search: '',
          searchResults: [],
          searching: false,
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to order investigation.');
      setInvestigationModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDeleteInvestigationOrder = async (orderId) => {
    try {
      await investigationOrderService.deleteOrder(orderId);
      setInvestigationOrders((prev) => prev.filter((o) => o.id !== orderId));
      setToastMessage('Investigation order cancelled.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel investigation order.');
    }
  };

  const handleFinalizeInvestigationOrder = async (orderId) => {
    try {
      const res = await investigationOrderService.finalizeOrder(orderId);
      if (res.success) {
        setInvestigationOrders((prev) =>
          prev.map((o) => (o.id === orderId ? res.data : o))
        );
        setToastMessage('Investigation order finalized.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finalize investigation order.');
    }
  };

  // Add Vital
  const handleRecordVital = async (e) => {
    e.preventDefault();
    setVitalsModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await encounterService.recordVital(id, vitalsModal.data);
      if (res.success) {
        setVitals((prev) => [res.data, ...prev]);
        setVitalsModal({
          isOpen: false,
          submitting: false,
          data: {
            temperature: '',
            pulseRate: '',
            respiratoryRate: '',
            systolicBp: '',
            diastolicBp: '',
            spo2: '',
            weightKg: '',
            heightCm: '',
            notes: '',
          },
        });
        setToastMessage('New vitals reading recorded.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record vitals.');
      setVitalsModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const isCompleted = encounter?.status === 'COMPLETED';
  const latestVital = vitals[0] || null;

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading clinical consultation workspace...</p>
      </div>
    );
  }

  if (error || !encounter) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs">
        <h3 className="font-bold text-sm mb-1">Encounter Not Found</h3>
        <p>{error || 'The requested clinical encounter could not be located.'}</p>
        <button
          onClick={() => navigate('/hospital-admin/encounters')}
          className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Worklist
        </button>
      </div>
    );
  }

  const patient = encounter.patient;
  const fullName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim();

  return (
    <div className="space-y-6 antialiased pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom duration-200">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hospital-admin/encounters')}
            className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs transition"
            title="Back to encounters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Doctor Consultation</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-blue-50 text-blue-700 border-blue-200">
                {encounter.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {encounter.encounterNumber} &bull; {encounter.encounterType} Consultation
            </p>
          </div>
        </div>

        {/* Action Buttons (Save Draft / Complete) */}
        {!isCompleted && isDoctor && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => setConfirmCompleteDialog(true)}
              disabled={completing}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Complete Consultation</span>
            </button>
          </div>
        )}
      </div>

      {/* Patient Header & Clinical Snapshot Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Patient Bio */}
          <div className="pr-4 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Patient</div>
            <h2 className="text-base font-bold text-slate-900">{fullName}</h2>
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="font-mono">{patient?.uhid}</span>
              <span>&bull;</span>
              <span>{patient?.gender}</span>
              {patient?.age && <span>({patient.age})</span>}
            </div>
            <div className="text-[11px] text-slate-500">
              Blood Group: <strong className="text-slate-700">{patient?.bloodGroup?.replace('_', ' ') || 'Unknown'}</strong>
            </div>
          </div>

          {/* Clinical Staff & Dept */}
          <div className="md:px-4 pt-3 md:pt-0 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Doctor & Clinic</div>
            <div className="text-sm font-semibold text-slate-800">{encounter.doctor?.name}</div>
            <div className="text-xs text-slate-500">
              {encounter.department?.name || encounter.doctor?.specialization || 'Clinical Department'}
            </div>
            {encounter.appointment && (
              <div className="text-[11px] text-blue-600 font-mono">
                Appt: {encounter.appointment.appointmentNumber}
              </div>
            )}
          </div>

          {/* Latest Vitals Snapshot */}
          <div className="md:px-4 pt-3 md:pt-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest Vitals</span>
              {!isCompleted && (
                <button
                  onClick={() => setVitalsModal((prev) => ({ ...prev, isOpen: true }))}
                  className="text-[11px] text-blue-600 font-semibold hover:underline"
                >
                  + Add Vital
                </button>
              )}
            </div>
            {latestVital ? (
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold text-slate-900">
                  BP: {latestVital.systolicBp}/{latestVital.diastolicBp} mmHg
                </div>
                <div className="text-slate-600 text-[11px]">
                  Pulse: {latestVital.pulseRate || '—'} bpm &bull; SpO₂: {latestVital.spo2 ? `${latestVital.spo2}%` : '—'}
                </div>
                {latestVital.bmi && (
                  <div className="text-[11px] text-emerald-700 font-medium">
                    BMI: {latestVital.bmi} kg/m² ({latestVital.weightKg} kg / {latestVital.heightCm} cm)
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                No vitals recorded yet.
              </div>
            )}
          </div>

          {/* Allergies & Alerts */}
          <div className="md:pl-4 pt-3 md:pt-0 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-500">Allergies & Alerts</div>
            <div className="text-xs text-slate-700 font-medium">
              {patient?.allergies || 'No known drug allergies (NKDA)'}
            </div>
            {patient?.medicalNotes && (
              <div className="text-[11px] text-slate-500 truncate" title={patient.medicalNotes}>
                Note: {patient.medicalNotes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Consultation Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Doctor's Consultation Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Chief Complaint & HPI */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Chief Complaint & Present Illness</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Chief Complaint</label>
              <textarea
                disabled={isCompleted}
                rows="2"
                placeholder="What brings the patient in today?"
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">History of Present Illness (HPI)</label>
              <textarea
                disabled={isCompleted}
                rows="3"
                placeholder="Onset, duration, severity, radiation, aggravating or relieving factors..."
                value={formData.historyOfPresentIllness}
                onChange={(e) => setFormData({ ...formData, historyOfPresentIllness: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Section 2: Clinical Examination & Observations */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Clinical Examination & Physical Findings</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Clinical Examination</label>
              <textarea
                disabled={isCompleted}
                rows="3"
                placeholder="General survey, cardiovascular examination (S1/S2, murmurs), chest sounds, pedal edema..."
                value={formData.clinicalExamination}
                onChange={(e) => setFormData({ ...formData, clinicalExamination: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Section 3: Assessment, Diagnoses & Treatment Plan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Assessment & Diagnoses</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Clinical Assessment</label>
              <textarea
                disabled={isCompleted}
                rows="2"
                placeholder="Doctor's clinical impression and interpretation of the visit..."
                value={formData.assessment}
                onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
              />
            </div>

            {/* Diagnoses List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Active Diagnoses</label>
                {!isCompleted && (
                  <button
                    onClick={() => setDiagnosisModal((prev) => ({ ...prev, isOpen: true }))}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    + Add Diagnosis
                  </button>
                )}
              </div>

              {diagnoses.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 text-center">
                  No diagnoses recorded yet. Click &quot;Add Diagnosis&quot; to specify primary and secondary diagnoses.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {diagnoses.map((diag) => (
                    <div key={diag.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <span>{diag.diagnosisName}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                              diag.isPrimary
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {diag.diagnosisType}
                          </span>
                        </div>
                        {diag.notes && <div className="text-[11px] text-slate-500">{diag.notes}</div>}
                      </div>

                      {!isCompleted && (
                        <button
                          onClick={() => handleDeleteDiagnosis(diag.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove diagnosis"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: 💊 Prescriptions & Medications */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="text-base">💊</span>
                <span>Prescriptions & Medications</span>
                {prescriptions.length > 0 && (
                  <span className="text-xs font-mono font-medium text-slate-500">
                    ({prescriptions.reduce((acc, p) => acc + (p.items?.length || 0), 0)} items)
                  </span>
                )}
              </h3>
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => setMedicineModal((prev) => ({ ...prev, isOpen: true }))}
                  className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Prescribe Medicine</span>
                </button>
              )}
            </div>

            {/* Allergy Safety Alert Banner */}
            {(encounter?.patient?.allergies || encounter?.patient?.hasAllergies) && (
              <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <span>Patient Allergy Warning:</span>
                    <span className="font-semibold text-rose-700">
                      {encounter.patient.allergies || 'Allergies on Record'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Confirm contraindications and sensitivities before issuing or modifying medications.
                  </p>
                </div>
              </div>
            )}

            {/* Prescriptions List */}
            {prescriptions.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 text-center space-y-1">
                <p className="font-medium text-slate-600">No prescriptions recorded for this encounter.</p>
                <p className="text-[11px] text-slate-400">Click &quot;Prescribe Medicine&quot; above to search the formulary and add medications.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {/* Prescription Card Header */}
                    <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{rx.prescriptionNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rx.status === 'FINALIZED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rx.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {rx.status}
                        </span>
                        {rx.prescribedAt && (
                          <span className="text-[11px] text-slate-400">
                            {new Date(rx.prescribedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {rx.status === 'DRAFT' && !isCompleted && rx.items?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleFinalizePrescription(rx.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Finalize & Lock Rx</span>
                        </button>
                      )}
                    </div>

                    {/* Prescription Items */}
                    {(!rx.items || rx.items.length === 0) ? (
                      <div className="p-3 text-xs text-slate-400 text-center">No medicines added to this prescription yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {rx.items.map((item, idx) => (
                          <div key={item.id || idx} className="p-3 text-xs hover:bg-slate-50 flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="font-semibold text-slate-800 flex items-center gap-2">
                                <span>{item.medicineName || item.medicine?.name}</span>
                                {item.medicine?.strength && (
                                  <span className="text-slate-500 font-normal">({item.medicine.strength})</span>
                                )}
                                {item.medicine?.formulation && (
                                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px]">
                                    {item.medicine.formulation}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span><strong className="text-slate-700">Dose:</strong> {item.dosage}</span>
                                <span><strong className="text-slate-700">Route:</strong> {item.route}</span>
                                <span><strong className="text-slate-700">Freq:</strong> {item.frequency}</span>
                                <span><strong className="text-slate-700">Duration:</strong> {item.durationValue} {item.durationUnit?.toLowerCase()}</span>
                                {item.foodInstruction && (
                                  <span className="text-blue-600 font-medium">({item.foodInstruction.replace('_', ' ')})</span>
                                )}
                              </div>
                              {item.instructions && (
                                <p className="text-[11px] text-slate-500 italic">&ldquo;{item.instructions}&rdquo;</p>
                              )}
                            </div>

                            {rx.status === 'DRAFT' && !isCompleted && (
                              <button
                                type="button"
                                onClick={() => handleDeletePrescriptionItem(rx.id, item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                title="Remove medicine"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: 🔬 Diagnostic Investigations */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="text-base">🔬</span>
                <span>Diagnostic & Laboratory Orders</span>
                {investigationOrders.length > 0 && (
                  <span className="text-xs font-mono font-medium text-slate-500">
                    ({investigationOrders.length})
                  </span>
                )}
              </h3>
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => setInvestigationModal((prev) => ({ ...prev, isOpen: true }))}
                  className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Order Investigation</span>
                </button>
              )}
            </div>

            {investigationOrders.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 text-center space-y-1">
                <p className="font-medium text-slate-600">No laboratory or diagnostic orders placed.</p>
                <p className="text-[11px] text-slate-400">Click &quot;Order Investigation&quot; above to select tests from the diagnostic master.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/90 rounded-xl overflow-hidden bg-white">
                {investigationOrders.map((order) => (
                  <div key={order.id} className="p-3 text-xs hover:bg-slate-50 flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">{order.orderNumber}</span>
                        <span className="font-semibold text-slate-900">{order.investigationName || order.investigation?.name}</span>
                        {order.investigation?.code && (
                          <span className="text-[11px] text-slate-500 font-mono">[{order.investigation.code}]</span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            order.priority === 'URGENT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {order.priority}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            order.status === 'ORDERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      {order.clinicalIndication && (
                        <p className="text-[11px] text-slate-600">
                          <strong className="text-slate-700">Indication:</strong> {order.clinicalIndication}
                        </p>
                      )}
                      {order.notes && (
                        <p className="text-[11px] text-slate-500">
                          <strong className="text-slate-700">Notes:</strong> {order.notes}
                        </p>
                      )}
                    </div>

                    {!isCompleted && order.status === 'ORDERED' && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFinalizeInvestigationOrder(order.id)}
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold px-2 py-0.5 rounded hover:bg-emerald-50 transition-colors"
                          title="Finalize and lock order"
                        >
                          Lock
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvestigationOrder(order.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          title="Cancel investigation order"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Treatment Plan & Follow-up Advice */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Treatment Plan & Follow-up Advice</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Treatment Plan & General Advice</label>
              <textarea
                disabled={isCompleted}
                rows="3"
                placeholder="Prescription recommendations, lifestyle changes, dietary advice, activity tolerance..."
                value={formData.treatmentPlan}
                onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Follow-up Date</label>
                <input
                  type="date"
                  disabled={isCompleted}
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Follow-up Instructions</label>
                <input
                  type="text"
                  disabled={isCompleted}
                  placeholder="e.g. Review after 2D Echo report..."
                  value={formData.followUpNotes}
                  onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Section 7: EECP Therapy Clinical Assessment & Suitability */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  EECP Therapy Clinical Assessment &amp; Suitability
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {eecpAssessment && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                    {eecpAssessment.suitabilityAssessment}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setEecpExpanded(!eecpExpanded)}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                >
                  {eecpExpanded ? 'Collapse' : 'Expand Assessment'}
                </button>
              </div>
            </div>

            {eecpExpanded && (
              <form onSubmit={handleSaveEecpAssessment} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Clinical Indication</label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      value={eecpForm.indication}
                      onChange={(e) => setEecpForm({ ...eecpForm, indication: e.target.value })}
                      placeholder="e.g. Refractory Angina / Ischemic Cardiomyopathy"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Suitability Assessment</label>
                    <select
                      disabled={isCompleted}
                      value={eecpForm.suitabilityAssessment}
                      onChange={(e) => setEecpForm({ ...eecpForm, suitabilityAssessment: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50 font-semibold"
                    >
                      <option value="SUITABLE">Suitable for EECP Therapy</option>
                      <option value="REQUIRES_FURTHER_EVALUATION">Requires Further Evaluation</option>
                      <option value="CONTRAINDICATED">Contraindicated (Unsuitable)</option>
                      <option value="UNSUITABLE">Unsuitable</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Cardiac History &amp; Interventions</label>
                    <textarea
                      disabled={isCompleted}
                      rows="2"
                      value={eecpForm.cardiacHistory}
                      onChange={(e) => setEecpForm({ ...eecpForm, cardiacHistory: e.target.value })}
                      placeholder="Prior MI, PTCA/Stents, CABG, ejection fraction %..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Safety Screening &amp; Contraindications</label>
                    <textarea
                      disabled={isCompleted}
                      rows="2"
                      value={eecpForm.contraindicationNotes}
                      onChange={(e) => setEecpForm({ ...eecpForm, contraindicationNotes: e.target.value })}
                      placeholder="Check for severe AR, active DVT, phlebitis, uncorrected arrhythmias..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Functional Status</label>
                    <select
                      disabled={isCompleted}
                      value={eecpForm.functionalStatus}
                      onChange={(e) => setEecpForm({ ...eecpForm, functionalStatus: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50"
                    >
                      <option value="CCS_CLASS_I">CCS Class I (Ordinary activity no angina)</option>
                      <option value="CCS_CLASS_II">CCS Class II (Slight limitation)</option>
                      <option value="CCS_CLASS_III">CCS Class III (Marked limitation)</option>
                      <option value="CCS_CLASS_IV">CCS Class IV (Inability to carry on physical activity)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Recommended Sessions</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      disabled={isCompleted}
                      value={eecpForm.recommendedSessions}
                      onChange={(e) => setEecpForm({ ...eecpForm, recommendedSessions: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Doctor Notes</label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      value={eecpForm.doctorNotes}
                      onChange={(e) => setEecpForm({ ...eecpForm, doctorNotes: e.target.value })}
                      placeholder="Doctor recommendations..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {!isCompleted && isDoctor && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => navigate('/hospital-admin/eecp')}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                    >
                      Open EECP Treatment Center →
                    </button>
                    <button
                      type="submit"
                      disabled={savingEecp}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition disabled:opacity-50"
                    >
                      {savingEecp ? 'Saving...' : 'Save EECP Assessment'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>


        {/* Right Column: Vitals History & Patient Timeline */}
        <div className="space-y-6">
          {/* Vitals History Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Vitals History ({vitals.length})
            </h3>
            {vitals.length === 0 ? (
              <div className="text-xs text-slate-400 p-3 text-center">No vitals on record.</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {vitals.map((v) => (
                  <div key={v.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>BP: {v.systolicBp}/{v.diastolicBp} mmHg</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Pulse: {v.pulseRate || '—'} bpm &bull; SpO₂: {v.spo2 ? `${v.spo2}%` : '—'} &bull; Temp: {v.temperature ? `${v.temperature}°F` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previous Visits / Clinical Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Patient Clinical Timeline
            </h3>
            {patientTimeline.length <= 1 ? (
              <div className="text-xs text-slate-400 p-3 text-center">First recorded consultation at hospital.</div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {patientTimeline
                  .filter((pEnc) => pEnc.id !== encounter.id)
                  .map((pEnc) => (
                    <div key={pEnc.id} className="p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{pEnc.encounterType}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(pEnc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Dr. {pEnc.doctor?.name} ({pEnc.department?.name || 'Clinic'})
                      </div>
                      {pEnc.assessment && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {pEnc.assessment}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ADD DIAGNOSIS MODAL */}
      {/* ============================================================== */}
      {diagnosisModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Diagnosis</h3>
              <button
                onClick={() => setDiagnosisModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddDiagnosis} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Diagnosis Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coronary Artery Disease (CAD), Angina Pectoris..."
                  value={diagnosisModal.diagnosisName}
                  onChange={(e) => setDiagnosisModal({ ...diagnosisModal, diagnosisName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Type</label>
                <select
                  value={diagnosisModal.diagnosisType}
                  onChange={(e) => setDiagnosisModal({ ...diagnosisModal, diagnosisType: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="PRIMARY">Primary Diagnosis</option>
                  <option value="SECONDARY">Secondary Diagnosis</option>
                  <option value="DIFFERENTIAL">Differential Diagnosis</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Diagnosis Code / ICD (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. I25.10"
                  value={diagnosisModal.diagnosisCode}
                  onChange={(e) => setDiagnosisModal({ ...diagnosisModal, diagnosisCode: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Clinical Notes (Optional)</label>
                <textarea
                  rows="2"
                  value={diagnosisModal.notes}
                  onChange={(e) => setDiagnosisModal({ ...diagnosisModal, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDiagnosisModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={diagnosisModal.submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {diagnosisModal.submitting ? 'Adding...' : 'Add Diagnosis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RECORD VITALS MODAL */}
      {/* ============================================================== */}
      {vitalsModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Vitals Reading</h3>
              <button
                onClick={() => setVitalsModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRecordVital} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Systolic BP</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={vitalsModal.data.systolicBp}
                    onChange={(e) => setVitalsModal({ ...vitalsModal, data: { ...vitalsModal.data, systolicBp: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Diastolic BP</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={vitalsModal.data.diastolicBp}
                    onChange={(e) => setVitalsModal({ ...vitalsModal, data: { ...vitalsModal.data, diastolicBp: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Pulse (bpm)</label>
                  <input
                    type="number"
                    placeholder="72"
                    value={vitalsModal.data.pulseRate}
                    onChange={(e) => setVitalsModal({ ...vitalsModal, data: { ...vitalsModal.data, pulseRate: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={vitalsModal.data.spo2}
                    onChange={(e) => setVitalsModal({ ...vitalsModal, data: { ...vitalsModal.data, spo2: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={vitalsModal.data.weightKg}
                    onChange={(e) => setVitalsModal({ ...vitalsModal, data: { ...vitalsModal.data, weightKg: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="170"
                    value={vitalsModal.data.heightCm}
                    onChange={(e) => setVitalsModal({ ...vitalsModal, data: { ...vitalsModal.data, heightCm: e.target.value } })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVitalsModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vitalsModal.submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {vitalsModal.submitting ? 'Saving...' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PRESCRIBE MEDICINE MODAL */}
      {/* ============================================================== */}
      {medicineModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>💊</span>
                <span>Prescribe Medication</span>
              </h3>
              <button
                type="button"
                onClick={() => setMedicineModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddMedicineSubmit} className="space-y-4">
              {/* Medicine Autocomplete Search */}
              <div className="space-y-1 relative">
                <label className="text-xs font-semibold text-slate-700">Search Formulary / Medicine *</label>
                <div className="relative">
                  <input
                    type="text"
                    required={!medicineModal.medicineId}
                    placeholder="Search by brand, generic name, or code..."
                    value={medicineModal.search}
                    onChange={(e) => handleSearchMedicines(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {medicineModal.searching && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 text-xs text-slate-500 text-center">
                    Searching pharmacy formulary...
                  </div>
                )}

                {!medicineModal.searching && medicineModal.searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {medicineModal.searchResults.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => handleSelectMedicine(med)}
                        className="w-full text-left p-2.5 hover:bg-blue-50/50 transition-colors text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            {med.name} {med.strength && <span className="text-slate-500 font-normal">({med.strength})</span>}
                          </div>
                          {med.genericName && (
                            <div className="text-[11px] text-slate-500">{med.genericName}</div>
                          )}
                        </div>
                        {med.formulation && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                            {med.formulation}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Medicine Pill */}
              {medicineModal.selectedMed && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-900">{medicineModal.selectedMed.name}</span>
                    {medicineModal.selectedMed.strength && (
                      <span className="text-blue-700 ml-1">({medicineModal.selectedMed.strength})</span>
                    )}
                    <div className="text-[11px] text-blue-600">{medicineModal.selectedMed.formulation}</div>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Selected</span>
                </div>
              )}

              {/* Dosage & Route */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Dosage *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 tablet, 5 ml, 1 puff"
                    value={medicineModal.dosage}
                    onChange={(e) => setMedicineModal({ ...medicineModal, dosage: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Route *</label>
                  <select
                    value={medicineModal.route}
                    onChange={(e) => setMedicineModal({ ...medicineModal, route: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="ORAL">Oral</option>
                    <option value="INTRAVENOUS">Intravenous (IV)</option>
                    <option value="INTRAMUSCULAR">Intramuscular (IM)</option>
                    <option value="SUBCUTANEOUS">Subcutaneous (SC)</option>
                    <option value="INHALATION">Inhalation</option>
                    <option value="TOPICAL">Topical</option>
                    <option value="OPHTHALMIC">Ophthalmic</option>
                    <option value="SUBLINGUAL">Sublingual</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Frequency & Timing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Frequency *</label>
                  <select
                    value={medicineModal.frequency}
                    onChange={(e) => setMedicineModal({ ...medicineModal, frequency: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Once Daily">Once Daily (OD)</option>
                    <option value="Twice Daily">Twice Daily (BD)</option>
                    <option value="Thrice Daily">Thrice Daily (TDS)</option>
                    <option value="Four Times Daily">Four Times Daily (QID)</option>
                    <option value="Every 4 Hours">Every 4 Hours</option>
                    <option value="Every 6 Hours">Every 6 Hours</option>
                    <option value="Every 8 Hours">Every 8 Hours</option>
                    <option value="As Needed">As Needed (SOS)</option>
                    <option value="Before Bed">Before Bed (HS)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Food Instruction</label>
                  <select
                    value={medicineModal.foodInstruction}
                    onChange={(e) => setMedicineModal({ ...medicineModal, foodInstruction: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="AFTER_FOOD">After Food</option>
                    <option value="BEFORE_FOOD">Before Food</option>
                    <option value="WITH_FOOD">With Food</option>
                    <option value="EMPTY_STOMACH">Empty Stomach</option>
                    <option value="NO_RESTRICTION">No Restriction</option>
                  </select>
                </div>
              </div>

              {/* Duration Value & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Duration *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={medicineModal.durationValue}
                    onChange={(e) => setMedicineModal({ ...medicineModal, durationValue: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Unit *</label>
                  <select
                    value={medicineModal.durationUnit}
                    onChange={(e) => setMedicineModal({ ...medicineModal, durationUnit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="DAYS">Days</option>
                    <option value="WEEKS">Weeks</option>
                    <option value="MONTHS">Months</option>
                  </select>
                </div>
              </div>

              {/* Specific Instructions & Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Specific Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Take in the morning with plenty of water"
                  value={medicineModal.instructions}
                  onChange={(e) => setMedicineModal({ ...medicineModal, instructions: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMedicineModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={medicineModal.submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {medicineModal.submitting ? 'Adding...' : 'Add to Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ORDER INVESTIGATION MODAL */}
      {/* ============================================================== */}
      {investigationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🔬</span>
                <span>Order Diagnostic Investigation</span>
              </h3>
              <button
                type="button"
                onClick={() => setInvestigationModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddInvestigationSubmit} className="space-y-4">
              {/* Investigation Autocomplete Search */}
              <div className="space-y-1 relative">
                <label className="text-xs font-semibold text-slate-700">Search Investigation Master *</label>
                <div className="relative">
                  <input
                    type="text"
                    required={!investigationModal.investigationId}
                    placeholder="Search by test name, code, or department..."
                    value={investigationModal.search}
                    onChange={(e) => handleSearchInvestigations(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {investigationModal.searching && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 text-xs text-slate-500 text-center">
                    Searching diagnostic catalog...
                  </div>
                )}

                {!investigationModal.searching && investigationModal.searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {investigationModal.searchResults.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => handleSelectInvestigation(inv)}
                        className="w-full text-left p-2.5 hover:bg-blue-50/50 transition-colors text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{inv.name}</div>
                          {inv.code && (
                            <div className="text-[11px] text-slate-500 font-mono">Code: {inv.code}</div>
                          )}
                        </div>
                        {inv.category && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                            {inv.category}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Investigation Pill */}
              {investigationModal.selectedInv && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-900">{investigationModal.selectedInv.name}</span>
                    {investigationModal.selectedInv.code && (
                      <span className="text-blue-700 ml-1 font-mono">[{investigationModal.selectedInv.code}]</span>
                    )}
                    <div className="text-[11px] text-blue-600">{investigationModal.selectedInv.category || 'Diagnostic Test'}</div>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Selected</span>
                </div>
              )}

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Order Priority *</label>
                <select
                  value={investigationModal.priority}
                  onChange={(e) => setInvestigationModal({ ...investigationModal, priority: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ROUTINE">Routine (Standard Turnaround)</option>
                  <option value="URGENT">Urgent / STAT (High Priority)</option>
                </select>
              </div>

              {/* Clinical Indication */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Clinical Indication (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chest pain evaluation, routine pre-op, acute shortness of breath..."
                  value={investigationModal.clinicalIndication}
                  onChange={(e) => setInvestigationModal({ ...investigationModal, clinicalIndication: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Clinical Notes / Instructions (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. 12-hour fasting required, report urgently to OPD..."
                  value={investigationModal.notes}
                  onChange={(e) => setInvestigationModal({ ...investigationModal, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInvestigationModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={investigationModal.submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {investigationModal.submitting ? 'Submitting...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmationDialog
        isOpen={confirmCompleteDialog}
        title="Complete Clinical Consultation?"
        message="Are you sure you want to finalize and complete this clinical encounter? This will lock clinical examination notes and mark the visit as completed."
        confirmText="Finalize Consultation"
        confirmVariant="primary"
        onConfirm={handleExecuteComplete}
        onCancel={() => setConfirmCompleteDialog(false)}
      />
    </div>
  );
}
