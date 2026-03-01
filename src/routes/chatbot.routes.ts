import { Router } from 'express';
import * as ChatbotController from '../controllers/chatbot.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateDTO } from '../middleware/validateDTO.middleware';
import { uploadPDF } from '../middleware/upload.middleware';
import {
    CreateChatbotRequestDTO,
    UpdateChatbotRequestDTO,
    PublishChatbotRequestDTO,
    ChatbotQueryDTO,
} from '../dto/chatbot.dto';
import { UploadPDFRequestDTO } from '../dto/upload.dto';

const router = Router();

// All chatbot management routes require authentication
router.use(authenticate);

router.post(
    '/',
    validateDTO(CreateChatbotRequestDTO),
    ChatbotController.createChatbot,
);

router.get(
    '/',
    validateDTO(ChatbotQueryDTO, 'query'),
    ChatbotController.getChatbots,
);

router.get('/:id', ChatbotController.getChatbot);

router.put(
    '/:id',
    validateDTO(UpdateChatbotRequestDTO),
    ChatbotController.updateChatbot,
);

router.patch(
    '/:id/publish',
    validateDTO(PublishChatbotRequestDTO),
    ChatbotController.publishChatbot,
);

router.post('/:id/retrain', ChatbotController.retrainChatbot);

router.delete('/:id', ChatbotController.deleteChatbot);

router.post(
    '/:id/upload-pdf',
    uploadPDF,
    validateDTO(UploadPDFRequestDTO),
    ChatbotController.uploadPDF,
);

export default router;
