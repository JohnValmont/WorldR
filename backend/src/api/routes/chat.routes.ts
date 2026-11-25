import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware';

const chatRoutes = Router();

chatRoutes.get('/messages', authMiddleware, ChatController.getMessages);
chatRoutes.post('/messages', authMiddleware, ChatController.postMessage);
chatRoutes.post('/messages/:id/report', authMiddleware, ChatController.reportMessage);

// Moderation (admins: users.role = 'admin')
chatRoutes.get('/reports', authMiddleware, requireAdmin, ChatController.listReports);
chatRoutes.post('/messages/:id/moderate', authMiddleware, requireAdmin, ChatController.moderateMessage);
chatRoutes.post('/characters/:characterId/mute', authMiddleware, requireAdmin, ChatController.muteCharacter);

export default chatRoutes;
