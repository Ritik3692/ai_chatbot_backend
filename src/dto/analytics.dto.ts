/**
 * DTO Layer — Analytics
 * Request validation + typed response shapes for analytics/stats endpoints.
 */
import { z } from 'zod';

// ─── Request DTOs ──────────────────────────────────────────────────────────────

export const AnalyticsQueryDTO = z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    chatbotId: z.string().optional(),
});
export type AnalyticsQueryDTO = z.infer<typeof AnalyticsQueryDTO>;

// ─── Response DTOs ─────────────────────────────────────────────────────────────

export interface ChatbotStatDTO {
    chatbotId: string;
    chatbotName: string;
    chatCount: number;
    tokenUsage: number;
    status: string;
}

export interface UserAnalyticsResponseDTO {
    totalChatbots: number;
    publishedChatbots: number;
    totalChats: number;
    totalTokensUsed: number;
    plan: string;
    chatbotLimit: number;
    chatbotsRemaining: number;
    perChatbotStats: ChatbotStatDTO[];
}

export interface GlobalAnalyticsResponseDTO {
    totalUsers: number;
    totalChatbots: number;
    totalChats: number;
    totalTokensUsed: number;
    averageChatsPerBot: number;
}
