import React, { useState, useEffect, useCallback, useTransition } from 'react';
import clinicalMasterService from '../../services/clinicalMasterService';
import departmentService from '../../services/departmentService';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import useAuth from '../../hooks/useAuth';

const TABS = [
  { id: 'medicines', label: 'Medicines', icon: '💊', desc: 'Formulary master for prescriptions' },
  { id: 'investigations', label: 'Investigations', icon: '🔬', desc: 'Pathology & cardiac diagnostic tests' },
  { id: 'treatments', label: 'Treatments', icon: '🩺', desc: 'Procedures & therapy catalog' },
  { id: 'eecp', label: 'EECP Packages', icon: '❤️', desc: 'Enhanced External Counterpulsation packages' },
  { id: 'payment_modes', label: 'Payment Modes', icon: '💳', desc: 'Accepted payment methods' },
];

export default function ClinicalMastersPage() {
  const { user } = useAuth();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState('medicines');
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Dynamic Forms State
  const [medicineForm, setMedicineForm] = useState({
    name: '',
    genericName: '',
    category: '',
    strength: '',
    dosageForm: 'Tablet',
    manufacturer: '',
    unit: 'Strip',
    status: 'ACTIVE',
  });

  const [investigationForm, setInvestigationForm] = useState({
    name: '',
    code: '',
    category: 'Cardiology',
    description: '',
    departmentId: '',
    defaultCharge: '',
    status: 'ACTIVE',
  });

  const [treatmentForm, setTreatmentForm] = useState({
    name: '',
    code: '',
    category: 'Cardiology Procedure',
    description: '',
    departmentId: '',
    defaultCharge: '',
    status: 'ACTIVE',
  });

  const [eecpForm, setEecpForm] = useState({
    name: '',
    description: '',
    numberOfSessions: '35',
    validityPeriod: '60 Days',
    packagePrice: '',
    sessionDuration: '60',
    notes: '',
    status: 'ACTIVE',
  });

  const [paymentModeForm, setPaymentModeForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'ACTIVE',
  });

  // Status dialog
  const [statusDialog, setStatusDialog] = useState({
    isOpen: false,
    item: null,
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

  // Load departments
  useEffect(() => {
    departmentService
      .getDepartments({ limit: 100, status: 'ACTIVE' })
      .then((res) => {
        if (res.success) setDepartments(res.data.departments || []);
      })
      .catch(() => {});
  }, []);

  // Fetch Master Data
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const params = { page, limit: 10 };
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;

        let res;
        switch (activeTab) {
          case 'medicines':
            res = await clinicalMasterService.getMedicines(params);
            if (res.success) {
              setItems(res.data.medicines || []);
              setPagination(res.data.pagination);
            }
            break;
          case 'investigations':
            res = await clinicalMasterService.getInvestigations(params);
            if (res.success) {
              setItems(res.data.investigations || []);
              setPagination(res.data.pagination);
            }
            break;
          case 'treatments':
            res = await clinicalMasterService.getTreatments(params);
            if (res.success) {
              setItems(res.data.treatments || []);
              setPagination(res.data.pagination);
            }
            break;
          case 'eecp':
            res = await clinicalMasterService.getEecpPackages(params);
            if (res.success) {
              setItems(res.data.packages || []);
              setPagination(res.data.pagination);
            }
            break;
          case 'payment_modes':
            res = await clinicalMasterService.getPaymentModes(params);
            if (res.success) {
              setItems(res.data.paymentModes || []);
              setPagination(res.data.pagination);
            }
            break;
          default:
            break;
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load master data.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, page, debouncedSearch, statusFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Tab Switch
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setPage(1);
  };

  // Open Modal
  const handleOpenAdd = () => {
    setModalMode('create');
    setSelectedItem(null);
    setFormErrors({});

    if (activeTab === 'medicines') {
      setMedicineForm({
        name: '',
        genericName: '',
        category: 'Cardiology',
        strength: '',
        dosageForm: 'Tablet',
        manufacturer: '',
        unit: 'Strip',
        status: 'ACTIVE',
      });
    } else if (activeTab === 'investigations') {
      setInvestigationForm({
        name: '',
        code: '',
        category: 'Cardiology',
        description: '',
        departmentId: '',
        defaultCharge: '',
        status: 'ACTIVE',
      });
    } else if (activeTab === 'treatments') {
      setTreatmentForm({
        name: '',
        code: '',
        category: 'Cardiology Procedure',
        description: '',
        departmentId: '',
        defaultCharge: '',
        status: 'ACTIVE',
      });
    } else if (activeTab === 'eecp') {
      setEecpForm({
        name: '',
        description: '',
        numberOfSessions: '35',
        validityPeriod: '60 Days',
        packagePrice: '',
        sessionDuration: '60',
        notes: '',
        status: 'ACTIVE',
      });
    } else if (activeTab === 'payment_modes') {
      setPaymentModeForm({
        name: '',
        code: '',
        description: '',
        status: 'ACTIVE',
      });
    }

    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormErrors({});

    if (activeTab === 'medicines') {
      setMedicineForm({
        name: item.name || '',
        genericName: item.genericName || '',
        category: item.category || '',
        strength: item.strength || '',
        dosageForm: item.dosageForm || 'Tablet',
        manufacturer: item.manufacturer || '',
        unit: item.unit || 'Strip',
        status: item.status || 'ACTIVE',
      });
    } else if (activeTab === 'investigations') {
      setInvestigationForm({
        name: item.name || '',
        code: item.code || '',
        category: item.category || 'Cardiology',
        description: item.description || '',
        departmentId: item.departmentId || '',
        defaultCharge: item.defaultCharge !== null ? String(item.defaultCharge) : '',
        status: item.status || 'ACTIVE',
      });
    } else if (activeTab === 'treatments') {
      setTreatmentForm({
        name: item.name || '',
        code: item.code || '',
        category: item.category || 'Cardiology Procedure',
        description: item.description || '',
        departmentId: item.departmentId || '',
        defaultCharge: item.defaultCharge !== null ? String(item.defaultCharge) : '',
        status: item.status || 'ACTIVE',
      });
    } else if (activeTab === 'eecp') {
      setEecpForm({
        name: item.name || '',
        description: item.description || '',
        numberOfSessions: item.numberOfSessions ? String(item.numberOfSessions) : '35',
        validityPeriod: item.validityPeriod || '60 Days',
        packagePrice: item.packagePrice !== null ? String(item.packagePrice) : '',
        sessionDuration: item.sessionDuration ? String(item.sessionDuration) : '60',
        notes: item.notes || '',
        status: item.status || 'ACTIVE',
      });
    } else if (activeTab === 'payment_modes') {
      setPaymentModeForm({
        name: item.name || '',
        code: item.code || '',
        description: item.description || '',
        status: item.status || 'ACTIVE',
      });
    }

    setIsModalOpen(true);
  };

  // Submit Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    try {
      if (activeTab === 'medicines') {
        if (!medicineForm.name.trim()) throw new Error('Medicine name is required');
        if (modalMode === 'create') await clinicalMasterService.createMedicine(medicineForm);
        else await clinicalMasterService.updateMedicine(selectedItem.id, medicineForm);
        showToast(`✓ Medicine "${medicineForm.name}" saved successfully.`);
      } else if (activeTab === 'investigations') {
        if (!investigationForm.name.trim()) throw new Error('Investigation name is required');
        const payload = {
          ...investigationForm,
          departmentId: investigationForm.departmentId || null,
          defaultCharge: investigationForm.defaultCharge !== '' ? parseFloat(investigationForm.defaultCharge) : 0,
        };
        if (modalMode === 'create') await clinicalMasterService.createInvestigation(payload);
        else await clinicalMasterService.updateInvestigation(selectedItem.id, payload);
        showToast(`✓ Investigation "${investigationForm.name}" saved successfully.`);
      } else if (activeTab === 'treatments') {
        if (!treatmentForm.name.trim()) throw new Error('Treatment name is required');
        const payload = {
          ...treatmentForm,
          departmentId: treatmentForm.departmentId || null,
          defaultCharge: treatmentForm.defaultCharge !== '' ? parseFloat(treatmentForm.defaultCharge) : 0,
        };
        if (modalMode === 'create') await clinicalMasterService.createTreatment(payload);
        else await clinicalMasterService.updateTreatment(selectedItem.id, payload);
        showToast(`✓ Treatment "${treatmentForm.name}" saved successfully.`);
      } else if (activeTab === 'eecp') {
        if (!eecpForm.name.trim()) throw new Error('EECP Package name is required');
        const payload = {
          ...eecpForm,
          numberOfSessions: parseInt(eecpForm.numberOfSessions, 10) || 35,
          packagePrice: eecpForm.packagePrice !== '' ? parseFloat(eecpForm.packagePrice) : 0,
          sessionDuration: parseInt(eecpForm.sessionDuration, 10) || 60,
        };
        if (modalMode === 'create') await clinicalMasterService.createEecpPackage(payload);
        else await clinicalMasterService.updateEecpPackage(selectedItem.id, payload);
        showToast(`✓ EECP Package "${eecpForm.name}" saved successfully.`);
      } else if (activeTab === 'payment_modes') {
        if (!paymentModeForm.name.trim()) throw new Error('Payment mode name is required');
        if (modalMode === 'create') await clinicalMasterService.createPaymentMode(paymentModeForm);
        else await clinicalMasterService.updatePaymentMode(selectedItem.id, paymentModeForm);
        showToast(`✓ Payment Mode "${paymentModeForm.name}" saved successfully.`);
      }

      setIsModalOpen(false);
      await fetchData(true);
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors) setFormErrors(respData.errors);
      else setFormErrors({ general: respData?.message || err.message || 'Operation failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Toggle
  const handleConfirmStatusToggle = async () => {
    if (!statusDialog.item) return;
    setStatusDialog((prev) => ({ ...prev, loading: true }));
    try {
      const id = statusDialog.item.id;
      const status = statusDialog.targetStatus;
      if (activeTab === 'medicines') await clinicalMasterService.updateMedicineStatus(id, status);
      else if (activeTab === 'investigations') await clinicalMasterService.updateInvestigationStatus(id, status);
      else if (activeTab === 'treatments') await clinicalMasterService.updateTreatmentStatus(id, status);
      else if (activeTab === 'eecp') await clinicalMasterService.updateEecpPackageStatus(id, status);
      else if (activeTab === 'payment_modes') await clinicalMasterService.updatePaymentModeStatus(id, status);

      showToast(`✓ ${statusDialog.item.name} is now ${status.toLowerCase()}.`);
      setStatusDialog({ isOpen: false, item: null, targetStatus: 'ACTIVE', loading: false });
      await fetchData(true);
    } catch (err) {
      showToast(`✗ Failed to update status: ${err.response?.data?.message || err.message}`);
      setStatusDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const currentTabMeta = TABS.find((t) => t.id === activeTab);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Clinical Masters
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure medicines, diagnostic investigations, treatments, EECP packages, and payment methods.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
            title={refreshing ? 'Refreshing...' : 'Refresh catalog'}
            aria-label="Refresh catalog"
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 transition shadow-2xs disabled:opacity-50 flex items-center justify-center"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add to {currentTabMeta?.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-1.5 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
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
            onClick={() => fetchData(true)}
            className="text-xs font-bold underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${currentTabMeta?.label.toLowerCase()}...`}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
      </div>

      {/* Main Table / Data View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading && !refreshing ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading {currentTabMeta?.label}...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
              {currentTabMeta?.icon}
            </div>
            <h3 className="text-sm font-bold text-slate-800">No {currentTabMeta?.label} records configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Configure master records to be referenced during appointments, investigations, prescriptions, and billing.
            </p>
            {isHospitalAdmin && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                Add First Record
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Name</th>
                    {activeTab === 'medicines' && (
                      <>
                        <th className="py-3.5 px-4">Generic Name</th>
                        <th className="py-3.5 px-4">Dosage / Strength</th>
                        <th className="py-3.5 px-4">Category</th>
                      </>
                    )}
                    {activeTab === 'investigations' && (
                      <>
                        <th className="py-3.5 px-4">Code</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Default Charge</th>
                      </>
                    )}
                    {activeTab === 'treatments' && (
                      <>
                        <th className="py-3.5 px-4">Code</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Default Charge</th>
                      </>
                    )}
                    {activeTab === 'eecp' && (
                      <>
                        <th className="py-3.5 px-4">Sessions</th>
                        <th className="py-3.5 px-4">Duration</th>
                        <th className="py-3.5 px-4">Validity</th>
                        <th className="py-3.5 px-4">Package Price</th>
                      </>
                    )}
                    {activeTab === 'payment_modes' && (
                      <>
                        <th className="py-3.5 px-4">Code</th>
                        <th className="py-3.5 px-4">Description</th>
                      </>
                    )}
                    <th className="py-3.5 px-4">Status</th>
                    {isHospitalAdmin && <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                        {item.name}
                        {item.description && (
                          <span className="text-[11px] text-slate-400 block font-normal max-w-xs truncate">
                            {item.description}
                          </span>
                        )}
                      </td>

                      {/* Medicines Columns */}
                      {activeTab === 'medicines' && (
                        <>
                          <td className="py-3.5 px-4 text-slate-600">{item.genericName || '—'}</td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="font-medium text-slate-800">{item.dosageForm}</span>
                            {item.strength && <span className="text-slate-400 block text-[11px]">{item.strength}</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                              {item.category || 'General'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Investigations Columns */}
                      {activeTab === 'investigations' && (
                        <>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{item.code || '—'}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                              {item.category || 'Pathology'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{item.department?.name || '—'}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">₹ {item.defaultCharge || '0.00'}</td>
                        </>
                      )}

                      {/* Treatments Columns */}
                      {activeTab === 'treatments' && (
                        <>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{item.code || '—'}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium">
                              {item.category || 'Clinical'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{item.department?.name || '—'}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">₹ {item.defaultCharge || '0.00'}</td>
                        </>
                      )}

                      {/* EECP Columns */}
                      {activeTab === 'eecp' && (
                        <>
                          <td className="py-3.5 px-4 font-bold text-blue-700">{item.numberOfSessions} Sessions</td>
                          <td className="py-3.5 px-4 text-slate-600">{item.sessionDuration} mins / session</td>
                          <td className="py-3.5 px-4 text-slate-600">{item.validityPeriod || '60 Days'}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">₹ {item.packagePrice}</td>
                        </>
                      )}

                      {/* Payment Modes Columns */}
                      {activeTab === 'payment_modes' && (
                        <>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{item.code || '—'}</td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{item.description || '—'}</td>
                        </>
                      )}

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      {isHospitalAdmin && (
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setStatusDialog({
                                  isOpen: true,
                                  item,
                                  targetStatus: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                  loading: false,
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition shadow-2xs ${
                                item.status === 'ACTIVE'
                                  ? 'text-red-700 bg-red-50/50 border-red-200 hover:bg-red-50'
                                  : 'text-emerald-700 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                              }`}
                            >
                              {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing Page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
                  <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total} records)
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

      {/* Dynamic Modal for Create / Edit */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === 'create' ? `Add ${currentTabMeta?.label}` : `Edit ${currentTabMeta?.label}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{currentTabMeta?.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
              {/* Form 1: Medicines */}
              {activeTab === 'medicines' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Medicine Brand Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={medicineForm.name}
                      onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                      placeholder="e.g., Atorvastatin, Telmisartan, Sorbitrate"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Generic Name</label>
                      <input
                        type="text"
                        value={medicineForm.genericName}
                        onChange={(e) => setMedicineForm({ ...medicineForm, genericName: e.target.value })}
                        placeholder="e.g., Atorvastatin Calcium"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Strength</label>
                      <input
                        type="text"
                        value={medicineForm.strength}
                        onChange={(e) => setMedicineForm({ ...medicineForm, strength: e.target.value })}
                        placeholder="e.g., 20 mg, 500 mg, 5 ml"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage Form</label>
                      <select
                        value={medicineForm.dosageForm}
                        onChange={(e) => setMedicineForm({ ...medicineForm, dosageForm: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Injection">Injection</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Ointment">Ointment</option>
                        <option value="Inhaler">Inhaler</option>
                        <option value="Drops">Drops</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                      <input
                        type="text"
                        value={medicineForm.category}
                        onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                        placeholder="e.g., Statin, Antihypertensive"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer</label>
                      <input
                        type="text"
                        value={medicineForm.manufacturer}
                        onChange={(e) => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })}
                        placeholder="e.g., Sun Pharma, Cipla"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={medicineForm.unit}
                        onChange={(e) => setMedicineForm({ ...medicineForm, unit: e.target.value })}
                        placeholder="Strip, Bottle, Box"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Form 2: Investigations */}
              {activeTab === 'investigations' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Investigation Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={investigationForm.name}
                      onChange={(e) => setInvestigationForm({ ...investigationForm, name: e.target.value })}
                      placeholder="e.g., ECG, 2D Echo, TMT, Holter 24h, Lipid Profile"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Test Code</label>
                      <input
                        type="text"
                        value={investigationForm.code}
                        onChange={(e) => setInvestigationForm({ ...investigationForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., ECG-01, ECHO-2D"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                      <input
                        type="text"
                        value={investigationForm.category}
                        onChange={(e) => setInvestigationForm({ ...investigationForm, category: e.target.value })}
                        placeholder="Cardiology, Pathology, Radiology"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                      <select
                        value={investigationForm.departmentId}
                        onChange={(e) => setInvestigationForm({ ...investigationForm, departmentId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">None / General</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Default Charge (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={investigationForm.defaultCharge}
                        onChange={(e) => setInvestigationForm({ ...investigationForm, defaultCharge: e.target.value })}
                        placeholder="e.g., 600"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Description / Preparation</label>
                    <textarea
                      rows="2"
                      value={investigationForm.description}
                      onChange={(e) => setInvestigationForm({ ...investigationForm, description: e.target.value })}
                      placeholder="e.g., 12-lead ECG, fasting required..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs resize-none"
                    />
                  </div>
                </>
              )}

              {/* Form 3: Treatments */}
              {activeTab === 'treatments' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Treatment / Procedure Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={treatmentForm.name}
                      onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                      placeholder="e.g., Cardiac Rehabilitation, IV Fluid Infusion, Wound Dressing"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Code</label>
                      <input
                        type="text"
                        value={treatmentForm.code}
                        onChange={(e) => setTreatmentForm({ ...treatmentForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., PROC-CR01"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                      <input
                        type="text"
                        value={treatmentForm.category}
                        onChange={(e) => setTreatmentForm({ ...treatmentForm, category: e.target.value })}
                        placeholder="Cardiac Therapy, Minor OT"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                      <select
                        value={treatmentForm.departmentId}
                        onChange={(e) => setTreatmentForm({ ...treatmentForm, departmentId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">None / General</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Default Charge (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={treatmentForm.defaultCharge}
                        onChange={(e) => setTreatmentForm({ ...treatmentForm, defaultCharge: e.target.value })}
                        placeholder="e.g., 1200"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Notes</label>
                    <textarea
                      rows="2"
                      value={treatmentForm.description}
                      onChange={(e) => setTreatmentForm({ ...treatmentForm, description: e.target.value })}
                      placeholder="Protocol, consumables required, or duration..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs resize-none"
                    />
                  </div>
                </>
              )}

              {/* Form 4: EECP Packages */}
              {activeTab === 'eecp' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      EECP Package Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eecpForm.name}
                      onChange={(e) => setEecpForm({ ...eecpForm, name: e.target.value })}
                      placeholder="e.g., EECP Standard 35-Hour Course, EECP Maintenance"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Total Sessions</label>
                      <input
                        type="number"
                        min="1"
                        value={eecpForm.numberOfSessions}
                        onChange={(e) => setEecpForm({ ...eecpForm, numberOfSessions: e.target.value })}
                        placeholder="35"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Session Duration (Mins)</label>
                      <input
                        type="number"
                        min="15"
                        value={eecpForm.sessionDuration}
                        onChange={(e) => setEecpForm({ ...eecpForm, sessionDuration: e.target.value })}
                        placeholder="60"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Package Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={eecpForm.packagePrice}
                        onChange={(e) => setEecpForm({ ...eecpForm, packagePrice: e.target.value })}
                        placeholder="e.g., 70000"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Validity Period</label>
                      <input
                        type="text"
                        value={eecpForm.validityPeriod}
                        onChange={(e) => setEecpForm({ ...eecpForm, validityPeriod: e.target.value })}
                        placeholder="e.g., 60 Days, 3 Months"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Notes & Inclusion</label>
                    <textarea
                      rows="2"
                      value={eecpForm.notes}
                      onChange={(e) => setEecpForm({ ...eecpForm, notes: e.target.value })}
                      placeholder="Includes doctor follow-ups, post-EECP Echo review, ECG monitoring..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs resize-none"
                    />
                  </div>
                </>
              )}

              {/* Form 5: Payment Modes */}
              {activeTab === 'payment_modes' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Mode Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={paymentModeForm.name}
                      onChange={(e) => setPaymentModeForm({ ...paymentModeForm, name: e.target.value })}
                      placeholder="e.g., UPI / QR Code, Cash, Credit Card, Bank Transfer (NEFT)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Code / Short Identifier</label>
                    <input
                      type="text"
                      value={paymentModeForm.code}
                      onChange={(e) => setPaymentModeForm({ ...paymentModeForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., UPI, CASH, CARD, NEFT"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows="2"
                      value={paymentModeForm.description}
                      onChange={(e) => setPaymentModeForm({ ...paymentModeForm, description: e.target.value })}
                      placeholder="Gateway account details or counter instructions..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs resize-none"
                    />
                  </div>
                </>
              )}

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={
                    activeTab === 'medicines'
                      ? medicineForm.status
                      : activeTab === 'investigations'
                      ? investigationForm.status
                      : activeTab === 'treatments'
                      ? treatmentForm.status
                      : activeTab === 'eecp'
                      ? eecpForm.status
                      : paymentModeForm.status
                  }
                  onChange={(e) => {
                    const st = e.target.value;
                    if (activeTab === 'medicines') setMedicineForm({ ...medicineForm, status: st });
                    else if (activeTab === 'investigations') setInvestigationForm({ ...investigationForm, status: st });
                    else if (activeTab === 'treatments') setTreatmentForm({ ...treatmentForm, status: st });
                    else if (activeTab === 'eecp') setEecpForm({ ...eecpForm, status: st });
                    else if (activeTab === 'payment_modes') setPaymentModeForm({ ...paymentModeForm, status: st });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ACTIVE">Active (Available for orders & billing)</option>
                  <option value="INACTIVE">Inactive (Archived)</option>
                </select>
              </div>

              {/* Modal Buttons */}
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Record' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Status Change */}
      <ConfirmationDialog
        isOpen={statusDialog.isOpen}
        title={statusDialog.targetStatus === 'INACTIVE' ? 'Deactivate Master Record' : 'Activate Master Record'}
        message={
          statusDialog.targetStatus === 'INACTIVE'
            ? `Are you sure you want to deactivate "${statusDialog.item?.name}"? Historical orders and bills will remain preserved.`
            : `Are you sure you want to activate "${statusDialog.item?.name}"?`
        }
        detailNote="Inactive records will not appear in prescription and order selection menus."
        confirmText={statusDialog.targetStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={statusDialog.targetStatus === 'INACTIVE' ? 'danger' : 'emerald'}
        loading={statusDialog.loading}
        onConfirm={handleConfirmStatusToggle}
        onClose={() =>
          !statusDialog.loading &&
          setStatusDialog({ isOpen: false, item: null, targetStatus: 'ACTIVE', loading: false })
        }
      />
    </div>
  );
}
