import { Router } from 'express';
import authRoutes from './auth.routes';
import worldRoutes from './world.routes';
import characterRoutes from './character.routes';
import companyRoutes from './company.routes';
import registryRoutes from './registry.routes';
import logisticsRoutes from './logistics.routes';
import manufacturingRoutes from './manufacturing.routes';

import politicsRoutes from './politics.routes';
import exchangeRoutes from './exchange.routes';
import bankRoutes from './bank.routes';
import investmentsRoutes from './investments.routes';
import chatRoutes from './chat.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/world', worldRoutes);
apiRouter.use('/characters', characterRoutes);
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/registry', registryRoutes);
apiRouter.use('/logistics', logisticsRoutes);
apiRouter.use('/politics', politicsRoutes);
apiRouter.use('/exchange', exchangeRoutes);
apiRouter.use('/banks', bankRoutes);
apiRouter.use('/investments', investmentsRoutes);
apiRouter.use('/chat', chatRoutes);
// Manufacturing: mounts bootstrap + company routes + admin month-process endpoint
apiRouter.use('/', manufacturingRoutes);

export default apiRouter;
