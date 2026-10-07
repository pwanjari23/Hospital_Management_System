import { Op } from 'sequelize';
import {
  Appointment,
  DoctorSchedule,
  DoctorLeave,
  User,
  Patient,
  Department,
  HospitalSequence,
  HospitalSetting,
  Hospital,
  Role,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';

const DAYS_OF_WEEK = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

const toTimeString = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Concurrency-safe atomic Appointment Number generator using PostgreSQL row lock
 */
export const generateNextAppointmentNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'APPOINTMENT' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'appointment_prefix' },
      transaction: t,
    });

    let prefix = customPrefixSetting?.value?.trim().toUpperCase();
    if (!prefix) {
      const hospital = await Hospital.findByPk(hospitalId, { transaction: t });
      if (hospital?.slug) {
        const cleanSlug = hospital.slug.replace(/[^a-zA-Z]/g, '').toUpperCase();
        prefix = `APT-${cleanSlug.slice(0, 4) || 'HOSP'}`;
      } else {
        prefix = 'APT';
      }
    }

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'APPOINTMENT',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'APPOINTMENT' },
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
 * Slot Generation Logic
 */
export const getAvailableSlots = async (hospitalId, options = {}) => {
  const { doctorId, date } = options;

  if (!doctorId || !date) {
    const error = new Error('Doctor ID and Date (YYYY-MM-DD) are required to generate slots');
    error.statusCode = 400;
    throw error;
  }

  // 1. Verify doctor
  const doctor = await User.findOne({
    where: { id: doctorId, hospitalId, status: 'ACTIVE' },
  });
  if (!doctor) {
    const error = new Error('Active doctor not found in this hospital');
    error.statusCode = 404;
    throw error;
  }

  // 2. Check doctor leaves on that date
  const leave = await DoctorLeave.findOne({
    where: {
      hospitalId,
      doctorId,
      isActive: true,
      startDate: { [Op.lte]: date },
      endDate: { [Op.gte]: date },
    },
  });

  if (leave) {
    return {
      date,
      doctorId,
      doctorName: doctor.name,
      isAvailable: false,
      reason: `Doctor is on leave: ${leave.reason}`,
      slots: [],
    };
  }

  // 3. Determine day of week
  const dateObj = new Date(`${date}T00:00:00Z`);
  const dayOfWeek = DAYS_OF_WEEK[dateObj.getUTCDay()];

  // 4. Retrieve doctor schedule for that day
  const schedules = await DoctorSchedule.findAll({
    where: {
      hospitalId,
      doctorId,
      dayOfWeek,
      isActive: true,
    },
    order: [['startTime', 'ASC']],
  });

  if (!schedules || schedules.length === 0) {
    return {
      date,
      doctorId,
      doctorName: doctor.name,
      isAvailable: false,
      reason: `Doctor has no working schedule configured for ${dayOfWeek}`,
      slots: [],
    };
  }

  // 5. Fetch all active/booked appointments for doctor on that date
  const existingAppointments = await Appointment.findAll({
    where: {
      hospitalId,
      doctorId,
      appointmentDate: date,
      status: {
        [Op.notIn]: ['CANCELLED', 'RESCHEDULED'],
      },
    },
  });

  // Count bookings per startTime
  const bookingCounts = {};
  existingAppointments.forEach((apt) => {
    const timeKey = apt.startTime.slice(0, 5);
    bookingCounts[timeKey] = (bookingCounts[timeKey] || 0) + 1;
  });

  const allSlots = [];

  for (const schedule of schedules) {
    const startMin = toMinutes(schedule.startTime);
    const endMin = toMinutes(schedule.endTime);
    const breakStartMin = schedule.breakStartTime ? toMinutes(schedule.breakStartTime) : null;
    const breakEndMin = schedule.breakEndTime ? toMinutes(schedule.breakEndTime) : null;
    const duration = schedule.slotDurationMinutes || 30;
    const maxPerSlot = schedule.maxAppointmentsPerSlot || 1;

    let currentMin = startMin;
    while (currentMin + duration <= endMin) {
      const slotStart = currentMin;
      const slotEnd = currentMin + duration;

      // Check if slot falls in break
      const isInBreak =
        breakStartMin !== null &&
        breakEndMin !== null &&
        slotStart < breakEndMin &&
        slotEnd > breakStartMin;

      if (!isInBreak) {
        const startTimeStr = toTimeString(slotStart);
        const endTimeStr = toTimeString(slotEnd);
        const bookedCount = bookingCounts[startTimeStr] || 0;
        const availableCount = Math.max(0, maxPerSlot - bookedCount);
        const isBooked = bookedCount >= maxPerSlot;

        allSlots.push({
          startTime: startTimeStr,
          endTime: endTimeStr,
          consultationType: schedule.consultationType,
          maxCapacity: maxPerSlot,
          bookedCount,
          availableCount,
          isAvailable: !isBooked,
        });
      }

      currentMin += duration;
    }
  }

  return {
    date,
    doctorId,
    doctorName: doctor.name,
    specialization: doctor.specialization,
    consultationFee: doctor.consultationFee,
    isAvailable: allSlots.length > 0,
    slots: allSlots,
  };
};

