import { Op, fn, col } from 'sequelize';
import {
  Patient,
  Appointment,
  Encounter,
  IpdAdmission,
  Ward,
  Bed,
  Medicine,
  MedicineBatch,
  PrescriptionDispensing,
  PharmacyStockTransaction,
  InvestigationOrder,
  InvestigationResult,
  EecpPackage,
  EecpTreatmentCourse,
  EecpSession,
  Invoice,
  Payment,
  PaymentMode,
  Department,
  User,
} from '../models/index.js';

// ==============================================================
// 1. DATE RANGE RESOLVER UTILITY
// ==============================================================

export const formatDateLocal = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Resolves a date preset or custom range into authoritative Date objects
 * and ISO date strings with proper start-of-day and end-of-day bounds.
 */
export const resolveDateRange = (preset = 'this_month', customStart = null, customEnd = null) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_week': {
      // Start from Monday (or Sunday if current day is Sunday)
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'last_week': {
      const day = start.getDay();
      const diffToMonday = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diffToMonday - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'last_month':
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
      break;
    }

    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case 'custom':
      if (customStart) {
        const parts = String(customStart).split('T')[0].split('-').map(Number);
        start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      } else {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        const parts = String(customEnd).split('T')[0].split('-').map(Number);
        end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }
      break;

    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  const startDateStr = formatDateLocal(start);
  const endDateStr = formatDateLocal(end);

  return {
    start,
    end,
    startDateStr,
    endDateStr,
    preset,
  };
};

// ==============================================================
// 2. CENTRAL HOSPITAL ANALYTICS DASHBOARD
// ==============================================================

