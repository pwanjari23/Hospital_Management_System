import { Op } from 'sequelize';
import { User, Role, UserRole, Department } from '../models/index.js';
import { hashPassword } from '../utils/password.js';
import withTransaction from '../utils/transaction.js';

export const ALLOWED_HOSPITAL_ROLES = [
  'HOSPITAL_ADMIN',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHARMACIST',
  'LAB_STAFF',
];

export const getStaff = async (hospitalId, options = {}) => {
  const {
    search = '',
    role = '',
    departmentId = '',
    status = 'ALL',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const where = { hospitalId };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (departmentId && departmentId !== 'ALL') {
    where.departmentId = departmentId;
  }

  if (search && search.trim() !== '') {
    const term = `%${search.trim().toLowerCase()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
      { phone: { [Op.iLike]: term } },
      { specialization: { [Op.iLike]: term } },
      { qualification: { [Op.iLike]: term } },
      { licenseNumber: { [Op.iLike]: term } },
    ];
  }

  const roleInclude = {
    model: Role,
    as: 'roles',
    through: { attributes: [] },
    attributes: ['id', 'name', 'scope'],
  };

  if (role && role !== 'ALL') {
    roleInclude.where = { name: role };
  }

  const allowedSortColumns = ['name', 'createdAt', 'status', 'consultationFee'];
  const orderCol = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const orderDir = ['ASC', 'DESC'].includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  const { count, rows } = await User.findAndCountAll({
    where,
    include: [
      roleInclude,
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code'],
      },
    ],
    order: [[orderCol, orderDir]],
    limit: limitNum,
    offset,
    distinct: true,
  });

  return {
    staff: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

export const getStaffById = async (hospitalId, id, options = {}) => {
  const user = await User.findOne({
    where: { id, hospitalId },
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        attributes: ['id', 'name', 'scope'],
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code', 'status'],
      },
    ],
    ...options,
  });

  if (!user) {
    const error = new Error('Staff member not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const createStaff = async (hospitalId, data) => {
  return withTransaction(async (t) => {
    const emailNormalized = data.email.trim().toLowerCase();

    // Check if email already exists in this hospital
    const existing = await User.findOne({
      where: { hospitalId, email: emailNormalized },
      transaction: t,
    });
    if (existing) {
      const error = new Error(`A staff member with email "${emailNormalized}" already exists in this hospital.`);
      error.statusCode = 409;
      throw error;
    }

    // Role validation: MUST NOT be SUPER_ADMIN
    const targetRole = data.role?.toUpperCase();
    if (!ALLOWED_HOSPITAL_ROLES.includes(targetRole)) {
      const error = new Error(`Invalid role '${targetRole}'. Allowed roles: ${ALLOWED_HOSPITAL_ROLES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const roleRecord = await Role.findOne({
      where: { name: targetRole, scope: 'HOSPITAL' },
      transaction: t,
    });
    if (!roleRecord) {
      const error = new Error(`Role '${targetRole}' not found in system catalogue.`);
      error.statusCode = 400;
      throw error;
    }

    // If departmentId provided, ensure it belongs to this hospital
    if (data.departmentId) {
      const dept = await Department.findOne({
        where: { id: data.departmentId, hospitalId },
        transaction: t,
      });
      if (!dept) {
        const error = new Error('Selected department does not exist in this hospital.');
        error.statusCode = 400;
        throw error;
      }
    }

    const passwordHash = await hashPassword(data.password);

    const user = await User.create(
      {
        hospitalId,
        name: data.name.trim(),
        email: emailNormalized,
        passwordHash,
        status: data.status || 'ACTIVE',
        departmentId: data.departmentId || null,
        phone: data.phone?.trim() || null,
        qualification: data.qualification?.trim() || null,
        specialization: data.specialization?.trim() || null,
        licenseNumber: data.licenseNumber?.trim() || null,
        experienceYears: data.experienceYears !== undefined && data.experienceYears !== '' ? parseInt(data.experienceYears, 10) : null,
        consultationFee: data.consultationFee !== undefined && data.consultationFee !== '' ? parseFloat(data.consultationFee) : 0.0,
      },
      { transaction: t }
    );

    await UserRole.create(
      {
        userId: user.id,
        roleId: roleRecord.id,
      },
      { transaction: t }
    );

    return getStaffById(hospitalId, user.id, { transaction: t });
  });
};

export const updateStaff = async (hospitalId, id, data) => {
  return withTransaction(async (t) => {
    const user = await User.findOne({
      where: { id, hospitalId },
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
      transaction: t,
    });

    if (!user) {
      const error = new Error('Staff member not found in this hospital.');
      error.statusCode = 404;
      throw error;
    }

    // If changing email, verify uniqueness in tenant
    if (data.email) {
      const emailNormalized = data.email.trim().toLowerCase();
      if (emailNormalized !== user.email) {
        const existing = await User.findOne({
          where: { hospitalId, email: emailNormalized, id: { [Op.ne]: id } },
          transaction: t,
        });
        if (existing) {
          const error = new Error(`A staff member with email "${emailNormalized}" already exists in this hospital.`);
          error.statusCode = 409;
          throw error;
        }
        user.email = emailNormalized;
      }
    }

    if (data.name) user.name = data.name.trim();
    if (data.phone !== undefined) user.phone = data.phone?.trim() || null;
    if (data.status) user.status = data.status;

    // Check department
    if (data.departmentId !== undefined) {
      if (data.departmentId) {
        const dept = await Department.findOne({
          where: { id: data.departmentId, hospitalId },
          transaction: t,
        });
        if (!dept) {
          const error = new Error('Selected department does not exist in this hospital.');
          error.statusCode = 400;
          throw error;
        }
        user.departmentId = data.departmentId;
      } else {
        user.departmentId = null;
      }
    }

    // Professional fields
    if (data.qualification !== undefined) user.qualification = data.qualification?.trim() || null;
    if (data.specialization !== undefined) user.specialization = data.specialization?.trim() || null;
    if (data.licenseNumber !== undefined) user.licenseNumber = data.licenseNumber?.trim() || null;
    if (data.experienceYears !== undefined) {
      user.experienceYears = data.experienceYears !== '' && data.experienceYears !== null ? parseInt(data.experienceYears, 10) : null;
    }
    if (data.consultationFee !== undefined) {
      user.consultationFee = data.consultationFee !== '' && data.consultationFee !== null ? parseFloat(data.consultationFee) : 0.0;
    }

    // Optional password reset
    if (data.password && data.password.trim().length >= 6) {
      user.passwordHash = await hashPassword(data.password.trim());
    }

    await user.save({ transaction: t });

    // Optional role update
    if (data.role) {
      const targetRole = data.role.toUpperCase();
      if (!ALLOWED_HOSPITAL_ROLES.includes(targetRole)) {
        const error = new Error(`Invalid role '${targetRole}'.`);
        error.statusCode = 400;
        throw error;
      }

      const roleRecord = await Role.findOne({
        where: { name: targetRole, scope: 'HOSPITAL' },
        transaction: t,
      });

      if (roleRecord) {
        await UserRole.destroy({ where: { userId: user.id }, transaction: t });
        await UserRole.create({ userId: user.id, roleId: roleRecord.id }, { transaction: t });
      }
    }

    return getStaffById(hospitalId, user.id, { transaction: t });
  });
};

export const updateStaffStatus = async (hospitalId, id, status) => {
  const user = await User.findOne({
    where: { id, hospitalId },
  });

  if (!user) {
    const error = new Error('Staff member not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }

  user.status = status;
  await user.save();
  return getStaffById(hospitalId, id);
};

export default {
  ALLOWED_HOSPITAL_ROLES,
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  updateStaffStatus,
};
