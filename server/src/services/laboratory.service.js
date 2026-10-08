import { Op } from 'sequelize';
import {
  HospitalSetting,
  HospitalSequence,
  Investigation,
  InvestigationOrder,
  InvestigationSample,
  InvestigationResult,
  Patient,
  User,
  Encounter,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';

// ==============================================================
// 1. SEQUENCE GENERATORS
// ==============================================================

/**
 * Generates tenant-scoped concurrency-safe sample number
 * Example: LAB-2026-000001
 */
export const generateNextSampleNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'LAB_SAMPLE' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'lab_sample_prefix' },
      transaction: t,
    });

    const prefix = customPrefixSetting?.value?.trim().toUpperCase() || 'LAB';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'LAB_SAMPLE',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'LAB_SAMPLE' },
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
 * Generates tenant-scoped concurrency-safe result number
 * Example: RES-2026-000001
 */
export const generateNextResultNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'LAB_RESULT' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'lab_result_prefix' },
      transaction: t,
    });

    const prefix = customPrefixSetting?.value?.trim().toUpperCase() || 'RES';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'LAB_RESULT',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'LAB_RESULT' },
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
// 2. DASHBOARD METRICS
// ==============================================================

/**
 * Aggregate Operational Metrics for Laboratory
 */
export const getLaboratoryDashboardMetrics = async (hospitalId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Pending Orders: Finalized orders that do not have a finalized or verified result yet
  const pendingOrders = await InvestigationOrder.count({
    where: {
      hospitalId,
      status: 'FINALIZED',
    },
    include: [
      {
        model: InvestigationResult,
        as: 'result',
        required: false,
        where: {
          status: { [Op.in]: ['VERIFIED', 'FINALIZED'] },
        },
      },
    ],
    // where result.id is null
    distinct: true,
  });

  // 2. Samples Pending Collection
  const samplesPending = await InvestigationSample.count({
    where: {
      hospitalId,
      status: 'PENDING_COLLECTION',
    },
  });

  // 3. In Processing (Samples received or processing, or results in progress)
  const processingSamples = await InvestigationSample.count({
    where: {
      hospitalId,
      status: { [Op.in]: ['RECEIVED', 'PROCESSING'] },
    },
  });

  // 4. Results Awaiting Verification
  const awaitingVerification = await InvestigationResult.count({
    where: {
      hospitalId,
      status: 'RESULT_ENTERED',
    },
  });

  // 5. Critical Results (Flagged as CRITICAL and not cancelled)
  const criticalResults = await InvestigationResult.count({
    where: {
      hospitalId,
      abnormalFlag: 'CRITICAL',
      status: { [Op.ne]: 'CANCELLED' },
    },
  });

  // 6. Results Finalized Today
  const resultsFinalizedToday = await InvestigationResult.count({
    where: {
      hospitalId,
      status: 'FINALIZED',
      finalizedAt: { [Op.gte]: todayStart },
    },
  });

  return {
    pendingOrders,
    samplesPending,
    processing: processingSamples,
    awaitingVerification,
    criticalResults,
    resultsFinalizedToday,
  };
};

// ==============================================================
// 3. LABORATORY QUEUE
// ==============================================================

/**
 * Get Laboratory Queue of Finalized Investigation Orders
 */
export const getLaboratoryQueue = async (hospitalId, filters = {}) => {
  const {
    search = '',
    priority = '',
    status = '',
    abnormalFlag = '',
    date = '',
    page = 1,
    limit = 20,
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * pageLimit;

  // Laboratory queue ONLY serves FINALIZED clinical doctor orders!
  const whereClause = {
    hospitalId,
    status: 'FINALIZED',
  };

  if (priority && ['ROUTINE', 'URGENT'].includes(priority)) {
    whereClause.priority = priority;
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    whereClause.orderedAt = { [Op.between]: [start, end] };
  }

  const patientWhere = {};
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    patientWhere[Op.or] = [
      { firstName: { [Op.iLike]: term } },
      { lastName: { [Op.iLike]: term } },
      { uhid: { [Op.iLike]: term } },
      { phone: { [Op.iLike]: term } },
    ];
  }

  const resultWhere = {};
  if (status) {
    resultWhere.status = status;
  }
  if (abnormalFlag) {
    resultWhere.abnormalFlag = abnormalFlag;
  }

  const { count, rows } = await InvestigationOrder.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Patient,
        as: 'patient',
        where: Object.keys(patientWhere).length > 0 ? patientWhere : undefined,
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'allergies'],
      },
      {
        model: Investigation,
        as: 'investigation',
        attributes: ['id', 'name', 'code', 'category', 'defaultCharge'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: Encounter,
        as: 'encounter',
        attributes: ['id', 'encounterNumber', 'encounterType'],
      },
      {
        model: InvestigationSample,
        as: 'samples',
        required: false,
        limit: 1,
        order: [['createdAt', 'DESC']],
      },
      {
        model: InvestigationResult,
        as: 'result',
        required: Object.keys(resultWhere).length > 0,
        where: Object.keys(resultWhere).length > 0 ? resultWhere : undefined,
        include: [
          { model: User, as: 'technician', attributes: ['id', 'name'] },
          { model: User, as: 'verifier', attributes: ['id', 'name'] },
          { model: User, as: 'finalizer', attributes: ['id', 'name'] },
        ],
      },
    ],
    order: [
      ['priority', 'DESC'], // URGENT first
      ['orderedAt', 'DESC'],
    ],
    limit: pageLimit,
    offset,
    distinct: true,
  });

  return {
    orders: rows,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageLimit),
  };
};