export const getHospitalDashboardMetrics = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { start, end, startDateStr, endDateStr } = dateRange;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const todayStr = startOfToday.toISOString().split('T')[0];

  // 1. Patient KPIs
  const newPatientsCount = await Patient.count({
    where: {
      hospitalId,
      createdAt: { [Op.between]: [start, end] },
    },
  });

  const totalPatientsCount = await Patient.count({
    where: { hospitalId },
  });

  // Total patient visits in range = Encounters + Appointments
  const totalEncountersCount = await Encounter.count({
    where: {
      hospitalId,
      createdAt: { [Op.between]: [start, end] },
    },
  });

  // 2. Appointment KPIs
  const appointmentsInRange = await Appointment.findAll({
    where: {
      hospitalId,
      appointmentDate: { [Op.between]: [startDateStr, endDateStr] },
    },
    attributes: ['status'],
  });

  let appointmentsScheduled = 0;
  let appointmentsCompleted = 0;
  let appointmentsCancelled = 0;
  let appointmentsNoShow = 0;

  appointmentsInRange.forEach((a) => {
    if (a.status === 'COMPLETED') appointmentsCompleted++;
    else if (a.status === 'CANCELLED') appointmentsCancelled++;
    else if (a.status === 'NO_SHOW') appointmentsNoShow++;
    else appointmentsScheduled++;
  });

  const totalAppointments = appointmentsInRange.length;
  const appointmentCompletionRate = totalAppointments > 0
    ? Number(((appointmentsCompleted / totalAppointments) * 100).toFixed(1))
    : 0;

  // 3. OPD Consultations
  const completedEncountersCount = await Encounter.count({
    where: {
      hospitalId,
      status: 'COMPLETED',
      createdAt: { [Op.between]: [start, end] },
    },
  });

  // 4. IPD KPIs
  const currentAdmittedCount = await IpdAdmission.count({
    where: {
      hospitalId,
      status: { [Op.in]: ['ADMITTED', 'TRANSFER_PENDING'] },
    },
  });

  const todayAdmissionsCount = await IpdAdmission.count({
    where: {
      hospitalId,
      admissionDate: todayStr,
      status: { [Op.ne]: 'CANCELLED' },
    },
  });

  const todayDischargesCount = await IpdAdmission.count({
    where: {
      hospitalId,
      status: 'DISCHARGED',
      [Op.or]: [
        { dischargedAt: { [Op.gte]: startOfToday } },
        { updatedAt: { [Op.gte]: startOfToday } },
      ],
    },
  });

  const beds = await Bed.findAll({
    where: { hospitalId, isActive: true },
    attributes: ['id', 'status', 'wardId'],
  });

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE').length;
  const bedOccupancyRate = totalBeds > 0
    ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1))
    : 0;

  // 5. Pharmacy KPIs
  const totalDispensingCount = await PrescriptionDispensing.count({
    where: {
      hospitalId,
      createdAt: { [Op.between]: [start, end] },
    },
  });

  // Low stock batches (quantityAvailable <= reorderLevel)
  const lowStockBatches = await MedicineBatch.findAll({
    where: {
      hospitalId,
      status: 'ACTIVE',
      quantityAvailable: { [Op.lte]: col('reorder_level') },
    },
    attributes: ['id', 'medicineId'],
  });
  const lowStockMedicinesCount = new Set(lowStockBatches.map((b) => b.medicineId)).size;

  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringBatchesCount = await MedicineBatch.count({
    where: {
      hospitalId,
      status: 'ACTIVE',
      quantityAvailable: { [Op.gt]: 0 },
      expiryDate: { [Op.lte]: thirtyDaysLater },
    },
  });

  // 6. Laboratory KPIs
  const labOrders = await InvestigationOrder.findAll({
    where: {
      hospitalId,
      orderedAt: { [Op.between]: [start, end] },
    },
    attributes: ['id', 'status'],
  });

  const totalLabOrders = labOrders.length;
  const pendingLabOrders = labOrders.filter((o) => ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROCESS'].includes(o.status)).length;
  const completedLabOrders = labOrders.filter((o) => ['FINALIZED', 'COMPLETED'].includes(o.status)).length;

  const criticalLabResultsCount = await InvestigationResult.count({
    where: {
      hospitalId,
      abnormalFlag: { [Op.in]: ['CRITICAL', 'ABNORMAL', 'HIGH', 'LOW'] },
      createdAt: { [Op.between]: [start, end] },
    },
  });

  // 7. EECP KPIs
  const activeEecpCourses = await EecpTreatmentCourse.count({
    where: {
      hospitalId,
      status: 'ACTIVE',
    },
  });

  const completedEecpCourses = await EecpTreatmentCourse.count({
    where: {
      hospitalId,
      status: 'COMPLETED',
      updatedAt: { [Op.between]: [start, end] },
    },
  });

  const eecpSessionsCompleted = await EecpSession.count({
    where: {
      hospitalId,
      status: 'COMPLETED',
      scheduledDate: { [Op.between]: [startDateStr, endDateStr] },
    },
  });

  const eecpSessionsScheduled = await EecpSession.count({
    where: {
      hospitalId,
      status: 'SCHEDULED',
      scheduledDate: { [Op.between]: [startDateStr, endDateStr] },
    },
  });

  // 8. Financial KPIs
  const invoiceFinancials = await Invoice.findAll({
    where: {
      hospitalId,
      invoiceDate: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'CANCELLED' },
    },
    attributes: ['totalAmount', 'paidAmount', 'dueAmount'],
  });

  const totalBilled = invoiceFinancials.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalOutstanding = invoiceFinancials.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);

  const payments = await Payment.findAll({
    where: {
      hospitalId,
      paymentDate: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'VOID' },
    },
    attributes: ['amount', 'refundedAmount'],
  });

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalRefunded = payments.reduce((sum, p) => sum + Number(p.refundedAmount || 0), 0);

  // 9. Department Activity Distribution
  const departmentActivity = await Encounter.findAll({
    where: {
      hospitalId,
      createdAt: { [Op.between]: [start, end] },
      departmentId: { [Op.ne]: null },
    },
    attributes: [
      'departmentId',
      [fn('COUNT', col('Encounter.id')), 'consultationCount'],
    ],
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
    ],
    group: ['Encounter.department_id', 'department.id', 'department.name', 'department.code'],
    raw: true,
  });

  // 10. Ward Occupancy Distribution
  const wardOccupancy = await Ward.findAll({
    where: { hospitalId, isActive: true },
    include: [
      {
        model: Bed,
        as: 'beds',
        attributes: ['id', 'status'],
        where: { isActive: true },
        required: false,
      },
    ],
  });

  const wardOccupancyData = wardOccupancy.map((w) => {
    const total = w.beds?.length || 0;
    const occupied = w.beds?.filter((b) => b.status === 'OCCUPIED').length || 0;
    const available = w.beds?.filter((b) => b.status === 'AVAILABLE').length || 0;
    const rate = total > 0 ? Number(((occupied / total) * 100).toFixed(1)) : 0;
    return {
      wardId: w.id,
      wardName: w.wardName,
      wardCode: w.wardCode,
      floor: w.floor,
      totalBeds: total,
      occupiedBeds: occupied,
      availableBeds: available,
      occupancyRate: rate,
    };
  });

  return {
    dateRange: {
      preset: dateRange.preset,
      startDate: startDateStr,
      endDate: endDateStr,
    },
    kpis: {
      patients: {
        newPatients: newPatientsCount,
        returningPatients: Math.max(0, totalEncountersCount - newPatientsCount),
        totalVisits: totalEncountersCount,
        totalRegistered: totalPatientsCount,
      },
      appointments: {
        total: totalAppointments,
        completed: appointmentsCompleted,
        scheduled: appointmentsScheduled,
        cancelled: appointmentsCancelled,
        noShow: appointmentsNoShow,
        completionRate: appointmentCompletionRate,
      },
      opd: {
        totalEncounters: totalEncountersCount,
        completedConsultations: completedEncountersCount,
      },
      ipd: {
        currentAdmissions: currentAdmittedCount,
        todayAdmissions: todayAdmissionsCount,
        todayDischarges: todayDischargesCount,
        totalBeds,
        occupiedBeds,
        availableBeds,
        bedOccupancyRate,
      },
      pharmacy: {
        dispensingCount: totalDispensingCount,
        lowStockMedicines: lowStockMedicinesCount,
        expiringBatches: expiringBatchesCount,
      },
      laboratory: {
        totalOrders: totalLabOrders,
        pendingOrders: pendingLabOrders,
        completedOrders: completedLabOrders,
        criticalResults: criticalLabResultsCount,
      },
      eecp: {
        activeCourses: activeEecpCourses,
        completedCourses: completedEecpCourses,
        sessionsCompleted: eecpSessionsCompleted,
        sessionsScheduled: eecpSessionsScheduled,
      },
      revenue: {
        totalBilled: Number(totalBilled.toFixed(2)),
        totalCollected: Number(totalCollected.toFixed(2)),
        totalOutstanding: Number(totalOutstanding.toFixed(2)),
        totalRefunded: Number(totalRefunded.toFixed(2)),
      },
    },
    charts: {
      appointmentStatus: [
        { status: 'Completed', count: appointmentsCompleted },
        { status: 'Scheduled', count: appointmentsScheduled },
        { status: 'Cancelled', count: appointmentsCancelled },
        { status: 'No Show', count: appointmentsNoShow },
      ],
      departmentActivity: departmentActivity.map((d) => ({
        departmentId: d.departmentId,
        departmentName: d['department.name'] || 'Unknown',
        consultations: Number(d.consultationCount || 0),
      })),
      wardOccupancy: wardOccupancyData,
    },
  };
};

