import { Router } from 'express';
import * as ChatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateDTO } from '../middleware/validateDTO.middleware';
import { chatRateLimiter } from '../middleware/rateLimiter.middleware';
import {
    SendMessageRequestDTO,
    ChatHistoryQueryDTO,
} from '../dto/chat.dto';

const router = Router();

/**
 * POST /api/chat/:referenceId/message
 * Public endpoint — no auth required (used by embed widget)
 */
router.post(
    '/:referenceId/message',
    chatRateLimiter,
    validateDTO(SendMessageRequestDTO),
    ChatController.sendMessage,
);

/**
 * GET /api/chat/:id/history
 * Protected — dashboard chat history viewer
 */
router.get(
    '/:id/history',
    authenticate,
    validateDTO(ChatHistoryQueryDTO, 'query'),
    ChatController.getChatHistories,
);

export default router;
