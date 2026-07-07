import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const chatRoutes = Router();

chatRoutes.get('/messages', authMiddleware, ChatController.getMessages);
chatRoutes.post('/messages', authMiddleware, ChatController.postMessage);

export default chatRoutes;
