import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, notificationController.getNotifications);
router.patch('/:id/read', authMiddleware, notificationController.markRead);
router.post('/read-all', authMiddleware, notificationController.markAllRead);

export default router;
