import {
  InvestigationOrder,
  Investigation,
  Encounter,
  Patient,
  User,
  HospitalSequence,
  HospitalSetting,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';

/**
 * Concurrency-safe atomic Investigation Order Number generator using PostgreSQL row lock
 */
export const generateNextInvestigationOrderNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'INVESTIGATION_ORDER' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'investigation_order_prefix' },
      transaction: t,
    });

    const prefix = customPrefixSetting?.value?.trim().toUpperCase() || 'INV';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'INVESTIGATION_ORDER',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'INVESTIGATION_ORDER' },
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
 * Get all Investigation Orders for an Encounter
 */
export const getEncounterInvestigationOrders = async (hospitalId, encounterId) => {
  const encounter = await Encounter.findOne({
    where: { id: encounterId, hospitalId },
  });

  if (!encounter) {
    const error = new Error('Clinical encounter not found');
    error.statusCode = 404;
    throw error;
  }

  return InvestigationOrder.findAll({
    where: { hospitalId, encounterId },
    include: [
      {
        model: Investigation,
        as: 'investigation',
        attributes: ['id', 'name', 'code', 'category', 'defaultCharge', 'status'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Get single Investigation Order by ID
 */
export const getInvestigationOrderById = async (hospitalId, id, options = {}) => {
  const order = await InvestigationOrder.findOne({
    where: { id, hospitalId },
    include: [
      {
        model: Investigation,
        as: 'investigation',
        attributes: ['id', 'name', 'code', 'category', 'defaultCharge', 'status'],
      },
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
    ],
    ...options,
  });

  if (!order) {
    const error = new Error('Investigation order not found');
    error.statusCode = 404;
    throw error;
  }

  return order;
};

/**
 * Create Single Investigation Order
 */
export const createInvestigationOrder = async (hospitalId, encounterId, orderData, userId) => {
  return withTransaction(async (t) => {
    // 1. Validate Encounter
    const encounter = await Encounter.findOne({
      where: { id: encounterId, hospitalId },
      transaction: t,
    });

    if (!encounter) {
      const error = new Error('Clinical encounter not found');
      error.statusCode = 404;
      throw error;
    }

    if (encounter.status === 'COMPLETED') {
      const error = new Error('Cannot create investigation order for a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validate Investigation
    if (!orderData.investigationId) {
      const error = new Error('Investigation must be specified');
      error.statusCode = 400;
      throw error;
    }

    const investigation = await Investigation.findOne({
      where: { id: orderData.investigationId, hospitalId },
      transaction: t,
    });

    if (!investigation) {
      const error = new Error('Investigation not found in hospital master');
      error.statusCode = 400;
      throw error;
    }

    if (investigation.status !== 'ACTIVE') {
      const error = new Error(`Investigation "${investigation.name}" is inactive and cannot be ordered`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Prevent duplicate active order in the same encounter
    const existingOrder = await InvestigationOrder.findOne({
      where: {
        hospitalId,
        encounterId,
        investigationId: investigation.id,
        status: ['ORDERED', 'FINALIZED'],
      },
      transaction: t,
    });

    if (existingOrder && !orderData.allowDuplicate) {
      const error = new Error(`Investigation "${investigation.name}" is already ordered for this encounter`);
      error.statusCode = 400;
      throw error;
    }

    // 4. Generate Order Number
    const orderNumber = await generateNextInvestigationOrderNumber(hospitalId, t);

    // 5. Create Order
    const order = await InvestigationOrder.create(
      {
        hospitalId,
        orderNumber,
        encounterId,
        patientId: encounter.patientId,
        doctorId: encounter.doctorId,
        investigationId: investigation.id,
        investigationName: investigation.name,
        priority: orderData.priority === 'URGENT' ? 'URGENT' : 'ROUTINE',
        clinicalIndication: orderData.clinicalIndication?.trim() || null,
        notes: orderData.notes?.trim() || null,
        status: orderData.status === 'FINALIZED' ? 'FINALIZED' : 'ORDERED',
        orderedAt: orderData.orderedAt || new Date(),
        createdBy: userId || null,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getInvestigationOrderById(hospitalId, order.id, { transaction: t });
  });
};

/**
 * Create Multiple Investigation Orders in Batch
 */
export const createBatchInvestigationOrders = async (hospitalId, encounterId, batchData, userId) => {
  const items = Array.isArray(batchData) ? batchData : batchData.items || [];
  if (!items.length) {
    const error = new Error('At least one investigation must be specified');
    error.statusCode = 400;
    throw error;
  }

  const createdOrders = [];
  for (const item of items) {
    const order = await createInvestigationOrder(hospitalId, encounterId, item, userId);
    createdOrders.push(order);
  }

  return createdOrders;
};

/**
 * Update Investigation Order details while still in ORDERED status
 */
export const updateInvestigationOrder = async (hospitalId, id, updateData, userId) => {
  return withTransaction(async (t) => {
    const order = await InvestigationOrder.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!order) {
      const error = new Error('Investigation order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.status !== 'ORDERED') {
      const error = new Error(`Cannot modify a ${order.status.toLowerCase()} investigation order`);
      error.statusCode = 400;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: order.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot modify investigation order of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    await order.update(
      {
        priority: updateData.priority !== undefined ? updateData.priority : order.priority,
        clinicalIndication:
          updateData.clinicalIndication !== undefined ? updateData.clinicalIndication : order.clinicalIndication,
        notes: updateData.notes !== undefined ? updateData.notes : order.notes,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getInvestigationOrderById(hospitalId, id, { transaction: t });
  });
};

/**
 * Finalize Investigation Order
 */
export const finalizeInvestigationOrder = async (hospitalId, id, userId) => {
  return withTransaction(async (t) => {
    const order = await InvestigationOrder.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!order) {
      const error = new Error('Investigation order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.status === 'FINALIZED') {
      return getInvestigationOrderById(hospitalId, id, { transaction: t });
    }

    if (order.status === 'CANCELLED') {
      const error = new Error('Cannot finalize a cancelled investigation order');
      error.statusCode = 400;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: order.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot finalize investigation order of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    await order.update(
      {
        status: 'FINALIZED',
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getInvestigationOrderById(hospitalId, id, { transaction: t });
  });
};

/**
 * Cancel Investigation Order
 */
export const cancelInvestigationOrder = async (hospitalId, id, cancellationReason, userId) => {
  return withTransaction(async (t) => {
    const order = await InvestigationOrder.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!order) {
      const error = new Error('Investigation order not found');
      error.statusCode = 404;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: order.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot cancel investigation order of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    await order.update(
      {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || 'Cancelled by physician',
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getInvestigationOrderById(hospitalId, id, { transaction: t });
  });
};

/**
 * Delete Investigation Order (if still in draft ORDERED state)
 */
export const deleteInvestigationOrder = async (hospitalId, id) => {
  return withTransaction(async (t) => {
    const order = await InvestigationOrder.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!order) {
      const error = new Error('Investigation order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.status !== 'ORDERED') {
      const error = new Error('Cannot delete a finalized or cancelled investigation order');
      error.statusCode = 400;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: order.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot delete investigation order of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    await order.destroy({ transaction: t });
    return { success: true, message: 'Investigation order removed successfully' };
  });
};

export default {
  generateNextInvestigationOrderNumber,
  getEncounterInvestigationOrders,
  getInvestigationOrders: getEncounterInvestigationOrders,
  getInvestigationOrderById,
  createInvestigationOrder,
  createBatchInvestigationOrders,
  createInvestigationOrdersBatch: createBatchInvestigationOrders,
  updateInvestigationOrder,
  finalizeInvestigationOrder,
  finalizeOrder: finalizeInvestigationOrder,
  cancelInvestigationOrder,
  deleteInvestigationOrder,
};
