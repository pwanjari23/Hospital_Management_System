import { Op } from 'sequelize';
import {
  Ward,
  Bed,
  IpdAdmission,
  IpdBedTransfer,
  IpdProgressNote,
  IpdNursingNote,
  DischargeSummary,
  DischargeMedication,
  Vital,
  Prescription,
  PrescriptionItem,
  InvestigationOrder,
  Investigation,
  InvestigationResult,
  PrescriptionDispensing,
  Medicine,
  Patient,
  User,
  Department,
  HospitalSequence,
  HospitalSetting,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';

// ==============================================================
// 1. AUDIT EVENT LOGGER HELPER
// ==============================================================

/**
 * Structured audit logging for IPD operations
 */
export const logAuditEvent = ({ actor, hospitalId, action, target, targetId, metadata = {} }) => {
  const auditRecord = {
    timestamp: new Date().toISOString(),
    action,
    actorId: actor?.id || null,
    actorName: actor?.name || 'SYSTEM',
    hospitalId,
    target,
    targetId,
    metadata,
  };
  // Structured console log for container audit collectors
  console.log(`[IPD_AUDIT] ${JSON.stringify(auditRecord)}`);
  return auditRecord;
};

// ==============================================================
// 2. CONCURRENCY-SAFE SEQUENCE GENERATORS
// ==============================================================

/**
 * Generate sequential, tenant-scoped IPD admission number
 * Format: IPD-YYYY-000001
 */
export const generateNextAdmissionNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'IPD' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefix = await HospitalSetting.findOne({
      where: { hospitalId, key: 'ipd_admission_prefix' },
      transaction: t,
    });

    const prefix = customPrefix?.value?.trim().toUpperCase() || 'IPD';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'IPD',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'IPD' },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }
  }

  const nextVal = Number(seq.lastValue) + 1;
  await seq.update({ lastValue: nextVal }, { transaction: t });

  const currentYear = new Date().getFullYear();
  return `${seq.prefix}-${currentYear}-${String(nextVal).padStart(6, '0')}`;
};

/**
 * Generate sequential, tenant-scoped IPD discharge summary number
 * Format: DIS-YYYY-000001
 */
export const generateNextDischargeNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'DISCHARGE' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefix = await HospitalSetting.findOne({
      where: { hospitalId, key: 'ipd_discharge_prefix' },
      transaction: t,
    });

    const prefix = customPrefix?.value?.trim().toUpperCase() || 'DIS';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'DISCHARGE',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'DISCHARGE' },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }
  }

  const nextVal = Number(seq.lastValue) + 1;
  await seq.update({ lastValue: nextVal }, { transaction: t });

  const currentYear = new Date().getFullYear();
  return `${seq.prefix}-${currentYear}-${String(nextVal).padStart(6, '0')}`;
};

// ==============================================================
// 3. WARD MANAGEMENT
// ==============================================================

export const createWard = async (hospitalId, data, user) => {
  const { wardCode, wardName, wardType, floor, departmentId, description, genderPolicy } = data;

  // Case-insensitive uniqueness check per hospital
  const existingWard = await Ward.findOne({
    where: {
      hospitalId,
      wardCode: wardCode.trim().toUpperCase(),
    },
  });

  if (existingWard) {
    const error = new Error(`Ward code '${wardCode.trim().toUpperCase()}' already exists in this hospital`);
    error.statusCode = 400;
    throw error;
  }

  // If department specified, verify it belongs to this hospital
  if (departmentId) {
    const dept = await Department.findOne({ where: { id: departmentId, hospitalId } });
    if (!dept) {
      const error = new Error('Specified department does not exist in this hospital');
      error.statusCode = 400;
      throw error;
    }
  }

  const ward = await Ward.create({
    hospitalId,
    wardCode: wardCode.trim().toUpperCase(),
    wardName: wardName.trim(),
    wardType: wardType || 'GENERAL',
    floor: floor?.trim() || null,
    departmentId: departmentId || null,
    description: description?.trim() || null,
    genderPolicy: genderPolicy || 'ANY',
    isActive: true,
    createdBy: user?.id || null,
    updatedBy: user?.id || null,
  });

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_WARD_CREATED',
    target: 'Ward',
    targetId: ward.id,
    metadata: { wardCode: ward.wardCode, wardName: ward.wardName },
  });

  return getWardById(hospitalId, ward.id);
};

export const getWards = async (hospitalId, query = {}) => {
  const { search, wardType, isActive, departmentId } = query;
  const where = { hospitalId };

  if (isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (wardType) {
    where.wardType = wardType;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (search) {
    where[Op.or] = [
      { wardCode: { [Op.iLike]: `%${search.trim()}%` } },
      { wardName: { [Op.iLike]: `%${search.trim()}%` } },
      { floor: { [Op.iLike]: `%${search.trim()}%` } },
    ];
  }

  const wards = await Ward.findAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: Bed,
        as: 'beds',
        attributes: ['id', 'bedNumber', 'bedType', 'status', 'isActive'],
      },
    ],
    order: [['wardName', 'ASC']],
  });

  // Calculate bed metrics for each ward
  return wards.map((w) => {
    const json = w.toJSON();
    const beds = json.beds || [];
    const totalBeds = beds.length;
    const availableBeds = beds.filter((b) => b.status === 'AVAILABLE' && b.isActive).length;
    const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED' && b.isActive).length;
    const maintenanceBeds = beds.filter((b) => b.status === 'MAINTENANCE' && b.isActive).length;
    const blockedBeds = beds.filter((b) => b.status === 'BLOCKED' && b.isActive).length;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      ...json,
      totalBeds,
      availableBeds,
      occupiedBeds,
      maintenanceBeds,
      blockedBeds,
      occupancyRate,
    };
  });
};

export const getWardById = async (hospitalId, wardId) => {
  const ward = await Ward.findOne({
    where: { id: wardId, hospitalId },
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: Bed,
        as: 'beds',
        attributes: ['id', 'bedNumber', 'bedType', 'floor', 'status', 'notes', 'isActive'],
      },
    ],
  });

  if (!ward) {
    const error = new Error('Ward not found');
    error.statusCode = 404;
    throw error;
  }

  const json = ward.toJSON();
  const beds = json.beds || [];
  const totalBeds = beds.length;
  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE' && b.isActive).length;
  const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED' && b.isActive).length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return {
    ...json,
    totalBeds,
    availableBeds,
    occupiedBeds,
    occupancyRate,
  };
};

export const updateWard = async (hospitalId, wardId, data, user) => {
  const ward = await Ward.findOne({ where: { id: wardId, hospitalId } });
  if (!ward) {
    const error = new Error('Ward not found');
    error.statusCode = 404;
    throw error;
  }

  const { wardCode, wardName, wardType, floor, departmentId, description, genderPolicy, isActive } = data;

  if (wardCode && wardCode.trim().toUpperCase() !== ward.wardCode) {
    const duplicate = await Ward.findOne({
      where: {
        hospitalId,
        wardCode: wardCode.trim().toUpperCase(),
        id: { [Op.ne]: wardId },
      },
    });
    if (duplicate) {
      const error = new Error(`Ward code '${wardCode.trim().toUpperCase()}' is already in use`);
      error.statusCode = 400;
      throw error;
    }
    ward.wardCode = wardCode.trim().toUpperCase();
  }

  if (departmentId !== undefined) {
    if (departmentId) {
      const dept = await Department.findOne({ where: { id: departmentId, hospitalId } });
      if (!dept) {
        const error = new Error('Specified department does not exist in this hospital');
        error.statusCode = 400;
        throw error;
      }
      ward.departmentId = departmentId;
    } else {
      ward.departmentId = null;
    }
  }

  // If deactivating ward, prevent deactivation if there are occupied beds
  if (isActive === false && ward.isActive === true) {
    const occupiedCount = await Bed.count({
      where: { hospitalId, wardId, status: 'OCCUPIED' },
    });
    if (occupiedCount > 0) {
      const error = new Error(`Cannot deactivate ward with ${occupiedCount} currently occupied bed(s)`);
      error.statusCode = 400;
      throw error;
    }
    ward.isActive = false;
  } else if (isActive === true) {
    ward.isActive = true;
  }

  if (wardName) ward.wardName = wardName.trim();
  if (wardType) ward.wardType = wardType;
  if (floor !== undefined) ward.floor = floor?.trim() || null;
  if (description !== undefined) ward.description = description?.trim() || null;
  if (genderPolicy) ward.genderPolicy = genderPolicy;
  ward.updatedBy = user?.id || null;

  await ward.save();

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_WARD_UPDATED',
    target: 'Ward',
    targetId: ward.id,
    metadata: { wardCode: ward.wardCode, wardName: ward.wardName, isActive: ward.isActive },
  });

  return getWardById(hospitalId, ward.id);
};

// ==============================================================
// 4. BED MANAGEMENT & AVAILABILITY
// ==============================================================

