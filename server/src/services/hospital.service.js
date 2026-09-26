import { Op } from 'sequelize';
import { Hospital, HospitalSetting, User, Role, UserRole } from '../models/index.js';
import { withTransaction } from '../utils/transaction.js';
import { hashPassword } from '../utils/password.js';

/**
 * Generate a unique URL slug from a hospital name.
 * If slug exists, appends incrementing integer (-2, -3, ...).
 */
export const generateUniqueSlug = async (name, transaction = null) => {
  const baseSlug = Hospital.slugify(name) || 'hospital';
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Hospital.findOne({
      where: { slug: candidate },
      transaction,
      attributes: ['id', 'slug'],
    });

    if (!existing) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
};

/**
 * Retrieve paginated list of hospitals with optional search and status filter
 */
export const getHospitals = async ({ page = 1, limit = 10, search, status, sort = 'createdAt:DESC' }) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    const searchPattern = `%${search}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: searchPattern } },
      { slug: { [Op.iLike]: searchPattern } },
      { city: { [Op.iLike]: searchPattern } },
    ];
  }

  // Parse sort param (e.g. "createdAt:DESC" or "name:ASC")
  let order = [['createdAt', 'DESC']];
  if (sort && typeof sort === 'string') {
    const [field, direction] = sort.split(':');
    const allowedSortFields = ['name', 'city', 'status', 'createdAt', 'updatedAt'];
    if (allowedSortFields.includes(field)) {
      order = [[field, direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];
    }
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await Hospital.findAndCountAll({
    where,
    limit,
    offset,
    order,
    distinct: true,
  });

  const totalPages = Math.ceil(count / limit) || 1;

  return {
    hospitals: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Retrieve full details of a specific hospital by UUID including settings
 */
export const getHospitalById = async (id, transaction = null) => {
  const options = {
    include: [
      {
        model: HospitalSetting,
        as: 'settings',
        attributes: ['id', 'key', 'value', 'createdAt', 'updatedAt'],
      },
    ],
  };

  if (transaction) {
    options.transaction = transaction;
  }

  const hospital = await Hospital.findByPk(id, options);

  if (!hospital) {
    const error = new Error('Hospital not found');
    error.statusCode = 404;
    throw error;
  }

  return hospital;
};

/**
 * Create a new hospital and initial default branding settings inside a managed transaction.
 * If adminEmail is provided, provisions the initial HOSPITAL_ADMIN user atomically.
 */
export const createHospital = async (data) => {
  return withTransaction(async (t) => {
    let slug;
    let hospital;
    let attempts = 0;

    // Retry loop in case of concurrent unique slug collision
    while (!hospital && attempts < 5) {
      attempts += 1;
      slug = await generateUniqueSlug(data.name, t);

      try {
        hospital = await Hospital.create(
          {
            name: data.name,
            slug,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            country: data.country || 'India',
            postalCode: data.postalCode || null,
            logoUrl: data.logoUrl || null,
            status: 'ACTIVE',
          },
          { transaction: t }
        );
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError' && attempts < 5) {
          // Retry with fresh slug check
          continue;
        }
        throw err;
      }
    }

    if (!hospital) {
      throw new Error('Failed to generate unique identifier for hospital. Please try again.');
    }

    // Seed default branding & feature module settings
    const defaultSettings = [
      { key: 'hospitalName', value: data.name },
      { key: 'primaryColor', value: '#2563EB' },
      { key: 'supportPhone', value: data.phone || '' },
      { key: 'supportEmail', value: data.email || data.adminEmail || '' },
      { key: 'module_pharmacy', value: 'true' },
      { key: 'module_inpatient', value: 'true' },
      { key: 'module_outpatient', value: 'true' },
      { key: 'module_laboratory', value: 'true' },
      { key: 'module_billing', value: 'true' },
    ];

    await Promise.all(
      defaultSettings.map((setting) =>
        HospitalSetting.create(
          {
            hospitalId: hospital.id,
            key: setting.key,
            value: setting.value,
          },
          { transaction: t }
        )
      )
    );

    // Initial Hospital Admin User Provisioning
    let adminUser = null;
    let rawPassword = null;
    if (data.adminEmail) {
      const hospitalAdminRole = await Role.findOne({
        where: { name: 'HOSPITAL_ADMIN', scope: 'HOSPITAL' },
        transaction: t,
      });

      if (!hospitalAdminRole) {
        throw new Error('HOSPITAL_ADMIN role not found in system catalogue.');
      }

      rawPassword = data.adminPassword || ('HospAdmin@' + Math.floor(100000 + Math.random() * 900000));
      const passwordHash = await hashPassword(rawPassword);

      adminUser = await User.create(
        {
          hospitalId: hospital.id,
          name: data.adminName || `${data.name} Admin`,
          email: data.adminEmail.trim().toLowerCase(),
          passwordHash,
          status: 'ACTIVE',
        },
        { transaction: t }
      );

      await UserRole.create(
        {
          userId: adminUser.id,
          roleId: hospitalAdminRole.id,
        },
        { transaction: t }
      );
    }

    const fullHospital = await getHospitalById(hospital.id, t);
    const result = fullHospital.toJSON ? fullHospital.toJSON() : fullHospital;

    if (adminUser) {
      result.adminUser = {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'HOSPITAL_ADMIN',
        initialPassword: rawPassword,
      };
    }

    return result;
  });
};

/**
 * Update allowed fields of a hospital
 */
export const updateHospital = async (id, data) => {
  const hospital = await Hospital.findByPk(id);

  if (!hospital) {
    const error = new Error('Hospital not found');
    error.statusCode = 404;
    throw error;
  }

  // Update attributes
  await hospital.update(data);

  return getHospitalById(hospital.id);
};

/**
 * Transition hospital status (ACTIVE <-> INACTIVE)
 * Note: Never deletes any records or tenant data.
 */
export const updateHospitalStatus = async (id, status) => {
  const hospital = await Hospital.findByPk(id);

  if (!hospital) {
    const error = new Error('Hospital not found');
    error.statusCode = 404;
    throw error;
  }

  await hospital.update({ status });

  return getHospitalById(hospital.id);
};

/**
 * Retrieve all users belonging to a specific hospital tenant
 */
export const getHospitalUsers = async (hospitalId) => {
  const hospital = await Hospital.findByPk(hospitalId);
  if (!hospital) {
    const error = new Error('Hospital not found');
    error.statusCode = 404;
    throw error;
  }

  const users = await User.findAll({
    where: { hospitalId },
    attributes: ['id', 'hospitalId', 'name', 'email', 'status', 'createdAt', 'updatedAt'],
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        attributes: ['id', 'name', 'scope'],
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  return users;
};

/**
 * Create a new user for a specific hospital tenant
 */
export const createHospitalUser = async (hospitalId, { name, email, password, role }) => {
  return withTransaction(async (t) => {
    const hospital = await Hospital.findByPk(hospitalId, { transaction: t });
    if (!hospital) {
      const error = new Error('Hospital not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if email already exists in this hospital
    const existing = await User.findOne({
      where: { hospitalId, email: email.trim().toLowerCase() },
      transaction: t,
    });
    if (existing) {
      const error = new Error('A user with this email address already exists in this hospital.');
      error.statusCode = 409;
      throw error;
    }

    // Find requested role
    const roleRecord = await Role.findOne({
      where: { name: role, scope: 'HOSPITAL' },
      transaction: t,
    });
    if (!roleRecord) {
      const error = new Error(`Role '${role}' not found or not eligible for hospital staff.`);
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create(
      {
        hospitalId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        status: 'ACTIVE',
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

    return User.findByPk(user.id, {
      attributes: ['id', 'hospitalId', 'name', 'email', 'status', 'createdAt'],
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          attributes: ['id', 'name', 'scope'],
        },
      ],
      transaction: t,
    });
  });
};

/**
 * Upsert tenant settings and module configuration flags
 */
export const updateHospitalSettings = async (hospitalId, settingsInput) => {
  return withTransaction(async (t) => {
    const hospital = await Hospital.findByPk(hospitalId, { transaction: t });
    if (!hospital) {
      const error = new Error('Hospital not found');
      error.statusCode = 404;
      throw error;
    }

    const entries = Array.isArray(settingsInput)
      ? settingsInput
      : Object.entries(settingsInput).map(([key, value]) => ({ key, value: String(value) }));

    for (const entry of entries) {
      if (!entry.key) continue;
      const existing = await HospitalSetting.findOne({
        where: { hospitalId, key: entry.key },
        transaction: t,
      });

      if (existing) {
        await existing.update({ value: String(entry.value) }, { transaction: t });
      } else {
        await HospitalSetting.create(
          {
            hospitalId,
            key: entry.key,
            value: String(entry.value),
          },
          { transaction: t }
        );
      }
    }

    return HospitalSetting.findAll({
      where: { hospitalId },
      attributes: ['id', 'key', 'value', 'createdAt', 'updatedAt'],
      transaction: t,
    });
  });
};

export default {
  generateUniqueSlug,
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  updateHospitalStatus,
  getHospitalUsers,
  createHospitalUser,
  updateHospitalSettings,
};