// ==============================================================
// 3. PATIENT REGISTRATION & VISITS REPORT
// ==============================================================

export const getPatientReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, gender, search, page = 1, limit = 20 } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { start, end, startDateStr, endDateStr } = dateRange;

  const where = {
    hospitalId,
    createdAt: { [Op.between]: [start, end] },
  };

  if (gender) {
    where.gender = gender;
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { firstName: { [Op.iLike]: term } },
      { lastName: { [Op.iLike]: term } },
      { uhid: { [Op.iLike]: term } },
      { phone: { [Op.iLike]: term } },
    ];
  }

  // Summary aggregation
  const totalCount = await Patient.count({ where });
  const maleCount = await Patient.count({ where: { ...where, gender: 'MALE' } });
  const femaleCount = await Patient.count({ where: { ...where, gender: 'FEMALE' } });
  const otherGenderCount = await Patient.count({
    where: { ...where, gender: { [Op.notIn]: ['MALE', 'FEMALE'] } },
  });

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  const { rows, count } = await Patient.findAndCountAll({
    where,
    attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'city', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: parsedLimit,
    offset,
  });

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    summary: {
      totalPatients: totalCount,
      malePatients: maleCount,
      femalePatients: femaleCount,
      otherPatients: otherGenderCount,
    },
    pagination: {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit),
    },
    data: rows.map((p) => ({
      id: p.id,
      uhid: p.uhid,
      fullName: `${p.firstName} ${p.lastName || ''}`.trim(),
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      phone: p.phone,
      city: p.city,
      registrationDate: p.createdAt ? p.createdAt.toISOString().split('T')[0] : null,
    })),
  };
};

// ==============================================================
// 4. APPOINTMENT REPORT
// ==============================================================

