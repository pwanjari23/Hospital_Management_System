import React, { useState, useEffect, useRef } from 'react';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer Not to Say' },
];

const BLOOD_GROUPS = [
  { value: 'UNKNOWN', label: 'Unknown / Not Tested' },
  { value: 'A_POSITIVE', label: 'A+' },
  { value: 'A_NEGATIVE', label: 'A-' },
  { value: 'B_POSITIVE', label: 'B+' },
  { value: 'B_NEGATIVE', label: 'B-' },
  { value: 'AB_POSITIVE', label: 'AB+' },
  { value: 'AB_NEGATIVE', label: 'AB-' },
  { value: 'O_POSITIVE', label: 'O+' },
  { value: 'O_NEGATIVE', label: 'O-' },
];

const INITIAL_FORM_STATE = {
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'MALE',
  bloodGroup: 'UNKNOWN',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  allergies: '',
  medicalNotes: '',
};

/**
 * Accessible Modal for registering or editing a patient
 * Styled identically to HospitalModal (Screenshot 2)
 */
export default function PatientModal({
  isOpen,
  patient = null,
  loading = false,
  isReceptionist = false,
  onSubmit,
  onClose,
}) {
  const isEditing = Boolean(patient);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (patient) {
        setFormData({
          firstName: patient.firstName || '',
          middleName: patient.middleName || '',
          lastName: patient.lastName || '',
          dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
          gender: patient.gender || 'MALE',
          bloodGroup: patient.bloodGroup || 'UNKNOWN',
          phone: patient.phone || '',
          email: patient.email || '',
          address: patient.address || '',
          city: patient.city || '',
          state: patient.state || '',
          country: patient.country || 'India',
          postalCode: patient.postalCode || '',
          emergencyContactName: patient.emergencyContactName || '',
          emergencyContactPhone: patient.emergencyContactPhone || '',
          emergencyContactRelation: patient.emergencyContactRelation || '',
          allergies: patient.allergies || '',
          medicalNotes: patient.medicalNotes || '',
        });
      } else {
        setFormData(INITIAL_FORM_STATE);
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
  }, [isOpen, patient, loading, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (formData.phone.trim().length < 7) {
      errs.phone = 'Phone number must be at least 7 characters.';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address.';
      }
    }

    if (!formData.dateOfBirth) {
      errs.dateOfBirth = 'Date of birth is required.';
    } else {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(dob.getTime())) {
        errs.dateOfBirth = 'Invalid date format.';
      } else if (dob > today) {
        errs.dateOfBirth = 'Date of birth cannot be in the future.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate() || loading) return;

    const payload = {
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim(),
      lastName: formData.lastName.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      bloodGroup: formData.bloodGroup,
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      country: formData.country.trim(),
      postalCode: formData.postalCode.trim(),
      emergencyContactName: formData.emergencyContactName.trim(),
      emergencyContactPhone: formData.emergencyContactPhone.trim(),
      emergencyContactRelation: formData.emergencyContactRelation.trim(),
    };

    if (!isReceptionist || !isEditing) {
      payload.allergies = formData.allergies.trim();
      payload.medicalNotes = formData.medicalNotes.trim();
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
      aria-labelledby="patient-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-elevated border border-slate-200 transform transition-all max-h-[90vh] overflow-y-auto">
        {/* Header - Identical to Screenshot 2 */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div>
            <h2 id="patient-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
              {isEditing ? 'Edit Patient Details' : 'Register New Patient'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isEditing
                ? `Updating information for ${patient?.firstName} ${patient?.lastName}`
                : 'Create a new patient record with automated unique hospital UHID generation.'}
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
          {/* Patient Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="patient-first-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={firstInputRef}
                id="patient-first-name"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. John"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 transition ${
                  errors.firstName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.firstName && <p className="text-xs text-red-600 mt-1 font-medium">{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="patient-middle-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Middle Name
              </label>
              <input
                id="patient-middle-name"
                name="middleName"
                type="text"
                value={formData.middleName}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label htmlFor="patient-last-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="patient-last-name"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Doe"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 transition ${
                  errors.lastName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.lastName && <p className="text-xs text-red-600 mt-1 font-medium">{errors.lastName}</p>}
            </div>
          </div>

          {/* Demographic row: DOB, Gender, Blood Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="patient-dob" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                id="patient-dob"
                name="dateOfBirth"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
                  errors.dateOfBirth
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1 font-medium">{errors.dateOfBirth}</p>}
            </div>

            <div>
              <label htmlFor="patient-gender" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="patient-gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="patient-blood-group" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Blood Group
              </label>
              <select
                id="patient-blood-group"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg.value} value={bg.value}>
                    {bg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="patient-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="patient-phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.phone
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1 font-medium">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="patient-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="patient-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="patient@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1 font-medium">{errors.email}</p>}
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="patient-address" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Street Address
            </label>
            <input
              id="patient-address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. 120 Healthcare Avenue, Civil Lines"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          {/* City, State, Country, Postal Code */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="patient-city" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                id="patient-city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Nagpur"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label htmlFor="patient-state" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                State
              </label>
              <input
                id="patient-state"
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Maharashtra"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label htmlFor="patient-country" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Country
              </label>
              <input
                id="patient-country"
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                placeholder="India"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label htmlFor="patient-postal-code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Postal Code
              </label>
              <input
                id="patient-postal-code"
                name="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="440001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Section: Emergency Contact (Accent Banner like Screenshot 2) */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span>Emergency Point of Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="emg-name" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Name
                </label>
                <input
                  id="emg-name"
                  name="emergencyContactName"
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="emg-phone" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Phone
                </label>
                <input
                  id="emg-phone"
                  name="emergencyContactPhone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="+91 98765 43211"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="emg-relation" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Relationship
                </label>
                <input
                  id="emg-relation"
                  name="emergencyContactRelation"
                  type="text"
                  value={formData.emergencyContactRelation}
                  onChange={handleChange}
                  placeholder="e.g. Spouse / Sibling"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Medical Notes & Allergies */}
          {(!isReceptionist || !isEditing) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="patient-allergies" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Known Allergies
                </label>
                <textarea
                  id="patient-allergies"
                  name="allergies"
                  rows={2}
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="e.g. Penicillin, Peanuts, Latex..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label htmlFor="patient-notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Medical Notes
                </label>
                <textarea
                  id="patient-notes"
                  name="medicalNotes"
                  rows={2}
                  value={formData.medicalNotes}
                  onChange={handleChange}
                  placeholder="e.g. Diabetic, hypertensive, pacemaker installed..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Register Patient'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
