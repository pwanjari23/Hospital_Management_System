import jwt from 'jsonwebtoken';
import env from '../config/env.js';

if (!env.jwt.accessSecret) {
  throw new Error(
    'Critical Security Error: JWT_ACCESS_SECRET must be defined in environment configuration.'
  );
}

/**
 * Generate a signed JWT access token with minimal identity payload
 * @param {Object} payload - { userId, role, scope }
 * @returns {string} Signed JWT
 */
export const generateAccessToken = (payload) => {
  if (!payload || !payload.userId) {
    throw new Error('Cannot generate access token: userId is required in payload.');
  }

  // Ensure only minimal identity fields are encoded
  const safePayload = {
    userId: payload.userId,
    role: payload.role,
    scope: payload.scope,
  };

  return jwt.sign(safePayload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn || '15m',
    algorithm: 'HS256',
  });
};

/**
 * Verify and decode an access token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required for verification.');
  }

  return jwt.verify(token, env.jwt.accessSecret, {
    algorithms: ['HS256'],
  });
};

export default {
  generateAccessToken,
  verifyAccessToken,
};
