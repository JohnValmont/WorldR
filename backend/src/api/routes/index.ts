import { Router } from 'express';
import authRoutes from './auth.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);

export default apiRouter;
