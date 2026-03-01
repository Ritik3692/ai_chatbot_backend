import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { validateDTO } from '../middleware/validateDTO.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import {
    RegisterRequestDTO,
    LoginRequestDTO,
    RefreshTokenRequestDTO,
} from '../dto/auth.dto';

const router = Router();

router.post(
    '/register',
    authRateLimiter,
    validateDTO(RegisterRequestDTO),
    AuthController.register,
);

router.post(
    '/login',
    authRateLimiter,
    validateDTO(LoginRequestDTO),
    AuthController.login,
);

router.post(
    '/refresh',
    validateDTO(RefreshTokenRequestDTO),
    AuthController.refreshToken,
);

router.post('/logout', AuthController.logout);

router.get('/me', authenticate, AuthController.getMe);

export default router;
