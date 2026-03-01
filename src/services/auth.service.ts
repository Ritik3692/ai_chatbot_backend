import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { IUser } from '../models/User';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface JWTPayload {
    userId: string;
}

export class AuthService {
    private static getAccessSecret(): string {
        const s = process.env.JWT_ACCESS_SECRET;
        if (!s) throw ApiError.internal('JWT_ACCESS_SECRET not configured');
        return s;
    }

    private static getRefreshSecret(): string {
        const s = process.env.JWT_REFRESH_SECRET;
        if (!s) throw ApiError.internal('JWT_REFRESH_SECRET not configured');
        return s;
    }

    static generateAccessToken(userId: string): string {
        return jwt.sign(
            { userId } as JWTPayload,
            this.getAccessSecret(),
            { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as any } as jwt.SignOptions,
        );
    }

    static generateRefreshToken(userId: string): string {
        return jwt.sign(
            { userId } as JWTPayload,
            this.getRefreshSecret(),
            { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any } as jwt.SignOptions,
        );
    }

    static generateTokenPair(userId: string): TokenPair {
        return {
            accessToken: this.generateAccessToken(userId),
            refreshToken: this.generateRefreshToken(userId),
        };
    }

    static verifyRefreshToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, this.getRefreshSecret()) as JWTPayload;
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                throw ApiError.unauthorized('Refresh token has expired. Please log in again.');
            }
            throw ApiError.unauthorized('Invalid refresh token');
        }
    }

    static setAuthCookies(
        res: import('express').Response,
        tokens: TokenPair,
    ): void {
        const isProd = process.env.NODE_ENV === 'production';

        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/auth/refresh',
        });
    }

    static clearAuthCookies(res: import('express').Response): void {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    }

    static canCreateChatbot(user: IUser, currentChatbotCount: number): boolean {
        return currentChatbotCount < user.chatbotLimit;
    }
}
