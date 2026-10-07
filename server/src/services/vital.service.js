import { Vital, Encounter, User } from '../models/index.js';
import withTransaction from '../utils/transaction.js';

export const getEncounterVitals = async (hospitalId, encounterId) => {
  const encounter = await Encounter.findOne({
    where: { id: encounterId, hospitalId },
  });

  if (!encounter) {
    const error = new Error('Clinical encounter not found');
    error.statusCode = 404;
    throw error;
  }

  return Vital.findAll({
    where: { hospitalId, encounterId },
    include: [
      {
        model: User,
        as: 'recorder',
        attributes: ['id', 'name', 'email'],
      },
    ],
    order: [['recordedAt', 'DESC']],
  });
};

export const getLatestVitalForPatient = async (hospitalId, patientId) => {
  return Vital.findOne({
    where: { hospitalId, patientId },
    order: [['recordedAt', 'DESC']],
  });
};

export const createVital = async (hospitalId, encounterId, vitalData, recordedByUserId) => {
  return withTransaction(async (t) => {
    // 1. Verify encounter belongs to this hospital
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
      const error = new Error('Cannot add vitals to a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    if (vitalData.spo2 !== undefined && vitalData.spo2 !== null && (Number(vitalData.spo2) < 0 || Number(vitalData.spo2) > 100)) {
      const error = new Error('SpO2 must be between 0% and 100%');
      error.statusCode = 400;
      throw error;
    }

    if (vitalData.pulseRate !== undefined && vitalData.pulseRate !== null && (Number(vitalData.pulseRate) < 20 || Number(vitalData.pulseRate) > 300)) {
      const error = new Error('Pulse rate must be between 20 and 300 bpm');
      error.statusCode = 400;
      throw error;
    }

    // 2. Create Vital entry
    const vital = await Vital.create(
      {
        ...vitalData,
        hospitalId,
        encounterId,
        patientId: encounter.patientId,
        recordedBy: recordedByUserId || null,
        recordedAt: vitalData.recordedAt || new Date(),
      },
      { transaction: t }
    );

    // 3. If encounter status was VITALS_PENDING, advance it to READY_FOR_DOCTOR
    if (encounter.status === 'VITALS_PENDING') {
      await encounter.update({ status: 'READY_FOR_DOCTOR' }, { transaction: t });
    }

    return Vital.findByPk(vital.id, {
      include: [
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'name', 'email'],
        },
      ],
      transaction: t,
    });
  });
};

export const deleteVital = async (hospitalId, id) => {
  return withTransaction(async (t) => {
    const vital = await Vital.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!vital) {
      const error = new Error('Vital record not found');
      error.statusCode = 404;
      throw error;
    }

    await vital.destroy({ transaction: t });
    return { success: true, message: 'Vital record removed successfully' };
  });
};

export default {
  getEncounterVitals,
  getLatestVitalForPatient,
  createVital,
  deleteVital,
};
