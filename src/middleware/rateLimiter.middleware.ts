import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10); // 15 min
const max = parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10);

/** General API rate limiter */
export const apiRateLimiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
        next(ApiError.tooManyRequests('Too many requests. Please wait and try again.'));
    },
});

/** Stricter limiter for auth routes */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
        next(ApiError.tooManyRequests('Too many login attempts. Please wait 15 minutes.'));
    },
});

/** Limiter for chat endpoints (per IP, per minute) */
export const chatRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    keyGenerator: (req) => req.ip ?? 'unknown',
    handler: (_req, _res, next) => {
        next(ApiError.tooManyRequests('Chat rate limit exceeded. Please slow down.'));
    },
});
