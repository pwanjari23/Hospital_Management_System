import {
  Prescription,
  PrescriptionItem,
  Medicine,
  Encounter,
  Patient,
  User,
  HospitalSequence,
  HospitalSetting,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';

/**
 * Concurrency-safe atomic Prescription Number generator using PostgreSQL row lock
 */
export const generateNextPrescriptionNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'PRESCRIPTION' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'prescription_prefix' },
      transaction: t,
    });

    const prefix = customPrefixSetting?.value?.trim().toUpperCase() || 'RX';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'PRESCRIPTION',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'PRESCRIPTION' },
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
 * Get all Prescriptions for an Encounter
 */
export const getEncounterPrescriptions = async (hospitalId, encounterId) => {
  const encounter = await Encounter.findOne({
    where: { id: encounterId, hospitalId },
  });

  if (!encounter) {
    const error = new Error('Clinical encounter not found');
    error.statusCode = 404;
    throw error;
  }

  return Prescription.findAll({
    where: { hospitalId, encounterId },
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
 * Get single Prescription details by ID
 */
export const getPrescriptionById = async (hospitalId, id, options = {}) => {
  const prescription = await Prescription.findOne({
    where: { id, hospitalId },
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
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'allergies'],
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

  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  return prescription;
};

/**
 * Create Prescription with optional items
 */
export const createPrescription = async (hospitalId, encounterId, prescriptionData = {}, userId) => {
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
      const error = new Error('Cannot create prescription for a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validate items if provided
    const items = prescriptionData.items || [];
    const validatedItemsData = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.medicineId) {
        const error = new Error(`Item at position ${i + 1} must specify a valid medicine`);
        error.statusCode = 400;
        throw error;
      }

      const medicine = await Medicine.findOne({
        where: { id: item.medicineId, hospitalId },
        transaction: t,
      });

      if (!medicine) {
        const error = new Error(`Medicine at position ${i + 1} not found in hospital inventory`);
        error.statusCode = 400;
        throw error;
      }

      if (medicine.status !== 'ACTIVE') {
        const error = new Error(`Medicine "${medicine.name}" is inactive and cannot be prescribed`);
        error.statusCode = 400;
        throw error;
      }

      validatedItemsData.push({
        hospitalId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        dosage: item.dosage?.trim() || '1 tablet',
        frequency: item.frequency?.trim() || 'Once Daily',
        route: item.route?.trim() || 'ORAL',
        durationValue: item.durationValue ? Number(item.durationValue) : 5,
        durationUnit: item.durationUnit?.trim() || 'DAYS',
        quantity: item.quantity ? Number(item.quantity) : null,
        foodInstruction: item.foodInstruction?.trim() || 'AFTER_FOOD',
        instructions: item.instructions?.trim() || null,
        notes: item.notes?.trim() || null,
        sortOrder: i,
        createdBy: userId || null,
      });
    }

    // 3. Generate Prescription Number
    const prescriptionNumber = await generateNextPrescriptionNumber(hospitalId, t);

    // 4. Create Prescription
    const prescription = await Prescription.create(
      {
        hospitalId,
        prescriptionNumber,
        encounterId,
        patientId: encounter.patientId,
        doctorId: encounter.doctorId,
        status: prescriptionData.status === 'FINALIZED' ? 'FINALIZED' : 'DRAFT',
        prescribedAt: prescriptionData.prescribedAt || new Date(),
        notes: prescriptionData.notes?.trim() || null,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    // 5. Create Items
    for (const itemData of validatedItemsData) {
      await PrescriptionItem.create(
        {
          ...itemData,
          prescriptionId: prescription.id,
        },
        { transaction: t }
      );
    }

    return getPrescriptionById(hospitalId, prescription.id, { transaction: t });
  });
};

/**
 * Update Prescription metadata (notes, etc.)
 */
export const updatePrescription = async (hospitalId, id, updateData, userId) => {
  return withTransaction(async (t) => {
    const prescription = await Prescription.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!prescription) {
      const error = new Error('Prescription not found');
      error.statusCode = 404;
      throw error;
    }

    if (prescription.status !== 'DRAFT') {
      const error = new Error(`Cannot modify a ${prescription.status.toLowerCase()} prescription`);
      error.statusCode = 400;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: prescription.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot modify prescription of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    await prescription.update(
      {
        notes: updateData.notes !== undefined ? updateData.notes : prescription.notes,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getPrescriptionById(hospitalId, id, { transaction: t });
  });
};

/**
 * Finalize Prescription (locks from further edits)
 */
export const finalizePrescription = async (hospitalId, id, userId) => {
  return withTransaction(async (t) => {
    const prescription = await Prescription.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!prescription) {
      const error = new Error('Prescription not found');
      error.statusCode = 404;
      throw error;
    }

    if (prescription.status === 'FINALIZED') {
      return getPrescriptionById(hospitalId, id, { transaction: t });
    }

    if (prescription.status === 'CANCELLED') {
      const error = new Error('Cannot finalize a cancelled prescription');
      error.statusCode = 400;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: prescription.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot finalize prescription of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    const itemCount = await PrescriptionItem.count({
      where: { prescriptionId: id, hospitalId },
      transaction: t,
    });

    if (itemCount === 0) {
      const error = new Error('Prescription must contain at least one medicine item to finalize');
      error.statusCode = 400;
      throw error;
    }

    await prescription.update(
      {
        status: 'FINALIZED',
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getPrescriptionById(hospitalId, id, { transaction: t });
  });
};

/**
 * Cancel Prescription
 */
export const cancelPrescription = async (hospitalId, id, cancellationReason, userId) => {
  return withTransaction(async (t) => {
    const prescription = await Prescription.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!prescription) {
      const error = new Error('Prescription not found');
      error.statusCode = 404;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: prescription.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot cancel prescription of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    await prescription.update(
      {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || 'Cancelled by physician',
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getPrescriptionById(hospitalId, id, { transaction: t });
  });
};

/**
 * Add Single Item to Draft Prescription
 */
export const addPrescriptionItem = async (hospitalId, prescriptionId, itemData, userId) => {
  return withTransaction(async (t) => {
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId, hospitalId },
      transaction: t,
    });

    if (!prescription) {
      const error = new Error('Prescription not found');
      error.statusCode = 404;
      throw error;
    }

    if (prescription.status !== 'DRAFT') {
      const error = new Error('Cannot add medicines to a finalized or cancelled prescription');
      error.statusCode = 400;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: prescription.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot add medicines to prescription of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    const medicine = await Medicine.findOne({
      where: { id: itemData.medicineId, hospitalId },
      transaction: t,
    });

    if (!medicine) {
      const error = new Error('Medicine not found in hospital inventory');
      error.statusCode = 400;
      throw error;
    }

    if (medicine.status !== 'ACTIVE') {
      const error = new Error(`Medicine "${medicine.name}" is inactive and cannot be prescribed`);
      error.statusCode = 400;
      throw error;
    }

    const nextSortOrder = (await PrescriptionItem.count({ where: { prescriptionId, hospitalId }, transaction: t })) + 1;

    const item = await PrescriptionItem.create(
      {
        hospitalId,
        prescriptionId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        dosage: itemData.dosage?.trim() || '1 tablet',
        frequency: itemData.frequency?.trim() || 'Once Daily',
        route: itemData.route?.trim() || 'ORAL',
        durationValue: itemData.durationValue ? Number(itemData.durationValue) : 5,
        durationUnit: itemData.durationUnit?.trim() || 'DAYS',
        quantity: itemData.quantity ? Number(itemData.quantity) : null,
        foodInstruction: itemData.foodInstruction?.trim() || 'AFTER_FOOD',
        instructions: itemData.instructions?.trim() || null,
        notes: itemData.notes?.trim() || null,
        sortOrder: nextSortOrder,
        createdBy: userId || null,
      },
      { transaction: t }
    );

    return PrescriptionItem.findByPk(item.id, {
      include: [
        {
          model: Medicine,
          as: 'medicine',
          attributes: ['id', 'name', 'genericName', 'category', 'strength', 'dosageForm', 'status'],
        },
      ],
      transaction: t,
    });
  });
};

/**
 * Update Prescription Item
 */
export const updatePrescriptionItem = async (hospitalId, prescriptionId, itemId, itemData, userId) => {
  return withTransaction(async (t) => {
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId, hospitalId },
      transaction: t,
    });

    if (!prescription) {
      const error = new Error('Prescription not found');
      error.statusCode = 404;
      throw error;
    }

    if (prescription.status !== 'DRAFT') {
      const error = new Error('Cannot modify medicines of a finalized or cancelled prescription');
      error.statusCode = 400;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: prescription.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot modify medicines of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    const item = await PrescriptionItem.findOne({
      where: { id: itemId, prescriptionId, hospitalId },
      transaction: t,
    });

    if (!item) {
      const error = new Error('Prescription item not found');
      error.statusCode = 404;
      throw error;
    }

    let medicineName = item.medicineName;
    if (itemData.medicineId && itemData.medicineId !== item.medicineId) {
      const medicine = await Medicine.findOne({
        where: { id: itemData.medicineId, hospitalId },
        transaction: t,
      });

      if (!medicine) {
        const error = new Error('Medicine not found');
        error.statusCode = 400;
        throw error;
      }

      if (medicine.status !== 'ACTIVE') {
        const error = new Error(`Medicine "${medicine.name}" is inactive`);
        error.statusCode = 400;
        throw error;
      }

      medicineName = medicine.name;
    }

    await item.update(
      {
        ...itemData,
        medicineName,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return PrescriptionItem.findByPk(item.id, {
      include: [
        {
          model: Medicine,
          as: 'medicine',
          attributes: ['id', 'name', 'genericName', 'category', 'strength', 'dosageForm', 'status'],
        },
      ],
      transaction: t,
    });
  });
};

/**
 * Delete Prescription Item
 */
export const deletePrescriptionItem = async (hospitalId, prescriptionId, itemId) => {
  return withTransaction(async (t) => {
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId, hospitalId },
      transaction: t,
    });

    if (!prescription) {
      const error = new Error('Prescription not found');
      error.statusCode = 404;
      throw error;
    }

    if (prescription.status !== 'DRAFT') {
      const error = new Error('Cannot remove medicines from a finalized or cancelled prescription');
      error.statusCode = 400;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: prescription.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot remove medicines of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    const item = await PrescriptionItem.findOne({
      where: { id: itemId, prescriptionId, hospitalId },
      transaction: t,
    });

    if (!item) {
      const error = new Error('Prescription item not found');
      error.statusCode = 404;
      throw error;
    }

    await item.destroy({ transaction: t });
    return { success: true, message: 'Prescription item removed successfully' };
  });
};

export default {
  generateNextPrescriptionNumber,
  getEncounterPrescriptions,
  getPrescriptions: getEncounterPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  finalizePrescription,
  cancelPrescription,
  addPrescriptionItem,
  addItem: addPrescriptionItem,
  updatePrescriptionItem,
  updateItem: updatePrescriptionItem,
  deletePrescriptionItem,
  deleteItem: deletePrescriptionItem,
};