export const getAppointmentReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, doctorId, departmentId, status, page = 1, limit = 20 } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { startDateStr, endDateStr } = dateRange;

  const where = {
    hospitalId,
    appointmentDate: { [Op.between]: [startDateStr, endDateStr] },
  };

  if (doctorId) where.doctorId = doctorId;
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;

  // Breakdown statistics
  const appointments = await Appointment.findAll({
    where,
    attributes: ['id', 'status', 'doctorId', 'departmentId'],
    include: [
      { model: User, as: 'doctor', attributes: ['id', 'name', 'specialization'] },
      { model: Department, as: 'department', attributes: ['id', 'name'] },
    ],
  });

  const total = appointments.length;
  let completed = 0;
  let scheduled = 0;
  let cancelled = 0;
  let noShow = 0;

  const doctorMap = {};
  const departmentMap = {};

  appointments.forEach((a) => {
    if (a.status === 'COMPLETED') completed++;
    else if (a.status === 'CANCELLED') cancelled++;
    else if (a.status === 'NO_SHOW') noShow++;
    else scheduled++;

    // Doctor grouping
    const docId = a.doctorId || 'unknown';
    const docName = a.doctor?.name || 'Unassigned';
    if (!doctorMap[docId]) {
      doctorMap[docId] = {
        doctorId: docId,
        doctorName: docName,
        specialization: a.doctor?.specialization || 'General',
        total: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      };
    }
    doctorMap[docId].total++;
    if (a.status === 'COMPLETED') doctorMap[docId].completed++;
    if (a.status === 'CANCELLED') doctorMap[docId].cancelled++;
    if (a.status === 'NO_SHOW') doctorMap[docId].noShow++;

    // Department grouping
    const depId = a.departmentId || 'unknown';
    const depName = a.department?.name || 'General';
    if (!departmentMap[depId]) {
      departmentMap[depId] = {
        departmentId: depId,
        departmentName: depName,
        total: 0,
        completed: 0,
        cancelled: 0,
      };
    }
    departmentMap[depId].total++;
    if (a.status === 'COMPLETED') departmentMap[depId].completed++;
    if (a.status === 'CANCELLED') departmentMap[depId].cancelled++;
  });

  const completionRate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

  // Pagination for detailed appointment list
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone'] },
      { model: User, as: 'doctor', attributes: ['id', 'name'] },
      { model: Department, as: 'department', attributes: ['id', 'name'] },
    ],
    order: [['appointmentDate', 'DESC'], ['startTime', 'DESC']],
    limit: parsedLimit,
    offset,
  });

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    summary: {
      total,
      completed,
      scheduled,
      cancelled,
      noShow,
      completionRate,
    },
    byDoctor: Object.values(doctorMap).map((d) => ({
      ...d,
      completionRate: d.total > 0 ? Number(((d.completed / d.total) * 100).toFixed(1)) : 0,
    })),
    byDepartment: Object.values(departmentMap).map((dep) => ({
      ...dep,
      completionRate: dep.total > 0 ? Number(((dep.completed / dep.total) * 100).toFixed(1)) : 0,
    })),
    pagination: {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit),
    },
    data: rows.map((a) => ({
      id: a.id,
      appointmentNumber: a.appointmentNumber,
      date: a.appointmentDate,
      time: a.startTime,
      patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName || ''}`.trim() : 'Unknown',
      patientUhid: a.patient?.uhid,
      doctorName: a.doctor?.name || 'Unassigned',
      departmentName: a.department?.name || 'General',
      appointmentType: a.appointmentType,
      status: a.status,
    })),
  };
};

// ==============================================================
// 5. OPD CLINICAL CONSULTATIONS REPORT
// ==============================================================

export const getOpdReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, doctorId, departmentId, encounterType, page = 1, limit = 20 } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { start, end, startDateStr, endDateStr } = dateRange;

  const where = {
    hospitalId,
    createdAt: { [Op.between]: [start, end] },
  };

  if (doctorId) where.doctorId = doctorId;
  if (departmentId) where.departmentId = departmentId;
  if (encounterType) where.encounterType = encounterType;

  const encounters = await Encounter.findAll({
    where,
    attributes: ['id', 'encounterType', 'status', 'doctorId', 'departmentId'],
    include: [
      { model: User, as: 'doctor', attributes: ['id', 'name', 'specialization'] },
      { model: Department, as: 'department', attributes: ['id', 'name'] },
    ],
  });

  const total = encounters.length;
  let completed = 0;
  let inProgress = 0;
  let cancelled = 0;

  const doctorStats = {};
  const departmentStats = {};

  encounters.forEach((e) => {
    if (e.status === 'COMPLETED') completed++;
    else if (e.status === 'CANCELLED') cancelled++;
    else inProgress++;

    const docId = e.doctorId || 'unassigned';
    if (!doctorStats[docId]) {
      doctorStats[docId] = {
        doctorId: docId,
        doctorName: e.doctor?.name || 'Unassigned',
        specialization: e.doctor?.specialization || 'General',
        total: 0,
        completed: 0,
      };
    }
    doctorStats[docId].total++;
    if (e.status === 'COMPLETED') doctorStats[docId].completed++;

    const depId = e.departmentId || 'general';
    if (!departmentStats[depId]) {
      departmentStats[depId] = {
        departmentId: depId,
        departmentName: e.department?.name || 'General',
        total: 0,
        completed: 0,
      };
    }
    departmentStats[depId].total++;
    if (e.status === 'COMPLETED') departmentStats[depId].completed++;
  });

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  const { rows, count } = await Encounter.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName'] },
      { model: User, as: 'doctor', attributes: ['id', 'name'] },
      { model: Department, as: 'department', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parsedLimit,
    offset,
  });

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    summary: {
      totalEncounters: total,
      completedConsultations: completed,
      inProgressConsultations: inProgress,
      cancelledConsultations: cancelled,
    },
    byDoctor: Object.values(doctorStats),
    byDepartment: Object.values(departmentStats),
    pagination: {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit),
    },
    data: rows.map((e) => ({
      id: e.id,
      encounterNumber: e.encounterNumber,
      encounterType: e.encounterType,
      date: e.createdAt.toISOString().split('T')[0],
      patientName: e.patient ? `${e.patient.firstName} ${e.patient.lastName || ''}`.trim() : 'Unknown',
      patientUhid: e.patient?.uhid,
      doctorName: e.doctor?.name || 'Unassigned',
      departmentName: e.department?.name || 'General',
      status: e.status,
    })),
  };
};

// ==============================================================
// 6. DOCTOR OPERATIONAL PERFORMANCE REPORT
// ==============================================================

export const getDoctorPerformanceReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, departmentId } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { startDateStr, endDateStr, start, end } = dateRange;

  const docWhere = {
    hospitalId,
    status: 'ACTIVE',
  };
  if (departmentId) docWhere.departmentId = departmentId;

  // Retrieve active doctors in this hospital
  const doctors = await User.findAll({
    where: docWhere,
    attributes: ['id', 'name', 'specialization', 'departmentId'],
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name'],
      },
    ],
  });

  const results = [];

  for (const doc of doctors) {
    const totalAppointments = await Appointment.count({
      where: {
        hospitalId,
        doctorId: doc.id,
        appointmentDate: { [Op.between]: [startDateStr, endDateStr] },
      },
    });

    const completedAppointments = await Appointment.count({
      where: {
        hospitalId,
        doctorId: doc.id,
        appointmentDate: { [Op.between]: [startDateStr, endDateStr] },
        status: 'COMPLETED',
      },
    });

    const cancelledAppointments = await Appointment.count({
      where: {
        hospitalId,
        doctorId: doc.id,
        appointmentDate: { [Op.between]: [startDateStr, endDateStr] },
        status: 'CANCELLED',
      },
    });

    const consultations = await Encounter.count({
      where: {
        hospitalId,
        doctorId: doc.id,
        createdAt: { [Op.between]: [start, end] },
      },
    });

    const ipdAdmissions = await IpdAdmission.count({
      where: {
        hospitalId,
        admittingDoctorId: doc.id,
        admissionDate: { [Op.between]: [start, end] },
        status: { [Op.ne]: 'CANCELLED' },
      },
    });

    const rate = totalAppointments > 0
      ? Number(((completedAppointments / totalAppointments) * 100).toFixed(1))
      : 0;

    results.push({
      doctorId: doc.id,
      doctorName: doc.name,
      departmentName: doc.department?.name || 'General',
      specialization: doc.specialization || 'Consultant',
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      consultations,
      ipdAdmissions,
      completionRate: rate,
    });
  }

  // Sort by completed consultations / appointments descending
  results.sort((a, b) => b.completedAppointments - a.completedAppointments);

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    data: results,
  };
};

// ==============================================================
// 7. DEPARTMENT ACTIVITY REPORT
// ==============================================================

export const getDepartmentReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { startDateStr, endDateStr, start, end } = dateRange;

  const departments = await Department.findAll({
    where: { hospitalId, status: 'ACTIVE' },
    attributes: ['id', 'name', 'code'],
  });

  const departmentStats = [];

  for (const dep of departments) {
    const appointmentsCount = await Appointment.count({
      where: {
        hospitalId,
        departmentId: dep.id,
        appointmentDate: { [Op.between]: [startDateStr, endDateStr] },
      },
    });

    const consultationsCount = await Encounter.count({
      where: {
        hospitalId,
        departmentId: dep.id,
        createdAt: { [Op.between]: [start, end] },
      },
    });

    const admissionsCount = await IpdAdmission.count({
      where: {
        hospitalId,
        departmentId: dep.id,
        admissionDate: { [Op.between]: [start, end] },
        status: { [Op.ne]: 'CANCELLED' },
      },
    });

    const staffCount = await User.count({
      where: {
        hospitalId,
        departmentId: dep.id,
        status: 'ACTIVE',
      },
    });

    departmentStats.push({
      departmentId: dep.id,
      departmentName: dep.name,
      departmentCode: dep.code,
      staffCount,
      appointments: appointmentsCount,
      consultations: consultationsCount,
      admissions: admissionsCount,
    });
  }

  departmentStats.sort((a, b) => b.consultations - a.consultations);

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    data: departmentStats,
  };
};

// ==============================================================
// 8. IPD ANALYTICS & BED OCCUPANCY REPORT
// ==============================================================

export const getIpdReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, wardId, page = 1, limit = 20 } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { startDateStr, endDateStr, start, end } = dateRange;

  const where = {
    hospitalId,
    admissionDate: { [Op.between]: [start, end] },
    status: { [Op.ne]: 'CANCELLED' },
  };

  if (wardId) where.wardId = wardId;

  const admissions = await IpdAdmission.findAll({
    where,
    attributes: ['id', 'admissionType', 'status', 'admissionDate', 'dischargedAt', 'wardId'],
  });

  const totalAdmissions = admissions.length;
  const emergencyAdmissions = admissions.filter((a) => a.admissionType === 'EMERGENCY').length;
  const plannedAdmissions = admissions.filter((a) => a.admissionType !== 'EMERGENCY').length;
  const dischargedInBatch = admissions.filter((a) => a.status === 'DISCHARGED');

  // Calculate Average Length of Stay (ALOS)
  let totalStayDays = 0;
  let validDischargesCount = 0;

  dischargedInBatch.forEach((a) => {
    if (a.dischargedAt && a.admissionDate) {
      const startMs = new Date(a.admissionDate).getTime();
      const endMs = new Date(a.dischargedAt).getTime();
      const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
      totalStayDays += diffDays;
      validDischargesCount++;
    }
  });

  const averageLengthOfStay = validDischargesCount > 0
    ? Number((totalStayDays / validDischargesCount).toFixed(1))
    : 0;

  // Real-time Bed Census & Ward Occupancy
  const wards = await Ward.findAll({
    where: { hospitalId, isActive: true },
    include: [
      {
        model: Bed,
        as: 'beds',
        where: { isActive: true },
        required: false,
      },
    ],
  });

  let totalBeds = 0;
  let occupiedBeds = 0;
  let availableBeds = 0;
  let maintenanceBeds = 0;

  const wardOccupancy = wards.map((w) => {
    const bedsInWard = w.beds || [];
    const totalW = bedsInWard.length;
    const occW = bedsInWard.filter((b) => b.status === 'OCCUPIED').length;
    const availW = bedsInWard.filter((b) => b.status === 'AVAILABLE').length;
    const maintW = bedsInWard.filter((b) => ['MAINTENANCE', 'BLOCKED', 'RESERVED'].includes(b.status)).length;

    totalBeds += totalW;
    occupiedBeds += occW;
    availableBeds += availW;
    maintenanceBeds += maintW;

    return {
      wardId: w.id,
      wardName: w.wardName,
      wardCode: w.wardCode,
      wardType: w.wardType,
      floor: w.floor,
      totalBeds: totalW,
      occupiedBeds: occW,
      availableBeds: availW,
      occupancyRate: totalW > 0 ? Number(((occW / totalW) * 100).toFixed(1)) : 0,
    };
  });

  const overallOccupancyRate = totalBeds > 0
    ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1))
    : 0;

  // Paginated admissions list
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  const { rows, count } = await IpdAdmission.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName'] },
      { model: User, as: 'admittingDoctor', attributes: ['id', 'name'] },
      { model: Ward, as: 'ward', attributes: ['id', 'wardName'] },
      { model: Bed, as: 'bed', attributes: ['id', 'bedNumber'] },
    ],
    order: [['admissionDate', 'DESC']],
    limit: parsedLimit,
    offset,
  });

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    summary: {
      totalAdmissions,
      emergencyAdmissions,
      plannedAdmissions,
      discharges: validDischargesCount,
      averageLengthOfStay,
      bedCensus: {
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        overallOccupancyRate,
      },
    },
    wardOccupancy,
    pagination: {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit),
    },
    data: rows.map((a) => {
      let los = null;
      if (a.dischargedAt && a.admissionDate) {
        const diff = Math.max(1, Math.round((new Date(a.dischargedAt) - new Date(a.admissionDate)) / (1000 * 60 * 60 * 24)));
        los = `${diff} days`;
      }
      return {
        id: a.id,
        admissionNumber: a.admissionNumber,
        admissionDate: a.admissionDate ? String(a.admissionDate).split('T')[0] : null,
        dischargedAt: a.dischargedAt ? String(a.dischargedAt).split('T')[0] : null,
        lengthOfStay: los,
        patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName || ''}`.trim() : 'Unknown',
        patientUhid: a.patient?.uhid,
        admittingDoctor: a.admittingDoctor?.name || 'Unassigned',
        wardName: a.ward?.wardName || 'Ward',
        bedNumber: a.bed?.bedNumber || 'Bed',
        admissionType: a.admissionType,
        status: a.status,
      };
    }),
  };
};

