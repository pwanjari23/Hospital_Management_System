import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Rate limiter for authentication endpoints (e.g. /login).
 * Protects against brute-force password guessing attacks.
 * Limit: 10 requests per 15-minute window per IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many login attempts from this IP. Please try again after 15 minutes.',
      429
    );
  },
});

export default {
  loginRateLimiter,
};
