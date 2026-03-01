import { Chatbot, IChatbot } from '../models/Chatbot';
import { ChatHistory } from '../models/ChatHistory';
import { User } from '../models/User';
import { generateReferenceId } from '../utils/generateReferenceId';
import { ApiError } from '../utils/ApiError';
import { deleteVectorNamespace } from './embedding.service';
import { deletePDFFromCloudinary } from './embedding.service';
import type {
    CreateChatbotRequestDTO,
    UpdateChatbotRequestDTO,
    ChatbotQueryDTO,
} from '../dto/chatbot.dto';
import type mongoose from 'mongoose';

export class ChatbotService {
    static async createChatbot(
        userId: mongoose.Types.ObjectId | string,
        data: CreateChatbotRequestDTO,
    ): Promise<IChatbot> {
        // Check plan limit
        const user = await User.findById(userId);
        if (!user) throw ApiError.notFound('User not found');

        const count = await Chatbot.countDocuments({ userId });
        if (count >= user.chatbotLimit) {
            throw ApiError.forbidden(
                `You have reached your chatbot limit (${user.chatbotLimit}). Please upgrade your plan.`,
            );
        }

        const referenceId = generateReferenceId();
        const vectorNamespace = `bot-${referenceId}`;

        const chatbot = await Chatbot.create({
            userId,
            name: data.name,
            description: data.description,
            greetingMessage: data.greetingMessage ?? 'Hello! How can I help you today?',
            theme: data.theme ?? {},
            referenceId,
            vectorNamespace,
            status: 'draft',
        });

        return chatbot;
    }

    static async getChatbots(
        userId: string,
        query: ChatbotQueryDTO,
    ): Promise<{ chatbots: IChatbot[]; total: number }> {
        const { page, limit, status, search } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = { userId };
        if (status) filter.status = status;
        if (search) filter.name = { $regex: search, $options: 'i' };

        const [chatbots, total] = await Promise.all([
            Chatbot.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Chatbot.countDocuments(filter),
        ]);

        return { chatbots: chatbots as unknown as IChatbot[], total };
    }

    static async getChatbotById(chatbotId: string, userId: string): Promise<IChatbot> {
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId });
        if (!chatbot) throw ApiError.notFound('Chatbot not found');
        return chatbot;
    }

    static async getChatbotByReferenceId(referenceId: string): Promise<IChatbot> {
        const chatbot = await Chatbot.findOne({ referenceId });
        if (!chatbot) throw ApiError.notFound('Chatbot not found');
        return chatbot;
    }

    static async updateChatbot(
        chatbotId: string,
        userId: string,
        data: UpdateChatbotRequestDTO,
    ): Promise<IChatbot> {
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId });
        if (!chatbot) throw ApiError.notFound('Chatbot not found');

        if (data.name) chatbot.name = data.name;
        if (data.description !== undefined) chatbot.description = data.description;
        if (data.greetingMessage !== undefined) chatbot.greetingMessage = data.greetingMessage;
        if (data.theme) chatbot.theme = { ...chatbot.theme, ...data.theme } as typeof chatbot.theme;

        await chatbot.save();
        return chatbot;
    }

    static async publishChatbot(
        chatbotId: string,
        userId: string,
        publish: boolean,
    ): Promise<IChatbot> {
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId });
        if (!chatbot) throw ApiError.notFound('Chatbot not found');

        if (publish && chatbot.status === 'draft') {
            throw ApiError.badRequest(
                'Cannot publish a chatbot that has not been trained. Please upload a PDF first.',
            );
        }

        chatbot.status = publish ? 'published' : 'draft';
        await chatbot.save();
        return chatbot;
    }

    static async deleteChatbot(chatbotId: string, userId: string): Promise<void> {
        const chatbot = await Chatbot.findOne({ _id: chatbotId, userId });
        if (!chatbot) throw ApiError.notFound('Chatbot not found');

        // Cleanup Pinecone namespace and Cloudinary PDF in parallel
        await Promise.allSettled([
            deleteVectorNamespace(chatbot.vectorNamespace),
            chatbot.pdfPublicId ? deletePDFFromCloudinary(chatbot.pdfPublicId) : Promise.resolve(),
        ]);

        // Delete chat history and chatbot document
        await Promise.all([
            ChatHistory.deleteMany({ chatbotId }),
            Chatbot.deleteOne({ _id: chatbotId }),
        ]);
    }

    static async updatePDFInfo(
        chatbotId: string,
        pdfUrl: string,
        pdfPublicId: string,
    ): Promise<void> {
        await Chatbot.findByIdAndUpdate(chatbotId, {
            pdfUrl,
            pdfPublicId,
            status: 'training',
            errorMessage: undefined,
        });
    }

    static async markEmbeddingError(chatbotId: string, error: string): Promise<void> {
        await Chatbot.findByIdAndUpdate(chatbotId, {
            status: 'error',
            errorMessage: error,
        });
    }
}