// ==============================================================
// 9. PHARMACY INVENTORY & DISPENSING REPORT
// ==============================================================

export const getPharmacyReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, category, page = 1, limit = 20 } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { start, end, startDateStr, endDateStr } = dateRange;

  const totalMedicines = await Medicine.count({ where: { hospitalId } });

  const medicineInclude = {
    model: Medicine,
    as: 'medicine',
    attributes: ['id', 'name', 'category', 'dosageForm'],
  };
  if (category) {
    medicineInclude.where = { category };
  }

  const activeBatches = await MedicineBatch.findAll({
    where: { hospitalId, status: 'ACTIVE' },
    include: [medicineInclude],
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const lowStockItems = [];
  const expiringItems = [];

  activeBatches.forEach((b) => {
    if (b.quantityAvailable <= b.reorderLevel) {
      lowStockItems.push({
        batchId: b.id,
        medicineName: b.medicine?.name || 'Unknown',
        category: b.medicine?.category || 'General',
        batchNumber: b.batchNumber,
        currentStock: b.quantityAvailable,
        reorderLevel: b.reorderLevel,
        expiryDate: b.expiryDate ? String(b.expiryDate).split('T')[0] : null,
      });
    }

    if (b.expiryDate && new Date(b.expiryDate) <= thirtyDaysFromNow && b.quantityAvailable > 0) {
      expiringItems.push({
        batchId: b.id,
        medicineName: b.medicine?.name || 'Unknown',
        batchNumber: b.batchNumber,
        currentStock: b.quantityAvailable,
        expiryDate: b.expiryDate ? String(b.expiryDate).split('T')[0] : null,
      });
    }
  });

  // Dispensing statistics
  const dispensingRecords = await PrescriptionDispensing.findAll({
    where: {
      hospitalId,
      createdAt: { [Op.between]: [start, end] },
    },
    attributes: ['id', 'status'],
  });

  const totalDispensed = dispensingRecords.length;
  const fullyDispensed = dispensingRecords.filter((d) => d.status === 'FULLY_DISPENSED' || d.status === 'DISPENSED').length;
  const partiallyDispensed = dispensingRecords.filter((d) => d.status === 'PARTIALLY_DISPENSED').length;

  // Stock movement ledger summary
  const stockTransactions = await PharmacyStockTransaction.findAll({
    where: {
      hospitalId,
      createdAt: { [Op.between]: [start, end] },
    },
    attributes: ['transactionType', 'quantity'],
  });

  let totalStockIn = 0;
  let totalStockDispensed = 0;
  let totalStockAdjusted = 0;

  stockTransactions.forEach((tx) => {
    if (['STOCK_IN', 'RETURN'].includes(tx.transactionType)) {
      totalStockIn += Math.abs(tx.quantity);
    } else if (tx.transactionType === 'DISPENSE') {
      totalStockDispensed += Math.abs(tx.quantity);
    } else {
      totalStockAdjusted += tx.quantity;
    }
  });

  // Paginated low-stock table
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;
  const paginatedLowStock = lowStockItems.slice(offset, offset + parsedLimit);

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    summary: {
      totalMedicines,
      activeBatchesCount: activeBatches.length,
      lowStockBatchesCount: lowStockItems.length,
      expiringBatchesCount: expiringItems.length,
      dispensing: {
        totalDispensed,
        fullyDispensed,
        partiallyDispensed,
      },
      stockMovement: {
        totalStockIn,
        totalStockDispensed,
        totalStockAdjusted,
      },
    },
    lowStockAlerts: paginatedLowStock,
    expiringAlerts: expiringItems.slice(0, 10),
    pagination: {
      total: lowStockItems.length,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(lowStockItems.length / parsedLimit),
    },
  };
};

