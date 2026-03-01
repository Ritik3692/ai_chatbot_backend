/**
 * DTO Layer — Chat
 * Request validation schemas + typed response shapes for the RAG chat pipeline.
 */
import { z } from 'zod';
import type { IChatHistory, IMessage } from '../models/ChatHistory';

// ─── Request DTOs ──────────────────────────────────────────────────────────────

export const SendMessageRequestDTO = z.object({
    message: z
        .string({ required_error: 'Message is required' })
        .trim()
        .min(1, 'Message cannot be empty')
        .max(2000, 'Message cannot exceed 2000 characters'),
    sessionId: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional(),
});
export type SendMessageRequestDTO = z.infer<typeof SendMessageRequestDTO>;

export const ChatHistoryQueryDTO = z.object({
    sessionId: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ChatHistoryQueryDTO = z.infer<typeof ChatHistoryQueryDTO>;

// ─── Response DTOs ─────────────────────────────────────────────────────────────

export interface MessageResponseDTO {
    role: string;
    content: string;
    tokenUsage: number;
    createdAt: string;
}

export interface SendMessageResponseDTO {
    sessionId: string;
    answer: string;
    tokenUsage: number;
    sources: string[];
}

export interface ChatSessionResponseDTO {
    id: string;
    chatbotId: string;
    sessionId: string;
    messages: MessageResponseDTO[];
    totalTokens: number;
    createdAt: string;
    updatedAt: string;
}

export interface ChatHistoryListResponseDTO {
    sessions: ChatSessionResponseDTO[];
    total: number;
    page: number;
    totalPages: number;
}

// ─── Transformers ──────────────────────────────────────────────────────────────

const toMessageResponseDTO = (msg: IMessage): MessageResponseDTO => ({
    role: msg.role,
    content: msg.content,
    tokenUsage: msg.tokenUsage ?? 0,
    createdAt: msg.createdAt.toISOString(),
});

export const toChatSessionResponseDTO = (session: IChatHistory): ChatSessionResponseDTO => ({
    id: session._id.toString(),
    chatbotId: session.chatbotId.toString(),
    sessionId: session.sessionId,
    messages: session.messages.map(toMessageResponseDTO),
    totalTokens: session.totalTokens,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
});
