import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler to forward errors to the global error handler.
 * Uses 'any' return type to support specialized TypedRequest in controllers
 * without manual casting at every call site.
 */
export const asyncHandler =
    <TReq = Request>(
        fn: (req: TReq, res: Response, next: NextFunction) => Promise<unknown> | unknown,
    ): any =>
        (req: any, res: any, next: any) => {
            Promise.resolve(fn(req as TReq, res, next)).catch(next);
        };