/**
 * List Appointments with server-side filters, search & pagination
 */
export const getAppointments = async (hospitalId, options = {}) => {
  const {
    doctorId,
    patientId,
    departmentId,
    status,
    appointmentType,
    date,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 10,
    sortBy = 'appointmentDate',
    sortOrder = 'DESC',
  } = options;

  const where = { hospitalId };

  if (doctorId) where.doctorId = doctorId;
  if (patientId) where.patientId = patientId;
  if (departmentId) where.departmentId = departmentId;
  if (status && status !== 'ALL') where.status = status.toUpperCase();
  if (appointmentType && appointmentType !== 'ALL') where.appointmentType = appointmentType;

  if (date) {
    where.appointmentDate = date;
  } else if (startDate && endDate) {
    where.appointmentDate = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    where.appointmentDate = { [Op.gte]: startDate };
  } else if (endDate) {
    where.appointmentDate = { [Op.lte]: endDate };
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

  const { count, rows } = await Appointment.findAndCountAll({
    where,
    include: [
      {
        model: Patient,
        as: 'patient',
        where: Object.keys(patientWhere).length > 0 ? patientWhere : undefined,
        attributes: ['id', 'uhid', 'firstName', 'middleName', 'lastName', 'phone', 'gender', 'dateOfBirth'],
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
        model: User,
        as: 'booker',
        attributes: ['id', 'name', 'email'],
      },
    ],
    limit: limitNum,
    offset,
    order: [
      [sortBy || 'appointmentDate', sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'],
      ['startTime', 'ASC'],
    ],
    distinct: true,
  });

  return {
    appointments: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

/**
 * Appointment Details by ID
 */
export const getAppointmentById = async (hospitalId, id, options = {}) => {
  const appointment = await Appointment.findOne({
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
          'phone',
          'email',
          'gender',
          'dateOfBirth',
          'bloodGroup',
          'allergies',
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
        model: User,
        as: 'booker',
        attributes: ['id', 'name', 'email'],
      },
    ],
    ...options,
  });

  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  return appointment;
};

/**
 * Create Appointment with strict concurrency and schedule verification
 */
export const createAppointment = async (hospitalId, appointmentData, bookedByUserId) => {
  return withTransaction(async (t) => {
    const {
      patientId,
      doctorId,
      departmentId,
      appointmentDate,
      startTime,
      endTime,
      appointmentType,
      reason,
      notes,
      consultationFee,
      paymentStatus,
    } = appointmentData;

    // 1. Verify Patient belongs to this hospital and is active
    const patient = await Patient.findOne({
      where: { id: patientId, hospitalId, isActive: true },
      transaction: t,
    });
    if (!patient) {
      const error = new Error('Patient not found or inactive in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 2. Verify Doctor belongs to this hospital and is active
    const doctor = await User.findOne({
      where: { id: doctorId, hospitalId, status: 'ACTIVE' },
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
      transaction: t,
    });
    if (!doctor) {
      const error = new Error('Doctor not found or inactive in this hospital');
      error.statusCode = 404;
      throw error;
    }
    const isDoctor = doctor.roles?.some((r) => r.name === 'DOCTOR');
    if (!isDoctor) {
      const error = new Error('Assigned staff member does not have DOCTOR role');
      error.statusCode = 400;
      throw error;
    }

    // 3. Department
    let assignedDeptId = departmentId || doctor.departmentId;
    if (assignedDeptId) {
      const dept = await Department.findOne({
        where: { id: assignedDeptId, hospitalId, status: 'ACTIVE' },
        transaction: t,
      });
      if (!dept) {
        assignedDeptId = null;
      }
    }

    // 4. Verify Doctor is NOT on leave
    const leave = await DoctorLeave.findOne({
      where: {
        hospitalId,
        doctorId,
        isActive: true,
        startDate: { [Op.lte]: appointmentDate },
        endDate: { [Op.gte]: appointmentDate },
      },
      transaction: t,
    });
    if (leave) {
      const error = new Error(`Doctor is on leave on ${appointmentDate} (${leave.reason})`);
      error.statusCode = 400;
      throw error;
    }

    // 5. Verify Doctor has active working schedule covering this slot
    const dateObj = new Date(`${appointmentDate}T00:00:00Z`);
    const dayOfWeek = DAYS_OF_WEEK[dateObj.getUTCDay()];

    const schedule = await DoctorSchedule.findOne({
      where: {
        hospitalId,
        doctorId,
        dayOfWeek,
        isActive: true,
        startTime: { [Op.lte]: startTime },
        endTime: { [Op.gte]: endTime },
      },
      transaction: t,
    });

    if (!schedule) {
      const error = new Error(`The requested slot (${startTime} - ${endTime}) is outside the doctor's working schedule on ${dayOfWeek}`);
      error.statusCode = 400;
      throw error;
    }

    // Check break overlap
    if (schedule.breakStartTime && schedule.breakEndTime) {
      const slotStartMin = toMinutes(startTime);
      const slotEndMin = toMinutes(endTime);
      const breakStartMin = toMinutes(schedule.breakStartTime);
      const breakEndMin = toMinutes(schedule.breakEndTime);

      if (slotStartMin < breakEndMin && slotEndMin > breakStartMin) {
        const error = new Error(`The requested slot overlaps with doctor's break time (${schedule.breakStartTime} - ${schedule.breakEndTime})`);
        error.statusCode = 400;
        throw error;
      }
    }

    // 6. Check existing bookings for this doctor at this slot (Concurrency Protection with lock)
    // Query existing appointments with lock
    const existingCount = await Appointment.count({
      where: {
        hospitalId,
        doctorId,
        appointmentDate,
        startTime,
        status: { [Op.notIn]: ['CANCELLED', 'RESCHEDULED'] },
      },
      transaction: t,
    });

    const maxCapacity = schedule.maxAppointmentsPerSlot || 1;
    if (existingCount >= maxCapacity) {
      const error = new Error('This time slot is no longer available. Please choose another time.');
      error.statusCode = 409;
      throw error;
    }

    // 7. Check if same patient already has an active appointment with this doctor on same date & time
    const patientOverlap = await Appointment.findOne({
      where: {
        hospitalId,
        patientId,
        doctorId,
        appointmentDate,
        startTime,
        status: { [Op.notIn]: ['CANCELLED', 'RESCHEDULED'] },
      },
      transaction: t,
    });
    if (patientOverlap) {
      const error = new Error('This patient already has an appointment booked for this time slot.');
      error.statusCode = 409;
      throw error;
    }

    // 8. Generate Appointment Reference Number
    const appointmentNumber = await generateNextAppointmentNumber(hospitalId, t);

    // 9. Fee determination
    const fee = consultationFee !== undefined ? Number(consultationFee) : Number(doctor.consultationFee || 0);

    // 10. Create record
    const created = await Appointment.create(
      {
        hospitalId,
        appointmentNumber,
        patientId,
        doctorId,
        departmentId: assignedDeptId,
        appointmentDate,
        startTime,
        endTime,
        appointmentType: appointmentType || 'OPD Consultation',
        status: 'SCHEDULED',
        reason: reason?.trim() || null,
        notes: notes?.trim() || null,
        consultationFee: isNaN(fee) ? 0 : fee,
        paymentStatus: paymentStatus || 'PENDING',
        bookedBy: bookedByUserId || null,
      },
      { transaction: t }
    );

    return getAppointmentById(hospitalId, created.id, { transaction: t });
  });
};

/**
 * Reschedule Appointment
 */
export const rescheduleAppointment = async (hospitalId, id, rescheduleData, _performedByUserId) => {
  return withTransaction(async (t) => {
    const appointment = await Appointment.findOne({
      where: { id, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      const error = new Error(`Cannot reschedule an appointment that is already ${appointment.status.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    const {
      appointmentDate,
      startTime,
      endTime,
      doctorId = appointment.doctorId,
      reason,
    } = rescheduleData;

    // Check doctor availability for new slot
    const dateObj = new Date(`${appointmentDate}T00:00:00Z`);
    const dayOfWeek = DAYS_OF_WEEK[dateObj.getUTCDay()];

    const schedule = await DoctorSchedule.findOne({
      where: {
        hospitalId,
        doctorId,
        dayOfWeek,
        isActive: true,
        startTime: { [Op.lte]: startTime },
        endTime: { [Op.gte]: endTime },
      },
      transaction: t,
    });

    if (!schedule) {
      const error = new Error(`The requested slot (${startTime} - ${endTime}) is outside working hours on ${dayOfWeek}`);
      error.statusCode = 400;
      throw error;
    }

    // Check capacity
    const existingCount = await Appointment.count({
      where: {
        hospitalId,
        doctorId,
        appointmentDate,
        startTime,
        id: { [Op.ne]: id },
        status: { [Op.notIn]: ['CANCELLED', 'RESCHEDULED'] },
      },
      transaction: t,
    });

    if (existingCount >= schedule.maxAppointmentsPerSlot) {
      const error = new Error('The selected time slot is already fully booked. Please select another slot.');
      error.statusCode = 409;
      throw error;
    }

    const previousInfo = `Rescheduled from ${appointment.appointmentDate} ${appointment.startTime}. Reason: ${reason || 'Patient request'}`;
    const newNotes = appointment.notes ? `${appointment.notes}\n[${new Date().toISOString()}] ${previousInfo}` : previousInfo;

    await appointment.update(
      {
        appointmentDate,
        startTime,
        endTime,
        doctorId,
        status: 'RESCHEDULED',
        notes: newNotes,
      },
      { transaction: t }
    );

    return getAppointmentById(hospitalId, id, { transaction: t });
  });
};

/**
 * Cancel Appointment
 */
export const cancelAppointment = async (hospitalId, id, cancelData) => {
  return withTransaction(async (t) => {
    const appointment = await Appointment.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      const error = new Error(`Appointment is already ${appointment.status.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    await appointment.update(
      {
        status: 'CANCELLED',
        cancellationReason: cancelData.cancellationReason,
        cancelledAt: new Date(),
      },
      { transaction: t }
    );

    return getAppointmentById(hospitalId, id, { transaction: t });
  });
};

/**
 * Update Status (CHECKED_IN, IN_PROGRESS, COMPLETED, NO_SHOW, etc.)
 */
export const updateAppointmentStatus = async (hospitalId, id, statusData) => {
  return withTransaction(async (t) => {
    const appointment = await Appointment.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    const newStatus = statusData.status.toUpperCase();
    const updatePayload = { status: newStatus };

    if (newStatus === 'CHECKED_IN' && !appointment.checkedInAt) {
      updatePayload.checkedInAt = new Date();
    }

    if (statusData.notes) {
      updatePayload.notes = appointment.notes
        ? `${appointment.notes}\n${statusData.notes}`
        : statusData.notes;
    }

    await appointment.update(updatePayload, { transaction: t });
    return getAppointmentById(hospitalId, id, { transaction: t });
  });
};

/**
 * Update Appointment generic fields
 */
export const updateAppointment = async (hospitalId, id, updateData) => {
  return withTransaction(async (t) => {
    const appointment = await Appointment.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    await appointment.update(updateData, { transaction: t });
    return getAppointmentById(hospitalId, id, { transaction: t });
  });
};

/**
 * Summary metrics for Appointment Dashboard Cards
 */
export const getAppointmentStats = async (hospitalId, date = null) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const todayCount = await Appointment.count({
    where: { hospitalId, appointmentDate: targetDate },
  });

  const checkedInCount = await Appointment.count({
    where: { hospitalId, appointmentDate: targetDate, status: 'CHECKED_IN' },
  });

  const completedCount = await Appointment.count({
    where: { hospitalId, appointmentDate: targetDate, status: 'COMPLETED' },
  });

  const upcomingCount = await Appointment.count({
    where: {
      hospitalId,
      appointmentDate: { [Op.gte]: targetDate },
      status: { [Op.in]: ['SCHEDULED', 'CONFIRMED'] },
    },
  });

  const cancelledCount = await Appointment.count({
    where: { hospitalId, appointmentDate: targetDate, status: 'CANCELLED' },
  });

  return {
    date: targetDate,
    today: todayCount,
    checkedIn: checkedInCount,
    completed: completedCount,
    upcoming: upcomingCount,
    cancelled: cancelledCount,
  };
};

export default {
  generateNextAppointmentNumber,
  getAvailableSlots,
  getAppointments,
  getAppointmentById,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  updateAppointment,
  getAppointmentStats,
};
