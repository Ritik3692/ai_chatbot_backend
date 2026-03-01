import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';

import { connectDB } from './config/db';
import { initCloudinary } from './config/cloudinary';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { logger } from './utils/logger';

// ─── Routes ───────────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.routes';
import chatbotRoutes from './routes/chatbot.routes';
import chatRoutes from './routes/chat.routes';
import analyticsRoutes from './routes/analytics.routes';
import embedRoutes from './routes/embed.routes';

const app = express();
const PORT = parseInt(process.env.PORT ?? '5000', 10);

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' }, // needed for embed widget
    }),
);

// Specific CORS for public routes (MUST be before global CORS or specific auth/api routes)
app.use('/embed', cors({ origin: '*' }));
app.use('/api/chat', cors({ origin: '*' }));

app.use(
    cors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                process.env.FRONTEND_URL ?? 'http://localhost:3000',
            ];
            // Allow requests with no origin (e.g. Postman, widget scripts)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: Origin ${origin} not allowed`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize()); // Prevent NoSQL injection

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api', apiRateLimiter);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/embed', embedRoutes);

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
const startServer = async (): Promise<void> => {
    try {
        await connectDB();
        initCloudinary();

        // Verify Redis connection at startup
        const { getRedisClient } = await import('./config/redis');
        getRedisClient();

        const server = app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info(`${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                const { disconnectDB } = await import('./config/db');
                const { closeRedis } = await import('./config/redis');
                await Promise.allSettled([disconnectDB(), closeRedis()]);
                logger.info('Server closed');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        process.on('unhandledRejection', (reason) => {
            logger.error('Unhandled promise rejection:', { reason });
        });

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught exception:', { message: err.message, stack: err.stack });
            process.exit(1);
        });
    } catch (err) {
        logger.error('Failed to start server:', { message: (err as Error).message });
        process.exit(1);
    }
};

startServer();

export default app;