// ==============================================================
// 10. LABORATORY DIAGNOSTICS REPORT
// ==============================================================

export const getLaboratoryReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, priority, status, page = 1, limit = 20 } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { start, end, startDateStr, endDateStr } = dateRange;

  const where = {
    hospitalId,
    orderedAt: { [Op.between]: [start, end] },
  };

  if (priority) where.priority = priority;
  if (status) where.status = status;

  const orders = await InvestigationOrder.findAll({
    where,
    attributes: ['id', 'investigationId', 'investigationName', 'priority', 'status', 'doctorId'],
    include: [
      { model: User, as: 'doctor', attributes: ['id', 'name'] },
      { model: InvestigationResult, as: 'result', attributes: ['id', 'abnormalFlag', 'status'] },
    ],
  });

  const totalOrders = orders.length;
  let pendingOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let criticalResults = 0;

  const investigationMap = {};

  orders.forEach((o) => {
    if (['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROCESS'].includes(o.status)) pendingOrders++;
    else if (['FINALIZED', 'COMPLETED'].includes(o.status)) completedOrders++;
    else if (o.status === 'CANCELLED') cancelledOrders++;

    if (o.result && ['CRITICAL', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'ABNORMAL'].includes(o.result.abnormalFlag)) {
      criticalResults++;
    }

    const invKey = o.investigationName || 'Unknown';
    if (!investigationMap[invKey]) {
      investigationMap[invKey] = {
        investigationName: invKey,
        total: 0,
        completed: 0,
        abnormal: 0,
      };
    }
    investigationMap[invKey].total++;
    if (['FINALIZED', 'COMPLETED'].includes(o.status)) investigationMap[invKey].completed++;
    if (o.result?.abnormalFlag) investigationMap[invKey].abnormal++;
  });

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  const { rows, count } = await InvestigationOrder.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName'] },
      { model: User, as: 'doctor', attributes: ['id', 'name'] },
      { model: InvestigationResult, as: 'result', attributes: ['id', 'abnormalFlag', 'resultValue', 'resultUnit'] },
    ],
    order: [['orderedAt', 'DESC']],
    limit: parsedLimit,
    offset,
  });

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    summary: {
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      criticalResults,
    },
    byInvestigation: Object.values(investigationMap),
    pagination: {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit),
    },
    data: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      date: o.orderedAt ? o.orderedAt.toISOString().split('T')[0] : null,
      patientName: o.patient ? `${o.patient.firstName} ${o.patient.lastName || ''}`.trim() : 'Unknown',
      patientUhid: o.patient?.uhid,
      doctorName: o.doctor?.name || 'Unassigned',
      investigationName: o.investigationName,
      priority: o.priority,
      status: o.status,
      abnormalFlag: o.result?.abnormalFlag || null,
      resultValue: o.result?.resultValue ? `${o.result.resultValue} ${o.result.resultUnit || ''}`.trim() : null,
    })),
  };
};

