import React, { useState, useEffect } from 'react';
import { getBranding, updateBranding } from '../../services/documentService';
import { getPreferences, updatePreferences } from '../../services/notificationService';

export default function HospitalBrandingPage() {
  const [form, setForm] = useState({
    hospitalName: '',
    tagline: '',
    regNumber: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    logoUrl: '',
    headerText: '',
    footerText: '',
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    appointmentEnabled: true,
    labEnabled: true,
    pharmacyEnabled: true,
    billingEnabled: true,
    ipdEnabled: true,
    eecpEnabled: true,
    emailChannelEnabled: false,
    smsChannelEnabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [brandingRes, prefsRes] = await Promise.all([
        getBranding(),
        getPreferences().catch(() => ({ data: {} })),
      ]);

      const b = brandingRes.data || {};
      setForm({
        hospitalName: b.hospitalName || '',
        tagline: b.tagline || '',
        regNumber: b.regNumber || '',
        phone: b.phone || '',
        alternatePhone: b.alternatePhone || '',
        email: b.email || '',
        website: b.website || '',
        address: b.address || '',
        city: b.city || '',
        state: b.state || '',
        postalCode: b.postalCode || '',
        logoUrl: b.logoUrl || '',
        headerText: b.headerText || '',
        footerText: b.footerText || '',
      });

      if (prefsRes.data) {
        setNotificationPrefs((prev) => ({ ...prev, ...prefsRes.data }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load hospital branding');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrefToggle = (key) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      await Promise.all([
        updateBranding(form),
        updatePreferences(notificationPrefs),
      ]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading branding settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Hospital Branding & Print Letterhead
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure official hospital identity, printable letterhead layout, and notification rules.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Hospital branding and notification preferences updated successfully!
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Live Letterhead Preview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Live Print Letterhead Preview
          </span>
          <span className="text-[11px] text-blue-600 font-medium">Standard A4 Document Format</span>
        </div>

        <div className="border border-slate-300 rounded-xl p-6 bg-slate-50/50">
          <div className="border-b-2 border-slate-800 pb-4 mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt={form.hospitalName}
                  className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shrink-0">
                  {form.hospitalName ? form.hospitalName.charAt(0).toUpperCase() : 'H'}
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  {form.hospitalName || 'SSSH Hospital'}
                </h2>
                {form.tagline && <p className="text-xs text-slate-500 italic">{form.tagline}</p>}
                <p className="text-xs text-slate-600 mt-0.5">
                  {[form.address, form.city, form.state, form.postalCode].filter(Boolean).join(', ') || 'Hospital Address, City, State'}
                </p>
                <div className="flex gap-3 text-[11px] text-slate-500 font-mono mt-1">
                  {form.phone && <span>Tel: {form.phone}</span>}
                  {form.email && <span>Email: {form.email}</span>}
                  {form.regNumber && <span>Reg: {form.regNumber}</span>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded">
                SAMPLE DOCUMENT
              </span>
              <p className="text-[11px] font-mono text-slate-500 mt-1">#DOC-2026-0001</p>
            </div>
          </div>

          <div className="py-6 text-center text-xs text-slate-400 italic">
            [ Patient, Clinical & Financial Document Content Appears Here ]
          </div>

          <div className="border-t border-slate-200 pt-3 flex justify-between text-[11px] text-slate-500">
            <span>{form.footerText || 'Confidential Computer-Generated Medical Record'}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Hospital Identity Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <h2 className="text-base font-bold text-slate-900">Hospital Details & Identity</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Name *</label>
              <input
                type="text"
                name="hospitalName"
                value={form.hospitalName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Tagline / Motto</label>
              <input
                type="text"
                name="tagline"
                value={form.tagline}
                onChange={handleChange}
                placeholder="e.g. Center for Excellence in Cardiology"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registration / License Number</label>
              <input
                type="text"
                name="regNumber"
                value={form.regNumber}
                onChange={handleChange}
                placeholder="e.g. MH-HOSP-2026-4491"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Logo URL</label>
              <input
                type="url"
                name="logoUrl"
                value={form.logoUrl}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Phone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate / Emergency Phone</label>
              <input
                type="text"
                name="alternatePhone"
                value={form.alternatePhone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
              <input
                type="text"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Header Text</label>
              <input
                type="text"
                name="headerText"
                value={form.headerText}
                onChange={handleChange}
                placeholder="e.g. Accredited by National Health Board"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Footer Legal Text</label>
              <input
                type="text"
                name="footerText"
                value={form.footerText}
                onChange={handleChange}
                placeholder="e.g. Please bring this record during all follow-up consultations."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notification Rules Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Hospital Notification Preferences</h2>
          <p className="text-xs text-slate-500">
            Control which automated events trigger in-app alerts and communications for your hospital staff.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[
              { key: 'appointmentEnabled', label: 'Appointment Alerts', desc: 'Notifies doctors on new bookings, reschedules & check-ins' },
              { key: 'labEnabled', label: 'Laboratory Diagnostics', desc: 'Alerts doctors on finalized results & critical abnormal flags' },
              { key: 'pharmacyEnabled', label: 'Pharmacy Dispensing', desc: 'Alerts prescribing staff when medications are dispensed' },
              { key: 'billingEnabled', label: 'Billing & Payments', desc: 'Alerts reception and admin on new invoices & payment collections' },
              { key: 'ipdEnabled', label: 'IPD Clinical Stays', desc: 'Notifies admitting doctors on bed transfers & discharge summaries' },
              { key: 'eecpEnabled', label: 'EECP Therapy Course', desc: 'Alerts therapy team on session completions & course progress' },
            ].map((p) => (
              <label
                key={p.key}
                className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl cursor-pointer transition border border-slate-200/60"
              >
                <input
                  type="checkbox"
                  checked={notificationPrefs[p.key]}
                  onChange={() => handlePrefToggle(p.key)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{p.label}</span>
                  <span className="text-[11px] text-slate-500">{p.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {saving ? 'Saving Changes...' : 'Save Branding & Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