export const createBed = async (hospitalId, data, user) => {
  const { wardId, bedNumber, bedType, floor, notes, status } = data;

  const ward = await Ward.findOne({ where: { id: wardId, hospitalId } });
  if (!ward) {
    const error = new Error('Ward not found in this hospital');
    error.statusCode = 404;
    throw error;
  }

  if (!ward.isActive) {
    const error = new Error('Cannot add bed to an inactive ward');
    error.statusCode = 400;
    throw error;
  }

  // Uniqueness within ward and hospital
  const existingBed = await Bed.findOne({
    where: {
      hospitalId,
      wardId,
      bedNumber: bedNumber.trim().toUpperCase(),
    },
  });

  if (existingBed) {
    const error = new Error(`Bed '${bedNumber.trim().toUpperCase()}' already exists in this ward`);
    error.statusCode = 400;
    throw error;
  }

  const initialStatus = status || 'AVAILABLE';
  if (initialStatus === 'OCCUPIED') {
    const error = new Error('New bed cannot be created directly with OCCUPIED status; create an admission instead');
    error.statusCode = 400;
    throw error;
  }

  const bed = await Bed.create({
    hospitalId,
    wardId,
    bedNumber: bedNumber.trim().toUpperCase(),
    bedType: bedType || 'STANDARD',
    floor: floor?.trim() || ward.floor || null,
    status: initialStatus,
    notes: notes?.trim() || null,
    isActive: true,
    createdBy: user?.id || null,
    updatedBy: user?.id || null,
  });

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_BED_CREATED',
    target: 'Bed',
    targetId: bed.id,
    metadata: { bedNumber: bed.bedNumber, wardId: bed.wardId, status: bed.status },
  });

  return getBedById(hospitalId, bed.id);
};

