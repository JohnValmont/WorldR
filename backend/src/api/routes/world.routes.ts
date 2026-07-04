import { Router } from 'express';
import { WorldController } from '../controllers/world.controller';

const worldRoutes = Router();

worldRoutes.get('/clock', WorldController.getClock);
worldRoutes.get('/bootstrap', WorldController.getBootstrap);
worldRoutes.get('/operators', WorldController.getOperators);
worldRoutes.get('/market-leaderboard', WorldController.getMarketLeaderboard);

export default worldRoutes;