/**
 * Get Single Investigation Order Workspace Details
 */
export const getLaboratoryOrderDetails = async (hospitalId, orderId) => {
  const order = await InvestigationOrder.findOne({
    where: { id: orderId, hospitalId },
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'allergies'],
      },
      {
        model: Investigation,
        as: 'investigation',
        attributes: ['id', 'name', 'code', 'category', 'description', 'defaultCharge'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization', 'phone'],
      },
      {
        model: Encounter,
        as: 'encounter',
        attributes: ['id', 'encounterNumber', 'encounterType', 'startedAt'],
      },
      {
        model: InvestigationSample,
        as: 'samples',
        include: [
          { model: User, as: 'collector', attributes: ['id', 'name'] },
          { model: User, as: 'receiver', attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
      },
      {
        model: InvestigationResult,
        as: 'result',
        include: [
          { model: User, as: 'technician', attributes: ['id', 'name'] },
          { model: User, as: 'verifier', attributes: ['id', 'name'] },
          { model: User, as: 'finalizer', attributes: ['id', 'name'] },
          { model: InvestigationSample, as: 'sample' },
        ],
      },
    ],
  });

  if (!order) {
    const error = new Error('Investigation order not found');
    error.statusCode = 404;
    throw error;
  }

  return order;
};

// ==============================================================
// 4. SAMPLE MANAGEMENT
// ==============================================================

/**
 * Record or Collect Sample for an Investigation Order
 */
export const createOrCollectSample = async (hospitalId, orderId, data, userId) => {
  return withTransaction(async (t) => {
    // 1. Validate Order
    const order = await InvestigationOrder.findOne({
      where: { id: orderId, hospitalId },
      transaction: t,
    });

    if (!order) {
      const error = new Error('Investigation order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.status !== 'FINALIZED') {
      const error = new Error('Cannot collect sample for non-finalized investigation order');
      error.statusCode = 400;
      throw error;
    }

    // 2. Check if sample exists or generate new sample number
    const sampleNumber = await generateNextSampleNumber(hospitalId, t);

    const isCollected = data.status === 'COLLECTED' || !data.status;
    const sample = await InvestigationSample.create(
      {
        hospitalId,
        investigationOrderId: order.id,
        patientId: order.patientId,
        sampleNumber,
        sampleType: data.sampleType?.trim() || 'Blood',
        status: isCollected ? 'COLLECTED' : 'PENDING_COLLECTION',
        collectedAt: isCollected ? new Date() : null,
        collectedBy: isCollected ? userId : null,
        notes: data.notes?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
      },
      { transaction: t }
    );

    return sample;
  });
};

/**
 * Update Sample Status (Receive, Reject, Process, Complete)
 */
export const updateSampleStatus = async (hospitalId, sampleId, data, userId) => {
  return withTransaction(async (t) => {
    const sample = await InvestigationSample.findOne({
      where: { id: sampleId, hospitalId },
      transaction: t,
    });

    if (!sample) {
      const error = new Error('Investigation sample not found');
      error.statusCode = 404;
      throw error;
    }

    const { status, rejectionReason, notes } = data;

    const validStatuses = [
      'PENDING_COLLECTION',
      'COLLECTED',
      'RECEIVED',
      'REJECTED',
      'PROCESSING',
      'COMPLETED',
    ];

    if (status && !validStatuses.includes(status)) {
      const error = new Error(`Invalid sample status: ${status}`);
      error.statusCode = 400;
      throw error;
    }

    if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
      const error = new Error('Rejection reason is required when rejecting a sample');
      error.statusCode = 400;
      throw error;
    }

    const updates = { updatedBy: userId };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason?.trim() || null;

    if (status === 'COLLECTED' && !sample.collectedAt) {
      updates.collectedAt = new Date();
      updates.collectedBy = userId;
    }

    if (status === 'RECEIVED') {
      updates.receivedAt = new Date();
      updates.receivedBy = userId;
    }

    await sample.update(updates, { transaction: t });

    return sample;
  });
};

