import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import patientService from '../../services/patientService';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import useAuth from '../../hooks/useAuth';
import { calculateAge } from '../../utils/age';
import pharmacyService from '../../services/pharmacyService';
import billingService from '../../services/billingService';
import ipdService from '../../services/ipdService';

const BLOOD_GROUP_MAP = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
  UNKNOWN: 'Unknown / Not Tested',
};

export default function PatientDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Status toggle confirmation modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const [medicationHistory, setMedicationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const canViewPharmacyHistory = ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'].includes(user?.role);

  const [financialHistory, setFinancialHistory] = useState(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const canViewBilling = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(user?.role);

  const [ipdHistory, setIpdHistory] = useState([]);
  const [loadingIpd, setLoadingIpd] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  const fetchPatient = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await patientService.getPatient(id);
      if (res.success && res.data) {
        setPatient(res.data);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Patient not found or you do not have permission to view this record.');
      } else {
        setError(err.response?.data?.message || 'Failed to load patient profile.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  useEffect(() => {
    if (canViewPharmacyHistory && id) {
      const fetchHistory = async () => {
        try {
          setLoadingHistory(true);
          const res = await pharmacyService.getPatientMedicationHistory(id);
          if (res.data) {
            setMedicationHistory(res.data);
          }
        } catch (err) {
          console.error('Failed to load medication history:', err);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [canViewPharmacyHistory, id]);

  useEffect(() => {
    if (canViewBilling && id) {
      const fetchFinance = async () => {
        try {
          setLoadingFinance(true);
          const res = await billingService.getPatientFinancialHistory(id);
          if (res.data) {
            setFinancialHistory(res.data);
          }
        } catch (err) {
          console.error('Failed to load patient financial history:', err);
        } finally {
          setLoadingFinance(false);
        }
      };
      fetchFinance();
    }
  }, [canViewBilling, id]);

  useEffect(() => {
    if (id) {
      const fetchIpd = async () => {
        try {
          setLoadingIpd(true);
          const res = await ipdService.getPatientAdmissions(id);
          if (res.data) {
            setIpdHistory(res.data);
          }
        } catch (err) {
          console.error('Failed to load patient IPD history:', err);
        } finally {
          setLoadingIpd(false);
        }
      };
      fetchIpd();
    }
  }, [id]);

  const canEdit = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(user?.role);
  const canChangeStatus = user?.role === 'HOSPITAL_ADMIN';

  const handleToggleStatus = async () => {
    if (!patient) return;
    setStatusLoading(true);
    try {
      const newStatus = !patient.isActive;
      await patientService.updatePatientStatus(patient.id, newStatus);
      setStatusModalOpen(false);
      setPatient((prev) => ({ ...prev, isActive: newStatus }));
      showToast(`✓ Patient successfully ${newStatus ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update patient status.');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-soft animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-9 bg-slate-100 rounded w-28" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-slate-50 rounded-xl" />
            <div className="h-40 bg-slate-50 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-soft">
        <div className="w-12 h-12 mx-auto mb-3 bg-red-50 text-red-600 rounded-full flex items-center justify-center font-bold text-xl">
          !
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Patient Record Unavailable</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
          {error || 'Patient could not be located in this hospital tenant.'}
        </p>
        <Link
          to="/hospital-admin/patients"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
        >
          &larr; Return to Patient Directory
        </Link>
      </div>
    );
  }

  const fullName = `${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`.trim();
  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-elevated border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
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

      {/* Top Hero Card & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl shadow-xs shrink-0">
            {patient.firstName.charAt(0).toUpperCase()}
            {patient.lastName.charAt(0).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/hospital-admin/patients" className="hover:text-blue-600 transition">
                Patients
              </Link>
              <span>/</span>
              <span className="font-mono text-blue-700 font-bold">{patient.uhid}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {fullName}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  patient.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    patient.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {patient.isActive ? 'Active Patient' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <Link
            to="/hospital-admin/patients"
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition shadow-2xs"
          >
            &larr; Patient List
          </Link>

          {canEdit && (
            <Link
              to={`/hospital-admin/patients/${patient.id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>Edit Details</span>
            </Link>
          )}

          {canChangeStatus && (
            <button
              type="button"
              onClick={() => setStatusModalOpen(true)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition shadow-2xs ${
                patient.isActive
                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {patient.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Demographics & Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 sm:p-7 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span>Demographics & Identity</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Hospital UHID</span>
              <span className="font-mono text-sm font-bold text-blue-700 mt-0.5 block">{patient.uhid}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Blood Group</span>
              <span className="font-semibold text-slate-900 mt-0.5 inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                {BLOOD_GROUP_MAP[patient.bloodGroup] || patient.bloodGroup || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Gender</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {patient.gender ? patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase() : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Date of Birth & Age</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '—'}{' '}
                {age !== null && <span className="text-slate-500 font-normal">({age} years)</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Contact Information */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 sm:p-7 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span>Contact & Address</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Primary Phone</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{patient.phone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Email Address</span>
              <span className="font-semibold text-slate-900 truncate block mt-0.5">{patient.email || '—'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Address</span>
              <span className="font-medium text-slate-800 mt-0.5 block">
                {[patient.address, patient.city, patient.state, patient.postalCode, patient.country]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Emergency Contact */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 sm:p-7 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span>Emergency Contact</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Contact Person</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{patient.emergencyContactName || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Phone</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{patient.emergencyContactPhone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Relationship</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{patient.emergencyContactRelation || '—'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Clinical Alerts & Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 sm:p-7 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span>Intake Alerts & Medical Notes</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold mb-1">
                Known Allergies
              </span>
              {patient.allergies ? (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 font-medium leading-relaxed">
                  {patient.allergies}
                </div>
              ) : (
                <span className="text-slate-400 italic">No allergies recorded</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold mb-1">
                General Medical Notes
              </span>
              {patient.medicalNotes ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium leading-relaxed">
                  {patient.medicalNotes}
                </div>
              ) : (
                <span className="text-slate-400 italic">No medical notes recorded</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 5: Medication & Pharmacy Dispensing History */}
      {canViewPharmacyHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 sm:p-7 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span>Medication & Pharmacy Dispensing History</span>
            </div>
            <Link
              to="/hospital-admin/pharmacy"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
            >
              Go to Pharmacy Queue →
            </Link>
          </div>

          {loadingHistory ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading medication history...</div>
          ) : medicationHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">No prescriptions recorded for this patient.</div>
          ) : (
            <div className="space-y-3">
              {medicationHistory.map((rx) => (
                <div key={rx.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{rx.prescriptionNumber}</span>
                      <span className="text-slate-400 ml-2">
                        {new Date(rx.prescribedAt).toLocaleDateString()} • Dr. {rx.doctor?.name || 'Assigned Doctor'}
                      </span>
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                        {rx.status}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
                    {rx.items?.map((item) => {
                      const totalDispensed = (item.dispensingItems || []).reduce(
                        (sum, di) => sum + (Number(di.dispensedQuantity) || 0),
                        0
                      );
                      return (
                        <div key={item.id} className="p-2 bg-white rounded-lg border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">{item.medicineName}</span>
                            <div className="text-[10px] text-slate-400">
                              {item.dosage} • {item.frequency}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Dispensed / Prescribed</span>
                            <span className="font-bold text-slate-700 text-xs">
                              {totalDispensed} / {item.quantity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patient Financial History */}
      {canViewBilling && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Financial History</h3>
              <p className="text-xs text-slate-500">Invoices, payments, receipts, and balance summary</p>
            </div>
            {financialHistory?.summary && (
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-slate-600">
                  Total Billed: ₹{Number(financialHistory.summary.totalBilled || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-emerald-600">
                  Total Paid: ₹{Number(financialHistory.summary.totalPaid || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-amber-600">
                  Outstanding: ₹{Number(financialHistory.summary.totalOutstanding || 0).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          {loadingFinance ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading financial records...</p>
          ) : !financialHistory || financialHistory.invoices?.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No invoices recorded for this patient.</p>
          ) : (
            <div className="space-y-4">
              {/* Invoices List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3">Invoice #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-3 text-right">Paid</th>
                      <th className="py-2 px-3 text-right">Due</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {financialHistory.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900 font-mono">
                          ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600 font-mono">
                          ₹{Number(inv.paidAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-600 font-mono">
                          ₹{Number(inv.dueAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {inv.status} • {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link
                            to={`/hospital-admin/billing/invoices/${inv.id}`}
                            className="text-indigo-600 font-semibold hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IPD Inpatient Admissions History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">Inpatient (IPD) History</h3>
            <p className="text-xs text-slate-500">Chronological inpatient admissions and ward stays</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {ipdHistory.length} Admission(s)
          </span>
        </div>

        {loadingIpd ? (
          <div className="text-center py-6 text-slate-400 text-xs">Loading inpatient history...</div>
        ) : ipdHistory.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No inpatient admissions recorded for this patient.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Admission #</th>
                  <th className="py-2.5 px-3">Admission Date</th>
                  <th className="py-2.5 px-3">Doctor</th>
                  <th className="py-2.5 px-3">Ward & Bed</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ipdHistory.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                      {adm.admissionNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {adm.admissionDate} <span className="text-[10px] text-slate-400">{adm.admissionTime}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {adm.admittingDoctor?.name || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800">{adm.ward?.wardName}</span>
                      <span className="text-slate-400 font-mono ml-1">({adm.bed?.bedNumber})</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {adm.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Link
                        to={`/hospital-admin/ipd/admissions/${adm.id}`}
                        className="text-teal-600 font-semibold hover:underline"
                      >
                        View Admission
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-4 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          Admitted / Registered on:{' '}
          <span className="font-semibold text-slate-700">
            {new Date(patient.createdAt).toLocaleString()}
          </span>
        </div>
        <div>
          Last updated:{' '}
          <span className="font-semibold text-slate-700">
            {new Date(patient.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Status Confirmation Modal */}
      <ConfirmationDialog
        isOpen={statusModalOpen}
        title={patient.isActive ? 'Deactivate Patient?' : 'Activate Patient?'}
        message={
          patient.isActive
            ? 'This patient will remain in the system, but will be marked inactive.'
            : `Re-activate ${fullName} for upcoming hospital consultations and admissions.`
        }
        detailNote={
          patient.isActive
            ? 'All historic medical records, UHID, and demographics are preserved.'
            : undefined
        }
        confirmText={patient.isActive ? 'Deactivate Patient' : 'Activate Patient'}
        confirmVariant={patient.isActive ? 'danger' : 'emerald'}
        loading={statusLoading}
        onConfirm={handleToggleStatus}
        onClose={() => !statusLoading && setStatusModalOpen(false)}
      />
    </div>
  );
}