// ==============================================================
// 11. EECP THERAPY CLINICAL REPORT
// ==============================================================

export const getEecpReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, packageId, status, page = 1, limit = 20 } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { startDateStr, endDateStr } = dateRange;

  const courseWhere = { hospitalId };
  if (status) courseWhere.status = status;
  if (packageId) courseWhere.packageId = packageId;

  const courses = await EecpTreatmentCourse.findAll({
    where: courseWhere,
    include: [
      { model: EecpPackage, as: 'package', attributes: ['id', 'name', 'numberOfSessions', 'packagePrice'] },
      { model: Patient, as: 'patient', attributes: ['id', 'uhid', 'firstName', 'lastName'] },
    ],
  });

  const totalCourses = courses.length;
  let activeCourses = 0;
  let completedCourses = 0;
  let pausedCourses = 0;
  let cancelledCourses = 0;

  const packageMap = {};

  courses.forEach((c) => {
    if (c.status === 'ACTIVE') activeCourses++;
    else if (c.status === 'COMPLETED') completedCourses++;
    else if (c.status === 'PAUSED') pausedCourses++;
    else if (c.status === 'CANCELLED') cancelledCourses++;

    const pkgName = c.package?.name || 'Standard Package';
    if (!packageMap[pkgName]) {
      packageMap[pkgName] = {
        packageName: pkgName,
        coursesCount: 0,
        sessionsPlanned: 0,
        sessionsCompleted: 0,
      };
    }
    packageMap[pkgName].coursesCount++;
    packageMap[pkgName].sessionsPlanned += c.plannedSessions ?? c.totalSessionsPlanned ?? 0;
    packageMap[pkgName].sessionsCompleted += c.completedSessions ?? c.sessionsCompleted ?? 0;
  });

  // Sessions in date range
  const sessions = await EecpSession.findAll({
    where: {
      hospitalId,
      scheduledDate: { [Op.between]: [startDateStr, endDateStr] },
    },
    attributes: ['id', 'status'],
  });

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length;
  const scheduledSessions = sessions.filter((s) => s.status === 'SCHEDULED').length;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  const paginatedCourses = courses.slice(offset, offset + parsedLimit);

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    summary: {
      totalCourses,
      activeCourses,
      completedCourses,
      pausedCourses,
      cancelledCourses,
      sessionsInRange: {
        total: totalSessions,
        completed: completedSessions,
        scheduled: scheduledSessions,
      },
    },
    packageUtilization: Object.values(packageMap),
    pagination: {
      total: courses.length,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(courses.length / parsedLimit),
    },
    data: paginatedCourses.map((c) => ({
      id: c.id,
      courseNumber: c.courseNumber,
      patientName: c.patient ? `${c.patient.firstName} ${c.patient.lastName || ''}`.trim() : 'Unknown',
      patientUhid: c.patient?.uhid,
      packageName: c.package?.name || 'Standard',
      totalPlanned: c.plannedSessions ?? c.totalSessionsPlanned,
      completed: c.completedSessions ?? c.sessionsCompleted,
      remaining: Math.max(0, (c.plannedSessions ?? c.totalSessionsPlanned ?? 0) - (c.completedSessions ?? c.sessionsCompleted ?? 0)),
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
    })),
  };
};

// ==============================================================
// 12. BILLING & REVENUE REPORT
// ==============================================================

