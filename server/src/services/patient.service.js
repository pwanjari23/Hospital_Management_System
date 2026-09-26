import { Op } from 'sequelize';
import { Patient, HospitalSequence, HospitalSetting, Hospital } from '../models/index.js';
import withTransaction from '../utils/transaction.js';

const ALLOWED_SORT_COLUMNS = ['createdAt', 'firstName', 'lastName', 'uhid', 'dateOfBirth'];

/**
 * Concurrency-safe atomic UHID generator using PostgreSQL SELECT ... FOR UPDATE
 * @param {string} hospitalId - Tenant ID
 * @param {object} t - Managed transaction instance
 * @returns {Promise<string>} - e.g. "HOSP-000001"
 */
export const generateNextUHID = async (hospitalId, t) => {
  // 1. Attempt to find existing sequence row with row-level lock
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'PATIENT' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  // 2. If row does not exist, initialize it atomically
  if (!seq) {
    // Check if hospital has a custom uhid_prefix configured in hospital_settings
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'uhid_prefix' },
      transaction: t,
    });

    let prefix = customPrefixSetting?.value?.trim().toUpperCase();
    if (!prefix) {
      // Fallback: derive 4-letter uppercase code from hospital slug, or default 'HOSP'
      const hospital = await Hospital.findByPk(hospitalId, { transaction: t });
      if (hospital?.slug) {
        const cleanSlug = hospital.slug.replace(/[^a-zA-Z]/g, '').toUpperCase();
        prefix = cleanSlug.slice(0, 4) || 'HOSP';
      } else {
        prefix = 'HOSP';
      }
    }

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'PATIENT',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      // If concurrent request inserted simultaneously, re-query with lock
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'PATIENT' },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }
  }

  // 3. Atomically increment counter
  const nextValue = Number(seq.lastValue) + 1;
  await seq.update({ lastValue: nextValue }, { transaction: t });

  // 4. Format UHID with zero-padding (6 digits)
  return `${seq.prefix}-${String(nextValue).padStart(6, '0')}`;
};

/**
 * List patients for a specific hospital tenant with search, filtering, and pagination
 */
export const getPatients = async (hospitalId, options = {}) => {
  const {
    search = '',
    gender = '',
    bloodGroup = '',
    status = 'ALL',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = options;

  // Strict tenant boundary
  const where = { hospitalId };

  // Status filter (Active / Inactive / All)
  if (status === 'ACTIVE') {
    where.isActive = true;
  } else if (status === 'INACTIVE') {
    where.isActive = false;
  }

  // Gender filter
  if (gender && gender !== 'ALL') {
    where.gender = gender;
  }

  // Blood group filter
  if (bloodGroup && bloodGroup !== 'ALL') {
    where.bloodGroup = bloodGroup;
  }

  // Case-insensitive database-level search across UHID, names, phone, email
  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const searchPattern = `%${trimmedSearch}%`;
    where[Op.or] = [
      { uhid: { [Op.iLike]: searchPattern } },
      { firstName: { [Op.iLike]: searchPattern } },
      { lastName: { [Op.iLike]: searchPattern } },
      { phone: { [Op.iLike]: searchPattern } },
      { email: { [Op.iLike]: searchPattern } },
    ];
  }

  // Safe pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  // Safe sorting whitelist
  const validatedSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
  const validatedSortOrder = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows } = await Patient.findAndCountAll({
    where,
    limit: limitNum,
    offset,
    order: [[validatedSortBy, validatedSortOrder]],
    distinct: true,
  });

  return {
    patients: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

/**
 * Retrieve patient by ID under strict tenant isolation
 */
export const getPatientById = async (hospitalId, patientId) => {
  const patient = await Patient.findOne({
    where: {
      id: patientId,
      hospitalId,
    },
  });

  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  return patient;
};

/**
 * Register a new patient atomically with generated UHID
 */
export const createPatient = async (hospitalId, patientData) => {
  return withTransaction(async (t) => {
    // Generate next sequential UHID for this hospital
    const uhid = await generateNextUHID(hospitalId, t);

    // Create patient record
    const patient = await Patient.create(
      {
        ...patientData,
        hospitalId,
        uhid,
        isActive: true,
      },
      { transaction: t }
    );

    return patient;
  });
};

/**
 * Update allowed demographic/contact/medical patient details
 */
export const updatePatient = async (hospitalId, patientId, updateData) => {
  return withTransaction(async (t) => {
    const patient = await Patient.findOne({
      where: {
        id: patientId,
        hospitalId,
      },
      transaction: t,
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Apply updates
    await patient.update(updateData, { transaction: t });
    return patient;
  });
};

/**
 * Update patient active/inactive status
 */
export const updatePatientStatus = async (hospitalId, patientId, isActive) => {
  return withTransaction(async (t) => {
    const patient = await Patient.findOne({
      where: {
        id: patientId,
        hospitalId,
      },
      transaction: t,
    });

    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    await patient.update({ isActive: Boolean(isActive) }, { transaction: t });
    return patient;
  });
};

export default {
  generateNextUHID,
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  updatePatientStatus,
};
