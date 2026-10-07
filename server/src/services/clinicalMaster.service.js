import { Op } from 'sequelize';
import {
  Medicine,
  Investigation,
  Treatment,
  EecpPackage,
  PaymentMode,
  Department,
} from '../models/index.js';

// ==========================================
// 1. Medicines
// ==========================================
export const getMedicines = async (hospitalId, options = {}) => {
  const { search = '', category = '', dosageForm = '', status = 'ALL', page = 1, limit = 10 } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const where = { hospitalId };
  if (status && status !== 'ALL') where.status = status;
  if (category && category !== 'ALL') where.category = category;
  if (dosageForm && dosageForm !== 'ALL') where.dosageForm = dosageForm;

  if (search && search.trim() !== '') {
    const term = `%${search.trim().toLowerCase()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { genericName: { [Op.iLike]: term } },
      { manufacturer: { [Op.iLike]: term } },
    ];
  }

  const { count, rows } = await Medicine.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: limitNum,
    offset,
  });

  return {
    medicines: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

export const createMedicine = async (hospitalId, data) => {
  const nameTrimmed = data.name.trim();
  const existing = await Medicine.findOne({
    where: { hospitalId, name: { [Op.iLike]: nameTrimmed } },
  });
  if (existing) {
    const error = new Error(`Medicine "${nameTrimmed}" already exists in your hospital catalogue.`);
    error.statusCode = 409;
    throw error;
  }

  return Medicine.create({
    hospitalId,
    name: nameTrimmed,
    genericName: data.genericName?.trim() || null,
    category: data.category?.trim() || null,
    strength: data.strength?.trim() || null,
    dosageForm: data.dosageForm?.trim() || null,
    manufacturer: data.manufacturer?.trim() || null,
    unit: data.unit?.trim() || null,
    status: data.status || 'ACTIVE',
  });
};

export const updateMedicine = async (hospitalId, id, data) => {
  const medicine = await Medicine.findOne({ where: { id, hospitalId } });
  if (!medicine) {
    const error = new Error('Medicine not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }

  if (data.name) {
    const nameTrimmed = data.name.trim();
    const existing = await Medicine.findOne({
      where: { hospitalId, name: { [Op.iLike]: nameTrimmed }, id: { [Op.ne]: id } },
    });
    if (existing) {
      const error = new Error(`Medicine "${nameTrimmed}" already exists in your hospital catalogue.`);
      error.statusCode = 409;
      throw error;
    }
    medicine.name = nameTrimmed;
  }

  if (data.genericName !== undefined) medicine.genericName = data.genericName?.trim() || null;
  if (data.category !== undefined) medicine.category = data.category?.trim() || null;
  if (data.strength !== undefined) medicine.strength = data.strength?.trim() || null;
  if (data.dosageForm !== undefined) medicine.dosageForm = data.dosageForm?.trim() || null;
  if (data.manufacturer !== undefined) medicine.manufacturer = data.manufacturer?.trim() || null;
  if (data.unit !== undefined) medicine.unit = data.unit?.trim() || null;
  if (data.status) medicine.status = data.status;

  await medicine.save();
  return medicine;
};

export const updateMedicineStatus = async (hospitalId, id, status) => {
  const medicine = await Medicine.findOne({ where: { id, hospitalId } });
  if (!medicine) {
    const error = new Error('Medicine not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }
  medicine.status = status;
  await medicine.save();
  return medicine;
};

// ==========================================
// 2. Investigations
// ==========================================
export const getInvestigations = async (hospitalId, options = {}) => {
  const { search = '', category = '', departmentId = '', status = 'ALL', page = 1, limit = 10 } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const where = { hospitalId };
  if (status && status !== 'ALL') where.status = status;
  if (category && category !== 'ALL') where.category = category;
  if (departmentId && departmentId !== 'ALL') where.departmentId = departmentId;

  if (search && search.trim() !== '') {
    const term = `%${search.trim().toLowerCase()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { code: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
    ];
  }

  const { count, rows } = await Investigation.findAndCountAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
    ],
    order: [['name', 'ASC']],
    limit: limitNum,
    offset,
  });

  return {
    investigations: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

export const createInvestigation = async (hospitalId, data) => {
  const nameTrimmed = data.name.trim();
  const existing = await Investigation.findOne({
    where: { hospitalId, name: { [Op.iLike]: nameTrimmed } },
  });
  if (existing) {
    const error = new Error(`Investigation "${nameTrimmed}" already exists in your hospital.`);
    error.statusCode = 409;
    throw error;
  }

  if (data.departmentId) {
    const dept = await Department.findOne({ where: { id: data.departmentId, hospitalId } });
    if (!dept) {
      const error = new Error('Selected department does not exist in this hospital.');
      error.statusCode = 400;
      throw error;
    }
  }

  return Investigation.create({
    hospitalId,
    name: nameTrimmed,
    code: data.code?.trim() || null,
    category: data.category?.trim() || null,
    description: data.description?.trim() || null,
    departmentId: data.departmentId || null,
    defaultCharge: data.defaultCharge !== undefined && data.defaultCharge !== '' ? parseFloat(data.defaultCharge) : 0.0,
    status: data.status || 'ACTIVE',
  });
};

export const updateInvestigation = async (hospitalId, id, data) => {
  const inv = await Investigation.findOne({ where: { id, hospitalId } });
  if (!inv) {
    const error = new Error('Investigation not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }

  if (data.name) {
    const nameTrimmed = data.name.trim();
    const existing = await Investigation.findOne({
      where: { hospitalId, name: { [Op.iLike]: nameTrimmed }, id: { [Op.ne]: id } },
    });
    if (existing) {
      const error = new Error(`Investigation "${nameTrimmed}" already exists in your hospital.`);
      error.statusCode = 409;
      throw error;
    }
    inv.name = nameTrimmed;
  }

  if (data.code !== undefined) inv.code = data.code?.trim() || null;
  if (data.category !== undefined) inv.category = data.category?.trim() || null;
  if (data.description !== undefined) inv.description = data.description?.trim() || null;
  if (data.departmentId !== undefined) inv.departmentId = data.departmentId || null;
  if (data.defaultCharge !== undefined && data.defaultCharge !== '') {
    inv.defaultCharge = parseFloat(data.defaultCharge);
  }
  if (data.status) inv.status = data.status;

  await inv.save();
  return inv;
};

export const updateInvestigationStatus = async (hospitalId, id, status) => {
  const inv = await Investigation.findOne({ where: { id, hospitalId } });
  if (!inv) {
    const error = new Error('Investigation not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }
  inv.status = status;
  await inv.save();
  return inv;
};

// ==========================================
// 3. Treatments
// ==========================================
export const getTreatments = async (hospitalId, options = {}) => {
  const { search = '', category = '', departmentId = '', status = 'ALL', page = 1, limit = 10 } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const where = { hospitalId };
  if (status && status !== 'ALL') where.status = status;
  if (category && category !== 'ALL') where.category = category;
  if (departmentId && departmentId !== 'ALL') where.departmentId = departmentId;

  if (search && search.trim() !== '') {
    const term = `%${search.trim().toLowerCase()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { code: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
    ];
  }

  const { count, rows } = await Treatment.findAndCountAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
    ],
    order: [['name', 'ASC']],
    limit: limitNum,
    offset,
  });

  return {
    treatments: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

export const createTreatment = async (hospitalId, data) => {
  const nameTrimmed = data.name.trim();
  const existing = await Treatment.findOne({
    where: { hospitalId, name: { [Op.iLike]: nameTrimmed } },
  });
  if (existing) {
    const error = new Error(`Treatment procedure "${nameTrimmed}" already exists in your hospital.`);
    error.statusCode = 409;
    throw error;
  }

  if (data.departmentId) {
    const dept = await Department.findOne({ where: { id: data.departmentId, hospitalId } });
    if (!dept) {
      const error = new Error('Selected department does not exist in this hospital.');
      error.statusCode = 400;
      throw error;
    }
  }

  return Treatment.create({
    hospitalId,
    name: nameTrimmed,
    code: data.code?.trim() || null,
    category: data.category?.trim() || null,
    description: data.description?.trim() || null,
    departmentId: data.departmentId || null,
    defaultCharge: data.defaultCharge !== undefined && data.defaultCharge !== '' ? parseFloat(data.defaultCharge) : 0.0,
    status: data.status || 'ACTIVE',
  });
};

export const updateTreatment = async (hospitalId, id, data) => {
  const treat = await Treatment.findOne({ where: { id, hospitalId } });
  if (!treat) {
    const error = new Error('Treatment not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }

  if (data.name) {
    const nameTrimmed = data.name.trim();
    const existing = await Treatment.findOne({
      where: { hospitalId, name: { [Op.iLike]: nameTrimmed }, id: { [Op.ne]: id } },
    });
    if (existing) {
      const error = new Error(`Treatment "${nameTrimmed}" already exists in your hospital.`);
      error.statusCode = 409;
      throw error;
    }
    treat.name = nameTrimmed;
  }

  if (data.code !== undefined) treat.code = data.code?.trim() || null;
  if (data.category !== undefined) treat.category = data.category?.trim() || null;
  if (data.description !== undefined) treat.description = data.description?.trim() || null;
  if (data.departmentId !== undefined) treat.departmentId = data.departmentId || null;
  if (data.defaultCharge !== undefined && data.defaultCharge !== '') {
    treat.defaultCharge = parseFloat(data.defaultCharge);
  }
  if (data.status) treat.status = data.status;

  await treat.save();
  return treat;
};

export const updateTreatmentStatus = async (hospitalId, id, status) => {
  const treat = await Treatment.findOne({ where: { id, hospitalId } });
  if (!treat) {
    const error = new Error('Treatment not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }
  treat.status = status;
  await treat.save();
  return treat;
};

// ==========================================
// 4. EECP Packages
// ==========================================
export const getEecpPackages = async (hospitalId, options = {}) => {
  const { search = '', status = 'ALL', page = 1, limit = 10 } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const where = { hospitalId };
  if (status && status !== 'ALL') where.status = status;

  if (search && search.trim() !== '') {
    const term = `%${search.trim().toLowerCase()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
      { notes: { [Op.iLike]: term } },
    ];
  }

  const { count, rows } = await EecpPackage.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: limitNum,
    offset,
  });

  return {
    packages: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

export const createEecpPackage = async (hospitalId, data) => {
  const nameTrimmed = data.name.trim();
  const existing = await EecpPackage.findOne({
    where: { hospitalId, name: { [Op.iLike]: nameTrimmed } },
  });
  if (existing) {
    const error = new Error(`EECP Package "${nameTrimmed}" already exists in your hospital.`);
    error.statusCode = 409;
    throw error;
  }

  return EecpPackage.create({
    hospitalId,
    name: nameTrimmed,
    description: data.description?.trim() || null,
    numberOfSessions: data.numberOfSessions !== undefined ? parseInt(data.numberOfSessions, 10) : 35,
    validityPeriod: data.validityPeriod?.trim() || '60 Days',
    packagePrice: data.packagePrice !== undefined && data.packagePrice !== '' ? parseFloat(data.packagePrice) : 0.0,
    sessionDuration: data.sessionDuration !== undefined ? parseInt(data.sessionDuration, 10) : 60,
    notes: data.notes?.trim() || null,
    status: data.status || 'ACTIVE',
  });
};

export const updateEecpPackage = async (hospitalId, id, data) => {
  const pkg = await EecpPackage.findOne({ where: { id, hospitalId } });
  if (!pkg) {
    const error = new Error('EECP Package not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }

  if (data.name) {
    const nameTrimmed = data.name.trim();
    const existing = await EecpPackage.findOne({
      where: { hospitalId, name: { [Op.iLike]: nameTrimmed }, id: { [Op.ne]: id } },
    });
    if (existing) {
      const error = new Error(`EECP Package "${nameTrimmed}" already exists in your hospital.`);
      error.statusCode = 409;
      throw error;
    }
    pkg.name = nameTrimmed;
  }

  if (data.description !== undefined) pkg.description = data.description?.trim() || null;
  if (data.numberOfSessions !== undefined) pkg.numberOfSessions = parseInt(data.numberOfSessions, 10);
  if (data.validityPeriod !== undefined) pkg.validityPeriod = data.validityPeriod?.trim() || null;
  if (data.packagePrice !== undefined && data.packagePrice !== '') pkg.packagePrice = parseFloat(data.packagePrice);
  if (data.sessionDuration !== undefined) pkg.sessionDuration = parseInt(data.sessionDuration, 10);
  if (data.notes !== undefined) pkg.notes = data.notes?.trim() || null;
  if (data.status) pkg.status = data.status;

  await pkg.save();
  return pkg;
};

export const updateEecpPackageStatus = async (hospitalId, id, status) => {
  const pkg = await EecpPackage.findOne({ where: { id, hospitalId } });
  if (!pkg) {
    const error = new Error('EECP Package not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }
  pkg.status = status;
  await pkg.save();
  return pkg;
};

// ==========================================
// 5. Payment Modes
// ==========================================
export const getPaymentModes = async (hospitalId, options = {}) => {
  const { search = '', status = 'ALL', page = 1, limit = 50 } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const where = { hospitalId };
  if (status && status !== 'ALL') where.status = status;

  if (search && search.trim() !== '') {
    const term = `%${search.trim().toLowerCase()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { code: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
    ];
  }

  const { count, rows } = await PaymentMode.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: limitNum,
    offset,
  });

  return {
    paymentModes: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

export const createPaymentMode = async (hospitalId, data) => {
  const nameTrimmed = data.name.trim();
  const existing = await PaymentMode.findOne({
    where: { hospitalId, name: { [Op.iLike]: nameTrimmed } },
  });
  if (existing) {
    const error = new Error(`Payment Mode "${nameTrimmed}" already exists in your hospital.`);
    error.statusCode = 409;
    throw error;
  }

  return PaymentMode.create({
    hospitalId,
    name: nameTrimmed,
    code: data.code?.trim()?.toUpperCase() || null,
    description: data.description?.trim() || null,
    status: data.status || 'ACTIVE',
  });
};

export const updatePaymentMode = async (hospitalId, id, data) => {
  const pm = await PaymentMode.findOne({ where: { id, hospitalId } });
  if (!pm) {
    const error = new Error('Payment mode not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }

  if (data.name) {
    const nameTrimmed = data.name.trim();
    const existing = await PaymentMode.findOne({
      where: { hospitalId, name: { [Op.iLike]: nameTrimmed }, id: { [Op.ne]: id } },
    });
    if (existing) {
      const error = new Error(`Payment Mode "${nameTrimmed}" already exists in your hospital.`);
      error.statusCode = 409;
      throw error;
    }
    pm.name = nameTrimmed;
  }

  if (data.code !== undefined) pm.code = data.code?.trim()?.toUpperCase() || null;
  if (data.description !== undefined) pm.description = data.description?.trim() || null;
  if (data.status) pm.status = data.status;

  await pm.save();
  return pm;
};

export const updatePaymentModeStatus = async (hospitalId, id, status) => {
  const pm = await PaymentMode.findOne({ where: { id, hospitalId } });
  if (!pm) {
    const error = new Error('Payment mode not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }
  pm.status = status;
  await pm.save();
  return pm;
};

export default {
  getMedicines,
  createMedicine,
  updateMedicine,
  updateMedicineStatus,
  getInvestigations,
  createInvestigation,
  updateInvestigation,
  updateInvestigationStatus,
  getTreatments,
  createTreatment,
  updateTreatment,
  updateTreatmentStatus,
  getEecpPackages,
  createEecpPackage,
  updateEecpPackage,
  updateEecpPackageStatus,
  getPaymentModes,
  createPaymentMode,
  updatePaymentMode,
  updatePaymentModeStatus,
};
