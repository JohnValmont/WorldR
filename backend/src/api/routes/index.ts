import { Router } from 'express';
import authRoutes from './auth.routes';
import worldRoutes from './world.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/world', worldRoutes);

export default apiRouter;
