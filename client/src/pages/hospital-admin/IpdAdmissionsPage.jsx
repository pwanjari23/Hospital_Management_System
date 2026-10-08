import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ipdService from '../../services/ipdService';
import patientService from '../../services/patientService';
import staffService from '../../services/staffService';
import departmentService from '../../services/departmentService';

const ADMISSION_TYPES = ['PLANNED', 'EMERGENCY', 'TRANSFER', 'OBSERVATION', 'OTHER'];
const ADMISSION_STATUSES = ['ADMITTED', 'TRANSFER_PENDING', 'DISCHARGE_PENDING', 'DISCHARGED', 'CANCELLED'];

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default function IpdAdmissionsPage() {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [filterType, setFilterType] = useState('');

  // Dropdown reference data
  const [wards, setWards] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Admit Modal State
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  const [availableBeds, setAvailableBeds] = useState([]);
  const [loadingBeds, setLoadingBeds] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    admittingDoctorId: '',
    departmentId: '',
    wardId: '',
    bedId: '',
    admissionType: 'PLANNED',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    reasonForAdmission: '',
    provisionalDiagnosis: '',
    referredBy: '',
    emergencyCase: false,
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedAdmissionForTransfer, setSelectedAdmissionForTransfer] = useState(null);
  const [transferForm, setTransferForm] = useState({
    toWardId: '',
    toBedId: '',
    transferReason: '',
    notes: '',
  });
  const [transferBeds, setTransferBeds] = useState([]);
  const [loadingTransferBeds, setLoadingTransferBeds] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState(null);

  const fetchAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterWard) params.wardId = filterWard;
      if (filterType) params.admissionType = filterType;

      const res = await ipdService.getAdmissions(params);
      setAdmissions(res.data.admissions || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load admissions');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterWard, filterType]);

  const fetchReferences = useCallback(async () => {
    try {
      const [wRes, sRes, dRes] = await Promise.all([
        ipdService.getWards({ isActive: true }),
        staffService.getStaff({ role: 'DOCTOR' }),
        departmentService.getDepartments(),
      ]);
      setWards(wRes.data || []);
      setDoctors(sRes.data || []);
      setDepartments(dRes.data || []);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  // Patient Search Debounce
  useEffect(() => {
    if (!patientSearchTerm || patientSearchTerm.trim().length < 2) {
      setPatientSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const res = await patientService.getPatients({ search: patientSearchTerm });
        setPatientSearchResults(res.data?.patients || res.data || []);
      } catch {
        setPatientSearchResults([]);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearchTerm]);

  // Load available beds when ward is selected in Admit Modal
  useEffect(() => {
    if (!formData.wardId) {
      setAvailableBeds([]);
      return;
    }
    const loadBeds = async () => {
      setLoadingBeds(true);
      try {
        const res = await ipdService.getBeds({
          wardId: formData.wardId,
          status: 'AVAILABLE',
          isActive: true,
        });
        setAvailableBeds(res.data || []);
      } catch {
        setAvailableBeds([]);
      } finally {
        setLoadingBeds(false);
      }
    };
    loadBeds();
  }, [formData.wardId]);

  // Load available beds when ward is selected in Transfer Modal
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

  const openAdmitModal = () => {
    setSelectedPatient(null);
    setPatientSearchTerm('');
    setPatientSearchResults([]);
    setFormData({
      patientId: '',
      admittingDoctorId: doctors[0]?.id || '',
      departmentId: '',
      wardId: wards[0]?.id || '',
      bedId: '',
      admissionType: 'PLANNED',
      admissionDate: new Date().toISOString().split('T')[0],
      admissionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
      reasonForAdmission: '',
      provisionalDiagnosis: '',
      referredBy: '',
      emergencyCase: false,
      notes: '',
    });
    setModalError(null);
    setAdmitModalOpen(true);
  };

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setFormData((prev) => ({ ...prev, patientId: p.id }));
    setPatientSearchResults([]);
    setPatientSearchTerm('');
  };

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientId) {
      setModalError('Please search and select a patient');
      return;
    }
    if (!formData.bedId) {
      setModalError('Please select an available bed');
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      const res = await ipdService.createAdmission(formData);
      setAdmitModalOpen(false);
      navigate(`/hospital-admin/ipd/admissions/${res.data.id}`);
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Failed to admit patient');
    } finally {
      setSubmitting(false);
    }
  };

  const openTransferModal = (adm) => {
    setSelectedAdmissionForTransfer(adm);
    setTransferForm({
      toWardId: wards[0]?.id || '',
      toBedId: '',
      transferReason: '',
      notes: '',
    });
    setTransferError(null);
    setTransferModalOpen(true);
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
      await ipdService.transferBed(selectedAdmissionForTransfer.id, transferForm);
      setTransferModalOpen(false);
      fetchAdmissions();
    } catch (err) {
      setTransferError(err?.response?.data?.message || 'Failed to transfer bed');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/hospital-admin/ipd')}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            ← Back to IPD
          </button>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">Inpatient Admissions</h1>
          <p className="text-sm text-slate-500 mt-1">Track active hospital stays, admissions, and inter-bed movements</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAdmitModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Admit Patient
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAdmissions} className="underline font-medium hover:text-rose-800">
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <input
            type="text"
            placeholder="Search admission #, patient, UHID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            {ADMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterWard}
            onChange={(e) => {
              setFilterWard(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.wardName} ({w.wardCode})
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">All Types</option>
            {ADMISSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admissions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admissions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No admissions found matching the filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Admission #</th>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Doctor</th>
                    <th className="px-5 py-3.5">Ward & Bed</th>
                    <th className="px-5 py-3.5">Admission Date</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-800">
                        <button
                          onClick={() => navigate(`/hospital-admin/ipd/admissions/${adm.id}`)}
                          className="hover:text-teal-600 underline text-left"
                        >
                          {adm.admissionNumber}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">
                          {adm.patient?.firstName} {adm.patient?.lastName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          UHID: {adm.patient?.uhid}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{adm.admittingDoctor?.name || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">
                          Bed {adm.bed?.bedNumber || '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {adm.ward?.wardName} ({adm.ward?.wardCode})
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {adm.admissionDate} <span className="text-xs text-slate-400">{adm.admissionTime}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {adm.admissionType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <AdmissionStatusBadge status={adm.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/hospital-admin/ipd/admissions/${adm.id}`)}
                          className="text-xs font-medium text-teal-600 hover:text-teal-700"
                        >
                          View
                        </button>
                        {adm.status === 'ADMITTED' && (
                          <button
                            onClick={() => openTransferModal(adm)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Transfer Bed
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/hospital-admin/patients/${adm.patientId}`)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          Patient
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {admissions.length} of {total} admissions
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2.5 py-1 font-medium text-slate-700">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Admit Patient Modal */}
      {admitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">New Inpatient Admission</h3>
              <button
                onClick={() => setAdmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAdmitSubmit} className="space-y-4 text-sm">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Patient <span className="text-rose-500">*</span>
                </label>
                {selectedPatient ? (
                  <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        UHID: <span className="font-mono">{selectedPatient.uhid}</span> • Phone: {selectedPatient.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                    >
                      Change Patient
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type patient name, UHID, or phone number to search..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    {searchingPatients && (
                      <div className="absolute right-3 top-2.5 text-xs text-slate-400">Searching...</div>
                    )}
                    {patientSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {patientSearchResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPatient(p)}
                            className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs"
                          >
                            <div className="font-semibold text-slate-800">
                              {p.firstName} {p.lastName}
                            </div>
                            <div className="text-slate-400 font-mono">
                              UHID: {p.uhid} • Phone: {p.phone}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Admitting Doctor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.admittingDoctorId}
                    onChange={(e) => setFormData({ ...formData, admittingDoctorId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ward & Bed Allocation */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Ward <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.wardId}
                    onChange={(e) =>
                      setFormData({ ...formData, wardId: e.target.value, bedId: '' })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
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
                    Available Bed <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={loadingBeds || !formData.wardId}
                    value={formData.bedId}
                    onChange={(e) => setFormData({ ...formData, bedId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white disabled:opacity-50"
                  >
                    <option value="">
                      {loadingBeds ? 'Loading beds...' : 'Select Available Bed'}
                    </option>
                    {availableBeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        Bed {b.bedNumber} ({b.bedType})
                      </option>
                    ))}
                  </select>
                  {formData.wardId && availableBeds.length === 0 && !loadingBeds && (
                    <p className="text-[11px] text-rose-500 mt-1">No available beds in this ward.</p>
                  )}
                </div>
              </div>

              {/* Admission Type, Date, Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Admission Type</label>
                  <select
                    value={formData.admissionType}
                    onChange={(e) => setFormData({ ...formData, admissionType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {ADMISSION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.admissionTime}
                    onChange={(e) => setFormData({ ...formData, admissionTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Clinical Reason & Diagnosis */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reason for Admission <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Severe Dehydration, Post-op monitoring"
                    value={formData.reasonForAdmission}
                    onChange={(e) => setFormData({ ...formData, reasonForAdmission: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Provisional Diagnosis
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acute Gastroenteritis"
                    value={formData.provisionalDiagnosis}
                    onChange={(e) => setFormData({ ...formData, provisionalDiagnosis: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emergencyCase"
                  checked={formData.emergencyCase}
                  onChange={(e) => setFormData({ ...formData, emergencyCase: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="emergencyCase" className="text-xs text-slate-700 font-medium">
                  Mark as Emergency Case
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdmitModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Admitting...' : 'Confirm Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Bed Modal */}
      {transferModalOpen && selectedAdmissionForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Transfer Patient Bed</h3>
                <p className="text-xs text-slate-500">
                  {selectedAdmissionForTransfer.patient?.firstName}{' '}
                  {selectedAdmissionForTransfer.patient?.lastName} • Current Bed:{' '}
                  <span className="font-bold text-slate-700">
                    {selectedAdmissionForTransfer.bed?.bedNumber}
                  </span>
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
                  placeholder="e.g. ICU step-down, Isolation required"
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
    </div>
  );
}
