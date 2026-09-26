import React, { useState, useEffect, useRef } from 'react';

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  logoUrl: '',
  provisionAdmin: true,
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

/**
 * Accessible Modal for creating or editing a hospital
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Object|null} props.hospital - Hospital to edit, or null if creating
 * @param {boolean} props.loading - Submission pending state
 * @param {Function} props.onSubmit - (formData) => Promise<void>
 * @param {Function} props.onClose
 */
export default function HospitalModal({
  isOpen,
  hospital = null,
  loading = false,
  onSubmit,
  onClose,
}) {
  const isEditing = Boolean(hospital);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (hospital) {
        setFormData({
          name: hospital.name || '',
          email: hospital.email || '',
          phone: hospital.phone || '',
          address: hospital.address || '',
          city: hospital.city || '',
          state: hospital.state || '',
          country: hospital.country || 'India',
          postalCode: hospital.postalCode || '',
          logoUrl: hospital.logoUrl || '',
          provisionAdmin: false,
          adminName: '',
          adminEmail: '',
          adminPassword: '',
        });
      } else {
        setFormData({
          ...INITIAL_FORM_STATE,
          adminPassword: 'Admin@' + Math.floor(100000 + Math.random() * 900000) + '!',
        });
      }
      setErrors({});
      setServerError('');

      // Auto-focus first input
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !loading) {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, hospital, loading, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const generateNewPassword = () => {
    const newPwd = 'Admin@' + Math.floor(100000 + Math.random() * 900000) + '!';
    setFormData((prev) => ({ ...prev, adminPassword: newPwd }));
  };

  const validate = () => {
    const newErrors = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      newErrors.name = 'Hospital name is required';
    } else if (trimmedName.length > 255) {
      newErrors.name = 'Name cannot exceed 255 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (formData.email && formData.email.trim()) {
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please provide a valid email address';
      }
    }

    if (!isEditing && formData.provisionAdmin) {
      if (formData.adminEmail && formData.adminEmail.trim()) {
        if (!emailRegex.test(formData.adminEmail.trim())) {
          newErrors.adminEmail = 'Please provide a valid email for the hospital administrator';
        }
      }
      if (formData.adminPassword && formData.adminPassword.length < 6) {
        newErrors.adminPassword = 'Admin password must be at least 6 characters';
      }
    }

    if (formData.logoUrl && formData.logoUrl.trim()) {
      try {
        const url = new URL(formData.logoUrl.trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.logoUrl = 'Logo URL must start with http:// or https://';
        }
      } catch {
        newErrors.logoUrl = 'Please provide a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    // Build payload containing only whitelisted mutable fields
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      country: formData.country.trim() || 'India',
      postalCode: formData.postalCode.trim() || null,
      logoUrl: formData.logoUrl.trim() || null,
    };

    if (!isEditing && formData.provisionAdmin && formData.adminEmail?.trim()) {
      payload.adminName = formData.adminName.trim() || `${formData.name.trim()} Admin`;
      payload.adminEmail = formData.adminEmail.trim().toLowerCase();
      payload.adminPassword = formData.adminPassword || undefined;
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.map((e) => e.message).join(', ')
          : err.message || 'Operation failed');
      setServerError(errorMsg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hospital-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-elevated border border-slate-200 transform transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div>
            <h2 id="hospital-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
              {isEditing ? 'Edit Hospital Details' : 'Register New Hospital'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isEditing
                ? `Updating information for ${hospital?.name}`
                : 'Create a new hospital tenant with automated unique slug generation and default branding settings.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {serverError && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Hospital Name (Required) */}
          <div>
            <label htmlFor="hospital-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hospital Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="hospital-name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. City Care General Hospital"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 transition ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1 font-medium">{errors.name}</p>}
            {isEditing && (
              <p className="text-[11px] text-slate-400 mt-1">
                Slug: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{hospital.slug}</code> (Slugs are permanent system identifiers and cannot be altered)
              </p>
            )}
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hospital-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Primary Contact Email
              </label>
              <input
                id="hospital-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@hospital.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 transition ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1 font-medium">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="hospital-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                id="hospital-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="hospital-address" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Street Address
            </label>
            <input
              id="hospital-address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. 120 Healthcare Avenue, Civil Lines"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
            />
          </div>

          {/* City, State, Country, Postal Code */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="hospital-city" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                id="hospital-city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Nagpur"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label htmlFor="hospital-state" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                State
              </label>
              <input
                id="hospital-state"
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Maharashtra"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label htmlFor="hospital-country" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Country
              </label>
              <input
                id="hospital-country"
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                placeholder="India"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label htmlFor="hospital-postalCode" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Postal Code
              </label>
              <input
                id="hospital-postalCode"
                name="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="440001"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="hospital-logoUrl" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Logo Image URL
            </label>
            <input
              id="hospital-logoUrl"
              name="logoUrl"
              type="url"
              value={formData.logoUrl}
              onChange={handleChange}
              placeholder="https://example.com/logo.png"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 transition ${
                errors.logoUrl
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {errors.logoUrl && <p className="text-xs text-red-600 mt-1 font-medium">{errors.logoUrl}</p>}
          </div>

          {/* Initial Administrator Account Provisioning (New Hospital Only) */}
          {!isEditing && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Initial Hospital Administrator
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Provision the primary tenant login credentials to access the Hospital Portal.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="provisionAdmin"
                    checked={formData.provisionAdmin}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {formData.provisionAdmin && (
                <div className="space-y-3 pt-2 border-t border-blue-100/60 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="adminName" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Admin Full Name
                      </label>
                      <input
                        id="adminName"
                        name="adminName"
                        type="text"
                        value={formData.adminName}
                        onChange={handleChange}
                        placeholder={formData.name ? `${formData.name} Admin` : 'e.g. Dr. Rajesh Kumar'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="adminEmail" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Admin Login Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="adminEmail"
                        name="adminEmail"
                        type="email"
                        required={formData.provisionAdmin}
                        value={formData.adminEmail}
                        onChange={handleChange}
                        placeholder="admin@hospital.com"
                        className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 transition bg-white ${
                          errors.adminEmail
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {errors.adminEmail && <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.adminEmail}</p>}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="adminPassword" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Temporary Password <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateNewPassword}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        ⚡ Generate Random
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="adminPassword"
                        name="adminPassword"
                        type={showPassword ? 'text' : 'password'}
                        required={formData.provisionAdmin}
                        value={formData.adminPassword}
                        onChange={handleChange}
                        className={`w-full pl-3 pr-20 py-2 rounded-xl border text-xs sm:text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 transition bg-white ${
                          errors.adminPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 hover:text-slate-700 font-semibold"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {errors.adminPassword && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.adminPassword}</p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">
                      Credentials will be displayed upon creation so you can provide them to the hospital team.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Hospital'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
