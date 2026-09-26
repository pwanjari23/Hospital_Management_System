import React, { useState, useEffect, useCallback } from 'react';
import HospitalStatusBadge from './HospitalStatusBadge';
import hospitalService from '../../services/hospitalService';

const AVAILABLE_MODULES = [
  { key: 'module_pharmacy', name: 'Pharmacy & Inventory', desc: 'Prescription dispensing, drug stock, batch tracking' },
  { key: 'module_inpatient', name: 'Inpatient (IPD) & Beds', desc: 'Ward allocation, admission, vitals chart, discharge' },
  { key: 'module_outpatient', name: 'Outpatient (OPD) & Clinics', desc: 'Patient check-in, queue scheduling, triage' },
  { key: 'module_laboratory', name: 'Laboratory & Pathology', desc: 'Lab test ordering, specimen intake, diagnostic reports' },
  { key: 'module_billing', name: 'Billing & Cashier', desc: 'Invoicing, claim estimation, payment receipts' },
];

const STAFF_ROLES = [
  { value: 'HOSPITAL_ADMIN', label: 'Hospital Administrator' },
  { value: 'DOCTOR', label: 'Doctor / Physician' },
  { value: 'NURSE', label: 'Nurse / Nursing Supervisor' },
  { value: 'RECEPTIONIST', label: 'Frontdesk Receptionist' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_STAFF', label: 'Lab Technician' },
];

/**
 * Enhanced Slide-over Drawer for displaying hospital overview, staff roster, and tenant module settings
 */
export default function HospitalDetailsDrawer({
  isOpen,
  hospital,
  onClose,
  onEdit,
  onToggleStatus,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  // Users tab state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'HOSPITAL_ADMIN',
  });
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Modules tab state
  const [moduleSettings, setModuleSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync settings when hospital changes
  useEffect(() => {
    if (hospital?.settings) {
      const map = {};
      hospital.settings.forEach((s) => {
        map[s.key] = s.value;
      });
      setModuleSettings(map);
    }
    setActiveTab('overview');
  }, [hospital]);

  const loadUsers = useCallback(async () => {
    if (!hospital?.id) return;
    setLoadingUsers(true);
    setUserError('');
    try {
      const data = await hospitalService.getHospitalUsers(hospital.id);
      setUsers(data || []);
    } catch (err) {
      setUserError(err.response?.data?.message || 'Failed to fetch hospital users');
    } finally {
      setLoadingUsers(false);
    }
  }, [hospital?.id]);

  useEffect(() => {
    if (activeTab === 'users' && hospital?.id) {
      loadUsers();
    }
  }, [activeTab, hospital?.id, loadUsers]);

  if (!isOpen || !hospital) return null;

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');
    setUserSubmitting(true);

    try {
      const created = await hospitalService.createHospitalUser(hospital.id, newUserData);
      setUserSuccess(`✓ Added user "${created.name}" (${newUserData.role}) successfully!`);
      setNewUserData({
        name: '',
        email: '',
        password: '',
        role: 'DOCTOR',
      });
      setShowAddUserModal(false);
      await loadUsers();
    } catch (err) {
      setUserError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleToggleModule = (key) => {
    setModuleSettings((prev) => ({
      ...prev,
      [key]: prev[key] === 'false' ? 'true' : 'false',
    }));
  };

  const handleSaveModules = async () => {
    setSavingSettings(true);
    setSettingsSuccess('');
    try {
      const entries = Object.entries(moduleSettings).map(([key, value]) => ({ key, value }));
      await hospitalService.updateHospitalSettings(hospital.id, entries);
      setSettingsSuccess('✓ Module configurations saved successfully!');
      setTimeout(() => setSettingsSuccess(''), 4000);
    } catch {
      alert('Failed to save module configurations');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hospital.logoUrl ? (
              <img
                src={hospital.logoUrl}
                alt={`${hospital.name} logo`}
                className="w-10 h-10 rounded-xl object-contain border border-slate-200 bg-white p-1"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 font-bold flex items-center justify-center border border-blue-200">
                {hospital.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 id="drawer-title" className="text-lg font-bold text-slate-900 tracking-tight">
                {hospital.name}
              </h2>
              <p className="text-xs font-mono text-slate-500">{hospital.slug}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Overview & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Staff & Admins
            {users.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                {users.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'modules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Modules & Features
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Status & Actions banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
                  <HospitalStatusBadge status={hospital.status} />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(hospital)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(hospital)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      hospital.status === 'ACTIVE'
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {hospital.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Contact Details */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Contact Information
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block">Email</span>
                      <span className="text-sm font-medium text-slate-800">
                        {hospital.email || <span className="text-slate-400 italic">Not provided</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 block">Phone</span>
                      <span className="text-sm font-medium text-slate-800">
                        {hospital.phone || <span className="text-slate-400 italic">Not provided</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Address */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Location & Address
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <span className="text-xs text-slate-400 block">Street Address</span>
                    <span className="text-sm font-medium text-slate-800">
                      {hospital.address || <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs text-slate-400 block">City</span>
                      <span className="text-sm font-medium text-slate-800">{hospital.city || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">State</span>
                      <span className="text-sm font-medium text-slate-800">{hospital.state || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Country</span>
                      <span className="text-sm font-medium text-slate-800">{hospital.country || 'India'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Postal Code</span>
                      <span className="text-sm font-medium text-slate-800">{hospital.postalCode || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Identifiers */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  System Identifiers
                </h3>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenant UUID:</span>
                    <code className="font-mono text-slate-700">{hospital.id}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unique Slug:</span>
                    <code className="font-mono text-slate-700">{hospital.slug}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created:</span>
                    <span className="text-slate-700">
                      {hospital.createdAt ? new Date(hospital.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Updated:</span>
                    <span className="text-slate-700">
                      {hospital.updatedAt ? new Date(hospital.updatedAt).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF & USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hospital Staff & Admins</h3>
                  <p className="text-xs text-slate-500">Authorized personnel operating under this hospital tenant.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Staff Member</span>
                </button>
              </div>

              {userSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  {userSuccess}
                </div>
              )}
              {userError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                  {userError}
                </div>
              )}

              {/* Inline Add User Form Modal */}
              {showAddUserModal && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Add New Staff or Admin
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleAddUserSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Full Name (e.g. Dr. Anita Roy)"
                        value={newUserData.name}
                        onChange={(e) => setNewUserData((p) => ({ ...p, name: e.target.value }))}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="email"
                        required
                        placeholder="Staff Email (login username)"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="password"
                        required
                        placeholder="Temporary Password (min 6)"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData((p) => ({ ...p, password: e.target.value }))}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                      <select
                        value={newUserData.role}
                        onChange={(e) => setNewUserData((p) => ({ ...p, role: e.target.value }))}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={userSubmitting}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                      >
                        {userSubmitting ? 'Creating...' : 'Create Account'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List */}
              {loadingUsers ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-blue-600" />
                  <p className="text-xs text-slate-500 mt-2">Loading hospital personnel...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">No staff users registered for this hospital yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(true)}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Provision initial hospital admin
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => {
                    const roleName = u.roles?.[0]?.name || 'STAFF';
                    return (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/60 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-100">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 text-xs block">{u.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono block">{u.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              roleName === 'HOSPITAL_ADMIN'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : roleName === 'DOCTOR'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {roleName.replace('_', ' ')}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'
                            }`}
                            title={`Status: ${u.status}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MODULES & SETTINGS */}
          {activeTab === 'modules' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tenant Module Toggles</h3>
                <p className="text-xs text-slate-500">
                  Control which functional modules are enabled for this hospital tenant.
                </p>
              </div>

              {settingsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  {settingsSuccess}
                </div>
              )}

              <div className="space-y-3">
                {AVAILABLE_MODULES.map((mod) => {
                  const isEnabled = moduleSettings[mod.key] !== 'false';
                  return (
                    <div
                      key={mod.key}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                    >
                      <div className="pr-4">
                        <span className="text-xs font-bold text-slate-900 block">{mod.name}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">{mod.desc}</span>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggleModule(mod.key)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveModules}
                  disabled={savingSettings}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                >
                  {savingSettings ? 'Saving...' : 'Save Module Configuration'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
