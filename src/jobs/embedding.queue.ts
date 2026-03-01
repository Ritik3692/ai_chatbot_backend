import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

export interface EmbeddingJobData {
    chatbotId: string;
    pdfUrl: string;
    chatbotName: string;
}

let embeddingQueue: Queue<EmbeddingJobData> | null = null;

export const getEmbeddingQueue = (): Queue<EmbeddingJobData> => {
    if (!embeddingQueue) {
        embeddingQueue = new Queue<EmbeddingJobData>('embedding', {
            connection: getRedisClient() as any,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
            },
        });
        logger.info('BullMQ embedding queue initialized');
    }
    return embeddingQueue!;
};

export const enqueueEmbeddingJob = async (
    data: EmbeddingJobData,
): Promise<string> => {
    const queue = getEmbeddingQueue();
    const job = await queue.add(`embed-${data.chatbotId}`, data, {
        jobId: `embed-${data.chatbotId}-${Date.now()}`,
    });
    logger.info(`Embedding job enqueued: ${job.id} for chatbot: ${data.chatbotId}`);
    return job.id!;
};
