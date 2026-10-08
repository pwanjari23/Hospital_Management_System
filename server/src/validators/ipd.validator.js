import { errorResponse } from '../utils/apiResponse.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const WARD_TYPES = ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'CCU', 'HDU', 'EMERGENCY', 'OTHER'];
const GENDER_POLICIES = ['ANY', 'MALE', 'FEMALE'];
const BED_TYPES = ['STANDARD', 'ICU', 'CCU', 'PRIVATE', 'SEMI_PRIVATE', 'EMERGENCY', 'OTHER'];
const BED_STATUSES = ['AVAILABLE', 'RESERVED', 'MAINTENANCE', 'BLOCKED'];
const ADMISSION_TYPES = ['EMERGENCY', 'PLANNED', 'TRANSFER', 'OBSERVATION', 'OTHER'];

export const validateCreateWard = (req, res, next) => {
  const { wardCode, wardName, wardType, genderPolicy, departmentId } = req.body;
  const errors = [];

  if (!wardCode || typeof wardCode !== 'string' || !wardCode.trim()) {
    errors.push('Ward code is required');
  }

  if (!wardName || typeof wardName !== 'string' || !wardName.trim()) {
    errors.push('Ward name is required');
  }

  if (wardType && !WARD_TYPES.includes(wardType)) {
    errors.push(`Ward type must be one of: ${WARD_TYPES.join(', ')}`);
  }

  if (genderPolicy && !GENDER_POLICIES.includes(genderPolicy)) {
    errors.push(`Gender policy must be one of: ${GENDER_POLICIES.join(', ')}`);
  }

  if (departmentId && !UUID_REGEX.test(departmentId)) {
    errors.push('Invalid department ID format');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateUpdateWard = (req, res, next) => {
  const { wardCode, wardName, wardType, genderPolicy, departmentId, isActive } = req.body;
  const errors = [];

  if (wardCode !== undefined && (typeof wardCode !== 'string' || !wardCode.trim())) {
    errors.push('Ward code cannot be empty');
  }

  if (wardName !== undefined && (typeof wardName !== 'string' || !wardName.trim())) {
    errors.push('Ward name cannot be empty');
  }

  if (wardType && !WARD_TYPES.includes(wardType)) {
    errors.push(`Ward type must be one of: ${WARD_TYPES.join(', ')}`);
  }

  if (genderPolicy && !GENDER_POLICIES.includes(genderPolicy)) {
    errors.push(`Gender policy must be one of: ${GENDER_POLICIES.join(', ')}`);
  }

  if (departmentId !== undefined && departmentId !== null && !UUID_REGEX.test(departmentId)) {
    errors.push('Invalid department ID format');
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateCreateBed = (req, res, next) => {
  const { wardId, bedNumber, bedType, status } = req.body;
  const errors = [];

  if (!wardId || !UUID_REGEX.test(wardId)) {
    errors.push('Valid ward ID is required');
  }

  if (!bedNumber || typeof bedNumber !== 'string' || !bedNumber.trim()) {
    errors.push('Bed number is required');
  }

  if (bedType && !BED_TYPES.includes(bedType)) {
    errors.push(`Bed type must be one of: ${BED_TYPES.join(', ')}`);
  }

  if (status && !BED_STATUSES.includes(status)) {
    errors.push(`Status must be one of: ${BED_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateUpdateBed = (req, res, next) => {
  const { bedNumber, bedType, wardId, isActive } = req.body;
  const errors = [];

  if (bedNumber !== undefined && (typeof bedNumber !== 'string' || !bedNumber.trim())) {
    errors.push('Bed number cannot be empty');
  }

  if (bedType && !BED_TYPES.includes(bedType)) {
    errors.push(`Bed type must be one of: ${BED_TYPES.join(', ')}`);
  }

  if (wardId !== undefined && !UUID_REGEX.test(wardId)) {
    errors.push('Invalid ward ID format');
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateUpdateBedStatus = (req, res, next) => {
  const { status } = req.body;
  const errors = [];

  if (!status || !BED_STATUSES.includes(status)) {
    errors.push(`Bed status must be one of: ${BED_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateCreateAdmission = (req, res, next) => {
  const {
    patientId,
    admittingDoctorId,
    wardId,
    bedId,
    departmentId,
    admissionType,
    admissionDate,
    expectedDischargeDate,
  } = req.body;
  const errors = [];

  if (!patientId || !UUID_REGEX.test(patientId)) {
    errors.push('Valid patient ID is required');
  }

  if (!admittingDoctorId || !UUID_REGEX.test(admittingDoctorId)) {
    errors.push('Valid admitting doctor ID is required');
  }

  if (!wardId || !UUID_REGEX.test(wardId)) {
    errors.push('Valid ward ID is required');
  }

  if (!bedId || !UUID_REGEX.test(bedId)) {
    errors.push('Valid bed ID is required');
  }

  if (departmentId && !UUID_REGEX.test(departmentId)) {
    errors.push('Invalid department ID format');
  }

  if (admissionType && !ADMISSION_TYPES.includes(admissionType)) {
    errors.push(`Admission type must be one of: ${ADMISSION_TYPES.join(', ')}`);
  }

  if (admissionDate && !DATE_REGEX.test(admissionDate)) {
    errors.push('Admission date must be in YYYY-MM-DD format');
  }

  if (expectedDischargeDate && !DATE_REGEX.test(expectedDischargeDate)) {
    errors.push('Expected discharge date must be in YYYY-MM-DD format');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateTransferBed = (req, res, next) => {
  const { toWardId, toBedId } = req.body;
  const errors = [];

  if (!toWardId || !UUID_REGEX.test(toWardId)) {
    errors.push('Valid destination ward ID is required');
  }

  if (!toBedId || !UUID_REGEX.test(toBedId)) {
    errors.push('Valid destination bed ID is required');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateCancelAdmission = (req, res, next) => {
  const { reason } = req.body;
  if (reason !== undefined && typeof reason !== 'string') {
    return errorResponse(res, 'Reason must be a string', 400);
  }
  next();
};

export const validateInpatientVital = (req, res, next) => {
  const {
    temperature,
    pulseRate,
    respiratoryRate,
    systolicBp,
    diastolicBp,
    spo2,
    weightKg,
    heightCm,
    painScore,
  } = req.body;
  const errors = [];

  if (pulseRate !== undefined && pulseRate !== '' && (isNaN(Number(pulseRate)) || Number(pulseRate) < 0 || Number(pulseRate) > 300)) {
    errors.push('Pulse rate must be between 0 and 300 bpm');
  }

  if (respiratoryRate !== undefined && respiratoryRate !== '' && (isNaN(Number(respiratoryRate)) || Number(respiratoryRate) < 0 || Number(respiratoryRate) > 100)) {
    errors.push('Respiratory rate must be between 0 and 100 breaths/min');
  }

  if (systolicBp !== undefined && systolicBp !== '' && (isNaN(Number(systolicBp)) || Number(systolicBp) < 0 || Number(systolicBp) > 350)) {
    errors.push('Systolic BP must be between 0 and 350 mmHg');
  }

  if (diastolicBp !== undefined && diastolicBp !== '' && (isNaN(Number(diastolicBp)) || Number(diastolicBp) < 0 || Number(diastolicBp) > 250)) {
    errors.push('Diastolic BP must be between 0 and 250 mmHg');
  }

  if (spo2 !== undefined && spo2 !== '' && (isNaN(Number(spo2)) || Number(spo2) < 0 || Number(spo2) > 100)) {
    errors.push('SpO2 must be between 0 and 100%');
  }

  if (temperature !== undefined && temperature !== '' && (isNaN(Number(temperature)) || Number(temperature) < 70 || Number(temperature) > 120)) {
    errors.push('Temperature must be between 70 and 120 °F');
  }

  if (weightKg !== undefined && weightKg !== '' && (isNaN(Number(weightKg)) || Number(weightKg) <= 0 || Number(weightKg) > 500)) {
    errors.push('Weight must be greater than 0 and less than 500 kg');
  }

  if (heightCm !== undefined && heightCm !== '' && (isNaN(Number(heightCm)) || Number(heightCm) <= 0 || Number(heightCm) > 300)) {
    errors.push('Height must be greater than 0 and less than 300 cm');
  }

  if (painScore !== undefined && painScore !== '' && (isNaN(Number(painScore)) || Number(painScore) < 0 || Number(painScore) > 10)) {
    errors.push('Pain score must be between 0 and 10');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateProgressNote = (req, res, next) => {
  const { subjective, objective, assessment, plan, notes, status, progressDate } = req.body;
  const errors = [];

  const hasContent = [subjective, objective, assessment, plan, notes].some(
    (field) => field && typeof field === 'string' && field.trim().length > 0
  );

  if (!hasContent) {
    errors.push('At least one progress note section (Subjective, Objective, Assessment, Plan, or Notes) must be provided');
  }

  if (status && !['DRAFT', 'FINALIZED'].includes(status)) {
    errors.push('Status must be either DRAFT or FINALIZED');
  }

  if (progressDate && !DATE_REGEX.test(progressDate)) {
    errors.push('Progress date must be in YYYY-MM-DD format');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateNursingNote = (req, res, next) => {
  const { observations, painScale, status, noteDate } = req.body;
  const errors = [];

  if (!observations || typeof observations !== 'string' || !observations.trim()) {
    errors.push('Nursing observations are required');
  }

  if (painScale !== undefined && painScale !== '' && (isNaN(Number(painScale)) || Number(painScale) < 0 || Number(painScale) > 10)) {
    errors.push('Pain scale must be between 0 and 10');
  }

  if (status && !['DRAFT', 'FINALIZED'].includes(status)) {
    errors.push('Status must be either DRAFT or FINALIZED');
  }

  if (noteDate && !DATE_REGEX.test(noteDate)) {
    errors.push('Note date must be in YYYY-MM-DD format');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

const DISPOSITION_VALUES = ['HOME', 'TRANSFERRED', 'LAMA', 'ABSCONDED', 'REFERRED', 'DECEASED'];

export const validateDischargeSummary = (req, res, next) => {
  const { finalDiagnosis, disposition, dischargeDate, followUpDate, medications } = req.body;
  const errors = [];

  if (req.method === 'POST' && (!finalDiagnosis || typeof finalDiagnosis !== 'string' || !finalDiagnosis.trim())) {
    errors.push('Final diagnosis is required');
  }

  if (disposition && !DISPOSITION_VALUES.includes(disposition)) {
    errors.push(`Disposition must be one of: ${DISPOSITION_VALUES.join(', ')}`);
  }

  if (dischargeDate && !DATE_REGEX.test(dischargeDate)) {
    errors.push('Discharge date must be in YYYY-MM-DD format');
  }

  if (followUpDate && !DATE_REGEX.test(followUpDate)) {
    errors.push('Follow-up date must be in YYYY-MM-DD format');
  }

  if (medications !== undefined && !Array.isArray(medications)) {
    errors.push('Medications must be an array');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};

export const validateFinalizeDischarge = (req, res, next) => {
  const { disposition, dischargeDate, followUpDate, medications } = req.body;
  const errors = [];

  if (disposition && !DISPOSITION_VALUES.includes(disposition)) {
    errors.push(`Disposition must be one of: ${DISPOSITION_VALUES.join(', ')}`);
  }

  if (dischargeDate && !DATE_REGEX.test(dischargeDate)) {
    errors.push('Discharge date must be in YYYY-MM-DD format');
  }

  if (followUpDate && !DATE_REGEX.test(followUpDate)) {
    errors.push('Follow-up date must be in YYYY-MM-DD format');
  }

  if (medications !== undefined && !Array.isArray(medications)) {
    errors.push('Medications must be an array');
  }

  if (errors.length > 0) {
    return errorResponse(res, errors.join('. '), 400);
  }

  next();
};