export const getBeds = async (hospitalId, query = {}) => {
  const { wardId, status, bedType, isActive, search } = query;
  const where = { hospitalId };

  if (wardId) where.wardId = wardId;
  if (status) where.status = status;
  if (bedType) where.bedType = bedType;
  if (isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    where.bedNumber = { [Op.iLike]: `%${search.trim()}%` };
  }

  const beds = await Bed.findAll({
    where,
    include: [
      {
        model: Ward,
        as: 'ward',
        attributes: ['id', 'wardCode', 'wardName', 'wardType', 'floor'],
      },
      {
        model: IpdAdmission,
        as: 'ipdAdmissions',
        where: { status: { [Op.in]: ['ADMITTED', 'TRANSFER_PENDING'] } },
        required: false,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'firstName', 'lastName', 'uhid', 'phone', 'gender', 'dateOfBirth'],
          },
          {
            model: User,
            as: 'admittingDoctor',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
    order: [
      ['wardId', 'ASC'],
      ['bedNumber', 'ASC'],
    ],
  });

  return beds.map((b) => {
    const json = b.toJSON();
    const currentAdmission = json.ipdAdmissions?.[0] || null;
    delete json.ipdAdmissions;
    return {
      ...json,
      currentAdmission,
    };
  });
};

export const getBedById = async (hospitalId, bedId) => {
  const bed = await Bed.findOne({
    where: { id: bedId, hospitalId },
    include: [
      {
        model: Ward,
        as: 'ward',
        attributes: ['id', 'wardCode', 'wardName', 'wardType', 'floor'],
      },
      {
        model: IpdAdmission,
        as: 'ipdAdmissions',
        where: { status: { [Op.in]: ['ADMITTED', 'TRANSFER_PENDING'] } },
        required: false,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'firstName', 'lastName', 'uhid', 'phone', 'gender', 'dateOfBirth'],
          },
          {
            model: User,
            as: 'admittingDoctor',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  if (!bed) {
    const error = new Error('Bed not found');
    error.statusCode = 404;
    throw error;
  }

  const json = bed.toJSON();
  const currentAdmission = json.ipdAdmissions?.[0] || null;
  delete json.ipdAdmissions;

  return {
    ...json,
    currentAdmission,
  };
};

export const updateBed = async (hospitalId, bedId, data, user) => {
  const bed = await Bed.findOne({ where: { id: bedId, hospitalId } });
  if (!bed) {
    const error = new Error('Bed not found');
    error.statusCode = 404;
    throw error;
  }

  const { bedNumber, bedType, floor, notes, isActive, wardId } = data;

  if (wardId && wardId !== bed.wardId) {
    if (bed.status === 'OCCUPIED') {
      const error = new Error('Cannot change ward of an occupied bed; use transfer workflow');
      error.statusCode = 400;
      throw error;
    }
    const newWard = await Ward.findOne({ where: { id: wardId, hospitalId } });
    if (!newWard || !newWard.isActive) {
      const error = new Error('Target ward does not exist or is inactive');
      error.statusCode = 400;
      throw error;
    }
    bed.wardId = wardId;
  }

  if (bedNumber && bedNumber.trim().toUpperCase() !== bed.bedNumber) {
    const duplicate = await Bed.findOne({
      where: {
        hospitalId,
        wardId: bed.wardId,
        bedNumber: bedNumber.trim().toUpperCase(),
        id: { [Op.ne]: bedId },
      },
    });
    if (duplicate) {
      const error = new Error(`Bed '${bedNumber.trim().toUpperCase()}' already exists in this ward`);
      error.statusCode = 400;
      throw error;
    }
    bed.bedNumber = bedNumber.trim().toUpperCase();
  }

  if (isActive === false && bed.status === 'OCCUPIED') {
    const error = new Error('Cannot deactivate an occupied bed; patient must be transferred or discharged first');
    error.statusCode = 400;
    throw error;
  }

  if (bedType) bed.bedType = bedType;
  if (floor !== undefined) bed.floor = floor?.trim() || null;
  if (notes !== undefined) bed.notes = notes?.trim() || null;
  if (isActive !== undefined) bed.isActive = isActive;
  bed.updatedBy = user?.id || null;

  await bed.save();

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_BED_UPDATED',
    target: 'Bed',
    targetId: bed.id,
    metadata: { bedNumber: bed.bedNumber, status: bed.status, isActive: bed.isActive },
  });

  return getBedById(hospitalId, bed.id);
};

export const updateBedStatus = async (hospitalId, bedId, { status, notes }, user) => {
  const bed = await Bed.findOne({ where: { id: bedId, hospitalId } });
  if (!bed) {
    const error = new Error('Bed not found');
    error.statusCode = 404;
    throw error;
  }

  if (bed.status === 'OCCUPIED' && status !== 'OCCUPIED') {
    const error = new Error('Cannot change status of an occupied bed directly; patient must be transferred or discharged first');
    error.statusCode = 400;
    throw error;
  }

  if (status === 'OCCUPIED' && bed.status !== 'OCCUPIED') {
    const error = new Error('Cannot directly set bed status to OCCUPIED; use admission or transfer workflow');
    error.statusCode = 400;
    throw error;
  }

  const validStatuses = ['AVAILABLE', 'RESERVED', 'MAINTENANCE', 'BLOCKED'];
  if (!validStatuses.includes(status)) {
    const error = new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const previousStatus = bed.status;
  bed.status = status;
  if (notes !== undefined) bed.notes = notes?.trim() || null;
  bed.updatedBy = user?.id || null;
  await bed.save();

  let auditAction = 'IPD_BED_UPDATED';
  if (status === 'BLOCKED') auditAction = 'IPD_BED_BLOCKED';
  else if (previousStatus === 'BLOCKED' && status === 'AVAILABLE') auditAction = 'IPD_BED_UNBLOCKED';

  logAuditEvent({
    actor: user,
    hospitalId,
    action: auditAction,
    target: 'Bed',
    targetId: bed.id,
    metadata: { previousStatus, newStatus: status, notes },
  });

  return getBedById(hospitalId, bed.id);
};

// ==============================================================
// 5. IPD ADMISSIONS & CONCURRENT BED ALLOCATION
// ==============================================================

export const createAdmission = async (hospitalId, data, user) => {
  const {
    patientId,
    admittingDoctorId,
    departmentId,
    wardId,
    bedId,
    admissionType,
    admissionDate,
    admissionTime,
    reasonForAdmission,
    provisionalDiagnosis,
    referredBy,
    emergencyCase,
    expectedDischargeDate,
    notes,
  } = data;

  return withTransaction(async (t) => {
    // 1. Verify Patient exists and belongs to hospital
    const patient = await Patient.findOne({
      where: { id: patientId, hospitalId },
      transaction: t,
    });
    if (!patient) {
      const error = new Error('Patient not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 2. Prevent duplicate active admissions for the same patient
    const existingActiveAdmission = await IpdAdmission.findOne({
      where: {
        hospitalId,
        patientId,
        status: { [Op.in]: ['ADMITTED', 'TRANSFER_PENDING'] },
      },
      transaction: t,
    });

    if (existingActiveAdmission) {
      const error = new Error(
        `Patient already has an active admission (${existingActiveAdmission.admissionNumber})`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Verify Doctor exists and belongs to hospital
    const doctor = await User.findOne({
      where: { id: admittingDoctorId, hospitalId },
      transaction: t,
    });
    if (!doctor) {
      const error = new Error('Admitting doctor not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 4. Verify Ward exists, belongs to hospital, and is active
    const ward = await Ward.findOne({
      where: { id: wardId, hospitalId },
      transaction: t,
    });
    if (!ward) {
      const error = new Error('Ward not found in this hospital');
      error.statusCode = 404;
      throw error;
    }
    if (!ward.isActive) {
      const error = new Error('Selected ward is currently inactive');
      error.statusCode = 400;
      throw error;
    }

    // 5. If Department specified, verify it belongs to hospital
    let resolvedDepartmentId = departmentId || ward.departmentId;
    if (resolvedDepartmentId) {
      const dept = await Department.findOne({
        where: { id: resolvedDepartmentId, hospitalId },
        transaction: t,
      });
      if (!dept) {
        resolvedDepartmentId = null;
      }
    }

    // 6. Concurrency-Safe Row Lock on Bed
    // Note: Querying single Bed model without outer joins to avoid Postgres lock errors
    const bed = await Bed.findOne({
      where: { id: bedId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!bed) {
      const error = new Error('Bed not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    if (!bed.isActive) {
      const error = new Error('Selected bed is inactive and cannot be allocated');
      error.statusCode = 400;
      throw error;
    }

    if (bed.wardId !== wardId) {
      const error = new Error('Selected bed does not belong to the selected ward');
      error.statusCode = 400;
      throw error;
    }

    // Authoritative check on bed availability
    if (bed.status !== 'AVAILABLE') {
      const error = new Error(`Bed ${bed.bedNumber} is not available (Current status: ${bed.status})`);
      error.statusCode = 409;
      throw error;
    }

    // 7. Generate sequential admission number
    const admissionNumber = await generateNextAdmissionNumber(hospitalId, t);

    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    // 8. Create IPD Admission record
    const admission = await IpdAdmission.create(
      {
        hospitalId,
        admissionNumber,
        patientId,
        admittingDoctorId,
        departmentId: resolvedDepartmentId,
        wardId,
        bedId,
        admissionType: admissionType || 'PLANNED',
        admissionDate: admissionDate || currentDateStr,
        admissionTime: admissionTime || currentTimeStr,
        reasonForAdmission: reasonForAdmission?.trim() || 'Clinical evaluation and inpatient care',
        provisionalDiagnosis: provisionalDiagnosis?.trim() || null,
        referredBy: referredBy?.trim() || null,
        emergencyCase: Boolean(emergencyCase),
        status: 'ADMITTED',
        expectedDischargeDate: expectedDischargeDate || null,
        notes: notes?.trim() || null,
        createdBy: user?.id || null,
        updatedBy: user?.id || null,
      },
      { transaction: t }
    );

    // 9. Update Bed status to OCCUPIED atomically
    await bed.update(
      {
        status: 'OCCUPIED',
        updatedBy: user?.id || null,
      },
      { transaction: t }
    );

    // 10. Audit Logging
    logAuditEvent({
      actor: user,
      hospitalId,
      action: 'IPD_ADMISSION_CREATED',
      target: 'IpdAdmission',
      targetId: admission.id,
      metadata: {
        admissionNumber,
        patientId,
        wardId,
        bedId: bed.id,
        bedNumber: bed.bedNumber,
      },
    });

    logAuditEvent({
      actor: user,
      hospitalId,
      action: 'IPD_BED_ASSIGNED',
      target: 'Bed',
      targetId: bed.id,
      metadata: {
        admissionId: admission.id,
        admissionNumber,
        patientId,
      },
    });

    return admission.id;
  }).then((admissionId) => getAdmissionById(hospitalId, admissionId));
};

export const getAdmissions = async (hospitalId, query = {}) => {
  const {
    status,
    wardId,
    admittingDoctorId,
    departmentId,
    admissionType,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = query;

  const where = { hospitalId };

  if (status) where.status = status;
  if (wardId) where.wardId = wardId;
  if (admittingDoctorId) where.admittingDoctorId = admittingDoctorId;
  if (departmentId) where.departmentId = departmentId;
  if (admissionType) where.admissionType = admissionType;

  if (startDate && endDate) {
    where.admissionDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.admissionDate = { [Op.gte]: startDate };
  } else if (endDate) {
    where.admissionDate = { [Op.lte]: endDate };
  }

  const patientWhere = {};
  if (search) {
    const trimmed = search.trim();
    patientWhere[Op.or] = [
      { firstName: { [Op.iLike]: `%${trimmed}%` } },
      { lastName: { [Op.iLike]: `%${trimmed}%` } },
      { uhid: { [Op.iLike]: `%${trimmed}%` } },
      { phone: { [Op.iLike]: `%${trimmed}%` } },
    ];
  }

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));

  const { count, rows } = await IpdAdmission.findAndCountAll({
    where,
    include: [
      {
        model: Patient,
        as: 'patient',
        where: Object.keys(patientWhere).length > 0 ? patientWhere : undefined,
        attributes: ['id', 'firstName', 'lastName', 'uhid', 'phone', 'gender', 'dateOfBirth'],
      },
      {
        model: User,
        as: 'admittingDoctor',
        attributes: ['id', 'name'],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: Ward,
        as: 'ward',
        attributes: ['id', 'wardCode', 'wardName', 'wardType', 'floor'],
      },
      {
        model: Bed,
        as: 'bed',
        attributes: ['id', 'bedNumber', 'bedType', 'floor', 'status'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: Math.max(1, parseInt(limit, 10)),
    offset,
  });

  return {
    total: count,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(count / Math.max(1, parseInt(limit, 10))),
    admissions: rows,
  };
};

export const getAdmissionById = async (hospitalId, admissionId) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: [
          'id',
          'firstName',
          'lastName',
          'uhid',
          'phone',
          'gender',
          'dateOfBirth',
          'bloodGroup',
          'address',
          'emergencyContactName',
          'emergencyContactPhone',
        ],
      },
      {
        model: User,
        as: 'admittingDoctor',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
      {
        model: Ward,
        as: 'ward',
        attributes: ['id', 'wardCode', 'wardName', 'wardType', 'floor'],
      },
      {
        model: Bed,
        as: 'bed',
        attributes: ['id', 'bedNumber', 'bedType', 'floor', 'status'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
      {
        model: IpdBedTransfer,
        as: 'bedTransfers',
        include: [
          {
            model: Ward,
            as: 'fromWard',
            attributes: ['id', 'wardCode', 'wardName', 'wardType'],
          },
          {
            model: Ward,
            as: 'toWard',
            attributes: ['id', 'wardCode', 'wardName', 'wardType'],
          },
          {
            model: Bed,
            as: 'fromBed',
            attributes: ['id', 'bedNumber', 'bedType'],
          },
          {
            model: Bed,
            as: 'toBed',
            attributes: ['id', 'bedNumber', 'bedType'],
          },
          {
            model: User,
            as: 'transferredByUser',
            attributes: ['id', 'name'],
          },
        ],
        order: [['transferredAt', 'ASC']],
      },
      {
        model: DischargeSummary,
        as: 'dischargeSummaryRecord',
        include: [
          {
            model: DischargeMedication,
            as: 'medications',
            include: [
              {
                model: Medicine,
                as: 'medicine',
                attributes: ['id', 'name', 'dosageForm', 'strength', 'unit'],
              },
            ],
          },
          {
            model: User,
            as: 'dischargingDoctor',
            attributes: ['id', 'name'],
          },
          {
            model: User,
            as: 'finalizer',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  return admission;
};

export const cancelAdmission = async (hospitalId, admissionId, { reason }, user) => {
  return withTransaction(async (t) => {
    const admission = await IpdAdmission.findOne({
      where: { id: admissionId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!admission) {
      const error = new Error('Admission not found');
      error.statusCode = 404;
      throw error;
    }

    if (admission.status !== 'ADMITTED') {
      const error = new Error(`Cannot cancel admission with status: ${admission.status}`);
      error.statusCode = 400;
      throw error;
    }

    // Release allocated bed
    const bed = await Bed.findOne({
      where: { id: admission.bedId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (bed) {
      await bed.update({ status: 'AVAILABLE', updatedBy: user?.id || null }, { transaction: t });
    }

    admission.status = 'CANCELLED';
    admission.notes = admission.notes
      ? `${admission.notes}\n[CANCELLED: ${reason || 'No reason provided'}]`
      : `[CANCELLED: ${reason || 'No reason provided'}]`;
    admission.updatedBy = user?.id || null;
    await admission.save({ transaction: t });

    logAuditEvent({
      actor: user,
      hospitalId,
      action: 'IPD_ADMISSION_CANCELLED',
      target: 'IpdAdmission',
      targetId: admission.id,
      metadata: { admissionNumber: admission.admissionNumber, reason },
    });

    return admission.id;
  }).then((id) => getAdmissionById(hospitalId, id));
};

// ==============================================================
// 6. BED TRANSFER WORKFLOW
// ==============================================================

export const transferBed = async (hospitalId, admissionId, data, user) => {
  const { toWardId, toBedId, transferReason, notes } = data;

  return withTransaction(async (t) => {
    // 1. Lock Admission
    const admission = await IpdAdmission.findOne({
      where: { id: admissionId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!admission) {
      const error = new Error('IPD Admission not found');
      error.statusCode = 404;
      throw error;
    }

    if (admission.status !== 'ADMITTED') {
      const error = new Error(`Cannot transfer patient with admission status: ${admission.status}`);
      error.statusCode = 400;
      throw error;
    }

    if (admission.bedId === toBedId) {
      const error = new Error('Patient is already assigned to this bed');
      error.statusCode = 400;
      throw error;
    }

    // 2. Verify destination ward
    const toWard = await Ward.findOne({
      where: { id: toWardId, hospitalId },
      transaction: t,
    });
    if (!toWard) {
      const error = new Error('Destination ward not found');
      error.statusCode = 404;
      throw error;
    }
    if (!toWard.isActive) {
      const error = new Error('Destination ward is inactive');
      error.statusCode = 400;
      throw error;
    }

    // 3. Lock destination bed and verify availability
    const toBed = await Bed.findOne({
      where: { id: toBedId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!toBed) {
      const error = new Error('Destination bed not found');
      error.statusCode = 404;
      throw error;
    }

    if (!toBed.isActive) {
      const error = new Error('Destination bed is inactive');
      error.statusCode = 400;
      throw error;
    }

    if (toBed.wardId !== toWardId) {
      const error = new Error('Destination bed does not belong to the selected ward');
      error.statusCode = 400;
      throw error;
    }

    if (toBed.status !== 'AVAILABLE') {
      const error = new Error(`Destination bed is not available (Current status: ${toBed.status})`);
      error.statusCode = 409;
      throw error;
    }

    // 4. Lock current bed to release it
    const fromBed = await Bed.findOne({
      where: { id: admission.bedId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const fromWardId = admission.wardId;
    const fromBedId = admission.bedId;

    // 5. Update beds
    if (fromBed) {
      await fromBed.update({ status: 'AVAILABLE', updatedBy: user?.id || null }, { transaction: t });
    }
    await toBed.update({ status: 'OCCUPIED', updatedBy: user?.id || null }, { transaction: t });

    // 6. Update admission with new ward and bed
    await admission.update(
      {
        wardId: toWardId,
        bedId: toBed.id,
        updatedBy: user?.id || null,
      },
      { transaction: t }
    );

    // 7. Record immutable bed transfer history
    const transfer = await IpdBedTransfer.create(
      {
        hospitalId,
        admissionId: admission.id,
        patientId: admission.patientId,
        fromWardId,
        fromBedId,
        toWardId,
        toBedId: toBed.id,
        transferReason: transferReason?.trim() || 'Clinical necessity',
        transferredBy: user?.id || null,
        transferredAt: new Date(),
        notes: notes?.trim() || null,
      },
      { transaction: t }
    );

    // 8. Audit logging
    logAuditEvent({
      actor: user,
      hospitalId,
      action: 'IPD_BED_TRANSFERRED',
      target: 'IpdBedTransfer',
      targetId: transfer.id,
      metadata: {
        admissionId: admission.id,
        patientId: admission.patientId,
        fromWardId,
        fromBedId,
        toWardId,
        toBedId: toBed.id,
        transferReason,
      },
    });

    return admission.id;
  }).then((admissionId) => getAdmissionById(hospitalId, admissionId));
};

export const getAdmissionTransfers = async (hospitalId, admissionId) => {
  const transfers = await IpdBedTransfer.findAll({
    where: { hospitalId, admissionId },
    include: [
      {
        model: Ward,
        as: 'fromWard',
        attributes: ['id', 'wardCode', 'wardName', 'wardType'],
      },
      {
        model: Ward,
        as: 'toWard',
        attributes: ['id', 'wardCode', 'wardName', 'wardType'],
      },
      {
        model: Bed,
        as: 'fromBed',
        attributes: ['id', 'bedNumber', 'bedType'],
      },
      {
        model: Bed,
        as: 'toBed',
        attributes: ['id', 'bedNumber', 'bedType'],
      },
      {
        model: User,
        as: 'transferredByUser',
        attributes: ['id', 'name'],
      },
    ],
    order: [['transferredAt', 'ASC']],
  });

  return transfers;
};

// ==============================================================
// 7. PATIENT ADMISSIONS HISTORY
// ==============================================================

export const getPatientAdmissions = async (hospitalId, patientId) => {
  const admissions = await IpdAdmission.findAll({
    where: { hospitalId, patientId },
    include: [
      {
        model: User,
        as: 'admittingDoctor',
        attributes: ['id', 'name'],
      },
      {
        model: Ward,
        as: 'ward',
        attributes: ['id', 'wardCode', 'wardName', 'wardType', 'floor'],
      },
      {
        model: Bed,
        as: 'bed',
        attributes: ['id', 'bedNumber', 'bedType'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return admissions;
};

// ==============================================================
// 8. IPD DASHBOARD METRICS & OCCUPANCY
// ==============================================================

export const getIpdDashboardMetrics = async (hospitalId) => {
  const beds = await Bed.findAll({
    where: { hospitalId, isActive: true },
    attributes: ['id', 'status', 'wardId'],
  });

  const totalBeds = beds.length;
  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE').length;
  const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
  const reservedBeds = beds.filter((b) => b.status === 'RESERVED').length;
  const maintenanceBeds = beds.filter((b) => b.status === 'MAINTENANCE').length;
  const blockedBeds = beds.filter((b) => b.status === 'BLOCKED').length;

  const currentAdmissions = await IpdAdmission.count({
    where: { hospitalId, status: { [Op.in]: ['ADMITTED', 'TRANSFER_PENDING'] } },
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAdmissions = await IpdAdmission.count({
    where: { hospitalId, admissionDate: todayStr },
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const transfersToday = await IpdBedTransfer.count({
    where: {
      hospitalId,
      transferredAt: { [Op.gte]: startOfToday },
    },
  });

  const todayDischarges = await IpdAdmission.count({
    where: {
      hospitalId,
      status: 'DISCHARGED',
      [Op.or]: [
        { dischargedAt: { [Op.gte]: startOfToday } },
        { updatedAt: { [Op.gte]: startOfToday } },
      ],
    },
  });

  const dischargePending = await IpdAdmission.count({
    where: {
      hospitalId,
      status: 'DISCHARGE_PENDING',
    },
  });

  // Ward-wise occupancy
  const wards = await Ward.findAll({
    where: { hospitalId, isActive: true },
    include: [
      {
        model: Bed,
        as: 'beds',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'status'],
      },
    ],
    order: [['wardName', 'ASC']],
  });

  const wardOccupancy = wards.map((w) => {
    const wardBeds = w.beds || [];
    const wTotal = wardBeds.length;
    const wOccupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
    const wAvailable = wardBeds.filter((b) => b.status === 'AVAILABLE').length;
    const rate = wTotal > 0 ? Math.round((wOccupied / wTotal) * 100) : 0;

    return {
      wardId: w.id,
      wardName: w.wardName,
      wardCode: w.wardCode,
      wardType: w.wardType,
      totalBeds: wTotal,
      occupiedBeds: wOccupied,
      availableBeds: wAvailable,
      occupancyRate: rate,
    };
  });

  return {
    totalBeds,
    availableBeds,
    occupiedBeds,
    reservedBeds,
    maintenanceBeds,
    blockedBeds,
    currentAdmissions,
    todayAdmissions,
    todayDischarges,
    dischargePending,
    transfersToday,
    wardOccupancy,
  };
};

// ==============================================================
// 9. VISUAL BED BOARD / BED MAP
// ==============================================================

export const getBedBoard = async (hospitalId, query = {}) => {
  const { wardId } = query;
  const wardWhere = { hospitalId, isActive: true };
  if (wardId) wardWhere.id = wardId;

  const wards = await Ward.findAll({
    where: wardWhere,
    include: [
      {
        model: Bed,
        as: 'beds',
        where: { isActive: true },
        required: false,
        include: [
          {
            model: IpdAdmission,
            as: 'ipdAdmissions',
            where: { status: { [Op.in]: ['ADMITTED', 'TRANSFER_PENDING'] } },
            required: false,
            include: [
              {
                model: Patient,
                as: 'patient',
                attributes: ['id', 'firstName', 'lastName', 'uhid', 'gender', 'dateOfBirth'],
              },
              {
                model: User,
                as: 'admittingDoctor',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
      },
    ],
    order: [
      ['wardName', 'ASC'],
      [{ model: Bed, as: 'beds' }, 'bedNumber', 'ASC'],
    ],
  });

  return wards.map((w) => {
    const json = w.toJSON();
    const beds = (json.beds || []).map((b) => {
      const currentAdmission = b.ipdAdmissions?.[0] || null;
      delete b.ipdAdmissions;
      return {
        ...b,
        currentAdmission,
      };
    });

    return {
      id: json.id,
      wardName: json.wardName,
      wardCode: json.wardCode,
      wardType: json.wardType,
      floor: json.floor,
      beds,
    };
  });
};

// ==============================================================
// 10. INPATIENT VITALS WORKFLOW
// ==============================================================

export const createInpatientVital = async (hospitalId, admissionId, data, user) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  // Active admission check
  if (['DISCHARGED', 'CANCELLED'].includes(admission.status)) {
    const error = new Error(`Cannot record vitals for a ${admission.status.toLowerCase()} admission`);
    error.statusCode = 400;
    throw error;
  }

  const {
    temperature,
    pulseRate,
    respiratoryRate,
    systolicBp,
    diastolicBp,
    spo2,
    weightKg,
    heightCm,
    bloodGlucose,
    painScore,
    notes,
    recordedAt,
  } = data;

  // Auto calculate BMI if both height and weight are provided
  let calculatedBmi = null;
  if (weightKg && heightCm && Number(heightCm) > 0) {
    const heightM = Number(heightCm) / 100;
    calculatedBmi = Number((Number(weightKg) / (heightM * heightM)).toFixed(1));
  }

  const vital = await Vital.create({
    hospitalId,
    patientId: admission.patientId,
    ipdAdmissionId: admission.id,
    encounterId: null,
    recordedBy: user?.id || null,
    recordedAt: recordedAt || new Date(),
    temperature: temperature !== undefined && temperature !== '' ? temperature : null,
    pulseRate: pulseRate !== undefined && pulseRate !== '' ? pulseRate : null,
    respiratoryRate: respiratoryRate !== undefined && respiratoryRate !== '' ? respiratoryRate : null,
    systolicBp: systolicBp !== undefined && systolicBp !== '' ? systolicBp : null,
    diastolicBp: diastolicBp !== undefined && diastolicBp !== '' ? diastolicBp : null,
    spo2: spo2 !== undefined && spo2 !== '' ? spo2 : null,
    weightKg: weightKg !== undefined && weightKg !== '' ? weightKg : null,
    heightCm: heightCm !== undefined && heightCm !== '' ? heightCm : null,
    bmi: calculatedBmi,
    bloodGlucose: bloodGlucose !== undefined && bloodGlucose !== '' ? bloodGlucose : null,
    painScore: painScore !== undefined && painScore !== '' ? painScore : null,
    notes: notes?.trim() || null,
  });

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_VITAL_RECORDED',
    target: 'Vital',
    targetId: vital.id,
    metadata: {
      admissionId: admission.id,
      patientId: admission.patientId,
      pulseRate: vital.pulseRate,
      systolicBp: vital.systolicBp,
      diastolicBp: vital.diastolicBp,
      spo2: vital.spo2,
    },
  });

  return Vital.findOne({
    where: { id: vital.id, hospitalId },
    include: [
      {
        model: User,
        as: 'recorder',
        attributes: ['id', 'name'],
      },
    ],
  });
};

export const getAdmissionVitals = async (hospitalId, admissionId) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  return Vital.findAll({
    where: { hospitalId, ipdAdmissionId: admissionId },
    include: [
      {
        model: User,
        as: 'recorder',
        attributes: ['id', 'name'],
      },
    ],
    order: [['recordedAt', 'DESC']],
  });
};

// ==============================================================
// 11. INPATIENT DOCTOR PROGRESS NOTES (SOAP)
// ==============================================================

export const createProgressNote = async (hospitalId, admissionId, data, user) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  if (['DISCHARGED', 'CANCELLED'].includes(admission.status)) {
    const error = new Error(`Cannot add progress notes to a ${admission.status.toLowerCase()} admission`);
    error.statusCode = 400;
    throw error;
  }

  const {
    doctorId,
    progressDate,
    progressTime,
    subjective,
    objective,
    assessment,
    plan,
    notes,
    status = 'DRAFT',
  } = data;

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  const isFinalized = status === 'FINALIZED';

  const progressNote = await IpdProgressNote.create({
    hospitalId,
    admissionId: admission.id,
    patientId: admission.patientId,
    doctorId: doctorId || user.id,
    progressDate: progressDate || currentDateStr,
    progressTime: progressTime || currentTimeStr,
    subjective: subjective?.trim() || null,
    objective: objective?.trim() || null,
    assessment: assessment?.trim() || null,
    plan: plan?.trim() || null,
    notes: notes?.trim() || null,
    status: isFinalized ? 'FINALIZED' : 'DRAFT',
    finalizedAt: isFinalized ? now : null,
    finalizedBy: isFinalized ? user.id : null,
    createdBy: user?.id || null,
    updatedBy: user?.id || null,
  });

  logAuditEvent({
    actor: user,
    hospitalId,
    action: isFinalized ? 'IPD_PROGRESS_FINALIZED' : 'IPD_PROGRESS_CREATED',
    target: 'IpdProgressNote',
    targetId: progressNote.id,
    metadata: {
      admissionId: admission.id,
      patientId: admission.patientId,
      status: progressNote.status,
    },
  });

  return getProgressNoteById(hospitalId, progressNote.id);
};

export const getProgressNotes = async (hospitalId, admissionId) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  return IpdProgressNote.findAll({
    where: { hospitalId, admissionId },
    include: [
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'finalizer',
        attributes: ['id', 'name'],
      },
    ],
    order: [
      ['progressDate', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });
};

export const getProgressNoteById = async (hospitalId, noteId) => {
  const note = await IpdProgressNote.findOne({
    where: { id: noteId, hospitalId },
    include: [
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'finalizer',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!note) {
    const error = new Error('Progress note not found');
    error.statusCode = 404;
    throw error;
  }

  return note;
};

export const updateProgressNote = async (hospitalId, noteId, data, user) => {
  const note = await IpdProgressNote.findOne({
    where: { id: noteId, hospitalId },
  });

  if (!note) {
    const error = new Error('Progress note not found');
    error.statusCode = 404;
    throw error;
  }

  // Finalized notes are immutable!
  if (note.status === 'FINALIZED') {
    const error = new Error('Finalized progress notes cannot be modified');
    error.statusCode = 400;
    throw error;
  }

  const {
    progressDate,
    progressTime,
    subjective,
    objective,
    assessment,
    plan,
    notes,
  } = data;

  if (progressDate) note.progressDate = progressDate;
  if (progressTime !== undefined) note.progressTime = progressTime;
  if (subjective !== undefined) note.subjective = subjective?.trim() || null;
  if (objective !== undefined) note.objective = objective?.trim() || null;
  if (assessment !== undefined) note.assessment = assessment?.trim() || null;
  if (plan !== undefined) note.plan = plan?.trim() || null;
  if (notes !== undefined) note.notes = notes?.trim() || null;
  note.updatedBy = user?.id || null;

  await note.save();

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_PROGRESS_UPDATED',
    target: 'IpdProgressNote',
    targetId: note.id,
    metadata: { admissionId: note.admissionId },
  });

  return getProgressNoteById(hospitalId, note.id);
};

export const finalizeProgressNote = async (hospitalId, noteId, user) => {
  const note = await IpdProgressNote.findOne({
    where: { id: noteId, hospitalId },
  });

  if (!note) {
    const error = new Error('Progress note not found');
    error.statusCode = 404;
    throw error;
  }

  if (note.status === 'FINALIZED') {
    const error = new Error('Progress note is already finalized');
    error.statusCode = 400;
    throw error;
  }

  note.status = 'FINALIZED';
  note.finalizedAt = new Date();
  note.finalizedBy = user.id;
  note.updatedBy = user.id;

  await note.save();

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_PROGRESS_FINALIZED',
    target: 'IpdProgressNote',
    targetId: note.id,
    metadata: { admissionId: note.admissionId },
  });

  return getProgressNoteById(hospitalId, note.id);
};

// ==============================================================
// 12. INPATIENT NURSING NOTES WORKFLOW
// ==============================================================

export const createNursingNote = async (hospitalId, admissionId, data, user) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  if (['DISCHARGED', 'CANCELLED'].includes(admission.status)) {
    const error = new Error(`Cannot add nursing notes to a ${admission.status.toLowerCase()} admission`);
    error.statusCode = 400;
    throw error;
  }

  const {
    nurseId,
    noteDate,
    noteTime,
    observations,
    painScale,
    mobility,
    diet,
    intakeOutput,
    nursingInterventions,
    safetyObservations,
    doctorNotificationNotes,
    notes,
    status = 'DRAFT',
  } = data;

  if (!observations || !observations.trim()) {
    const error = new Error('Nursing observations cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  const isFinalized = status === 'FINALIZED';

  const nursingNote = await IpdNursingNote.create({
    hospitalId,
    admissionId: admission.id,
    patientId: admission.patientId,
    nurseId: nurseId || user.id,
    noteDate: noteDate || currentDateStr,
    noteTime: noteTime || currentTimeStr,
    observations: observations.trim(),
    painScale: painScale !== undefined && painScale !== '' ? painScale : null,
    mobility: mobility?.trim() || null,
    diet: diet?.trim() || null,
    intakeOutput: intakeOutput?.trim() || null,
    nursingInterventions: nursingInterventions?.trim() || null,
    safetyObservations: safetyObservations?.trim() || null,
    doctorNotificationNotes: doctorNotificationNotes?.trim() || null,
    notes: notes?.trim() || null,
    status: isFinalized ? 'FINALIZED' : 'DRAFT',
    finalizedAt: isFinalized ? now : null,
    finalizedBy: isFinalized ? user.id : null,
    createdBy: user?.id || null,
    updatedBy: user?.id || null,
  });

  logAuditEvent({
    actor: user,
    hospitalId,
    action: isFinalized ? 'IPD_NURSING_NOTE_FINALIZED' : 'IPD_NURSING_NOTE_CREATED',
    target: 'IpdNursingNote',
    targetId: nursingNote.id,
    metadata: {
      admissionId: admission.id,
      patientId: admission.patientId,
      status: nursingNote.status,
    },
  });

  return getNursingNoteById(hospitalId, nursingNote.id);
};

export const getNursingNotes = async (hospitalId, admissionId) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  return IpdNursingNote.findAll({
    where: { hospitalId, admissionId },
    include: [
      {
        model: User,
        as: 'nurse',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'finalizer',
        attributes: ['id', 'name'],
      },
    ],
    order: [
      ['noteDate', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });
};

export const getNursingNoteById = async (hospitalId, noteId) => {
  const note = await IpdNursingNote.findOne({
    where: { id: noteId, hospitalId },
    include: [
      {
        model: User,
        as: 'nurse',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'finalizer',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!note) {
    const error = new Error('Nursing note not found');
    error.statusCode = 404;
    throw error;
  }

  return note;
};

export const updateNursingNote = async (hospitalId, noteId, data, user) => {
  const note = await IpdNursingNote.findOne({
    where: { id: noteId, hospitalId },
  });

  if (!note) {
    const error = new Error('Nursing note not found');
    error.statusCode = 404;
    throw error;
  }

  // Finalized nursing notes are immutable!
  if (note.status === 'FINALIZED') {
    const error = new Error('Finalized nursing notes cannot be modified');
    error.statusCode = 400;
    throw error;
  }

  const {
    noteDate,
    noteTime,
    observations,
    painScale,
    mobility,
    diet,
    intakeOutput,
    nursingInterventions,
    safetyObservations,
    doctorNotificationNotes,
    notes,
  } = data;

  if (noteDate) note.noteDate = noteDate;
  if (noteTime !== undefined) note.noteTime = noteTime;
  if (observations !== undefined) {
    if (!observations.trim()) {
      const error = new Error('Nursing observations cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    note.observations = observations.trim();
  }
  if (painScale !== undefined) note.painScale = painScale !== '' ? painScale : null;
  if (mobility !== undefined) note.mobility = mobility?.trim() || null;
  if (diet !== undefined) note.diet = diet?.trim() || null;
  if (intakeOutput !== undefined) note.intakeOutput = intakeOutput?.trim() || null;
  if (nursingInterventions !== undefined) note.nursingInterventions = nursingInterventions?.trim() || null;
  if (safetyObservations !== undefined) note.safetyObservations = safetyObservations?.trim() || null;
  if (doctorNotificationNotes !== undefined) note.doctorNotificationNotes = doctorNotificationNotes?.trim() || null;
  if (notes !== undefined) note.notes = notes?.trim() || null;
  note.updatedBy = user?.id || null;

  await note.save();

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_NURSING_NOTE_UPDATED',
    target: 'IpdNursingNote',
    targetId: note.id,
    metadata: { admissionId: note.admissionId },
  });

  return getNursingNoteById(hospitalId, note.id);
};

export const finalizeNursingNote = async (hospitalId, noteId, user) => {
  const note = await IpdNursingNote.findOne({
    where: { id: noteId, hospitalId },
  });

  if (!note) {
    const error = new Error('Nursing note not found');
    error.statusCode = 404;
    throw error;
  }

  if (note.status === 'FINALIZED') {
    const error = new Error('Nursing note is already finalized');
    error.statusCode = 400;
    throw error;
  }

  note.status = 'FINALIZED';
  note.finalizedAt = new Date();
  note.finalizedBy = user.id;
  note.updatedBy = user.id;

  await note.save();

  logAuditEvent({
    actor: user,
    hospitalId,
    action: 'IPD_NURSING_NOTE_FINALIZED',
    target: 'IpdNursingNote',
    targetId: note.id,
    metadata: { admissionId: note.admissionId },
  });

  return getNursingNoteById(hospitalId, note.id);
};

// ==============================================================
// 13. INPATIENT MEDICATION & INVESTIGATION CONTEXT
// ==============================================================

export const getAdmissionPrescriptions = async (hospitalId, admissionId) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  return Prescription.findAll({
    where: {
      hospitalId,
      patientId: admission.patientId,
    },
    include: [
      {
        model: PrescriptionItem,
        as: 'items',
        include: [
          {
            model: Medicine,
            as: 'medicine',
            attributes: ['id', 'name', 'dosageForm', 'strength', 'unit'],
          },
        ],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name'],
      },
      {
        model: PrescriptionDispensing,
        as: 'dispensings',
      },
    ],
    order: [['createdAt', 'DESC']],
  });
};

export const getAdmissionInvestigations = async (hospitalId, admissionId) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  return InvestigationOrder.findAll({
    where: {
      hospitalId,
      patientId: admission.patientId,
    },
    include: [
      {
        model: Investigation,
        as: 'investigation',
        attributes: ['id', 'name', 'code', 'category'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name'],
      },
      {
        model: InvestigationResult,
        as: 'result',
      },
    ],
    order: [['createdAt', 'DESC']],
  });
};

// ==============================================================
// 14. IPD UNIFIED CHRONOLOGICAL CLINICAL TIMELINE
// ==============================================================

export const getAdmissionTimeline = async (hospitalId, admissionId) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName', 'uhid'] },
      { model: User, as: 'admittingDoctor', attributes: ['id', 'name'] },
      { model: Ward, as: 'ward', attributes: ['id', 'wardName', 'wardCode'] },
      { model: Bed, as: 'bed', attributes: ['id', 'bedNumber'] },
    ],
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  const events = [];

  // 1. Admission Event
  const admissionDateTime = admission.admissionDate && admission.admissionTime
    ? new Date(`${admission.admissionDate}T${admission.admissionTime}`)
    : admission.createdAt;

  events.push({
    id: `adm-${admission.id}`,
    eventType: 'ADMISSION',
    title: 'Admitted to Hospital',
    description: `Admitted under Dr. ${admission.admittingDoctor?.name || 'Assigned Doctor'} to ${admission.ward?.wardName || 'Ward'} (Bed ${admission.bed?.bedNumber || 'Assigned'})`,
    timestamp: admissionDateTime,
    actor: admission.admittingDoctor?.name || 'Staff',
    badgeColor: 'blue',
    metadata: {
      admissionNumber: admission.admissionNumber,
      admissionType: admission.admissionType,
      reasonForAdmission: admission.reasonForAdmission,
      provisionalDiagnosis: admission.provisionalDiagnosis,
    },
  });

  // 2. Bed Transfers
  const transfers = await IpdBedTransfer.findAll({
    where: { hospitalId, admissionId },
    include: [
      { model: Ward, as: 'fromWard', attributes: ['wardName', 'wardCode'] },
      { model: Ward, as: 'toWard', attributes: ['wardName', 'wardCode'] },
      { model: Bed, as: 'fromBed', attributes: ['bedNumber'] },
      { model: Bed, as: 'toBed', attributes: ['bedNumber'] },
      { model: User, as: 'transferredByUser', attributes: ['name'] },
    ],
  });

  for (const t of transfers) {
    events.push({
      id: `trans-${t.id}`,
      eventType: 'BED_TRANSFER',
      title: 'Transferred Bed',
      description: `Transferred from ${t.fromWard?.wardName || ''} (Bed ${t.fromBed?.bedNumber || ''}) to ${t.toWard?.wardName || ''} (Bed ${t.toBed?.bedNumber || ''})`,
      timestamp: t.transferredAt,
      actor: t.transferredByUser?.name || 'Staff',
      badgeColor: 'amber',
      metadata: { transferReason: t.transferReason, notes: t.notes },
    });
  }

  // 3. Vitals
  const vitals = await Vital.findAll({
    where: { hospitalId, ipdAdmissionId: admissionId },
    include: [{ model: User, as: 'recorder', attributes: ['name'] }],
  });

  for (const v of vitals) {
    const parts = [];
    if (v.systolicBp && v.diastolicBp) parts.push(`BP: ${v.systolicBp}/${v.diastolicBp}`);
    if (v.pulseRate) parts.push(`Pulse: ${v.pulseRate} bpm`);
    if (v.spo2) parts.push(`SpO2: ${v.spo2}%`);
    if (v.temperature) parts.push(`Temp: ${v.temperature}°F`);

    events.push({
      id: `vital-${v.id}`,
      eventType: 'VITALS',
      title: 'Vitals Recorded',
      description: parts.join(' | ') || 'Vitals recorded',
      timestamp: v.recordedAt || v.createdAt,
      actor: v.recorder?.name || 'Nurse',
      badgeColor: 'teal',
      metadata: {
        pulseRate: v.pulseRate,
        systolicBp: v.systolicBp,
        diastolicBp: v.diastolicBp,
        spo2: v.spo2,
        temperature: v.temperature,
        bmi: v.bmi,
        painScore: v.painScore,
        notes: v.notes,
      },
    });
  }

  // 4. Progress Notes
  const progressNotes = await IpdProgressNote.findAll({
    where: { hospitalId, admissionId },
    include: [
      { model: User, as: 'doctor', attributes: ['name'] },
      { model: User, as: 'finalizer', attributes: ['name'] },
    ],
  });

  for (const pn of progressNotes) {
    events.push({
      id: `prog-${pn.id}`,
      eventType: 'DOCTOR_PROGRESS',
      title: `Doctor Progress Note (${pn.status})`,
      description: pn.assessment || pn.subjective || 'Clinical progress documented',
      timestamp: pn.finalizedAt || pn.createdAt,
      actor: pn.doctor?.name || 'Doctor',
      badgeColor: pn.status === 'FINALIZED' ? 'emerald' : 'slate',
      metadata: {
        status: pn.status,
        subjective: pn.subjective,
        objective: pn.objective,
        assessment: pn.assessment,
        plan: pn.plan,
      },
    });
  }

  // 5. Nursing Notes
  const nursingNotes = await IpdNursingNote.findAll({
    where: { hospitalId, admissionId },
    include: [
      { model: User, as: 'nurse', attributes: ['name'] },
      { model: User, as: 'finalizer', attributes: ['name'] },
    ],
  });

  for (const nn of nursingNotes) {
    events.push({
      id: `nurse-${nn.id}`,
      eventType: 'NURSING_NOTE',
      title: `Nursing Note (${nn.status})`,
      description: nn.observations,
      timestamp: nn.finalizedAt || nn.createdAt,
      actor: nn.nurse?.name || 'Nurse',
      badgeColor: 'cyan',
      metadata: {
        status: nn.status,
        observations: nn.observations,
        painScale: nn.painScale,
        mobility: nn.mobility,
        diet: nn.diet,
        nursingInterventions: nn.nursingInterventions,
      },
    });
  }

  // 6. Discharge
  if (admission.status === 'DISCHARGED' || admission.dischargeDate) {
    const summary = await DischargeSummary.findOne({
      where: { hospitalId, admissionId },
      include: [{ model: User, as: 'dischargingDoctor', attributes: ['name'] }],
    });

    const dischargeTimestamp = admission.dischargeDate && admission.dischargeTime
      ? new Date(`${admission.dischargeDate}T${admission.dischargeTime}`)
      : admission.updatedAt;

    events.push({
      id: `disc-${admission.id}`,
      eventType: 'DISCHARGE',
      title: `Patient Discharged (${summary?.disposition || 'HOME'})`,
      description: summary
        ? `Final Diagnosis: ${summary.finalDiagnosis} | Condition: ${summary.conditionAtDischarge || 'Stable'}`
        : 'Patient successfully discharged',
      timestamp: dischargeTimestamp,
      actor: summary?.dischargingDoctor?.name || 'Attending Doctor',
      badgeColor: 'purple',
      metadata: {
        dischargeNumber: summary?.dischargeSummaryNumber,
        disposition: summary?.disposition,
        finalDiagnosis: summary?.finalDiagnosis,
        conditionAtDischarge: summary?.conditionAtDischarge,
        followUpDate: summary?.followUpDate,
      },
    });
  }

  // Sort chronologically ascending
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return events;
};

// ==============================================================
// 15. DISCHARGE SUMMARY & TRANSACTIONAL BED RELEASE WORKFLOW
// ==============================================================

export const getDischargeSummary = async (hospitalId, admissionId) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  const summary = await DischargeSummary.findOne({
    where: { hospitalId, admissionId },
    include: [
      {
        model: DischargeMedication,
        as: 'medications',
        include: [
          {
            model: Medicine,
            as: 'medicine',
            attributes: ['id', 'name', 'dosageForm', 'strength', 'unit'],
          },
        ],
      },
      {
        model: User,
        as: 'dischargingDoctor',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'finalizer',
        attributes: ['id', 'name'],
      },
    ],
  });

  return summary;
};

export const createOrUpdateDischargeSummary = async (hospitalId, admissionId, data, user) => {
  const admission = await IpdAdmission.findOne({
    where: { id: admissionId, hospitalId },
  });

  if (!admission) {
    const error = new Error('IPD Admission not found');
    error.statusCode = 404;
    throw error;
  }

  if (admission.status === 'CANCELLED') {
    const error = new Error('Cannot prepare discharge summary for a cancelled admission');
    error.statusCode = 400;
    throw error;
  }

  let existingSummary = await DischargeSummary.findOne({
    where: { hospitalId, admissionId },
  });

  // Immutability check
  if (existingSummary && existingSummary.status === 'FINALIZED') {
    const error = new Error('Finalized discharge summary cannot be modified');
    error.statusCode = 400;
    throw error;
  }

  const {
    dischargingDoctorId,
    dischargeDate,
    dischargeTime,
    reasonForAdmission,
    provisionalDiagnosis,
    finalDiagnosis,
    hospitalCourse,
    significantFindings,
    investigationSummary,
    treatmentGiven,
    complications,
    conditionAtDischarge,
    disposition,
    dischargeInstructions,
    dietInstructions,
    activityInstructions,
    warningSigns,
    followUpDate,
    followUpInstructions,
    doctorRemarks,
    medications = [],
  } = data;

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  return withTransaction(async (t) => {
    let summary;

    if (existingSummary) {
      if (dischargingDoctorId) existingSummary.dischargingDoctorId = dischargingDoctorId;
      if (dischargeDate) existingSummary.dischargeDate = dischargeDate;
      if (dischargeTime !== undefined) existingSummary.dischargeTime = dischargeTime;
      if (reasonForAdmission !== undefined) existingSummary.reasonForAdmission = reasonForAdmission;
      if (provisionalDiagnosis !== undefined) existingSummary.provisionalDiagnosis = provisionalDiagnosis;
      if (finalDiagnosis !== undefined) existingSummary.finalDiagnosis = finalDiagnosis;
      if (hospitalCourse !== undefined) existingSummary.hospitalCourse = hospitalCourse;
      if (significantFindings !== undefined) existingSummary.significantFindings = significantFindings;
      if (investigationSummary !== undefined) existingSummary.investigationSummary = investigationSummary;
      if (treatmentGiven !== undefined) existingSummary.treatmentGiven = treatmentGiven;
      if (complications !== undefined) existingSummary.complications = complications;
      if (conditionAtDischarge !== undefined) existingSummary.conditionAtDischarge = conditionAtDischarge;
      if (disposition !== undefined) existingSummary.disposition = disposition;
      if (dischargeInstructions !== undefined) existingSummary.dischargeInstructions = dischargeInstructions;
      if (dietInstructions !== undefined) existingSummary.dietInstructions = dietInstructions;
      if (activityInstructions !== undefined) existingSummary.activityInstructions = activityInstructions;
      if (warningSigns !== undefined) existingSummary.warningSigns = warningSigns;
      if (followUpDate !== undefined) existingSummary.followUpDate = followUpDate;
      if (followUpInstructions !== undefined) existingSummary.followUpInstructions = followUpInstructions;
      if (doctorRemarks !== undefined) existingSummary.doctorRemarks = doctorRemarks;
      existingSummary.updatedBy = user?.id || null;

      await existingSummary.save({ transaction: t });
      summary = existingSummary;
    } else {
      // Validate mandatory fields for new summary
      if (!finalDiagnosis || !finalDiagnosis.trim()) {
        const error = new Error('Final diagnosis is required');
        error.statusCode = 400;
        throw error;
      }

      // Generate sequence number
      const dischargeSummaryNumber = await generateNextDischargeNumber(hospitalId, t);

      summary = await DischargeSummary.create(
        {
          hospitalId,
          admissionId: admission.id,
          patientId: admission.patientId,
          dischargeSummaryNumber,
          dischargingDoctorId: dischargingDoctorId || admission.admittingDoctorId || user.id,
          dischargeDate: dischargeDate || currentDateStr,
          dischargeTime: dischargeTime || currentTimeStr,
          reasonForAdmission: reasonForAdmission || admission.reasonForAdmission,
          provisionalDiagnosis: provisionalDiagnosis || admission.provisionalDiagnosis,
          finalDiagnosis: finalDiagnosis.trim(),
          hospitalCourse: hospitalCourse || null,
          significantFindings: significantFindings || null,
          investigationSummary: investigationSummary || null,
          treatmentGiven: treatmentGiven || null,
          complications: complications || null,
          conditionAtDischarge: conditionAtDischarge || 'Stable',
          disposition: disposition || 'HOME',
          dischargeInstructions: dischargeInstructions || null,
          dietInstructions: dietInstructions || null,
          activityInstructions: activityInstructions || null,
          warningSigns: warningSigns || null,
          followUpDate: followUpDate || null,
          followUpInstructions: followUpInstructions || null,
          doctorRemarks: doctorRemarks || null,
          status: 'DRAFT',
          createdBy: user?.id || null,
          updatedBy: user?.id || null,
        },
        { transaction: t }
      );
    }

    // Save discharge medications if provided
    if (Array.isArray(medications)) {
      await DischargeMedication.destroy({
        where: { dischargeSummaryId: summary.id, hospitalId },
        transaction: t,
      });

      for (let i = 0; i < medications.length; i++) {
        const med = medications[i];
        if (med.medicineName && med.dosage && med.frequency && med.duration) {
          await DischargeMedication.create(
            {
              hospitalId,
              dischargeSummaryId: summary.id,
              medicineId: med.medicineId || null,
              medicineName: med.medicineName.trim(),
              dosage: med.dosage.trim(),
              frequency: med.frequency.trim(),
              route: med.route || 'ORAL',
              duration: med.duration.trim(),
              instructions: med.instructions?.trim() || null,
              orderIndex: i,
            },
            { transaction: t }
          );
        }
      }
    }

    // Update admission status to DISCHARGE_PENDING if not already discharged
    if (admission.status === 'ADMITTED') {
      await admission.update(
        { status: 'DISCHARGE_PENDING', updatedBy: user?.id || null },
        { transaction: t }
      );
    }

    logAuditEvent({
      actor: user,
      hospitalId,
      action: 'IPD_DISCHARGE_INITIATED',
      target: 'DischargeSummary',
      targetId: summary.id,
      metadata: {
        admissionId: admission.id,
        dischargeSummaryNumber: summary.dischargeSummaryNumber,
      },
    });

    return summary.id;
  }).then((summaryId) => DischargeSummary.findOne({
    where: { id: summaryId, hospitalId },
    include: [
      { model: DischargeMedication, as: 'medications' },
      { model: User, as: 'dischargingDoctor', attributes: ['id', 'name'] },
    ],
  }));
};

/**
 * ATOMIC DISCHARGE & BED RELEASE TRANSACTION
 * 1. Locks Admission row
 * 2. Confirms active admission
 * 3. Locks assigned Bed
 * 4. Confirms bed belongs to same hospital
 * 5. Finalizes discharge summary with validation
 * 6. Sets admission status to DISCHARGED
 * 7. Sets discharge date/time
 * 8. Releases bed -> status to AVAILABLE
 * 9. Records audit logs
 * 10. Rolls back on any failure
 */
export const finalizeDischargeAndReleaseBed = async (hospitalId, admissionId, data = {}, user) => {
  return withTransaction(async (t) => {
    // 1. Lock Admission
    const admission = await IpdAdmission.findOne({
      where: { id: admissionId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!admission) {
      const error = new Error('IPD Admission not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // Prevent double discharge
    if (admission.status === 'DISCHARGED') {
      const error = new Error('Patient is already discharged');
      error.statusCode = 400;
      throw error;
    }

    if (admission.status === 'CANCELLED') {
      const error = new Error('Cannot discharge a cancelled admission');
      error.statusCode = 400;
      throw error;
    }

    // 2. Lock assigned Bed
    const bed = await Bed.findOne({
      where: { id: admission.bedId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!bed) {
      const error = new Error('Assigned bed could not be verified in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 3. Find or create DischargeSummary
    let summary = await DischargeSummary.findOne({
      where: { hospitalId, admissionId: admission.id },
      transaction: t,
    });

    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    if (!summary) {
      const finalDiagnosis = data.finalDiagnosis || admission.provisionalDiagnosis;
      if (!finalDiagnosis || !finalDiagnosis.trim()) {
        const error = new Error('A final diagnosis is required to complete discharge');
        error.statusCode = 400;
        throw error;
      }

      const dischargeSummaryNumber = await generateNextDischargeNumber(hospitalId, t);

      summary = await DischargeSummary.create(
        {
          hospitalId,
          admissionId: admission.id,
          patientId: admission.patientId,
          dischargeSummaryNumber,
          dischargingDoctorId: data.dischargingDoctorId || admission.admittingDoctorId || user.id,
          dischargeDate: data.dischargeDate || currentDateStr,
          dischargeTime: data.dischargeTime || currentTimeStr,
          reasonForAdmission: data.reasonForAdmission || admission.reasonForAdmission,
          provisionalDiagnosis: data.provisionalDiagnosis || admission.provisionalDiagnosis,
          finalDiagnosis: finalDiagnosis.trim(),
          hospitalCourse: data.hospitalCourse || null,
          significantFindings: data.significantFindings || null,
          investigationSummary: data.investigationSummary || null,
          treatmentGiven: data.treatmentGiven || null,
          complications: data.complications || null,
          conditionAtDischarge: data.conditionAtDischarge || 'Stable',
          disposition: data.disposition || 'HOME',
          dischargeInstructions: data.dischargeInstructions || null,
          dietInstructions: data.dietInstructions || null,
          activityInstructions: data.activityInstructions || null,
          warningSigns: data.warningSigns || null,
          followUpDate: data.followUpDate || null,
          followUpInstructions: data.followUpInstructions || null,
          doctorRemarks: data.doctorRemarks || null,
          status: 'FINALIZED',
          finalizedAt: now,
          finalizedBy: user.id,
          createdBy: user?.id || null,
          updatedBy: user?.id || null,
        },
        { transaction: t }
      );
    } else {
      // Validate final diagnosis
      const finalDiagnosis = data.finalDiagnosis || summary.finalDiagnosis;
      if (!finalDiagnosis || !finalDiagnosis.trim()) {
        const error = new Error('A final diagnosis is required to complete discharge');
        error.statusCode = 400;
        throw error;
      }

      // Update fields if provided
      if (data.finalDiagnosis) summary.finalDiagnosis = data.finalDiagnosis.trim();
      if (data.conditionAtDischarge) summary.conditionAtDischarge = data.conditionAtDischarge;
      if (data.disposition) summary.disposition = data.disposition;
      if (data.dischargeInstructions) summary.dischargeInstructions = data.dischargeInstructions;
      if (data.dietInstructions) summary.dietInstructions = data.dietInstructions;
      if (data.activityInstructions) summary.activityInstructions = data.activityInstructions;
      if (data.warningSigns) summary.warningSigns = data.warningSigns;
      if (data.followUpDate) summary.followUpDate = data.followUpDate;
      if (data.followUpInstructions) summary.followUpInstructions = data.followUpInstructions;
      if (data.doctorRemarks) summary.doctorRemarks = data.doctorRemarks;
      if (data.hospitalCourse) summary.hospitalCourse = data.hospitalCourse;

      summary.status = 'FINALIZED';
      summary.finalizedAt = now;
      summary.finalizedBy = user.id;
      summary.dischargeDate = data.dischargeDate || summary.dischargeDate || currentDateStr;
      summary.dischargeTime = data.dischargeTime || summary.dischargeTime || currentTimeStr;
      summary.updatedBy = user.id;

      await summary.save({ transaction: t });
    }

    // Save medications if provided
    if (Array.isArray(data.medications) && data.medications.length > 0) {
      await DischargeMedication.destroy({
        where: { dischargeSummaryId: summary.id, hospitalId },
        transaction: t,
      });

      for (let i = 0; i < data.medications.length; i++) {
        const med = data.medications[i];
        if (med.medicineName && med.dosage && med.frequency && med.duration) {
          await DischargeMedication.create(
            {
              hospitalId,
              dischargeSummaryId: summary.id,
              medicineId: med.medicineId || null,
              medicineName: med.medicineName.trim(),
              dosage: med.dosage.trim(),
              frequency: med.frequency.trim(),
              route: med.route || 'ORAL',
              duration: med.duration.trim(),
              instructions: med.instructions?.trim() || null,
              orderIndex: i,
            },
            { transaction: t }
          );
        }
      }
    }

    // 4. Update Admission status to DISCHARGED
    await admission.update(
      {
        status: 'DISCHARGED',
        dischargedAt: now,
        updatedBy: user?.id || null,
      },
      { transaction: t }
    );

    // 5. Release Bed to AVAILABLE
    await bed.update(
      {
        status: 'AVAILABLE',
        updatedBy: user?.id || null,
      },
      { transaction: t }
    );

    // 6. Audit Logging
    logAuditEvent({
      actor: user,
      hospitalId,
      action: 'IPD_DISCHARGE_SUMMARY_FINALIZED',
      target: 'DischargeSummary',
      targetId: summary.id,
      metadata: {
        admissionId: admission.id,
        dischargeSummaryNumber: summary.dischargeSummaryNumber,
        disposition: summary.disposition,
      },
    });

    logAuditEvent({
      actor: user,
      hospitalId,
      action: 'IPD_DISCHARGED',
      target: 'IpdAdmission',
      targetId: admission.id,
      metadata: {
        admissionNumber: admission.admissionNumber,
        dischargeDate: summary.dischargeDate,
        disposition: summary.disposition,
      },
    });

    logAuditEvent({
      actor: user,
      hospitalId,
      action: 'IPD_BED_RELEASED',
      target: 'Bed',
      targetId: bed.id,
      metadata: {
        bedNumber: bed.bedNumber,
        previousStatus: 'OCCUPIED',
        newStatus: 'AVAILABLE',
        admissionId: admission.id,
      },
    });

    return admission.id;
  }).then((admissionId) => getAdmissionById(hospitalId, admissionId));
};

export default {
  logAuditEvent,
  generateNextAdmissionNumber,
  generateNextDischargeNumber,
  createWard,
  getWards,
  getWardById,
  updateWard,
  createBed,
  getBeds,
  getBedById,
  updateBed,
  updateBedStatus,
  createAdmission,
  getAdmissions,
  getAdmissionById,
  cancelAdmission,
  transferBed,
  getAdmissionTransfers,
  getPatientAdmissions,
  getIpdDashboardMetrics,
  getBedBoard,
  createInpatientVital,
  getAdmissionVitals,
  createProgressNote,
  getProgressNotes,
  getProgressNoteById,
  updateProgressNote,
  finalizeProgressNote,
  createNursingNote,
  getNursingNotes,
  getNursingNoteById,
  updateNursingNote,
  finalizeNursingNote,
  getAdmissionPrescriptions,
  getAdmissionInvestigations,
  getAdmissionTimeline,
  getDischargeSummary,
  createOrUpdateDischargeSummary,
  finalizeDischargeAndReleaseBed,
};
