import IORedis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: IORedis | null = null;

export const getRedisClient = (): IORedis => {
    if (!redisClient) {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = new IORedis(url, {
            maxRetriesPerRequest: null, // Required for BullMQ
            enableReadyCheck: false,
        });

        redisClient.on('connect', () => logger.info('Redis connected'));
        redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
        redisClient.on('close', () => logger.warn('Redis connection closed'));
    }
    return redisClient;
};

export const closeRedis = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger.info('Redis disconnected gracefully');
    }
};
