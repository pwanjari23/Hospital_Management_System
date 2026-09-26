import { Op } from 'sequelize';
import { User, Role, Hospital } from '../models/index.js';
import { comparePassword } from '../utils/password.js';
import { generateAccessToken } from '../utils/jwt.js';

const INVALID_CREDENTIALS_MSG = 'Invalid email or password.';

/**
 * Authenticate Platform Super Admin credentials and issue access token
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: Object, accessToken: string }>}
 */
export const loginSuperAdmin = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Find user by email specifically for platform root (hospitalId = null)
  const user = await User.scope('withPassword').findOne({
    where: {
      email: normalizedEmail,
      hospitalId: null,
    },
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        attributes: ['id', 'name', 'scope'],
      },
    ],
  });

  // Prevent account enumeration: return identical message if user not found
  if (!user) {
    const error = new Error(INVALID_CREDENTIALS_MSG);
    error.statusCode = 401;
    throw error;
  }

  // Account must be active
  if (user.status !== 'ACTIVE') {
    const error = new Error(INVALID_CREDENTIALS_MSG);
    error.statusCode = 401;
    throw error;
  }

  // Must have SUPER_ADMIN role with PLATFORM scope
  const hasSuperAdminRole = user.roles?.some(
    (role) => role.name === 'SUPER_ADMIN' && role.scope === 'PLATFORM'
  );

  if (!hasSuperAdminRole) {
    const error = new Error(INVALID_CREDENTIALS_MSG);
    error.statusCode = 401;
    throw error;
  }

  // Verify password hash
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error(INVALID_CREDENTIALS_MSG);
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT access token with minimal payload
  const accessToken = generateAccessToken({
    userId: user.id,
    role: 'SUPER_ADMIN',
    scope: 'PLATFORM',
  });

  // Construct safe user object without password hash or sensitive internals
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'SUPER_ADMIN',
    scope: 'PLATFORM',
  };

  return {
    user: safeUser,
    accessToken,
  };
};

/**
 * Authenticate tenant Hospital Admin or Staff credentials and issue access token
 * @param {string} email
 * @param {string} password
 */
export const loginHospitalUser = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.scope('withPassword').findOne({
    where: {
      email: normalizedEmail,
      hospitalId: { [Op.ne]: null },
    },
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        attributes: ['id', 'name', 'scope'],
      },
    ],
  });

  if (!user) {
    const error = new Error(INVALID_CREDENTIALS_MSG);
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'ACTIVE') {
    const error = new Error(INVALID_CREDENTIALS_MSG);
    error.statusCode = 401;
    throw error;
  }

  // Verify hospital status
  const hospital = await Hospital.findByPk(user.hospitalId);
  if (!hospital || hospital.status !== 'ACTIVE') {
    const error = new Error('Hospital tenant is currently inactive or suspended. Please contact platform administration.');
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error(INVALID_CREDENTIALS_MSG);
    error.statusCode = 401;
    throw error;
  }

  const primaryRole = user.roles?.[0] || { name: 'HOSPITAL_ADMIN', scope: 'HOSPITAL' };

  const accessToken = generateAccessToken({
    userId: user.id,
    hospitalId: user.hospitalId,
    role: primaryRole.name,
    scope: primaryRole.scope,
  });

  const safeUser = {
    id: user.id,
    hospitalId: user.hospitalId,
    hospitalName: hospital.name,
    name: user.name,
    email: user.email,
    role: primaryRole.name,
    scope: primaryRole.scope,
  };

  return {
    user: safeUser,
    accessToken,
  };
};

/**
 * Fetch authenticated user profile
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const getCurrentUser = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        attributes: ['id', 'name', 'scope'],
      },
      {
        model: Hospital,
        as: 'hospital',
        attributes: ['id', 'name', 'slug', 'logoUrl', 'status'],
      },
    ],
  });

  if (!user || user.status !== 'ACTIVE') {
    const error = new Error('User not found or account is not active');
    error.statusCode = 401;
    throw error;
  }

  const primaryRole = user.roles?.[0];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hospitalId: user.hospitalId || null,
    hospitalName: user.hospital?.name || null,
    hospitalLogoUrl: user.hospital?.logoUrl || null,
    role: primaryRole?.name || 'SUPER_ADMIN',
    scope: primaryRole?.scope || 'PLATFORM',
  };
};

export default {
  loginSuperAdmin,
  loginHospitalUser,
  getCurrentUser,
};
