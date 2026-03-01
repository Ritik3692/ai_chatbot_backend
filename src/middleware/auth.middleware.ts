import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// auth.middleware.ts - types now handled by src/types/express.d.ts

interface JWTPayload {
    userId: string;
    iat?: number;
    exp?: number;
}

export const authenticate = asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
        // 1. Extract token from Authorization header or HTTP-only cookie
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        } else if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) throw ApiError.unauthorized('Access token is missing');

        // 2. Verify token
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) throw ApiError.internal('JWT secret not configured');

        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, secret) as JWTPayload;
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                throw ApiError.unauthorized('Access token has expired');
            }
            throw ApiError.unauthorized('Invalid access token');
        }

        // 3. Load user from DB
        const user = await User.findById(decoded.userId).select('+password');
        if (!user) throw ApiError.unauthorized('User no longer exists');

        req.user = user;
        next();
    },
);

/**
 * Optional auth — attaches user if token present, continues if not.
 * Useful for public endpoints that optionally personalise for logged-in users.
 */
export const optionalAuthenticate = asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
        let token: string | undefined;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
        else if (req.cookies?.accessToken) token = req.cookies.accessToken;

        if (token) {
            try {
                const secret = process.env.JWT_ACCESS_SECRET!;
                const decoded = jwt.verify(token, secret) as JWTPayload;
                const user = await User.findById(decoded.userId);
                if (user) req.user = user;
            } catch {
                // silently ignore
            }
        }
        next();
    },
);
