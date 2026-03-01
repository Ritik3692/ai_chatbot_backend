import { Request, Response } from 'express';
import { User } from '../models/User';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/sendResponse';
import { ApiError } from '../utils/ApiError';
import {
    RegisterRequestDTO,
    LoginRequestDTO,
    RefreshTokenRequestDTO,
    toUserResponseDTO,
    type AuthResponseDTO,
} from '../dto/auth.dto';

export const register = asyncHandler(async (req: Request, res: Response) => {
    const dto = req.body as RegisterRequestDTO;

    const existing = await User.findOne({ email: dto.email });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const user = await User.create({ name: dto.name, email: dto.email, password: dto.password });

    const tokens = AuthService.generateTokenPair(user._id.toString());
    AuthService.setAuthCookies(res, tokens);

    const response: AuthResponseDTO = {
        user: toUserResponseDTO(user),
        ...tokens,
    };

    sendResponse({ res, statusCode: 201, message: 'Account created successfully', data: response });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const dto = req.body as LoginRequestDTO;

    const user = await User.findOne({ email: dto.email }).select('+password');
    if (!user || !(await user.comparePassword(dto.password))) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = AuthService.generateTokenPair(user._id.toString());
    AuthService.setAuthCookies(res, tokens);

    const response: AuthResponseDTO = {
        user: toUserResponseDTO(user),
        ...tokens,
    };

    sendResponse({ res, statusCode: 200, message: 'Login successful', data: response });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Prefer cookie, fallback to body
    const token: string =
        req.cookies?.refreshToken ?? (req.body as RefreshTokenRequestDTO).refreshToken;

    if (!token) throw ApiError.unauthorized('Refresh token is required');

    const { userId } = AuthService.verifyRefreshToken(token);
    const user = await User.findById(userId);
    if (!user) throw ApiError.unauthorized('User no longer exists');

    const tokens = AuthService.generateTokenPair(userId);
    AuthService.setAuthCookies(res, tokens);

    sendResponse({ res, statusCode: 200, message: 'Tokens refreshed', data: tokens });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    AuthService.clearAuthCookies(res);
    sendResponse({ res, statusCode: 200, message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    sendResponse({
        res,
        statusCode: 200,
        message: 'User profile retrieved',
        data: toUserResponseDTO(req.user),
    });
});
