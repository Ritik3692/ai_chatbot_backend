import mongoose, { Document, Schema } from 'mongoose';

export type ChatbotStatus = 'draft' | 'training' | 'published' | 'error';

export interface IChatbotTheme {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    fontFamily: string;
    borderRadius: string;
    position: 'bottom-right' | 'bottom-left';
}

export interface IChatbot extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    referenceId: string;
    pdfUrl?: string;
    pdfPublicId?: string;       // Cloudinary public ID for deletion
    vectorNamespace: string;    // Pinecone namespace per chatbot
    status: ChatbotStatus;
    greetingMessage: string;
    theme: IChatbotTheme;
    chatCount: number;
    tokenUsageTotal: number;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ThemeSchema = new Schema<IChatbotTheme>(
    {
        primaryColor: { type: String, default: '#6366f1' },
        secondaryColor: { type: String, default: '#8b5cf6' },
        textColor: { type: String, default: '#1f2937' },
        backgroundColor: { type: String, default: '#ffffff' },
        fontFamily: { type: String, default: 'Inter, sans-serif' },
        borderRadius: { type: String, default: '12px' },
        position: { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
    },
    { _id: false },
);

const ChatbotSchema = new Schema<IChatbot>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Chatbot name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        description: { type: String, maxlength: 500 },
        referenceId: {
            type: String,
            required: true,
            unique: true,
        },
        pdfUrl: { type: String },
        pdfPublicId: { type: String },
        vectorNamespace: { type: String, required: true },
        status: {
            type: String,
            enum: ['draft', 'training', 'published', 'error'],
            default: 'draft',
        },
        greetingMessage: {
            type: String,
            default: 'Hello! How can I help you today?',
            maxlength: 300,
        },
        theme: { type: ThemeSchema, default: () => ({}) },
        chatCount: { type: Number, default: 0 },
        tokenUsageTotal: { type: Number, default: 0 },
        errorMessage: { type: String },
    },
    { timestamps: true },
);

// Compound index: one user's chatbots ordered by creation
ChatbotSchema.index({ userId: 1, createdAt: -1 });
ChatbotSchema.index({ referenceId: 1, status: 1 });

export const Chatbot = mongoose.model<IChatbot>('Chatbot', ChatbotSchema);
