import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.get('/latest', authMiddleware, reportController.getLatestReport);
router.get('/', authMiddleware, reportController.getReportHistory);

export default router;
