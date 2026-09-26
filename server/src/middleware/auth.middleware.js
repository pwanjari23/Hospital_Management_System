import { verifyAccessToken } from '../utils/jwt.js';
import { User, Role } from '../models/index.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Authentication middleware.
 * Verifies Bearer JWT, confirms user exists and is active in database,
 * and attaches sanitized user context to req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authorization token is missing or invalid format', 401);
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      return errorResponse(res, 'Access token is required', 401);
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Access token has expired', 401);
      }
      return errorResponse(res, 'Invalid access token', 401);
    }

    if (!decoded || !decoded.userId) {
      return errorResponse(res, 'Malformed token payload', 401);
    }

    // Retrieve active user from database with assigned roles
    const user = await User.findByPk(decoded.userId, {
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
      return errorResponse(res, 'User not found or session invalid', 401);
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 'Account is inactive or suspended', 401);
    }

    const roles = user.roles
      ? user.roles.map((r) => ({ id: r.id, name: r.name, scope: r.scope }))
      : [];
    const primaryRole = roles[0]?.name || null;
    const primaryScope = roles[0]?.scope || null;

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      hospitalId: user.hospitalId,
      status: user.status,
      roles,
      role: primaryRole,
      scope: primaryScope,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Authorization middleware for Platform Super Admin.
 * Enforces:
 * 1. Authenticated user
 * 2. Active status
 * 3. SUPER_ADMIN role
 * 4. PLATFORM scope
 * 5. hospitalId = NULL
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  const { status, hospitalId, roles } = req.user;

  if (status !== 'ACTIVE') {
    return errorResponse(res, 'Account is inactive or suspended', 403);
  }

  const isPlatformSuperAdmin =
    hospitalId === null && roles?.some((r) => r.name === 'SUPER_ADMIN' && r.scope === 'PLATFORM');

  if (!isPlatformSuperAdmin) {
    return errorResponse(res, 'Access denied: Platform Super Admin privileges required', 403);
  }

  return next();
};

/**
 * Extensible RBAC helper for future modules: require specific role(s)
 * @param {string|string[]} allowedRoles
 */
export const requireRole = (...allowedRoles) => {
  const rolesToCheck = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const hasRole = req.user.roles?.some((r) => rolesToCheck.includes(r.name));
    if (!hasRole) {
      return errorResponse(res, 'Access denied: Insufficient role permissions', 403);
    }

    return next();
  };
};

/**
 * Ensures user belongs to a hospital tenant (hospitalId !== null)
 */
export const requireHospitalTenant = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  if (!req.user.hospitalId) {
    return errorResponse(res, 'Access denied: Hospital context required', 403);
  }

  return next();
};

export default {
  authenticate,
  requireSuperAdmin,
  requireRole,
  requireHospitalTenant,
};
