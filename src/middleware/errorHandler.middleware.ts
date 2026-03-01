import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

interface ErrorResponse {
    success: false;
    message: string;
    errors?: unknown[];
    stack?: string;
}

export const errorHandler = (
    err: Error | ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    const isDev = process.env.NODE_ENV !== 'production';

    if (err instanceof ApiError && err.isOperational) {
        // Known, safe-to-expose errors
        const response: ErrorResponse = {
            success: false,
            message: err.message,
            errors: err.errors,
        };
        if (isDev) response.stack = err.stack;
        res.status(err.statusCode).json(response);
        return;
    }

    // Programming or unknown errors — log full details, give client minimal info
    logger.error('Unhandled error', { message: err.message, stack: err.stack });

    const response: ErrorResponse = {
        success: false,
        message: isDev ? err.message : 'An unexpected error occurred. Please try again later.',
    };
    if (isDev) response.stack = err.stack;
    res.status(500).json(response);
};

/** Handler for non-existent routes */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
    next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
