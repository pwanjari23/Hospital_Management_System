import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import {
  HospitalSetting,
  HospitalSequence,
  Medicine,
  MedicineBatch,
  PharmacyStockTransaction,
  Prescription,
  PrescriptionItem,
  PrescriptionDispensing,
  PrescriptionDispensingItem,
  Patient,
  User,
  Encounter,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';


/**
 * Generates tenant-scoped concurrency-safe dispensing number
 * Example: DISP-2026-000001
 */
export const generateNextDispensingNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'DISPENSING' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'dispensing_prefix' },
      transaction: t,
    });

    const prefix = customPrefixSetting?.value?.trim().toUpperCase() || 'DISP';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'DISPENSING',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'DISPENSING' },
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
// 1. PHARMACY INVENTORY & BATCH MANAGEMENT
// ==============================================================

/**
 * Record stock-in of physical medicines into a batch
 */
export const stockIn = async (hospitalId, data, userId) => {
  return withTransaction(async (t) => {
    // 1. Validate Medicine
    const medicine = await Medicine.findOne({
      where: { id: data.medicineId, hospitalId },
      transaction: t,
    });

    if (!medicine) {
      const error = new Error('Medicine not found in hospital master');
      error.statusCode = 404;
      throw error;
    }

    if (medicine.status !== 'ACTIVE') {
      const error = new Error(`Medicine "${medicine.name}" is inactive in catalog`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Validate Quantity
    const qty = Number(data.quantity);
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
      const error = new Error('Stock-in quantity must be a positive whole integer');
      error.statusCode = 400;
      throw error;
    }

    // 3. Validate Batch & Expiry
    const batchNumber = data.batchNumber?.trim();
    if (!batchNumber) {
      const error = new Error('Batch number is required');
      error.statusCode = 400;
      throw error;
    }

    if (!data.expiryDate) {
      const error = new Error('Expiry date is required');
      error.statusCode = 400;
      throw error;
    }

    const expiryDateStr = String(data.expiryDate).split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    if (expiryDateStr <= todayStr) {
      const error = new Error('Cannot stock-in expired medicines');
      error.statusCode = 400;
      throw error;
    }

    // 4. Find or Create Batch
    let batch = await MedicineBatch.findOne({
      where: {
        hospitalId,
        medicineId: medicine.id,
        batchNumber,
      },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (batch) {
      // Existing batch replenishment
      const newReceived = Number(batch.quantityReceived) + qty;
      const newAvailable = Number(batch.quantityAvailable) + qty;

      const updates = {
        quantityReceived: newReceived,
        quantityAvailable: newAvailable,
        expiryDate: expiryDateStr,
        manufacturingDate: data.manufacturingDate ? String(data.manufacturingDate).split('T')[0] : batch.manufacturingDate,
        purchaseRate: data.purchaseRate !== undefined && data.purchaseRate !== null ? Number(data.purchaseRate) : batch.purchaseRate,
        sellingRate: data.sellingRate !== undefined && data.sellingRate !== null ? Number(data.sellingRate) : batch.sellingRate,
        storageLocation: data.storageLocation?.trim() || batch.storageLocation,
        reorderLevel: data.reorderLevel !== undefined && data.reorderLevel !== null ? Number(data.reorderLevel) : batch.reorderLevel,
        status: batch.status === 'DEPLETED' ? 'ACTIVE' : batch.status,
        updatedBy: userId || null,
      };

      await batch.update(updates, { transaction: t });
    } else {
      // New batch creation
      batch = await MedicineBatch.create(
        {
          hospitalId,
          medicineId: medicine.id,
          batchNumber,
          manufacturingDate: data.manufacturingDate ? String(data.manufacturingDate).split('T')[0] : null,
          expiryDate: expiryDateStr,
          purchaseRate: data.purchaseRate !== undefined && data.purchaseRate !== null ? Number(data.purchaseRate) : null,
          sellingRate: data.sellingRate !== undefined && data.sellingRate !== null ? Number(data.sellingRate) : null,
          quantityReceived: qty,
          quantityAvailable: qty,
          reorderLevel: data.reorderLevel !== undefined && data.reorderLevel !== null ? Number(data.reorderLevel) : 10,
          storageLocation: data.storageLocation?.trim() || null,
          status: 'ACTIVE',
          createdBy: userId || null,
          updatedBy: userId || null,
        },
        { transaction: t }
      );
    }

    // 5. Create Immutable Stock Transaction Ledger Entry
    await PharmacyStockTransaction.create(
      {
        hospitalId,
        medicineId: medicine.id,
        batchId: batch.id,
        transactionType: 'STOCK_IN',
        quantity: qty,
        referenceType: data.referenceType?.trim() || 'STOCK_ENTRY',
        referenceId: data.referenceId || null,
        reason: data.reason?.trim() || 'Pharmacy stock-in receipt',
        performedBy: userId || null,
        transactionDate: new Date(),
      },
      { transaction: t }
    );

    return getBatchById(hospitalId, batch.id, t);
  });
};

/**
 * List inventory batches with filtering, search, and pagination
 */
export const getInventory = async (hospitalId, options = {}) => {
  const {
    medicineId,
    status,
    stockStatus,
    search,
    limit = 50,
    offset = 0,
  } = options;

  const where = { hospitalId };

  if (medicineId) {
    where.medicineId = medicineId;
  }

  if (status) {
    where.status = status;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
  const thirtyDaysStr = thirtyDaysAhead.toISOString().split('T')[0];

  if (stockStatus === 'OUT_OF_STOCK') {
    where.quantityAvailable = 0;
  } else if (stockStatus === 'LOW_STOCK') {
    where.quantityAvailable = {
      [Op.gt]: 0,
      [Op.lte]: sequelize.col('MedicineBatch.reorder_level'),
    };
  } else if (stockStatus === 'EXPIRED') {
    where.expiryDate = { [Op.lte]: todayStr };
  } else if (stockStatus === 'EXPIRING_SOON') {
    where.expiryDate = {
      [Op.gt]: todayStr,
      [Op.lte]: thirtyDaysStr,
    };
    where.quantityAvailable = { [Op.gt]: 0 };
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    where[Op.or] = [
      { batchNumber: { [Op.iLike]: s } },
      { storageLocation: { [Op.iLike]: s } },
      { '$medicine.name$': { [Op.iLike]: s } },
      { '$medicine.generic_name$': { [Op.iLike]: s } },
    ];
  }

  const { rows, count } = await MedicineBatch.findAndCountAll({
    where,
    include: [
      {
        model: Medicine,
        as: 'medicine',
        attributes: ['id', 'name', 'genericName', 'category', 'strength', 'dosageForm', 'unit', 'status'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
    ],
    order: [
      ['expiryDate', 'ASC'],
      ['batchNumber', 'ASC'],
    ],
    limit: Number(limit),
    offset: Number(offset),
  });

  // Attach computed flags
  const enrichedBatches = rows.map((b) => {
    const batchJson = b.toJSON();
    const isExpired = batchJson.expiryDate <= todayStr;
    const isExpiringSoon = !isExpired && batchJson.expiryDate <= thirtyDaysStr;
    const isOutOfStock = batchJson.quantityAvailable === 0;
    const isLowStock = !isOutOfStock && batchJson.quantityAvailable <= batchJson.reorderLevel;

    return {
      ...batchJson,
      isExpired,
      isExpiringSoon,
      isOutOfStock,
      isLowStock,
    };
  });

  return { batches: enrichedBatches, total: count };
};

/**
 * Get Batch Details by ID
 */
export const getBatchById = async (hospitalId, batchId, transaction = null) => {
  const batch = await MedicineBatch.findOne({
    where: { id: batchId, hospitalId },
    transaction,
    include: [
      {
        model: Medicine,
        as: 'medicine',
        attributes: ['id', 'name', 'genericName', 'category', 'strength', 'dosageForm', 'unit', 'status'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: User,
        as: 'updater',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: PharmacyStockTransaction,
        as: 'stockTransactions',
        include: [{ model: User, as: 'performer', attributes: ['id', 'name'] }],
        limit: 10,
        order: [['transactionDate', 'DESC']],
      },
    ],
  });

  if (!batch) {
    const error = new Error('Medicine batch not found');
    error.statusCode = 404;
    throw error;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
  const thirtyDaysStr = thirtyDaysAhead.toISOString().split('T')[0];

  const batchJson = batch.toJSON();
  const isExpired = batchJson.expiryDate <= todayStr;
  const isExpiringSoon = !isExpired && batchJson.expiryDate <= thirtyDaysStr;
  const isOutOfStock = batchJson.quantityAvailable === 0;
  const isLowStock = !isOutOfStock && batchJson.quantityAvailable <= batchJson.reorderLevel;

  return {
    ...batchJson,
    isExpired,
    isExpiringSoon,
    isOutOfStock,
    isLowStock,
  };
};

/**
 * Get Stock Transactions for a Batch
 */
export const getBatchTransactions = async (hospitalId, batchId) => {
  const batch = await MedicineBatch.findOne({
    where: { id: batchId, hospitalId },
  });

  if (!batch) {
    const error = new Error('Medicine batch not found');
    error.statusCode = 404;
    throw error;
  }

  return PharmacyStockTransaction.findAll({
    where: { batchId, hospitalId },
    include: [{ model: User, as: 'performer', attributes: ['id', 'name', 'email'] }],
    order: [['transactionDate', 'DESC']],
  });
};

/**
 * Update Batch Status (e.g. BLOCKED, ACTIVE)
 */
export const updateBatchStatus = async (hospitalId, batchId, targetStatus, reason, userId) => {
  return withTransaction(async (t) => {
    const batch = await MedicineBatch.findOne({
      where: { id: batchId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!batch) {
      const error = new Error('Medicine batch not found');
      error.statusCode = 404;
      throw error;
    }

    if (!['ACTIVE', 'BLOCKED'].includes(targetStatus)) {
      const error = new Error('Batch status can only be updated to ACTIVE or BLOCKED');
      error.statusCode = 400;
      throw error;
    }

    await batch.update(
      {
        status: targetStatus,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    // Record adjustment audit in ledger if status changes
    await PharmacyStockTransaction.create(
      {
        hospitalId,
        medicineId: batch.medicineId,
        batchId: batch.id,
        transactionType: 'ADJUSTMENT',
        quantity: 0,
        referenceType: 'STATUS_CHANGE',
        reason: reason?.trim() || `Status updated to ${targetStatus}`,
        performedBy: userId || null,
        transactionDate: new Date(),
      },
      { transaction: t }
    );

    return getBatchById(hospitalId, batch.id, t);
  });
};

// ==============================================================
// 2. FEFO ALLOCATION LOGIC
// ==============================================================

/**
 * Calculates FEFO (First Expiry, First Out) batch allocation for a medicine
 */
export const calculateFefoAllocation = async (hospitalId, medicineId, requiredQuantity, t = null) => {
  const reqQty = Number(requiredQuantity);
  if (!reqQty || reqQty <= 0) {
    return {
      allocations: [],
      totalAllocated: 0,
      unfulfilledQuantity: 0,
      fullyFulfillable: true,
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const batches = await MedicineBatch.findAll({
    where: {
      hospitalId,
      medicineId,
      status: 'ACTIVE',
      quantityAvailable: { [Op.gt]: 0 },
      expiryDate: { [Op.gt]: todayStr },
    },
    order: [
      ['expiryDate', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    transaction: t,
  });

  const allocations = [];
  let remainingNeeded = reqQty;

  for (const batch of batches) {
    if (remainingNeeded <= 0) break;

    const available = Number(batch.quantityAvailable);
    const take = Math.min(available, remainingNeeded);

    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      storageLocation: batch.storageLocation,
      quantityAvailable: available,
      allocatedQuantity: take,
      sellingRate: batch.sellingRate ? Number(batch.sellingRate) : null,
    });

    remainingNeeded -= take;
  }

  const totalAllocated = reqQty - remainingNeeded;

  return {
    medicineId,
    requiredQuantity: reqQty,
    totalAllocated,
    unfulfilledQuantity: remainingNeeded,
    fullyFulfillable: remainingNeeded === 0,
    allocations,
  };
};

// ==============================================================
// 3. PHARMACY QUEUE & DISPENSING WORKFLOW
// ==============================================================

/**
 * List Finalized Prescriptions waiting for Pharmacy Dispensing
 */
export const getPrescriptionQueue = async (hospitalId, options = {}) => {
  const {
    search,
    dispensingStatus,
    doctorId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  // IMPORTANT: Only FINALIZED prescriptions can appear in pharmacy queue!
  const where = {
    hospitalId,
    status: 'FINALIZED',
  };

  if (doctorId) {
    where.doctorId = doctorId;
  }

  if (startDate && endDate) {
    where.prescribedAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    where[Op.or] = [
      { prescriptionNumber: { [Op.iLike]: s } },
      { '$patient.first_name$': { [Op.iLike]: s } },
      { '$patient.last_name$': { [Op.iLike]: s } },
      { '$patient.uhid$': { [Op.iLike]: s } },
      { '$patient.phone$': { [Op.iLike]: s } },
    ];
  }

  const { rows, count } = await Prescription.findAndCountAll({
    where,
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'gender', 'dateOfBirth', 'allergies'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: Encounter,
        as: 'encounter',
        attributes: ['id', 'encounterNumber', 'encounterType', 'status'],
      },
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
        model: PrescriptionDispensing,
        as: 'dispensings',
        include: [
          {
            model: PrescriptionDispensingItem,
            as: 'items',
            attributes: ['prescriptionItemId', 'dispensedQuantity'],
          },
        ],
      },
    ],
    order: [['prescribedAt', 'DESC']],
    limit: Number(limit),
    offset: Number(offset),
    distinct: true,
  });

  // Compute authoritative dispensing status for each prescription
  const queueItems = rows.map((rx) => {
    const rxJson = rx.toJSON();
    const items = rxJson.items || [];
    const dispensings = rxJson.dispensings || [];

    // Map cumulative dispensed quantity per prescription item
    const dispensedPerItem = {};
    for (const d of dispensings) {
      if (d.status !== 'CANCELLED' && d.items) {
        for (const ditem of d.items) {
          dispensedPerItem[ditem.prescriptionItemId] =
            (dispensedPerItem[ditem.prescriptionItemId] || 0) + Number(ditem.dispensedQuantity);
        }
      }
    }

    let totalPrescribed = 0;
    let totalDispensed = 0;
    let anyDispensed = false;
    let allFullyDispensed = items.length > 0;

    for (const item of items) {
      const prescribed = Number(item.quantity) || 0;
      const dispensed = dispensedPerItem[item.id] || 0;
      totalPrescribed += prescribed;
      totalDispensed += dispensed;

      if (dispensed > 0) anyDispensed = true;
      if (dispensed < prescribed) allFullyDispensed = false;
    }

    let overallDispensingStatus = 'PENDING';
    if (allFullyDispensed && totalPrescribed > 0) {
      overallDispensingStatus = 'FULLY_DISPENSED';
    } else if (anyDispensed) {
      overallDispensingStatus = 'PARTIALLY_DISPENSED';
    }

    return {
      ...rxJson,
      totalPrescribedQty: totalPrescribed,
      totalDispensedQty: totalDispensed,
      dispensingStatus: overallDispensingStatus,
      dispensingsCount: dispensings.length,
    };
  });

  // Filter by computed dispensing status if requested
  const filtered = dispensingStatus
    ? queueItems.filter((q) => q.dispensingStatus === dispensingStatus)
    : queueItems;

  return { prescriptions: filtered, total: dispensingStatus ? filtered.length : count };
};

/**
 * Get detailed prescription context for dispensing workspace
 */
export const getPrescriptionForDispensing = async (hospitalId, prescriptionId) => {
  const prescription = await Prescription.findOne({
    where: { id: prescriptionId, hospitalId },
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: [
          'id',
          'uhid',
          'firstName',
          'lastName',
          'phone',
          'gender',
          'dateOfBirth',
          'bloodGroup',
          'allergies',
          'medicalNotes',
        ],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization', 'phone'],
      },
      {
        model: Encounter,
        as: 'encounter',
        attributes: ['id', 'encounterNumber', 'encounterType', 'status'],
      },
      {
        model: PrescriptionItem,
        as: 'items',
        include: [
          {
            model: Medicine,
            as: 'medicine',
            attributes: ['id', 'name', 'genericName', 'category', 'strength', 'dosageForm', 'unit', 'status'],
          },
        ],
      },
      {
        model: PrescriptionDispensing,
        as: 'dispensings',
        include: [
          {
            model: User,
            as: 'pharmacist',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: PrescriptionDispensingItem,
            as: 'items',
            include: [
              {
                model: MedicineBatch,
                as: 'batch',
                attributes: ['id', 'batchNumber', 'expiryDate', 'storageLocation'],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      },
    ],
  });

  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  if (prescription.status !== 'FINALIZED') {
    const error = new Error(`Only finalized prescriptions can be dispensed (current status: ${prescription.status})`);
    error.statusCode = 400;
    throw error;
  }

  const rxJson = prescription.toJSON();

  // Aggregate cumulative dispensed quantity per item
  const dispensedPerItem = {};
  for (const d of rxJson.dispensings || []) {
    if (d.status !== 'CANCELLED' && d.items) {
      for (const ditem of d.items) {
        dispensedPerItem[ditem.prescriptionItemId] =
          (dispensedPerItem[ditem.prescriptionItemId] || 0) + Number(ditem.dispensedQuantity);
      }
    }
  }

  // Enrich each prescription item with remaining quantity and suggested FEFO allocation
  const enrichedItems = await Promise.all(
    (rxJson.items || []).map(async (item) => {
      const prescribedQty = Number(item.quantity) || 0;
      const alreadyDispensed = dispensedPerItem[item.id] || 0;
      const remainingQty = Math.max(0, prescribedQty - alreadyDispensed);

      // Pre-calculate suggested FEFO allocation for remaining quantity
      const fefoPlan = await calculateFefoAllocation(hospitalId, item.medicineId, remainingQty);

      return {
        ...item,
        prescribedQuantity: prescribedQty,
        dispensedQuantity: alreadyDispensed,
        remainingQuantity: remainingQty,
        isCompleted: remainingQty === 0,
        fefoAllocation: fefoPlan,
      };
    })
  );

  let totalPrescribed = 0;
  let totalDispensed = 0;
  let allCompleted = enrichedItems.length > 0;
  let anyDispensed = false;

  for (const ei of enrichedItems) {
    totalPrescribed += ei.prescribedQuantity;
    totalDispensed += ei.dispensedQuantity;
    if (ei.dispensedQuantity > 0) anyDispensed = true;
    if (!ei.isCompleted) allCompleted = false;
  }

  let overallDispensingStatus = 'PENDING';
  if (allCompleted && totalPrescribed > 0) {
    overallDispensingStatus = 'FULLY_DISPENSED';
  } else if (anyDispensed) {
    overallDispensingStatus = 'PARTIALLY_DISPENSED';
  }

  return {
    ...rxJson,
    items: enrichedItems,
    totalPrescribedQty: totalPrescribed,
    totalDispensedQty: totalDispensed,
    dispensingStatus: overallDispensingStatus,
  };
};

/**
 * Atomic Execution of Prescription Dispensing
 * - Locks batches
 * - Deducts available inventory
 * - Records stock ledger entries
 * - Creates dispensing and dispensing items
 * - Enforces immutability: NEVER touches the original doctor's prescription!
 */
export const dispensePrescription = async (hospitalId, prescriptionId, payload, userId) => {
  return withTransaction(async (t) => {
    // 1. Lock and validate Prescription
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!prescription) {
      const error = new Error('Prescription not found');
      error.statusCode = 404;
      throw error;
    }

    if (prescription.status !== 'FINALIZED') {
      const error = new Error(`Cannot dispense a prescription with status "${prescription.status}"`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Fetch Prescription Items
    const rxItems = await PrescriptionItem.findAll({
      where: { prescriptionId, hospitalId },
      transaction: t,
    });

    if (!rxItems || rxItems.length === 0) {
      const error = new Error('Prescription has no medication items to dispense');
      error.statusCode = 400;
      throw error;
    }

    // 3. Compute previously dispensed quantities
    const pastDispensingItems = await PrescriptionDispensingItem.findAll({
      where: { hospitalId },
      include: [
        {
          model: PrescriptionDispensing,
          as: 'dispensing',
          where: { prescriptionId, status: { [Op.ne]: 'CANCELLED' } },
          attributes: ['id', 'status'],
        },
      ],
      transaction: t,
    });

    const alreadyDispensedByItem = {};
    for (const pdi of pastDispensingItems) {
      alreadyDispensedByItem[pdi.prescriptionItemId] =
        (alreadyDispensedByItem[pdi.prescriptionItemId] || 0) + Number(pdi.dispensedQuantity);
    }

    // 4. Validate Dispensing Payload
    const requestedItems = payload.items;
    if (!requestedItems || !Array.isArray(requestedItems) || requestedItems.length === 0) {
      const error = new Error('At least one medication item must be specified for dispensing');
      error.statusCode = 400;
      throw error;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const itemsToCreate = [];
    const stockDeductions = [];

    for (const reqItem of requestedItems) {
      const rxItem = rxItems.find((i) => i.id === reqItem.prescriptionItemId);
      if (!rxItem) {
        const error = new Error(`Prescription item "${reqItem.prescriptionItemId}" does not belong to this prescription`);
        error.statusCode = 400;
        throw error;
      }

      if (reqItem.medicineId && reqItem.medicineId !== rxItem.medicineId) {
        const error = new Error('Dispensing medicine does not match prescribed medicine. Prescription is immutable.');
        error.statusCode = 400;
        throw error;
      }

      const prescribedQty = Number(rxItem.quantity) || 0;
      const alreadyDispensed = alreadyDispensedByItem[rxItem.id] || 0;
      const remainingQty = Math.max(0, prescribedQty - alreadyDispensed);

      if (remainingQty <= 0) {
        const error = new Error(`Prescribed item "${rxItem.medicineName}" is already fully dispensed`);
        error.statusCode = 400;
        throw error;
      }

      // Check batch allocations
      const allocations = reqItem.batchAllocations;
      if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
        const error = new Error(`No batch allocations specified for "${rxItem.medicineName}"`);
        error.statusCode = 400;
        throw error;
      }

      let itemTotalDispensing = 0;

      for (const alloc of allocations) {
        const allocQty = Number(alloc.quantity);
        if (!allocQty || allocQty <= 0 || !Number.isInteger(allocQty)) {
          const error = new Error(`Allocation quantity must be a positive integer for "${rxItem.medicineName}"`);
          error.statusCode = 400;
          throw error;
        }

        itemTotalDispensing += allocQty;

        // Lock Batch Row for Concurrency Safety
        const batch = await MedicineBatch.findOne({
          where: {
            id: alloc.batchId,
            hospitalId,
            medicineId: rxItem.medicineId,
          },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (!batch) {
          const error = new Error(`Batch not found for medicine "${rxItem.medicineName}"`);
          error.statusCode = 404;
          throw error;
        }

        if (batch.status === 'BLOCKED') {
          const error = new Error(`Batch "${batch.batchNumber}" is blocked from dispensing`);
          error.statusCode = 400;
          throw error;
        }

        if (batch.status === 'EXPIRED' || batch.expiryDate <= todayStr) {
          const error = new Error(`Batch "${batch.batchNumber}" is expired (${batch.expiryDate}) and cannot be dispensed`);
          error.statusCode = 400;
          throw error;
        }

        const available = Number(batch.quantityAvailable);
        if (available < allocQty) {
          const error = new Error(
            `Insufficient stock in batch "${batch.batchNumber}". Requested: ${allocQty}, Available: ${available}`
          );
          error.statusCode = 400;
          throw error;
        }

        stockDeductions.push({
          batch,
          quantity: allocQty,
          rxItem,
        });

        itemsToCreate.push({
          prescriptionItemId: rxItem.id,
          medicineId: rxItem.medicineId,
          batchId: batch.id,
          prescribedQuantity: prescribedQty,
          dispensedQuantity: allocQty,
          notes: alloc.notes?.trim() || null,
        });
      }

      if (itemTotalDispensing > remainingQty) {
        const error = new Error(
          `Cannot dispense ${itemTotalDispensing} units of "${rxItem.medicineName}". Only ${remainingQty} units remaining.`
        );
        error.statusCode = 400;
        throw error;
      }

      // Update in-memory tracker for overall status calculation
      alreadyDispensedByItem[rxItem.id] = alreadyDispensed + itemTotalDispensing;
    }

    // 5. Generate Dispensing Number
    const dispensingNumber = await generateNextDispensingNumber(hospitalId, t);

    // 6. Check Overall Dispensing Status
    let allItemsFulfilled = true;
    for (const rxItem of rxItems) {
      const prescribed = Number(rxItem.quantity) || 0;
      const dispensed = alreadyDispensedByItem[rxItem.id] || 0;
      if (dispensed < prescribed) {
        allItemsFulfilled = false;
        break;
      }
    }

    const currentDispensingStatus = allItemsFulfilled ? 'FULLY_DISPENSED' : 'PARTIALLY_DISPENSED';

    // 7. Create Dispensing Record
    const dispensing = await PrescriptionDispensing.create(
      {
        hospitalId,
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        pharmacistId: userId || null,
        dispensingNumber,
        status: currentDispensingStatus,
        dispensedAt: new Date(),
        notes: payload.notes?.trim() || null,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    // 8. Deduct Stock and Record Ledger Entries
    for (const deduction of stockDeductions) {
      const { batch, quantity, rxItem } = deduction;
      const newAvailable = Number(batch.quantityAvailable) - quantity;
      const newStatus = newAvailable === 0 ? 'DEPLETED' : batch.status;

      await batch.update(
        {
          quantityAvailable: newAvailable,
          status: newStatus,
          updatedBy: userId || null,
        },
        { transaction: t }
      );

      // Immutable Stock Ledger Entry
      await PharmacyStockTransaction.create(
        {
          hospitalId,
          medicineId: rxItem.medicineId,
          batchId: batch.id,
          transactionType: 'DISPENSE',
          quantity,
          referenceType: 'PRESCRIPTION_DISPENSING',
          referenceId: dispensing.id,
          reason: `Dispensed against ${prescription.prescriptionNumber} (${dispensingNumber})`,
          performedBy: userId || null,
          transactionDate: new Date(),
        },
        { transaction: t }
      );
    }

    // 9. Bulk Create Dispensing Items
    const preparedItems = itemsToCreate.map((item) => ({
      ...item,
      hospitalId,
      dispensingId: dispensing.id,
      createdBy: userId || null,
      updatedBy: userId || null,
    }));

    await PrescriptionDispensingItem.bulkCreate(preparedItems, { transaction: t });

    // 10. Return Created Dispensing with complete details
    return getDispensingById(hospitalId, dispensing.id, t);
  });
};

/**
 * Get Single Dispensing by ID
 */
export const getDispensingById = async (hospitalId, dispensingId, transaction = null) => {
  const dispensing = await PrescriptionDispensing.findOne({
    where: { id: dispensingId, hospitalId },
    transaction,
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'gender', 'dateOfBirth'],
      },
      {
        model: User,
        as: 'pharmacist',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: Prescription,
        as: 'prescription',
        attributes: ['id', 'prescriptionNumber', 'prescribedAt', 'status'],
        include: [
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'specialization'],
          },
        ],
      },
      {
        model: PrescriptionDispensingItem,
        as: 'items',
        include: [
          {
            model: Medicine,
            as: 'medicine',
            attributes: ['id', 'name', 'dosageForm', 'strength', 'unit'],
          },
          {
            model: MedicineBatch,
            as: 'batch',
            attributes: ['id', 'batchNumber', 'expiryDate', 'storageLocation', 'sellingRate'],
          },
        ],
      },
    ],
  });

  if (!dispensing) {
    const error = new Error('Dispensing record not found');
    error.statusCode = 404;
    throw error;
  }

  return dispensing;
};

// ==============================================================
// 4. PATIENT MEDICATION HISTORY
// ==============================================================

/**
 * Get Complete Patient Medication History with dispensing execution
 */
export const getPatientMedicationHistory = async (hospitalId, patientId) => {
  const patient = await Patient.findOne({
    where: { id: patientId, hospitalId },
  });

  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  const prescriptions = await Prescription.findAll({
    where: { patientId, hospitalId },
    include: [
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: Encounter,
        as: 'encounter',
        attributes: ['id', 'encounterNumber', 'encounterType', 'startedAt'],
      },
      {
        model: PrescriptionItem,
        as: 'items',
        include: [
          {
            model: Medicine,
            as: 'medicine',
            attributes: ['id', 'name', 'dosageForm', 'strength', 'unit'],
          },
          {
            model: PrescriptionDispensingItem,
            as: 'dispensingItems',
            include: [
              {
                model: MedicineBatch,
                as: 'batch',
                attributes: ['id', 'batchNumber', 'expiryDate'],
              },
              {
                model: PrescriptionDispensing,
                as: 'dispensing',
                attributes: ['id', 'dispensingNumber', 'dispensedAt', 'status'],
                include: [{ model: User, as: 'pharmacist', attributes: ['id', 'name'] }],
              },
            ],
          },
        ],
      },
      {
        model: PrescriptionDispensing,
        as: 'dispensings',
        include: [{ model: User, as: 'pharmacist', attributes: ['id', 'name'] }],
      },
    ],
    order: [['prescribedAt', 'DESC']],
  });

  return prescriptions;
};

// ==============================================================
// 5. PHARMACY DASHBOARD METRICS
// ==============================================================

/**
 * Aggregated Operational Metrics for Pharmacy Team
 */
export const getPharmacyDashboardMetrics = async (hospitalId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
  const thirtyDaysStr = thirtyDaysAhead.toISOString().split('T')[0];

  // 1. Finalized Prescriptions Count
  const finalizedPrescriptions = await Prescription.findAll({
    where: { hospitalId, status: 'FINALIZED' },
    attributes: ['id'],
    include: [
      {
        model: PrescriptionDispensing,
        as: 'dispensings',
        where: { status: { [Op.ne]: 'CANCELLED' } },
        required: false,
        attributes: ['id', 'status'],
      },
    ],
  });

  let pendingPrescriptions = 0;
  let partiallyDispensed = 0;

  for (const rx of finalizedPrescriptions) {
    const dispensings = rx.dispensings || [];
    if (dispensings.length === 0) {
      pendingPrescriptions++;
    } else {
      const hasFull = dispensings.some((d) => d.status === 'FULLY_DISPENSED');
      if (!hasFull) {
        partiallyDispensed++;
      }
    }
  }

  // 2. Dispensed Today Count
  const dispensedToday = await PrescriptionDispensing.count({
    where: {
      hospitalId,
      dispensedAt: { [Op.gte]: todayStart },
      status: { [Op.ne]: 'CANCELLED' },
    },
  });

  // 3. Low Stock Batches
  const lowStockCount = await MedicineBatch.count({
    where: {
      hospitalId,
      status: 'ACTIVE',
      quantityAvailable: {
        [Op.gt]: 0,
        [Op.lte]: sequelize.col('MedicineBatch.reorder_level'),
      },
    },
  });

  // 4. Expiring Soon Batches (Within 30 Days)
  const expiringSoonCount = await MedicineBatch.count({
    where: {
      hospitalId,
      status: 'ACTIVE',
      quantityAvailable: { [Op.gt]: 0 },
      expiryDate: {
        [Op.gt]: todayStr,
        [Op.lte]: thirtyDaysStr,
      },
    },
  });

  // 5. Out of Stock Batches (Depleted or 0 qty)
  const outOfStockCount = await MedicineBatch.count({
    where: {
      hospitalId,
      quantityAvailable: 0,
    },
  });

  return {
    pendingPrescriptions,
    partiallyDispensed,
    dispensedToday,
    lowStockCount,
    expiringSoonCount,
    outOfStockCount,
  };
};

export default {
  generateNextDispensingNumber,
  stockIn,
  getInventory,
  getBatchById,
  getBatchTransactions,
  updateBatchStatus,
  calculateFefoAllocation,
  getPrescriptionQueue,
  getPrescriptionForDispensing,
  dispensePrescription,
  getDispensingById,
  getPatientMedicationHistory,
  getPharmacyDashboardMetrics,
};
