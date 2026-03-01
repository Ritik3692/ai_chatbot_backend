import { Chatbot } from '../models/Chatbot';
import { ChatHistory } from '../models/ChatHistory';
import { User } from '../models/User';
import type {
    UserAnalyticsResponseDTO,
    ChatbotStatDTO,
} from '../dto/analytics.dto';
import { ApiError } from '../utils/ApiError';

export class AnalyticsService {
    static async getUserAnalytics(userId: string): Promise<UserAnalyticsResponseDTO> {
        const user = await User.findById(userId);
        if (!user) throw ApiError.notFound('User not found');

        const chatbots = await Chatbot.find({ userId }).lean();

        const totalChatbots = chatbots.length;
        const publishedChatbots = chatbots.filter((b) => b.status === 'published').length;
        const totalChats = chatbots.reduce((sum, b) => sum + b.chatCount, 0);
        const totalTokensUsed = chatbots.reduce((sum, b) => sum + b.tokenUsageTotal, 0);

        const perChatbotStats: ChatbotStatDTO[] = chatbots.map((b) => ({
            chatbotId: b._id.toString(),
            chatbotName: b.name,
            chatCount: b.chatCount,
            tokenUsage: b.tokenUsageTotal,
            status: b.status,
        }));

        return {
            totalChatbots,
            publishedChatbots,
            totalChats,
            totalTokensUsed,
            plan: user.plan,
            chatbotLimit: user.chatbotLimit,
            chatbotsRemaining: Math.max(user.chatbotLimit - totalChatbots, 0),
            perChatbotStats,
        };
    }

    static async getChatbotSessionCount(chatbotId: string): Promise<number> {
        return ChatHistory.countDocuments({ chatbotId });
    }
}
