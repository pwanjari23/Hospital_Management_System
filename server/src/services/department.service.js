import { Op } from 'sequelize';
import { Department, User, Role } from '../models/index.js';

export const getDepartments = async (hospitalId, options = {}) => {
  const { search = '', status = 'ALL', page = 1, limit = 10 } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const where = { hospitalId };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (search && search.trim() !== '') {
    const term = `%${search.trim().toLowerCase()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { code: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
    ];
  }

  const { count, rows } = await Department.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: limitNum,
    offset,
  });

  // Fetch staff count and doctor count per department for this hospital
  const deptIds = rows.map((d) => d.id);
  const staffCounts = {};
  const doctorCounts = {};

  if (deptIds.length > 0) {
    const usersInDept = await User.findAll({
      where: {
        hospitalId,
        departmentId: { [Op.in]: deptIds },
      },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          attributes: ['name'],
        },
      ],
      attributes: ['id', 'departmentId'],
    });

    for (const u of usersInDept) {
      const dId = u.departmentId;
      staffCounts[dId] = (staffCounts[dId] || 0) + 1;
      const isDoctor = u.roles?.some((r) => r.name === 'DOCTOR');
      if (isDoctor) {
        doctorCounts[dId] = (doctorCounts[dId] || 0) + 1;
      }
    }
  }

  const departmentsWithCounts = rows.map((dept) => {
    const data = dept.toJSON();
    data.staffCount = staffCounts[dept.id] || 0;
    data.doctorCount = doctorCounts[dept.id] || 0;
    return data;
  });

  return {
    departments: departmentsWithCounts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum) || 1,
    },
  };
};

export const getDepartmentById = async (hospitalId, id) => {
  const department = await Department.findOne({
    where: { id, hospitalId },
  });

  if (!department) {
    const error = new Error('Department not found in this hospital.');
    error.statusCode = 404;
    throw error;
  }

  return department;
};

export const createDepartment = async (hospitalId, data) => {
  const trimmedName = data.name.trim();

  // Check unique name in this hospital (case-insensitive)
  const existing = await Department.findOne({
    where: {
      hospitalId,
      name: { [Op.iLike]: trimmedName },
    },
  });

  if (existing) {
    const error = new Error(`A department with name "${trimmedName}" already exists in your hospital.`);
    error.statusCode = 409;
    throw error;
  }

  return Department.create({
    hospitalId,
    name: trimmedName,
    code: data.code?.trim() || null,
    description: data.description?.trim() || null,
    status: data.status || 'ACTIVE',
  });
};

export const updateDepartment = async (hospitalId, id, data) => {
  const department = await getDepartmentById(hospitalId, id);

  if (data.name) {
    const trimmedName = data.name.trim();
    const existing = await Department.findOne({
      where: {
        hospitalId,
        id: { [Op.ne]: id },
        name: { [Op.iLike]: trimmedName },
      },
    });

    if (existing) {
      const error = new Error(`A department with name "${trimmedName}" already exists in your hospital.`);
      error.statusCode = 409;
      throw error;
    }

    department.name = trimmedName;
  }

  if (data.code !== undefined) {
    department.code = data.code?.trim() || null;
  }

  if (data.description !== undefined) {
    department.description = data.description?.trim() || null;
  }

  if (data.status) {
    department.status = data.status;
  }

  await department.save();
  return department;
};

export const updateDepartmentStatus = async (hospitalId, id, status) => {
  const department = await getDepartmentById(hospitalId, id);
  department.status = status;
  await department.save();
  return department;
};

export default {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  updateDepartmentStatus,
};
