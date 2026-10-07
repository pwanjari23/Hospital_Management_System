import { EncounterDiagnosis, Encounter, User } from '../models/index.js';
import withTransaction from '../utils/transaction.js';

export const getEncounterDiagnoses = async (hospitalId, encounterId) => {
  const encounter = await Encounter.findOne({
    where: { id: encounterId, hospitalId },
  });

  if (!encounter) {
    const error = new Error('Clinical encounter not found');
    error.statusCode = 404;
    throw error;
  }

  return EncounterDiagnosis.findAll({
    where: { hospitalId, encounterId },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
    ],
    order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
  });
};

export const addDiagnosis = async (hospitalId, encounterId, diagnosisData, createdByUserId) => {
  return withTransaction(async (t) => {
    // 1. Verify encounter
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
      const error = new Error('Cannot add diagnosis to a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    // If marked isPrimary or PRIMARY diagnosis type, demote any existing primary diagnoses
    const isPrimary = diagnosisData.isPrimary || diagnosisData.diagnosisType === 'PRIMARY';
    if (isPrimary) {
      await EncounterDiagnosis.update(
        { isPrimary: false },
        { where: { encounterId, hospitalId, isPrimary: true }, transaction: t }
      );
    }

    const diagnosis = await EncounterDiagnosis.create(
      {
        ...diagnosisData,
        hospitalId,
        encounterId,
        isPrimary,
        createdBy: createdByUserId || null,
      },
      { transaction: t }
    );

    return EncounterDiagnosis.findByPk(diagnosis.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      transaction: t,
    });
  });
};

export const updateDiagnosis = async (hospitalId, idOrEncounterId, updateDataOrId, maybeData) => {
  const id = maybeData !== undefined ? updateDataOrId : idOrEncounterId;
  const updateData = maybeData !== undefined ? maybeData : updateDataOrId;
  return withTransaction(async (t) => {
    const diagnosis = await EncounterDiagnosis.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!diagnosis) {
      const error = new Error('Diagnosis record not found');
      error.statusCode = 404;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: diagnosis.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot modify diagnoses of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    if (updateData.isPrimary || updateData.diagnosisType === 'PRIMARY') {
      await EncounterDiagnosis.update(
        { isPrimary: false },
        { where: { encounterId: diagnosis.encounterId, hospitalId, isPrimary: true }, transaction: t }
      );
    }

    await diagnosis.update(updateData, { transaction: t });
    return EncounterDiagnosis.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      transaction: t,
    });
  });
};

export const deleteDiagnosis = async (hospitalId, idOrEncounterId, maybeId) => {
  const id = maybeId || idOrEncounterId;
  return withTransaction(async (t) => {
    const diagnosis = await EncounterDiagnosis.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!diagnosis) {
      const error = new Error('Diagnosis record not found');
      error.statusCode = 404;
      throw error;
    }

    const encounter = await Encounter.findOne({
      where: { id: diagnosis.encounterId, hospitalId },
      transaction: t,
    });

    if (encounter && encounter.status === 'COMPLETED') {
      const error = new Error('Cannot modify diagnoses of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    await diagnosis.destroy({ transaction: t });
    return { success: true, message: 'Diagnosis removed successfully' };
  });
};

export default {
  getEncounterDiagnoses,
  getDiagnoses: getEncounterDiagnoses,
  addDiagnosis,
  createDiagnosis: addDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
};
