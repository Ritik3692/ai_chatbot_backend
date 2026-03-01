import { Response } from 'express';

interface ApiResponseOptions<T> {
    res: Response;
    statusCode?: number;
    message: string;
    data?: T;
    meta?: Record<string, unknown>;
}

/**
 * Sends a standardised JSON success response.
 */
export const sendResponse = <T>({
    res,
    statusCode = 200,
    message,
    data,
    meta,
}: ApiResponseOptions<T>): void => {
    res.status(statusCode).json({
        success: true,
        message,
        data: data ?? null,
        meta: meta ?? null,
        timestamp: new Date().toISOString(),
    });
};