// ==============================================================
// 5. RESULT ENTRY & LIFECYCLE (SAVE, VERIFY, FINALIZE)
// ==============================================================

/**
 * Create or Save Result Draft / Entry
 */
export const saveResult = async (hospitalId, orderId, data, userId) => {
  return withTransaction(async (t) => {
    // 1. Lock and validate order
    const order = await InvestigationOrder.findOne({
      where: { id: orderId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!order) {
      const error = new Error('Investigation order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.status !== 'FINALIZED') {
      const error = new Error('Cannot record results for non-finalized investigation order');
      error.statusCode = 400;
      throw error;
    }

    // 2. Find existing result or create new
    let result = await InvestigationResult.findOne({
      where: { investigationOrderId: order.id, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (result && result.status === 'FINALIZED') {
      const error = new Error('Finalized results are immutable and cannot be modified');
      error.statusCode = 400;
      throw error;
    }

    // Determine target status
    const targetStatus = data.submitForVerification ? 'RESULT_ENTERED' : 'IN_PROGRESS';

    if (!result) {
      const resultNumber = await generateNextResultNumber(hospitalId, t);
      result = await InvestigationResult.create(
        {
          hospitalId,
          investigationOrderId: order.id,
          investigationId: order.investigationId,
          patientId: order.patientId,
          encounterId: order.encounterId,
          doctorId: order.doctorId,
          sampleId: data.sampleId || null,
          resultNumber,
          status: targetStatus,
          resultType: data.resultType || 'QUANTITATIVE',
          resultValue: data.resultValue !== undefined ? String(data.resultValue).trim() : null,
          resultUnit: data.resultUnit?.trim() || null,
          referenceRange: data.referenceRange?.trim() || null,
          abnormalFlag: data.abnormalFlag || 'NORMAL',
          interpretation: data.interpretation?.trim() || null,
          observations: data.observations?.trim() || null,
          technicianNotes: data.technicianNotes?.trim() || null,
          investigationNameSnapshot: order.investigationName || order.investigation?.name || 'Diagnostic Test',
          normalRangeSnapshot: data.referenceRange?.trim() || null,
          unitSnapshot: data.resultUnit?.trim() || null,
          enteredBy: userId,
          enteredAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
        { transaction: t }
      );
    } else {
      await result.update(
        {
          sampleId: data.sampleId !== undefined ? data.sampleId : result.sampleId,
          status: targetStatus,
          resultType: data.resultType || result.resultType,
          resultValue: data.resultValue !== undefined ? String(data.resultValue).trim() : result.resultValue,
          resultUnit: data.resultUnit !== undefined ? data.resultUnit?.trim() || null : result.resultUnit,
          referenceRange: data.referenceRange !== undefined ? data.referenceRange?.trim() || null : result.referenceRange,
          abnormalFlag: data.abnormalFlag || result.abnormalFlag,
          interpretation: data.interpretation !== undefined ? data.interpretation?.trim() || null : result.interpretation,
          observations: data.observations !== undefined ? data.observations?.trim() || null : result.observations,
          technicianNotes: data.technicianNotes !== undefined ? data.technicianNotes?.trim() || null : result.technicianNotes,
          enteredBy: userId,
          enteredAt: new Date(),
          updatedBy: userId,
        },
        { transaction: t }
      );
    }

    return getResultById(hospitalId, result.id, t);
  });
};

/**
 * Verify Result by Authorized Lab Staff / Supervisor
 */
export const verifyResult = async (hospitalId, resultId, notes, userId) => {
  return withTransaction(async (t) => {
    const result = await InvestigationResult.findOne({
      where: { id: resultId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!result) {
      const error = new Error('Investigation result not found');
      error.statusCode = 404;
      throw error;
    }

    if (result.status === 'FINALIZED') {
      const error = new Error('Finalized results are immutable and cannot be re-verified');
      error.statusCode = 400;
      throw error;
    }

    if (!result.resultValue || !result.resultValue.trim()) {
      const error = new Error('Cannot verify result with empty result value');
      error.statusCode = 400;
      throw error;
    }

    await result.update(
      {
        status: 'VERIFIED',
        verifiedBy: userId,
        verifiedAt: new Date(),
        observations: notes ? (result.observations ? `${result.observations}\n${notes}` : notes) : result.observations,
        updatedBy: userId,
      },
      { transaction: t }
    );

    return getResultById(hospitalId, result.id, t);
  });
};

/**
 * Finalize Result (Locks result into immutable clinical document)
 */
export const finalizeResult = async (hospitalId, resultId, notes, userId) => {
  return withTransaction(async (t) => {
    const result = await InvestigationResult.findOne({
      where: { id: resultId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!result) {
      const error = new Error('Investigation result not found');
      error.statusCode = 404;
      throw error;
    }

    if (result.status === 'FINALIZED') {
      const error = new Error('Result has already been finalized');
      error.statusCode = 400;
      throw error;
    }

    if (!result.resultValue || !result.resultValue.trim()) {
      const error = new Error('Cannot finalize result with empty result value');
      error.statusCode = 400;
      throw error;
    }

    // Auto-verify if not verified yet during finalization
    const verifiedBy = result.verifiedBy || userId;
    const verifiedAt = result.verifiedAt || new Date();

    await result.update(
      {
        status: 'FINALIZED',
        verifiedBy,
        verifiedAt,
        finalizedBy: userId,
        finalizedAt: new Date(),
        observations: notes ? (result.observations ? `${result.observations}\n${notes}` : notes) : result.observations,
        updatedBy: userId,
      },
      { transaction: t }
    );

    return getResultById(hospitalId, result.id, t);
  });
};

/**
 * Get Investigation Result by ID with full associations
 */
export const getResultById = async (hospitalId, resultId, t = null) => {
  const result = await InvestigationResult.findOne({
    where: { id: resultId, hospitalId },
    include: [
      {
        model: InvestigationOrder,
        as: 'order',
        include: [
          { model: Investigation, as: 'investigation' },
          { model: User, as: 'doctor', attributes: ['id', 'name', 'specialization'] },
          { model: Encounter, as: 'encounter', attributes: ['id', 'encounterNumber', 'encounterType'] },
        ],
      },
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'allergies'],
      },
      {
        model: InvestigationSample,
        as: 'sample',
      },
      {
        model: User,
        as: 'technician',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'verifier',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'finalizer',
        attributes: ['id', 'name'],
      },
    ],
    transaction: t,
  });

  if (!result) {
    const error = new Error('Investigation result not found');
    error.statusCode = 404;
    throw error;
  }

  return result;
};

// ==============================================================
// 6. CLINICAL & ENCOUNTER INTEGRATION
// ==============================================================

/**
 * Get all Finalized Investigation Results for an Encounter (For Doctor Consultation View)
 */
export const getEncounterResults = async (hospitalId, encounterId) => {
  const encounter = await Encounter.findOne({
    where: { id: encounterId, hospitalId },
  });

  if (!encounter) {
    const error = new Error('Clinical encounter not found');
    error.statusCode = 404;
    throw error;
  }

  const results = await InvestigationResult.findAll({
    where: {
      encounterId,
      hospitalId,
      status: 'FINALIZED',
    },
    include: [
      {
        model: InvestigationOrder,
        as: 'order',
        attributes: ['id', 'orderNumber', 'investigationName', 'priority', 'clinicalIndication'],
      },
      {
        model: Investigation,
        as: 'investigation',
        attributes: ['id', 'name', 'code', 'category'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: User,
        as: 'verifier',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'finalizer',
        attributes: ['id', 'name'],
      },
    ],
    order: [['finalizedAt', 'DESC']],
  });

  return results;
};

/**
 * Get Complete Patient Investigation History across all encounters
 */
export const getPatientInvestigationHistory = async (hospitalId, patientId) => {
  const patient = await Patient.findOne({
    where: { id: patientId, hospitalId },
  });

  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  const results = await InvestigationResult.findAll({
    where: { patientId, hospitalId },
    include: [
      {
        model: InvestigationOrder,
        as: 'order',
        attributes: ['id', 'orderNumber', 'investigationName', 'priority', 'clinicalIndication', 'orderedAt'],
      },
      {
        model: Investigation,
        as: 'investigation',
        attributes: ['id', 'name', 'code', 'category'],
      },
      {
        model: Encounter,
        as: 'encounter',
        attributes: ['id', 'encounterNumber', 'encounterType', 'startedAt'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: User,
        as: 'finalizer',
        attributes: ['id', 'name'],
      },
      {
        model: InvestigationSample,
        as: 'sample',
        attributes: ['id', 'sampleNumber', 'sampleType', 'status'],
      },
    ],
    order: [
      ['createdAt', 'DESC'],
    ],
  });

  return results;
};

export default {
  generateNextSampleNumber,
  generateNextResultNumber,
  getLaboratoryDashboardMetrics,
  getLaboratoryQueue,
  getLaboratoryOrderDetails,
  createOrCollectSample,
  updateSampleStatus,
  saveResult,
  verifyResult,
  finalizeResult,
  getResultById,
  getEncounterResults,
  getPatientInvestigationHistory,
};
