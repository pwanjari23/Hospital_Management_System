import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import patientService from '../../services/patientService';
import useAuth from '../../hooks/useAuth';

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

export default function PatientFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const isReceptionist = user?.role === 'RECEPTIONIST';

  const [formData, setFormData] = useState({
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
  });

  // If edit mode, load existing patient
  useEffect(() => {
    if (!isEditMode) return;

    let isMounted = true;
    const fetchPatientData = async () => {
      try {
        const res = await patientService.getPatient(id);
        if (isMounted && res.success && res.data) {
          const p = res.data;
          setFormData({
            firstName: p.firstName || '',
            middleName: p.middleName || '',
            lastName: p.lastName || '',
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
            gender: p.gender || 'MALE',
            bloodGroup: p.bloodGroup || 'UNKNOWN',
            phone: p.phone || '',
            email: p.email || '',
            address: p.address || '',
            city: p.city || '',
            state: p.state || '',
            country: p.country || 'India',
            postalCode: p.postalCode || '',
            emergencyContactName: p.emergencyContactName || '',
            emergencyContactPhone: p.emergencyContactPhone || '',
            emergencyContactRelation: p.emergencyContactRelation || '',
            allergies: p.allergies || '',
            medicalNotes: p.medicalNotes || '',
          });
        }
      } catch (err) {
        if (isMounted) {
          setGeneralError(err.response?.data?.message || 'Failed to load patient information.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPatientData();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!formData.phone.trim()) {
      errors.phone = 'Contact phone number is required.';
    } else if (formData.phone.trim().length < 7) {
      errors.phone = 'Phone number must be at least 7 characters.';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please provide a valid email address.';
      }
    }

    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.';
    } else {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(dob.getTime())) {
        errors.dateOfBirth = 'Invalid date format.';
      } else if (dob > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate() || submitting) return;

    setSubmitting(true);

    try {
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

      if (!isReceptionist || !isEditMode) {
        payload.allergies = formData.allergies.trim();
        payload.medicalNotes = formData.medicalNotes.trim();
      }

      if (isEditMode) {
        await patientService.updatePatient(id, payload);
        navigate(`/hospital-admin/patients/${id}`, { replace: true });
      } else {
        const res = await patientService.createPatient(payload);
        const newId = res.data?.id;
        navigate(newId ? `/hospital-admin/patients/${newId}` : '/hospital-admin/patients', {
          replace: true,
        });
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setGeneralError(
        err.response?.data?.message || 'Failed to save patient. Please check input values.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-soft animate-pulse space-y-6">
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link to="/hospital-admin/patients" className="hover:text-teal-600 transition">
              Patients
            </Link>
            <span>/</span>
            <span className="text-slate-800">{isEditMode ? 'Edit Patient' : 'Registration'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {isEditMode ? 'Edit Patient Profile' : 'Register New Patient'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditMode
              ? 'Update demographic, emergency contact, and clinical notes for this patient.'
              : 'Admit a patient and automatically generate an atomic, concurrency-safe hospital UHID.'}
          </p>
        </div>

        <Link
          to="/hospital-admin/patients"
          className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium shadow-xs transition-colors self-start sm:self-auto"
        >
          &larr; Back to Directory
        </Link>
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-start gap-2.5">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{generalError}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Personal Demographics */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-100">
                1
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                <p className="text-xs text-slate-500">Legal patient identity and demographic details</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                First Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. John"
                className={`w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 transition shadow-2xs ${
                  fieldErrors.firstName
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-600'
                }`}
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="middleName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Middle Name
              </label>
              <input
                id="middleName"
                name="middleName"
                type="text"
                value={formData.middleName}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Last Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Doe"
                className={`w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 transition shadow-2xs ${
                  fieldErrors.lastName
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-600'
                }`}
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 pt-1">
            <div>
              <label htmlFor="dateOfBirth" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date of Birth <span className="text-rose-600">*</span>
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 transition shadow-2xs ${
                  fieldErrors.dateOfBirth
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-600'
                }`}
              />
              {fieldErrors.dateOfBirth && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.dateOfBirth}</p>
              )}
            </div>

            <div>
              <label htmlFor="gender" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender <span className="text-rose-600">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bloodGroup" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Blood Group
              </label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              >
                {BLOOD_GROUPS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Address */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-100">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Contact & Address</h2>
                <p className="text-xs text-slate-500">Patient communication channels and residential address</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-rose-600">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +91 9876543210"
                className={`w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 transition shadow-2xs ${
                  fieldErrors.phone
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-600'
                }`}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="patient@example.com"
                className={`w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 transition shadow-2xs ${
                  fieldErrors.email
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-600'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Street Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Apartment, building, street address"
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="city" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                placeholder="Country"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Postal Code
              </label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="Postal code"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contact */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center border border-rose-100">
                3
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Emergency Contact</h2>
                <p className="text-xs text-slate-500">Designated emergency point of contact or next of kin</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div>
              <label htmlFor="emergencyContactName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Name
              </label>
              <input
                id="emergencyContactName"
                name="emergencyContactName"
                type="text"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="emergencyContactPhone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone
              </label>
              <input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="e.g. +91 9876543211"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="emergencyContactRelation" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Relationship
              </label>
              <input
                id="emergencyContactRelation"
                name="emergencyContactRelation"
                type="text"
                value={formData.emergencyContactRelation}
                onChange={handleChange}
                placeholder="e.g. Spouse / Sibling / Parent"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Basic Medical Notes & Allergies */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 font-bold text-xs flex items-center justify-center border border-amber-100">
                4
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Medical Notes & Allergies</h2>
                <p className="text-xs text-slate-500">Critical alerts for intake staff and consulting clinicians</p>
              </div>
            </div>
            {isReceptionist && isEditMode && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                Read-only for Receptionists
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label htmlFor="allergies" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Known Allergies
              </label>
              <textarea
                id="allergies"
                name="allergies"
                rows={3}
                disabled={isReceptionist && isEditMode}
                value={formData.allergies}
                onChange={handleChange}
                placeholder="e.g. Penicillin, Peanuts, Latex..."
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed transition shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="medicalNotes" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                General Medical Notes
              </label>
              <textarea
                id="medicalNotes"
                name="medicalNotes"
                rows={3}
                disabled={isReceptionist && isEditMode}
                value={formData.medicalNotes}
                onChange={handleChange}
                placeholder="e.g. Diabetic, hypertensive, pacemaker installed..."
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed transition shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            to="/hospital-admin/patients"
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving Patient...</span>
              </>
            ) : isEditMode ? (
              'Save Changes'
            ) : (
              'Register Patient'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
