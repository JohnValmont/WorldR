import { Router } from 'express';
import authRoutes from './auth.routes';
import worldRoutes from './world.routes';
import characterRoutes from './character.routes';
import companyRoutes from './company.routes';
import registryRoutes from './registry.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/world', worldRoutes);
apiRouter.use('/characters', characterRoutes);
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/registry', registryRoutes);

export default apiRouter;
