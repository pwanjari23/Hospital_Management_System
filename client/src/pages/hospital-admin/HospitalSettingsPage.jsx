import React, { useState, useEffect } from 'react';
import settingsService from '../../services/settingsService';
import useAuth from '../../hooks/useAuth';

const SETTINGS_TABS = [
  { id: 'profile', label: 'Hospital Profile', icon: '🏥', desc: 'Organization details and contact branding' },
  { id: 'patient', label: 'Patient Numbering', icon: '🆔', desc: 'UHID prefix & sequence configuration' },
  { id: 'billing', label: 'Billing Configuration', icon: '🧾', desc: 'Tax rates, invoice prefixes & billing terms' },
  { id: 'notifications', label: 'Notification Settings', icon: '🔔', desc: 'Automated alert & reminder triggers' },
];

export default function HospitalSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: '',
    slug: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    workingHours: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  });

  // Patient Numbering Form
  const [patientConfig, setPatientConfig] = useState({
    uhid_prefix: 'HOSP',
    patient_starting_number: '1',
  });

  // Billing Configuration Form
  const [billingConfig, setBillingConfig] = useState({
    billing_tax_enabled: 'false',
    billing_tax_rate: '0',
    billing_invoice_prefix: 'INV-',
    billing_receipt_prefix: 'REC-',
    billing_currency: 'INR',
    billing_payment_terms: 'Immediate upon discharge or service completion',
    billing_notes: 'Thank you for placing your trust in our healthcare services.',
  });

  // Notification Settings Form
  const [notifyConfig, setNotifyConfig] = useState({
    notify_appointment_reminders: 'true',
    notify_followup_reminders: 'true',
    notify_payment_reminders: 'true',
    notify_eecp_reminders: 'true',
    notify_email_enabled: 'true',
    notify_sms_enabled: 'false',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await settingsService.getSettings();
      if (res.success && res.data) {
        const { hospital, settings } = res.data;
        if (hospital) {
          setProfileForm({
            name: hospital.name || '',
            slug: hospital.slug || '',
            phone: hospital.phone || '',
            alternatePhone: hospital.alternatePhone || '',
            email: hospital.email || '',
            website: hospital.website || '',
            address: hospital.address || '',
            city: hospital.city || '',
            state: hospital.state || '',
            postalCode: hospital.postalCode || '',
            workingHours: hospital.workingHours || '24x7 Emergency & OPD 9:00 AM - 7:00 PM',
            timezone: hospital.timezone || 'Asia/Kolkata',
            currency: hospital.currency || 'INR',
          });
        }

        if (settings) {
          setPatientConfig({
            uhid_prefix: settings.uhid_prefix || 'HOSP',
            patient_starting_number: settings.patient_starting_number || '1',
          });

          setBillingConfig({
            billing_tax_enabled: settings.billing_tax_enabled || 'false',
            billing_tax_rate: settings.billing_tax_rate || '0',
            billing_invoice_prefix: settings.billing_invoice_prefix || 'INV-',
            billing_receipt_prefix: settings.billing_receipt_prefix || 'REC-',
            billing_currency: settings.billing_currency || 'INR',
            billing_payment_terms: settings.billing_payment_terms || 'Immediate upon discharge or service completion',
            billing_notes: settings.billing_notes || 'Thank you for placing your trust in our healthcare services.',
          });

          setNotifyConfig({
            notify_appointment_reminders: settings.notify_appointment_reminders || 'true',
            notify_followup_reminders: settings.notify_followup_reminders || 'true',
            notify_payment_reminders: settings.notify_payment_reminders || 'true',
            notify_eecp_reminders: settings.notify_eecp_reminders || 'true',
            notify_email_enabled: settings.notify_email_enabled || 'true',
            notify_sms_enabled: settings.notify_sms_enabled || 'false',
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load hospital settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save Handlers
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await settingsService.updateProfile(profileForm);
      showToast('✓ Hospital profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update hospital profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePatientConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await settingsService.updatePatientConfig(patientConfig);
      showToast('✓ Patient numbering settings updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update patient numbering settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBillingConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await settingsService.updateBillingConfig(billingConfig);
      showToast('✓ Billing configuration updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update billing configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await settingsService.updateNotificationConfig(notifyConfig);
      showToast('✓ Notification settings updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update notification settings.');
    } finally {
      setSaving(false);
    }
  };

  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Hospital Settings & Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure organization profile, patient numbering rules, billing parameters, and notifications.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSettings}
          disabled={loading || saving}
          aria-label="Refresh settings"
          className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium shadow-xs transition-colors self-start sm:self-auto flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reload</span>
        </button>
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
            onClick={loadSettings}
            className="text-xs font-bold underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading settings...</p>
          </div>
        ) : (
          <>
            {/* 1. Hospital Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hospital Organization Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These contact details appear on patient registration cards, appointment slips, and prescription headers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Name *</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital Code / Slug <span className="text-slate-400 font-normal">(System Identifier)</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.slug}
                      readOnly
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono text-xs cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate / Emergency Helpline</label>
                    <input
                      type="tel"
                      value={profileForm.alternatePhone}
                      onChange={(e) => setProfileForm({ ...profileForm, alternatePhone: e.target.value })}
                      placeholder="+91 98765 00000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="info@hospital.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                    <input
                      type="url"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                      placeholder="https://www.hospital.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="Plot No. 12, Main Road, Medical Enclave"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={profileForm.state}
                      onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code (PIN)</label>
                    <input
                      type="text"
                      value={profileForm.postalCode}
                      onChange={(e) => setProfileForm({ ...profileForm, postalCode: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Working Hours</label>
                    <input
                      type="text"
                      value={profileForm.workingHours}
                      onChange={(e) => setProfileForm({ ...profileForm, workingHours: e.target.value })}
                      placeholder="OPD: 9am - 7pm, Emergency 24/7"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
                    <select
                      value={profileForm.timezone}
                      onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                      <option value="UTC">UTC (+0:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Base Currency</label>
                    <select
                      value={profileForm.currency}
                      onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="INR">INR (₹ Indian Rupee)</option>
                      <option value="USD">USD ($ US Dollar)</option>
                      <option value="EUR">EUR (€ Euro)</option>
                      <option value="AED">AED (Dirham)</option>
                    </select>
                  </div>
                </div>

                {isHospitalAdmin && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* 2. Patient Numbering Tab */}
            {activeTab === 'patient' && (
              <form onSubmit={handleSavePatientConfig} className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Patient UHID Numbering Rules</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Every newly registered patient is assigned a Unique Hospital Identification (UHID) generated atomically.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                      Sample Generated UHID Preview
                    </span>
                    <span className="font-mono text-lg font-bold text-blue-700">
                      {patientConfig.uhid_prefix.toUpperCase() || 'HOSP'}-000001
                    </span>
                  </div>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg font-medium">
                    6 Digits Zero-Padded
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      UHID Prefix <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength="10"
                      value={patientConfig.uhid_prefix}
                      onChange={(e) =>
                        setPatientConfig({ ...patientConfig, uhid_prefix: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., SSSH, HOSP, CARD"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm uppercase focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Standard healthcare practice uses a 3 to 5 letter code representing hospital initials.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Starting Sequence Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={patientConfig.patient_starting_number}
                      onChange={(e) =>
                        setPatientConfig({ ...patientConfig, patient_starting_number: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {isHospitalAdmin && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Numbering Rules'}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* 3. Billing Configuration Tab */}
            {activeTab === 'billing' && (
              <form onSubmit={handleSaveBillingConfig} className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Billing & Invoicing Configuration</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pre-set tax guidelines, document prefixes, and standard footer terms for future billing.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800 block">Enable Tax / GST on Clinical Services</strong>
                      <span className="text-[11px] text-slate-500">Apply tax calculations to outpatient and inpatient bills</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billingConfig.billing_tax_enabled === 'true'}
                        onChange={(e) =>
                          setBillingConfig({
                            ...billingConfig,
                            billing_tax_enabled: e.target.checked ? 'true' : 'false',
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {billingConfig.billing_tax_enabled === 'true' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Default Tax Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={billingConfig.billing_tax_rate}
                        onChange={(e) =>
                          setBillingConfig({ ...billingConfig, billing_tax_rate: e.target.value })
                        }
                        placeholder="e.g., 5, 12, 18"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                      <input
                        type="text"
                        value={billingConfig.billing_invoice_prefix}
                        onChange={(e) =>
                          setBillingConfig({ ...billingConfig, billing_invoice_prefix: e.target.value })
                        }
                        placeholder="INV-"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Prefix</label>
                      <input
                        type="text"
                        value={billingConfig.billing_receipt_prefix}
                        onChange={(e) =>
                          setBillingConfig({ ...billingConfig, billing_receipt_prefix: e.target.value })
                        }
                        placeholder="REC-"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Payment Terms</label>
                    <input
                      type="text"
                      value={billingConfig.billing_payment_terms}
                      onChange={(e) =>
                        setBillingConfig({ ...billingConfig, billing_payment_terms: e.target.value })
                      }
                      placeholder="Due upon receipt or at discharge"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Invoice Footer Notes
                    </label>
                    <textarea
                      rows="2"
                      value={billingConfig.billing_notes}
                      onChange={(e) => setBillingConfig({ ...billingConfig, billing_notes: e.target.value })}
                      placeholder="Thank you for choosing SSSH Hospital..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm resize-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {isHospitalAdmin && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Billing Settings'}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* 4. Notification Settings Tab */}
            {activeTab === 'notifications' && (
              <form onSubmit={handleSaveNotificationConfig} className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Automated Reminders & Notifications</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle channels and triggers for future clinical notifications and appointment follow-ups.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  <div className="py-3.5 flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800 block">Appointment Reminders</strong>
                      <span className="text-[11px] text-slate-500">Send alerts to patients 24 hours prior to appointment slot</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyConfig.notify_appointment_reminders === 'true'}
                        onChange={(e) =>
                          setNotifyConfig({
                            ...notifyConfig,
                            notify_appointment_reminders: e.target.checked ? 'true' : 'false',
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="py-3.5 flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800 block">Follow-up Reminders</strong>
                      <span className="text-[11px] text-slate-500">Alert patients when doctor-advised follow-up date approaches</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyConfig.notify_followup_reminders === 'true'}
                        onChange={(e) =>
                          setNotifyConfig({
                            ...notifyConfig,
                            notify_followup_reminders: e.target.checked ? 'true' : 'false',
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="py-3.5 flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800 block">EECP Session Reminders</strong>
                      <span className="text-[11px] text-slate-500">Notify cardiac EECP patients about daily therapy appointments</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyConfig.notify_eecp_reminders === 'true'}
                        onChange={(e) =>
                          setNotifyConfig({
                            ...notifyConfig,
                            notify_eecp_reminders: e.target.checked ? 'true' : 'false',
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="py-3.5 flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800 block">Payment & Invoice Reminders</strong>
                      <span className="text-[11px] text-slate-500">Notify patients about pending dues or receipt generation</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyConfig.notify_payment_reminders === 'true'}
                        onChange={(e) =>
                          setNotifyConfig({
                            ...notifyConfig,
                            notify_payment_reminders: e.target.checked ? 'true' : 'false',
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="py-3.5 flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800 block">Email Alerts Channel</strong>
                      <span className="text-[11px] text-slate-500">Dispatch alerts via hospital transactional email</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyConfig.notify_email_enabled === 'true'}
                        onChange={(e) =>
                          setNotifyConfig({
                            ...notifyConfig,
                            notify_email_enabled: e.target.checked ? 'true' : 'false',
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="py-3.5 flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-slate-800 block">SMS Alerts Channel</strong>
                      <span className="text-[11px] text-slate-500">Dispatch alerts via telecom SMS gateway</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyConfig.notify_sms_enabled === 'true'}
                        onChange={(e) =>
                          setNotifyConfig({
                            ...notifyConfig,
                            notify_sms_enabled: e.target.checked ? 'true' : 'false',
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {isHospitalAdmin && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium shadow-xs disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Notification Settings'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
