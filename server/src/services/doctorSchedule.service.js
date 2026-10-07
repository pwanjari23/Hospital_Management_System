import { Op } from 'sequelize';
import { DoctorSchedule, User, Department, Role } from '../models/index.js';
import withTransaction from '../utils/transaction.js';

export const getDoctorSchedules = async (hospitalId, options = {}) => {
  const { doctorId, departmentId, dayOfWeek, isActive } = options;
  const where = { hospitalId };

  if (doctorId) where.doctorId = doctorId;
  if (departmentId) where.departmentId = departmentId;
  if (dayOfWeek) where.dayOfWeek = dayOfWeek.toUpperCase();
  if (isActive !== undefined && isActive !== 'ALL') {
    where.isActive = isActive === true || isActive === 'true';
  }

  const schedules = await DoctorSchedule.findAll({
    where,
    include: [
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'email', 'phone', 'specialization', 'qualification', 'consultationFee', 'status'],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code', 'status'],
      },
    ],
    order: [
      ['dayOfWeek', 'ASC'],
      ['startTime', 'ASC'],
    ],
  });

  return schedules;
};

export const getDoctorScheduleById = async (hospitalId, id, options = {}) => {
  const schedule = await DoctorSchedule.findOne({
    where: { id, hospitalId },
    include: [
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'email', 'phone', 'specialization', 'qualification', 'consultationFee'],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
    ],
    ...options,
  });

  if (!schedule) {
    const error = new Error('Doctor schedule not found');
    error.statusCode = 404;
    throw error;
  }

  return schedule;
};

export const getDoctorSchedulesByDoctorId = async (hospitalId, doctorId) => {
  return DoctorSchedule.findAll({
    where: { hospitalId, doctorId, isActive: true },
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
    ],
    order: [
      ['dayOfWeek', 'ASC'],
      ['startTime', 'ASC'],
    ],
  });
};

export const createDoctorSchedule = async (hospitalId, scheduleData) => {
  return withTransaction(async (t) => {
    // 1. Verify doctor exists in this hospital and has DOCTOR role
    const doctor = await User.findOne({
      where: { id: scheduleData.doctorId, hospitalId },
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

    // 2. If departmentId is provided or doctor has assigned department, verify/link
    let departmentId = scheduleData.departmentId || doctor.departmentId;
    if (departmentId) {
      const dept = await Department.findOne({
        where: { id: departmentId, hospitalId },
        transaction: t,
      });
      if (!dept) {
        departmentId = null;
      }
    }

    // 3. Check for overlapping active schedule for same doctor on same day
    const dayOfWeek = scheduleData.dayOfWeek.toUpperCase();
    const overlapping = await DoctorSchedule.findOne({
      where: {
        hospitalId,
        doctorId: doctor.id,
        dayOfWeek,
        isActive: true,
        [Op.or]: [
          {
            startTime: { [Op.lt]: scheduleData.endTime },
            endTime: { [Op.gt]: scheduleData.startTime },
          },
        ],
      },
      transaction: t,
    });

    if (overlapping) {
      const error = new Error(`An overlapping schedule already exists for this doctor on ${dayOfWeek} (${overlapping.startTime} - ${overlapping.endTime})`);
      error.statusCode = 409;
      throw error;
    }

    // 4. Create schedule
    const created = await DoctorSchedule.create(
      {
        hospitalId,
        doctorId: doctor.id,
        departmentId,
        dayOfWeek,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        breakStartTime: scheduleData.breakStartTime || null,
        breakEndTime: scheduleData.breakEndTime || null,
        slotDurationMinutes: scheduleData.slotDurationMinutes || 30,
        maxAppointmentsPerSlot: scheduleData.maxAppointmentsPerSlot || 1,
        consultationType: scheduleData.consultationType || 'OPD Consultation',
        isActive: scheduleData.isActive !== undefined ? scheduleData.isActive : true,
      },
      { transaction: t }
    );

    return getDoctorScheduleById(hospitalId, created.id, { transaction: t });
  });
};

export const updateDoctorSchedule = async (hospitalId, id, updateData) => {
  return withTransaction(async (t) => {
    const schedule = await DoctorSchedule.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!schedule) {
      const error = new Error('Doctor schedule not found');
      error.statusCode = 404;
      throw error;
    }

    const newDay = (updateData.dayOfWeek || schedule.dayOfWeek).toUpperCase();
    const newStart = updateData.startTime || schedule.startTime;
    const newEnd = updateData.endTime || schedule.endTime;

    // Check overlap if timings or day changed
    if (updateData.dayOfWeek || updateData.startTime || updateData.endTime) {
      const overlapping = await DoctorSchedule.findOne({
        where: {
          hospitalId,
          doctorId: schedule.doctorId,
          dayOfWeek: newDay,
          id: { [Op.ne]: id },
          isActive: true,
          startTime: { [Op.lt]: newEnd },
          endTime: { [Op.gt]: newStart },
        },
        transaction: t,
      });

      if (overlapping) {
        const error = new Error(`An overlapping schedule already exists for this doctor on ${newDay} (${overlapping.startTime} - ${overlapping.endTime})`);
        error.statusCode = 409;
        throw error;
      }
    }

    await schedule.update(
      {
        ...updateData,
        dayOfWeek: newDay,
        startTime: newStart,
        endTime: newEnd,
      },
      { transaction: t }
    );

    return getDoctorScheduleById(hospitalId, id, { transaction: t });
  });
};

export const toggleDoctorScheduleStatus = async (hospitalId, id) => {
  return withTransaction(async (t) => {
    const schedule = await DoctorSchedule.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!schedule) {
      const error = new Error('Doctor schedule not found');
      error.statusCode = 404;
      throw error;
    }

    const newStatus = !schedule.isActive;
    await schedule.update({ isActive: newStatus }, { transaction: t });

    return getDoctorScheduleById(hospitalId, id, { transaction: t });
  });
};

export const deleteDoctorSchedule = async (hospitalId, id) => {
  return withTransaction(async (t) => {
    const schedule = await DoctorSchedule.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!schedule) {
      const error = new Error('Doctor schedule not found');
      error.statusCode = 404;
      throw error;
    }

    await schedule.destroy({ transaction: t });
    return { success: true, message: 'Doctor schedule deleted successfully' };
  });
};

export default {
  getDoctorSchedules,
  getDoctorScheduleById,
  getDoctorSchedulesByDoctorId,
  createDoctorSchedule,
  updateDoctorSchedule,
  toggleDoctorScheduleStatus,
  deleteDoctorSchedule,
};
