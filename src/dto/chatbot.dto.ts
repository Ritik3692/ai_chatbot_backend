/**
 * DTO Layer — Chatbot
 * Request validation schemas (Zod) + response shape transformers.
 */
import { z } from 'zod';
import type { IChatbot, IChatbotTheme } from '../models/Chatbot';

// ─── Request DTOs ──────────────────────────────────────────────────────────────

const ThemeDTO = z.object({
    primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').optional(),
    secondaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').optional(),
    textColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').optional(),
    backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').optional(),
    fontFamily: z.string().max(100).optional(),
    borderRadius: z.string().max(20).optional(),
    position: z.enum(['bottom-right', 'bottom-left']).optional(),
});

export const CreateChatbotRequestDTO = z.object({
    name: z
        .string({ required_error: 'Chatbot name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    greetingMessage: z.string().max(300, 'Greeting cannot exceed 300 characters').optional(),
    theme: ThemeDTO.optional(),
});
export type CreateChatbotRequestDTO = z.infer<typeof CreateChatbotRequestDTO>;

export const UpdateChatbotRequestDTO = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    greetingMessage: z.string().max(300).optional(),
    theme: ThemeDTO.optional(),
});
export type UpdateChatbotRequestDTO = z.infer<typeof UpdateChatbotRequestDTO>;

export const PublishChatbotRequestDTO = z.object({
    publish: z.boolean({ required_error: 'publish field (boolean) is required' }),
});
export type PublishChatbotRequestDTO = z.infer<typeof PublishChatbotRequestDTO>;

export const ChatbotQueryDTO = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['draft', 'training', 'published', 'error']).optional(),
    search: z.string().max(100).optional(),
});
export type ChatbotQueryDTO = z.infer<typeof ChatbotQueryDTO>;

// ─── Response DTOs ─────────────────────────────────────────────────────────────

export interface ThemeResponseDTO {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    fontFamily: string;
    borderRadius: string;
    position: 'bottom-right' | 'bottom-left';
}

export interface ChatbotResponseDTO {
    id: string;
    userId: string;
    name: string;
    description?: string;
    referenceId: string;
    pdfUrl?: string;
    vectorNamespace: string;
    status: string;
    greetingMessage: string;
    theme: ThemeResponseDTO;
    chatCount: number;
    tokenUsageTotal: number;
    embedScript: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatbotListResponseDTO {
    chatbots: ChatbotResponseDTO[];
    total: number;
    page: number;
    totalPages: number;
}

export interface ChatbotPublicConfigDTO {
    referenceId: string;
    name: string;
    greetingMessage: string;
    theme: ThemeResponseDTO;
    status: string;
}

// ─── Transformers ──────────────────────────────────────────────────────────────

const EMBED_BASE_URL = process.env.EMBED_WIDGET_URL ?? 'https://yourdomain.com';

const toThemeResponseDTO = (theme: IChatbotTheme): ThemeResponseDTO => ({
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    textColor: theme.textColor,
    backgroundColor: theme.backgroundColor,
    fontFamily: theme.fontFamily,
    borderRadius: theme.borderRadius,
    position: theme.position,
});

export const toChatbotResponseDTO = (chatbot: IChatbot): ChatbotResponseDTO => ({
    id: chatbot._id.toString(),
    userId: chatbot.userId.toString(),
    name: chatbot.name,
    description: chatbot.description,
    referenceId: chatbot.referenceId,
    pdfUrl: chatbot.pdfUrl,
    vectorNamespace: chatbot.vectorNamespace,
    status: chatbot.status,
    greetingMessage: chatbot.greetingMessage,
    theme: toThemeResponseDTO(chatbot.theme),
    chatCount: chatbot.chatCount,
    tokenUsageTotal: chatbot.tokenUsageTotal,
    embedScript: `<script src="${EMBED_BASE_URL}/embed.js" data-bot-id="${chatbot.referenceId}" defer></script>`,
    createdAt: chatbot.createdAt.toISOString(),
    updatedAt: chatbot.updatedAt.toISOString(),
});

export const toChatbotPublicConfigDTO = (chatbot: IChatbot): ChatbotPublicConfigDTO => ({
    referenceId: chatbot.referenceId,
    name: chatbot.name,
    greetingMessage: chatbot.greetingMessage,
    theme: toThemeResponseDTO(chatbot.theme),
    status: chatbot.status,
});
