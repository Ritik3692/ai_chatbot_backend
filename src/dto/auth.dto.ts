/**
 * DTO Layer — Auth
 * Defines Zod schemas for request validation and typed request/response interfaces.
 * Controllers accept raw req.body → validate via DTO schema → pass typed object to service.
 */
import { z } from 'zod';

// ─── Request DTOs ──────────────────────────────────────────────────────────────

export const RegisterRequestDTO = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters'),
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email address')
        .toLowerCase(),
    password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain uppercase, lowercase, and a number',
        ),
});
export type RegisterRequestDTO = z.infer<typeof RegisterRequestDTO>;

export const LoginRequestDTO = z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address').toLowerCase(),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});
export type LoginRequestDTO = z.infer<typeof LoginRequestDTO>;

export const RefreshTokenRequestDTO = z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});
export type RefreshTokenRequestDTO = z.infer<typeof RefreshTokenRequestDTO>;

// ─── Response DTOs ─────────────────────────────────────────────────────────────

export interface UserResponseDTO {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    plan: string;
    chatbotLimit: number;
    createdAt: string;
}

export interface AuthResponseDTO {
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
}

export interface TokenResponseDTO {
    accessToken: string;
    refreshToken: string;
}

// ─── Transformers ──────────────────────────────────────────────────────────────

import type { IUser } from '../models/User';

export const toUserResponseDTO = (user: IUser): UserResponseDTO => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    plan: user.plan,
    chatbotLimit: user.chatbotLimit,
    createdAt: user.createdAt.toISOString(),
});
