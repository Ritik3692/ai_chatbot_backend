/**
 * BullMQ Worker — PDF Embedding
 *
 * Run this as a separate process:
 *   npm run worker
 *
 * It picks up jobs from the 'embedding' queue, downloads the PDF from
 * Cloudinary, processes the RAG pipeline, and updates the chatbot status.
 */
import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { connectDB } from '../config/db';
import { initCloudinary } from '../config/cloudinary';
import { processPDFEmbedding } from '../services/embedding.service';
import { ChatbotService } from '../services/chatbot.service';
import { logger } from '../utils/logger';
import axios from 'axios';
import type { EmbeddingJobData } from './embedding.queue';

const WORKER_CONCURRENCY = parseInt(process.env.EMBEDDING_CONCURRENCY ?? '2', 10);

const processJob = async (job: Job<EmbeddingJobData>): Promise<void> => {
    const { chatbotId, pdfUrl } = job.data;

    logger.info(`Processing embedding job ${job.id} for chatbot ${chatbotId}`);
    await job.updateProgress(10);

    // Download PDF buffer from Cloudinary URL
    logger.info(`Downloading PDF from: ${pdfUrl}`);
    let pdfBuffer: Buffer;
    try {
        const response = await axios.get<ArrayBuffer>(pdfUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
        });
        pdfBuffer = Buffer.from(response.data);
    } catch (err: any) {
        throw new Error(`Cloudinary Download Failed (${err.response?.status || err.message}). Please make sure your Cloudinary settings allow public access.`);
    }

    logger.info(`Downloaded PDF (${pdfBuffer.length} bytes) for chatbot ${chatbotId}`);

    await job.updateProgress(30);

    // Run the full embedding pipeline
    logger.info(`Starting embedding pipeline for chatbot ${chatbotId}`);
    try {
        await processPDFEmbedding(chatbotId, pdfBuffer);
    } catch (err: any) {
        if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('balance')) {
            throw new Error(`OpenAI Quota Exceeded. Aapka OpenAI billing quota khatam ho gaya hai ya credit balance nahi hai. Please check your OpenAI account and billing settings.`);
        }
        throw err;
    }

    await job.updateProgress(100);
    logger.info(`Embedding job ${job.id} completed for chatbot ${chatbotId}`);
};

export const startWorker = async (): Promise<void> => {
    // Initialise external connections
    await connectDB();
    initCloudinary();

    const worker = new Worker<EmbeddingJobData>('embedding', processJob, {
        connection: getRedisClient() as any,
        concurrency: WORKER_CONCURRENCY,
    });

    worker.on('completed', (job) => {
        logger.info(`Job ${job.id} completed`);
    });

    worker.on('failed', async (job, err) => {
        logger.error(`Job ${job?.id} failed: ${err.message}`);
        if (job) {
            await ChatbotService.markEmbeddingError(
                job.data.chatbotId,
                err.message ?? 'Unknown embedding error',
            );
        }
    });

    worker.on('error', (err) => {
        logger.error(`Worker error: ${err.message}`);
    });

    logger.info(`Embedding worker started (concurrency: ${WORKER_CONCURRENCY})`);
};

// Auto-start if run directly from CLI
if (require.main === module) {
    startWorker().catch((err) => {
        logger.error(`Worker startup failed: ${err.message}`);
        process.exit(1);
    });
}
