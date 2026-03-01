import { Request, Response } from 'express';
import { ChatbotService } from '../services/chatbot.service';
import { uploadPDFToCloudinary } from '../services/embedding.service';
import { enqueueEmbeddingJob } from '../jobs/embedding.queue';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/sendResponse';
import { ApiError } from '../utils/ApiError';
import { TypedRequest } from '../utils/types';
import {
    toChatbotResponseDTO,
    toChatbotPublicConfigDTO,
    type CreateChatbotRequestDTO,
    type UpdateChatbotRequestDTO,
    type PublishChatbotRequestDTO,
    type ChatbotQueryDTO,
    type ChatbotListResponseDTO,
} from '../dto/chatbot.dto';
import type { UploadResponseDTO, UploadPDFRequestDTO } from '../dto/upload.dto';

export const createChatbot = asyncHandler(async (req: TypedRequest<CreateChatbotRequestDTO>, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const dto = req.body;

    const chatbot = await ChatbotService.createChatbot(req.user._id.toString(), dto);

    sendResponse({
        res,
        statusCode: 201,
        message: 'Chatbot created successfully',
        data: toChatbotResponseDTO(chatbot),
    });
});

export const getChatbots = asyncHandler(async (req: TypedRequest<any, ChatbotQueryDTO>, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const query = req.query;

    const { chatbots, total } = await ChatbotService.getChatbots(req.user._id.toString(), query);
    const { page = 1, limit = 10 } = query;

    const response: ChatbotListResponseDTO = {
        chatbots: chatbots.map(toChatbotResponseDTO),
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
    };

    sendResponse({ res, statusCode: 200, message: 'Chatbots retrieved', data: response });
});

export const getChatbot = asyncHandler(async (req: TypedRequest<any, any, { id: string }>, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const chatbot = await ChatbotService.getChatbotById(req.params.id, req.user._id.toString());
    sendResponse({ res, statusCode: 200, message: 'Chatbot retrieved', data: toChatbotResponseDTO(chatbot) });
});

export const updateChatbot = asyncHandler(async (req: TypedRequest<UpdateChatbotRequestDTO, any, { id: string }>, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const dto = req.body;

    const chatbot = await ChatbotService.updateChatbot(req.params.id, req.user._id.toString(), dto);

    sendResponse({ res, statusCode: 200, message: 'Chatbot updated', data: toChatbotResponseDTO(chatbot) });
});

export const publishChatbot = asyncHandler(async (req: TypedRequest<PublishChatbotRequestDTO, any, { id: string }>, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const { publish } = req.body;

    const chatbot = await ChatbotService.publishChatbot(req.params.id, req.user._id.toString(), publish);

    sendResponse({
        res,
        statusCode: 200,
        message: publish ? 'Chatbot published' : 'Chatbot moved to draft',
        data: toChatbotResponseDTO(chatbot),
    });
});

export const deleteChatbot = asyncHandler(async (req: TypedRequest<any, any, { id: string }>, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await ChatbotService.deleteChatbot(req.params.id, req.user._id.toString());
    sendResponse({ res, statusCode: 200, message: 'Chatbot deleted successfully' });
});

export const uploadPDF = asyncHandler(async (req: TypedRequest<UploadPDFRequestDTO>, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!req.file) throw ApiError.badRequest('No PDF file uploaded');

    const { chatbotId } = req.body;

    // Verify chatbot ownership
    const chatbot = await ChatbotService.getChatbotById(chatbotId, req.user._id.toString());

    // Upload to Cloudinary (memory buffer → stream)
    const { url, publicId } = await uploadPDFToCloudinary(
        req.file.buffer,
        req.file.originalname,
        chatbotId,
    );

    // Update chatbot PDF info and set status to 'training'
    await ChatbotService.updatePDFInfo(chatbotId, url, publicId);

    // Enqueue background embedding job
    await enqueueEmbeddingJob({
        chatbotId,
        pdfUrl: url,
        chatbotName: chatbot.name,
    });

    const response: UploadResponseDTO = {
        chatbotId,
        file: {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            cloudinaryUrl: url,
            cloudinaryPublicId: publicId,
        },
        status: 'queued',
        message: 'PDF uploaded and training started. Chatbot will be ready shortly.',
    };

    sendResponse({ res, statusCode: 202, message: 'PDF upload accepted', data: response });
});

export const retrainChatbot = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const chatbotId = req.params.id as string;

    const chatbot = await ChatbotService.getChatbotById(chatbotId, req.user._id.toString());

    if (!chatbot.pdfUrl) {
        throw ApiError.badRequest('Cannot retrain a chatbot without a PDF. Please upload one first.');
    }

    // Reset status to training
    await ChatbotService.updatePDFInfo(chatbotId, chatbot.pdfUrl, chatbot.pdfPublicId || '');

    // Re-enqueue job
    await enqueueEmbeddingJob({
        chatbotId,
        pdfUrl: chatbot.pdfUrl,
        chatbotName: chatbot.name,
    });

    sendResponse({ res, statusCode: 200, message: 'Retraining started' });
});

/** Public endpoint — no auth required, used by the embed widget */
export const getChatbotPublicConfig = asyncHandler(async (req: TypedRequest<any, any, { referenceId: string }>, res: Response) => {
    const chatbot = await ChatbotService.getChatbotByReferenceId(req.params.referenceId);
    sendResponse({
        res,
        statusCode: 200,
        message: 'Chatbot config retrieved',
        data: toChatbotPublicConfigDTO(chatbot),
    });
});
