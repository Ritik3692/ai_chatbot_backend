import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Generic DTO validation middleware factory.
 * Validates req[target] against the provided Zod schema.
 * On success: replaces req[target] with the parsed (sanitised) object.
 * On failure: returns 400 with formatted field-level errors.
 */
export const validateDTO =
    <T>(schema: ZodSchema<T>, target: ValidateTarget = 'body') =>
        (req: Request, _res: Response, next: NextFunction): void => {
            const result = schema.safeParse(req[target]);

            if (!result.success) {
                const errors = result.error.errors.map((e: ZodError['errors'][0]) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));

                return next(ApiError.badRequest('Validation failed', errors));
            }

            // Replace with sanitised/coerced output
            (req as Request & Record<string, unknown>)[target] = result.data;
            next();
        };
