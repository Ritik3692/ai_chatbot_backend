import { Router } from 'express';
import { getUserAnalytics } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getUserAnalytics);

export default router;
