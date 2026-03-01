import { Request, Response } from 'express';
import { processChat } from '../services/chat.service';
import { ChatHistory } from '../models/ChatHistory';
import { ChatbotService } from '../services/chatbot.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/sendResponse';
import { ApiError } from '../utils/ApiError';
import { TypedRequest } from '../utils/types';
import {
    toChatSessionResponseDTO,
    type SendMessageRequestDTO,
    type ChatHistoryQueryDTO,
    type ChatHistoryListResponseDTO,
} from '../dto/chat.dto';

import { nanoid } from 'nanoid';

export const sendMessage = asyncHandler(async (req: TypedRequest<SendMessageRequestDTO>, res: Response) => {
    const { referenceId } = req.params;
    const { message, sessionId: providedSessionId } = req.body;

    const sessionId = providedSessionId || `session_${nanoid(12)}`;

    // Get chatbot for its MongoDB _id
    const chatbot = await ChatbotService.getChatbotByReferenceId(referenceId as string);

    const result = await processChat(
        chatbot._id.toString(),
        referenceId as string,
        sessionId,
        message,
    );

    sendResponse({ res, statusCode: 200, message: 'Message sent', data: result });
});

export const getChatHistories = asyncHandler(async (req: TypedRequest<any, ChatHistoryQueryDTO>, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const { id: chatbotId } = req.params;
    const { page = 1, limit = 20, sessionId } = req.query;

    // Verify ownership
    await ChatbotService.getChatbotById(chatbotId as string, req.user._id.toString());

    const filter: Record<string, unknown> = { chatbotId };
    if (sessionId) filter.sessionId = sessionId;

    const skip = (Number(page) - 1) * Number(limit);

    const [sessions, total] = await Promise.all([
        ChatHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        ChatHistory.countDocuments(filter),
    ]);

    const response: ChatHistoryListResponseDTO = {
        sessions: sessions.map(toChatSessionResponseDTO),
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
    };

    sendResponse({ res, statusCode: 200, message: 'Chat histories retrieved', data: response });
});
