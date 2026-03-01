import { Router } from 'express';
import { getChatbotPublicConfig } from '../controllers/chatbot.controller';

const router = Router();

/**
 * GET /embed/:referenceId
 * Public — used by the embed widget to fetch chatbot config/theme
 */
router.get('/:referenceId', getChatbotPublicConfig);

export default router;
