import { Op } from 'sequelize';
import { DoctorLeave, User, Role } from '../models/index.js';
import withTransaction from '../utils/transaction.js';

export const getDoctorLeaves = async (hospitalId, options = {}) => {
  const { doctorId, startDate, endDate, isActive } = options;
  const where = { hospitalId };

  if (doctorId) where.doctorId = doctorId;
  if (isActive !== undefined && isActive !== 'ALL') {
    where.isActive = isActive === true || isActive === 'true';
  }

  if (startDate && endDate) {
    where[Op.and] = [
      { startDate: { [Op.lte]: endDate } },
      { endDate: { [Op.gte]: startDate } },
    ];
  } else if (startDate) {
    where.endDate = { [Op.gte]: startDate };
  } else if (endDate) {
    where.startDate = { [Op.lte]: endDate };
  }

  const leaves = await DoctorLeave.findAll({
    where,
    include: [
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'email', 'phone', 'specialization', 'qualification'],
      },
    ],
    order: [['startDate', 'DESC']],
  });

  return leaves;
};

export const getDoctorLeaveById = async (hospitalId, id, options = {}) => {
  const leave = await DoctorLeave.findOne({
    where: { id, hospitalId },
    include: [
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'email', 'phone', 'specialization', 'qualification'],
      },
    ],
    ...options,
  });

  if (!leave) {
    const error = new Error('Doctor leave record not found');
    error.statusCode = 404;
    throw error;
  }

  return leave;
};

export const createDoctorLeave = async (hospitalId, leaveData) => {
  return withTransaction(async (t) => {
    // 1. Verify doctor
    const doctor = await User.findOne({
      where: { id: leaveData.doctorId, hospitalId },
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
      transaction: t,
    });

    if (!doctor) {
      const error = new Error('Doctor not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    const isDoctor = doctor.roles?.some((r) => r.name === 'DOCTOR');
    if (!isDoctor) {
      const error = new Error('The selected user does not have a DOCTOR role');
      error.statusCode = 400;
      throw error;
    }

    // 2. Check overlap
    const overlapping = await DoctorLeave.findOne({
      where: {
        hospitalId,
        doctorId: doctor.id,
        isActive: true,
        startDate: { [Op.lte]: leaveData.endDate },
        endDate: { [Op.gte]: leaveData.startDate },
      },
      transaction: t,
    });

    if (overlapping) {
      const error = new Error(`An overlapping leave already exists for this doctor from ${overlapping.startDate} to ${overlapping.endDate}`);
      error.statusCode = 409;
      throw error;
    }

    // 3. Create leave
    const created = await DoctorLeave.create(
      {
        hospitalId,
        doctorId: doctor.id,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        reason: leaveData.reason.trim(),
        notes: leaveData.notes?.trim() || null,
        isActive: leaveData.isActive !== undefined ? leaveData.isActive : true,
      },
      { transaction: t }
    );

    return getDoctorLeaveById(hospitalId, created.id, { transaction: t });
  });
};

export const updateDoctorLeave = async (hospitalId, id, updateData) => {
  return withTransaction(async (t) => {
    const leave = await DoctorLeave.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!leave) {
      const error = new Error('Doctor leave record not found');
      error.statusCode = 404;
      throw error;
    }

    const newStart = updateData.startDate || leave.startDate;
    const newEnd = updateData.endDate || leave.endDate;

    if (updateData.startDate || updateData.endDate) {
      const overlapping = await DoctorLeave.findOne({
        where: {
          hospitalId,
          doctorId: leave.doctorId,
          id: { [Op.ne]: id },
          isActive: true,
          startDate: { [Op.lte]: newEnd },
          endDate: { [Op.gte]: newStart },
        },
        transaction: t,
      });

      if (overlapping) {
        const error = new Error(`An overlapping leave already exists from ${overlapping.startDate} to ${overlapping.endDate}`);
        error.statusCode = 409;
        throw error;
      }
    }

    await leave.update(updateData, { transaction: t });
    return getDoctorLeaveById(hospitalId, id, { transaction: t });
  });
};

export const toggleDoctorLeaveStatus = async (hospitalId, id) => {
  return withTransaction(async (t) => {
    const leave = await DoctorLeave.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!leave) {
      const error = new Error('Doctor leave record not found');
      error.statusCode = 404;
      throw error;
    }

    await leave.update({ isActive: !leave.isActive }, { transaction: t });
    return getDoctorLeaveById(hospitalId, id, { transaction: t });
  });
};

export const deleteDoctorLeave = async (hospitalId, id) => {
  return withTransaction(async (t) => {
    const leave = await DoctorLeave.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!leave) {
      const error = new Error('Doctor leave record not found');
      error.statusCode = 404;
      throw error;
    }

    await leave.destroy({ transaction: t });
    return { success: true, message: 'Doctor leave removed successfully' };
  });
};

export default {
  getDoctorLeaves,
  getDoctorLeaveById,
  createDoctorLeave,
  updateDoctorLeave,
  toggleDoctorLeaveStatus,
  deleteDoctorLeave,
};
