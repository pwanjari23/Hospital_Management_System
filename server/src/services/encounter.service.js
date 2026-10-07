import { Op } from 'sequelize';
import {
  Encounter,
  Vital,
  EncounterDiagnosis,
  Patient,
  Appointment,
  User,
  Department,
  HospitalSequence,
  HospitalSetting,
  Prescription,
  PrescriptionItem,
  Medicine,
  InvestigationOrder,
  Investigation,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';

/**
 * Generate unique, tenant-safe Encounter Number: ENC-YYYY-000001
 */
export const generateNextEncounterNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'ENCOUNTER' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'encounter_prefix' },
      transaction: t,
    });

    let prefix = customPrefixSetting?.value?.trim().toUpperCase();
    if (!prefix) {
      prefix = 'ENC';
    }

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'ENCOUNTER',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'ENCOUNTER' },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }
  }

  const nextValue = Number(seq.lastValue) + 1;
  await seq.update({ lastValue: nextValue }, { transaction: t });

  const year = new Date().getFullYear();
  return `${seq.prefix}-${year}-${String(nextValue).padStart(6, '0')}`;
};

/**
 * List Encounters with server-side filters & pagination
 */
export const getEncounters = async (hospitalId, options = {}) => {
  const {
    doctorId,
    patientId,
    departmentId,
    status,
    encounterType,
    date,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = options;

  const where = { hospitalId };

  if (doctorId) where.doctorId = doctorId;
  if (patientId) where.patientId = patientId;
  if (departmentId) where.departmentId = departmentId;
  if (status && status !== 'ALL') where.status = status.toUpperCase();
  if (encounterType && encounterType !== 'ALL') where.encounterType = encounterType.toUpperCase();

  if (date) {
    where.createdAt = {
      [Op.gte]: new Date(`${date}T00:00:00.000Z`),
      [Op.lte]: new Date(`${date}T23:59:59.999Z`),
    };
  }

  const patientWhere = {};
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    patientWhere[Op.or] = [
      { firstName: { [Op.iLike]: s } },
      { lastName: { [Op.iLike]: s } },
      { uhid: { [Op.iLike]: s } },
      { phone: { [Op.iLike]: s } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await Encounter.findAndCountAll({
    where,
    include: [
      {
        model: Patient,
        as: 'patient',
        where: Object.keys(patientWhere).length > 0 ? patientWhere : undefined,
        attributes: ['id', 'uhid', 'firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'bloodGroup', 'allergies'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'phone', 'specialization', 'qualification'],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: Appointment,
        as: 'appointment',
        attributes: ['id', 'appointmentNumber', 'appointmentDate', 'startTime', 'endTime', 'status'],
      },
      {
        model: Vital,
        as: 'vitals',
        limit: 1,
        order: [['recordedAt', 'DESC']],
      },
      {
        model: EncounterDiagnosis,
        as: 'diagnoses',
      },
    ],
    limit: limitNum,
    offset,
    order: [[sortBy || 'createdAt', sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
    distinct: true,
  });

  return {
    encounters: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

/**
 * Get Encounter Details by ID with complete clinical snapshot
 */
export const getEncounterById = async (hospitalId, id, options = {}) => {
  const encounter = await Encounter.findOne({
    where: { id, hospitalId },
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: [
          'id',
          'uhid',
          'firstName',
          'middleName',
          'lastName',
          'gender',
          'dateOfBirth',
          'phone',
          'email',
          'bloodGroup',
          'allergies',
          'medicalNotes',
        ],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'phone', 'specialization', 'qualification', 'consultationFee'],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: Appointment,
        as: 'appointment',
        attributes: ['id', 'appointmentNumber', 'appointmentDate', 'startTime', 'endTime', 'status', 'reason'],
      },
      {
        model: Vital,
        as: 'vitals',
        order: [['recordedAt', 'DESC']],
      },
      {
        model: EncounterDiagnosis,
        as: 'diagnoses',
        order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
      },
      {
        model: Prescription,
        as: 'prescriptions',
        include: [
          {
            model: PrescriptionItem,
            as: 'items',
            include: [
              {
                model: Medicine,
                as: 'medicine',
                attributes: ['id', 'name', 'genericName', 'category', 'strength', 'dosageForm', 'status'],
              },
            ],
          },
        ],
      },
      {
        model: InvestigationOrder,
        as: 'investigationOrders',
        include: [
          {
            model: Investigation,
            as: 'investigation',
            attributes: ['id', 'name', 'code', 'category', 'defaultCharge', 'status'],
          },
        ],
      },
    ],
    ...options,
  });

  if (!encounter) {
    const error = new Error('Clinical encounter not found');
    error.statusCode = 404;
    throw error;
  }

  return encounter;
};

/**
 * Start or Create Encounter (commonly from checked-in appointment or direct registration)
 */
export const createEncounter = async (hospitalId, encounterData, createdByUserId) => {
  return withTransaction(async (t) => {
    let {
      patientId,
      doctorId,
      departmentId,
      appointmentId,
      encounterType = 'OPD',
      chiefComplaint,
    } = encounterData;

    // 1. If appointmentId is provided, validate appointment and reuse its details
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findOne({
        where: { id: appointmentId, hospitalId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!appointment) {
        const error = new Error('Appointment not found in this hospital');
        error.statusCode = 404;
        throw error;
      }

      // If an encounter is already linked to this appointment, return existing encounter
      const existing = await Encounter.findOne({
        where: { appointmentId, hospitalId },
        transaction: t,
      });
      if (existing) {
        return getEncounterById(hospitalId, existing.id, { transaction: t });
      }

      // Check appointment status eligibility
      if (['CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
        const error = new Error(`Cannot start clinical encounter for ${appointment.status.toLowerCase()} appointment`);
        error.statusCode = 400;
        throw error;
      }

      patientId = appointment.patientId;
      doctorId = appointment.doctorId;
      departmentId = appointment.departmentId;
      chiefComplaint = chiefComplaint || appointment.reason;

      // Update appointment status to IN_PROGRESS if CHECKED_IN or SCHEDULED
      if (['CHECKED_IN', 'SCHEDULED', 'CONFIRMED'].includes(appointment.status)) {
        await appointment.update({ status: 'IN_PROGRESS' }, { transaction: t });
      }
    }

    // 2. Validate Patient
    const patient = await Patient.findOne({
      where: { id: patientId, hospitalId, isActive: true },
      transaction: t,
    });
    if (!patient) {
      const error = new Error('Active patient not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 3. Validate Doctor
    const doctor = await User.findOne({
      where: { id: doctorId, hospitalId, status: 'ACTIVE' },
      transaction: t,
    });
    if (!doctor) {
      const error = new Error('Active doctor not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 4. Generate Encounter Number
    const encounterNumber = await generateNextEncounterNumber(hospitalId, t);

    // 5. Create Encounter
    const encounter = await Encounter.create(
      {
        hospitalId,
        encounterNumber,
        patientId,
        doctorId,
        departmentId: departmentId || doctor.departmentId || null,
        appointmentId: appointmentId || null,
        encounterType: encounterType.toUpperCase(),
        status: 'VITALS_PENDING',
        chiefComplaint: chiefComplaint?.trim() || null,
        startedAt: new Date(),
        createdBy: createdByUserId || null,
      },
      { transaction: t }
    );

    return getEncounterById(hospitalId, encounter.id, { transaction: t });
  });
};

/**
 * Update Consultation Notes, Assessment, and Plan (Doctor Save Draft)
 */
export const updateConsultation = async (hospitalId, id, updateData, updatedByUserId) => {
  return withTransaction(async (t) => {
    const encounter = await Encounter.findOne({
      where: { id, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!encounter) {
      const error = new Error('Clinical encounter not found');
      error.statusCode = 404;
      throw error;
    }

    if (encounter.status === 'COMPLETED') {
      const error = new Error('Cannot edit a completed encounter. Clinical notes are locked.');
      error.statusCode = 400;
      throw error;
    }

    const updates = {
      ...updateData,
      updatedBy: updatedByUserId || null,
    };

    // If status is still VITALS_PENDING or READY_FOR_DOCTOR, transition to IN_CONSULTATION
    if (['VITALS_PENDING', 'READY_FOR_DOCTOR'].includes(encounter.status)) {
      updates.status = 'IN_CONSULTATION';
    }

    await encounter.update(updates, { transaction: t });
    return getEncounterById(hospitalId, id, { transaction: t });
  });
};

/**
 * Complete Consultation
 */
export const completeEncounter = async (hospitalId, id, completeData = {}, completedByUserId) => {
  return withTransaction(async (t) => {
    const encounter = await Encounter.findOne({
      where: { id, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!encounter) {
      const error = new Error('Clinical encounter not found');
      error.statusCode = 404;
      throw error;
    }

    if (encounter.status === 'COMPLETED') {
      return getEncounterById(hospitalId, id, { transaction: t });
    }

    const updates = {
      ...completeData,
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedBy: completedByUserId || null,
    };

    await encounter.update(updates, { transaction: t });

    // Synchronize Appointment status to COMPLETED if linked
    if (encounter.appointmentId) {
      const appointment = await Appointment.findOne({
        where: { id: encounter.appointmentId, hospitalId },
        transaction: t,
      });
      if (appointment) {
        await appointment.update({ status: 'COMPLETED' }, { transaction: t });
      }
    }

    return getEncounterById(hospitalId, id, { transaction: t });
  });
};

/**
 * Update Encounter Status with Controlled Lifecycle Transitions
 */
export const updateEncounterStatus = async (hospitalId, id, targetStatus, updatedByUserId) => {
  const ALLOWED_TRANSITIONS = {
    OPEN: ['VITALS_PENDING', 'READY_FOR_DOCTOR', 'CANCELLED'],
    VITALS_PENDING: ['READY_FOR_DOCTOR', 'IN_CONSULTATION', 'CANCELLED'],
    READY_FOR_DOCTOR: ['IN_CONSULTATION', 'CANCELLED'],
    IN_CONSULTATION: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  return withTransaction(async (t) => {
    const encounter = await Encounter.findOne({
      where: { id, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!encounter) {
      const error = new Error('Clinical encounter not found');
      error.statusCode = 404;
      throw error;
    }

    if (encounter.status === targetStatus) {
      return encounter;
    }

    const allowed = ALLOWED_TRANSITIONS[encounter.status] || [];
    if (!allowed.includes(targetStatus)) {
      const error = new Error(`Cannot transition encounter from ${encounter.status} to ${targetStatus}`);
      error.statusCode = 400;
      throw error;
    }

    const updates = {
      status: targetStatus,
      updatedBy: updatedByUserId || null,
    };

    if (targetStatus === 'COMPLETED') {
      updates.completedAt = new Date();
      if (encounter.appointmentId) {
        const appointment = await Appointment.findOne({
          where: { id: encounter.appointmentId, hospitalId },
          transaction: t,
        });
        if (appointment) {
          await appointment.update({ status: 'COMPLETED' }, { transaction: t });
        }
      }
    }

    await encounter.update(updates, { transaction: t });
    return getEncounterById(hospitalId, id, { transaction: t });
  });
};

/**
 * Patient Previous Encounter History / Clinical Timeline
 */
export const getPatientEncounterHistory = async (hospitalId, patientId) => {
  return Encounter.findAll({
    where: { hospitalId, patientId },
    include: [
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name'],
      },
      {
        model: Vital,
        as: 'vitals',
        limit: 1,
        order: [['recordedAt', 'DESC']],
      },
      {
        model: EncounterDiagnosis,
        as: 'diagnoses',
      },
    ],
    order: [['createdAt', 'DESC']],
  });
};

export default {
  generateNextEncounterNumber,
  getEncounters,
  getEncounterById,
  createEncounter,
  updateConsultation,
  updateEncounter: updateConsultation,
  updateEncounterStatus,
  completeEncounter,
  completeConsultation: completeEncounter,
  getPatientEncounterHistory,
};
