import mongoose, { Document, Schema } from 'mongoose';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface IMessage {
    role: MessageRole;
    content: string;
    tokenUsage?: number;
    createdAt: Date;
}

export interface IChatHistory extends Document {
    _id: mongoose.Types.ObjectId;
    chatbotId: mongoose.Types.ObjectId;
    sessionId: string;
    messages: IMessage[];
    totalTokens: number;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true,
        },
        content: { type: String, required: true },
        tokenUsage: { type: Number, default: 0 },
        createdAt: { type: Date, default: () => new Date() },
    },
    { _id: false },
);

const ChatHistorySchema = new Schema<IChatHistory>(
    {
        chatbotId: {
            type: Schema.Types.ObjectId,
            ref: 'Chatbot',
            required: true,
        },
        sessionId: {
            type: String,
            required: true,
        },
        messages: { type: [MessageSchema], default: [] },
        totalTokens: { type: Number, default: 0 },
    },
    { timestamps: true },
);

// Compound index: session lookup within a chatbot
ChatHistorySchema.index({ chatbotId: 1, sessionId: 1 });
ChatHistorySchema.index({ chatbotId: 1, createdAt: -1 });

export const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
