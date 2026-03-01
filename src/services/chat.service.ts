import { getOpenAIClient } from '../config/openai';
import { ChatHistory } from '../models/ChatHistory';
import { Chatbot } from '../models/Chatbot';
import { searchSimilarChunks } from './embedding.service';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import type { SendMessageResponseDTO } from '../dto/chat.dto';

const CHAT_MODEL = 'gpt-4o-mini';
const MAX_CONTEXT_CHUNKS = 5;

const buildSystemPrompt = (chatbotName: string, chunks: string[]): string => {
    const context = chunks.join('\n\n---\n\n');
    return `You are ${chatbotName}, a helpful AI assistant. Answer questions based ONLY on the following knowledge base content.
If the answer cannot be found in the provided content, politely say you don't have that information.
Keep answers concise, accurate, and helpful.

KNOWLEDGE BASE:
${context}`;
};

export const processChat = async (
    chatbotId: string,
    referenceId: string,
    sessionId: string,
    userMessage: string,
): Promise<SendMessageResponseDTO> => {
    // 1. Load chatbot
    const chatbot = await Chatbot.findById(chatbotId);
    if (!chatbot) throw ApiError.notFound('Chatbot not found');
    if (chatbot.status !== 'published') {
        throw ApiError.badRequest('This chatbot is not published yet. Please train it first.');
    }

    // 2. Find or create chat session
    let session = await ChatHistory.findOne({ chatbotId, sessionId });
    if (!session) {
        session = await ChatHistory.create({ chatbotId, sessionId, messages: [], totalTokens: 0 });
    }

    // 3. Get relevant context from Pinecone
    const relevantChunks = await searchSimilarChunks(
        chatbot.vectorNamespace,
        userMessage,
        MAX_CONTEXT_CHUNKS,
    );

    // 4. Build messages array (include last 10 messages for context window)
    const recentHistory = session.messages.slice(-10);
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: buildSystemPrompt(chatbot.name, relevantChunks) },
        ...recentHistory.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        })),
        { role: 'user', content: userMessage },
    ];

    // 5. Call OpenAI chat completion
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? 'I could not generate a response.';
    const tokenUsage = completion.usage?.total_tokens ?? 0;

    logger.debug(`Chat response for session ${sessionId}: ${tokenUsage} tokens used`);

    // 6. Persist messages to DB
    session.messages.push(
        { role: 'user', content: userMessage, tokenUsage: 0, createdAt: new Date() },
        { role: 'assistant', content: answer, tokenUsage, createdAt: new Date() },
    );
    session.totalTokens += tokenUsage;
    await session.save();

    // 7. Update chatbot analytics
    await Chatbot.findByIdAndUpdate(chatbotId, {
        $inc: { chatCount: 1, tokenUsageTotal: tokenUsage },
    });

    return {
        sessionId,
        answer,
        tokenUsage,
        sources: relevantChunks.map((c) => c.slice(0, 100) + '...'), // snippet preview
    };
};