export const getBillingReport = async (hospitalId, options = {}) => {
  const { preset, startDate, endDate, page = 1, limit = 20 } = options;
  const dateRange = resolveDateRange(preset, startDate, endDate);
  const { startDateStr, endDateStr, start, end } = dateRange;

  const invoices = await Invoice.findAll({
    where: {
      hospitalId,
      invoiceDate: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'CANCELLED' },
    },
    attributes: ['id', 'invoiceNumber', 'invoiceDate', 'subtotal', 'discountAmount', 'taxAmount', 'totalAmount', 'paidAmount', 'dueAmount', 'paymentStatus'],
  });

  const totalInvoices = invoices.length;
  let totalSubtotal = 0;
  let totalDiscounts = 0;
  let totalTaxes = 0;
  let totalBilled = 0;
  let totalOutstanding = 0;

  invoices.forEach((inv) => {
    totalSubtotal += Number(inv.subtotal || 0);
    totalDiscounts += Number(inv.discountAmount || 0);
    totalTaxes += Number(inv.taxAmount || 0);
    totalBilled += Number(inv.totalAmount || 0);
    totalOutstanding += Number(inv.dueAmount || 0);
  });

  // Payments collected in range
  const payments = await Payment.findAll({
    where: {
      hospitalId,
      paymentDate: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'VOID' },
    },
    include: [
      {
        model: PaymentMode,
        as: 'paymentMode',
        attributes: ['id', 'name', 'code'],
      },
    ],
  });

  let totalCollected = 0;
  let totalRefunded = 0;
  const modeMap = {};

  payments.forEach((p) => {
    const amt = Number(p.amount || 0);
    const ref = Number(p.refundedAmount || 0);
    totalCollected += amt;
    totalRefunded += ref;

    const modeName = p.paymentMode?.name || 'Cash';
    if (!modeMap[modeName]) {
      modeMap[modeName] = {
        modeName,
        transactionsCount: 0,
        amount: 0,
      };
    }
    modeMap[modeName].transactionsCount++;
    modeMap[modeName].amount += amt;
  });

  // Outstanding Aging Calculation
  const now = new Date();
  const unpaidInvoices = await Invoice.findAll({
    where: {
      hospitalId,
      dueAmount: { [Op.gt]: 0 },
      status: { [Op.ne]: 'CANCELLED' },
    },
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone'],
      },
    ],
    order: [['invoiceDate', 'ASC']],
  });

  let aging0To30 = 0;
  let aging31To60 = 0;
  let aging61To90 = 0;
  let aging90Plus = 0;

  const outstandingList = unpaidInvoices.map((inv) => {
    const invDate = new Date(inv.invoiceDate);
    const diffDays = Math.max(0, Math.floor((now - invDate) / (1000 * 60 * 60 * 24)));
    const due = Number(inv.dueAmount || 0);

    let bucket = '0-30 Days';
    if (diffDays <= 30) aging0To30 += due;
    else if (diffDays <= 60) {
      aging31To60 += due;
      bucket = '31-60 Days';
    } else if (diffDays <= 90) {
      aging61To90 += due;
      bucket = '61-90 Days';
    } else {
      aging90Plus += due;
      bucket = '90+ Days';
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : null,
      patientName: inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName || ''}`.trim() : 'Unknown',
      patientUhid: inv.patient?.uhid,
      totalAmount: Number(inv.totalAmount || 0),
      paidAmount: Number(inv.paidAmount || 0),
      dueAmount: due,
      agingDays: diffDays,
      agingBucket: bucket,
      paymentStatus: inv.paymentStatus,
    };
  });

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  return {
    dateRange: { preset: dateRange.preset, startDate: startDateStr, endDate: endDateStr },
    summary: {
      totalInvoices,
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      totalDiscounts: Number(totalDiscounts.toFixed(2)),
      totalTaxes: Number(totalTaxes.toFixed(2)),
      totalBilled: Number(totalBilled.toFixed(2)),
      totalCollected: Number(totalCollected.toFixed(2)),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      totalRefunded: Number(totalRefunded.toFixed(2)),
    },
    byPaymentMode: Object.values(modeMap).map((m) => ({
      ...m,
      amount: Number(m.amount.toFixed(2)),
      sharePercentage: totalCollected > 0 ? Number(((m.amount / totalCollected) * 100).toFixed(1)) : 0,
    })),
    agingSummary: {
      aging0To30: Number(aging0To30.toFixed(2)),
      aging31To60: Number(aging31To60.toFixed(2)),
      aging61To90: Number(aging61To90.toFixed(2)),
      aging90Plus: Number(aging90Plus.toFixed(2)),
      totalOutstandingAllTime: Number((aging0To30 + aging31To60 + aging61To90 + aging90Plus).toFixed(2)),
    },
    pagination: {
      total: outstandingList.length,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(outstandingList.length / parsedLimit),
    },
    outstandingInvoices: outstandingList.slice(offset, offset + parsedLimit),
  };
};

// ==============================================================
// 13. CSV EXPORT UTILITY
// ==============================================================

export const exportReportToCsv = (reportType, reportData) => {
  const sanitize = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  let rows = [];

  switch (reportType) {
    case 'patients':
      rows.push(['UHID', 'Patient Name', 'Gender', 'Date of Birth', 'Phone', 'City', 'Registration Date']);
      (reportData.data || []).forEach((p) => {
        rows.push([p.uhid, p.fullName, p.gender, p.dateOfBirth, p.phone, p.city, p.registrationDate]);
      });
      break;

    case 'appointments':
      rows.push(['Appointment Number', 'Date', 'Time', 'Patient Name', 'UHID', 'Doctor', 'Department', 'Type', 'Status']);
      (reportData.data || []).forEach((a) => {
        rows.push([a.appointmentNumber, a.date, a.time, a.patientName, a.patientUhid, a.doctorName, a.departmentName, a.appointmentType, a.status]);
      });
      break;

    case 'ipd':
      rows.push(['Admission Number', 'Admission Date', 'Discharge Date', 'Length of Stay', 'Patient Name', 'UHID', 'Doctor', 'Ward', 'Bed', 'Status']);
      (reportData.data || []).forEach((a) => {
        rows.push([a.admissionNumber, a.admissionDate, a.dischargedAt, a.lengthOfStay, a.patientName, a.patientUhid, a.admittingDoctor, a.wardName, a.bedNumber, a.status]);
      });
      break;

    case 'billing':
      rows.push(['Invoice Number', 'Invoice Date', 'Patient Name', 'UHID', 'Total Amount', 'Paid Amount', 'Due Amount', 'Aging Days', 'Bucket', 'Status']);
      (reportData.outstandingInvoices || []).forEach((inv) => {
        rows.push([inv.invoiceNumber, inv.invoiceDate, inv.patientName, inv.patientUhid, inv.totalAmount, inv.paidAmount, inv.dueAmount, inv.agingDays, inv.agingBucket, inv.paymentStatus]);
      });
      break;

    default:
      rows.push(['Report Type', reportType]);
      rows.push(['Generated At', new Date().toISOString()]);
      break;
  }

  return rows.map((r) => r.map(sanitize).join(',')).join('\n');
};

export default {
  resolveDateRange,
  getHospitalDashboardMetrics,
  getPatientReport,
  getAppointmentReport,
  getOpdReport,
  getDoctorPerformanceReport,
  getDepartmentReport,
  getIpdReport,
  getPharmacyReport,
  getLaboratoryReport,
  getEecpReport,
  getBillingReport,
  exportReportToCsv,
};
