import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/sendResponse';
import { ApiError } from '../utils/ApiError';

export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const stats = await AnalyticsService.getUserAnalytics(req.user._id.toString());
    sendResponse({ res, statusCode: 200, message: 'Analytics retrieved', data: stats });
});
