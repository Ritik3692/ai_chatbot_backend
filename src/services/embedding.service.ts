import { Readable } from 'stream';
import { cloudinary } from '../config/cloudinary';
import { getOpenAIClient } from '../config/openai';
import { getPineconeIndex } from '../config/pinecone';
import { Chatbot } from '../models/Chatbot';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import pdfParse from 'pdf-parse';

// LangChain text splitter
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 100; // Pinecone upsert batch size

// ─── Cloudinary Upload ─────────────────────────────────────────────────────────

export const uploadPDFToCloudinary = async (
    buffer: Buffer,
    originalName: string,
    chatbotId: string,
): Promise<{ url: string; publicId: string }> => {
    return new Promise((resolve, reject) => {
        const cleanName = originalName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
        const public_id = `${Date.now()}-${cleanName}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                type: 'upload',
                folder: `chatbot-pdfs/${chatbotId}`,
                public_id: `${public_id}.pdf`,
            },
            (error, result) => {
                if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
                logger.info(`Cloudinary upload successful. URL: ${result.secure_url}`);
                resolve({ url: result.secure_url, publicId: result.public_id });
            },
        );

        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
};

export const deletePDFFromCloudinary = async (publicId: string): Promise<void> => {
    // Attempt to delete from both to be safe during transition
    await Promise.allSettled([
        cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }),
        cloudinary.uploader.destroy(publicId, { resource_type: 'image' }),
    ]);
};

// ─── PDF Text Extraction ───────────────────────────────────────────────────────

const extractTextFromBuffer = async (buffer: Buffer): Promise<string> => {
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length === 0) {
        throw ApiError.badRequest('PDF appears to be empty or contains no extractable text.');
    }
    return data.text;
};

// ─── Text Chunking ─────────────────────────────────────────────────────────────

const chunkText = async (text: string): Promise<string[]> => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
        separators: ['\n\n', '\n', '. ', ' ', ''],
    });
    const docs = await splitter.createDocuments([text]);
    return docs.map((d) => d.pageContent);
};

// ─── OpenAI Embeddings ─────────────────────────────────────────────────────────

const embedChunks = async (chunks: string[]): Promise<{ values: number[]; text: string }[]> => {
    const openai = getOpenAIClient();
    const results: { values: number[]; text: string }[] = [];

    // Process in batches to stay within OpenAI rate limits
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const response = await openai.embeddings.create({
            model: EMBEDDING_DEPLOYMENT,
            input: batch,
        });

        response.data.forEach((item, idx) => {
            results.push({ values: item.embedding, text: batch[idx] });
        });

        logger.debug(`Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
    }

    return results;
};

// ─── Pinecone Upsert ───────────────────────────────────────────────────────────

const upsertToPinecone = async (
    namespace: string,
    embeddings: { values: number[]; text: string }[],
): Promise<void> => {
    const index = getPineconeIndex().namespace(namespace);

    const vectors = embeddings.map((emb, i) => ({
        id: `chunk-${Date.now()}-${i}`,
        values: emb.values,
        metadata: { text: emb.text, chunkIndex: i },
    }));

    // Upsert in batches of 100
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        await index.upsert(batch);
    }

    logger.info(`Upserted ${vectors.length} vectors to Pinecone namespace: ${namespace}`);
};

// ─── Delete Namespace ──────────────────────────────────────────────────────────

export const deleteVectorNamespace = async (namespace: string): Promise<void> => {
    try {
        const index = getPineconeIndex().namespace(namespace);
        await index.deleteAll();
        logger.info(`Deleted Pinecone namespace: ${namespace}`);
    } catch (err) {
        logger.warn(`Could not delete Pinecone namespace ${namespace}: ${(err as Error).message}`);
    }
};

// ─── Main Pipeline ─────────────────────────────────────────────────────────────

export const processPDFEmbedding = async (
    chatbotId: string,
    pdfBuffer: Buffer,
): Promise<void> => {
    logger.info(`Starting PDF embedding pipeline for chatbot: ${chatbotId}`);

    // 1. Extract text
    const rawText = await extractTextFromBuffer(pdfBuffer);
    logger.debug(`Extracted ${rawText.length} characters from PDF`);

    // 2. Chunk
    const chunks = await chunkText(rawText);
    logger.debug(`Created ${chunks.length} text chunks`);

    // 3. Embed
    const embeddings = await embedChunks(chunks);

    // 4. Get chatbot for namespace
    const chatbot = await Chatbot.findById(chatbotId);
    if (!chatbot) throw new Error(`Chatbot ${chatbotId} not found`);

    // 5. Upsert to Pinecone
    await upsertToPinecone(chatbot.vectorNamespace, embeddings);

    // 6. Update chatbot status to published
    await Chatbot.findByIdAndUpdate(chatbotId, {
        status: 'published',
        errorMessage: undefined,
    });

    logger.info(`Embedding pipeline completed for chatbot: ${chatbotId}`);
};

// ─── Similarity Search ─────────────────────────────────────────────────────────

export const searchSimilarChunks = async (
    namespace: string,
    query: string,
    topK = 5,
): Promise<string[]> => {
    const openai = getOpenAIClient();

    const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_DEPLOYMENT,
        input: query,
    });

    const queryVector = embeddingResponse.data[0].embedding;
    const index = getPineconeIndex().namespace(namespace);

    const results = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
    });

    return results.matches
        .filter((m) => m.metadata?.text)
        .map((m) => m.metadata!.text as string);
};
