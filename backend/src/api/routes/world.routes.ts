import { Router } from 'express';
import { WorldController } from '../controllers/world.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware';
import { getWorldSnapshot } from '../services/worldSnapshot.service';

const worldRoutes = Router();

worldRoutes.get('/clock', WorldController.getClock);
worldRoutes.get('/bootstrap', WorldController.getBootstrap);
worldRoutes.get('/operators', WorldController.getOperators);
worldRoutes.get('/market-leaderboard', WorldController.getMarketLeaderboard);
worldRoutes.get('/global-leaderboards', WorldController.getGlobalLeaderboards);
// Public, real-data summary of the world (Chronicle panel + landing HUD).
worldRoutes.get('/snapshot', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    res.json(await getWorldSnapshot());
  } catch (err) {
    next(err);
  }
});

// Admin: world tick controls
worldRoutes.post('/tick', [authMiddleware, requireAdmin], WorldController.forceTick);
worldRoutes.post('/politics-tick', [authMiddleware, requireAdmin], WorldController.forcePoliticsTick);
worldRoutes.post('/clock/pause', [authMiddleware, requireAdmin], WorldController.pauseClock);
worldRoutes.post('/clock/resume', [authMiddleware, requireAdmin], WorldController.resumeClock);
worldRoutes.patch('/clock/speed', [authMiddleware, requireAdmin], WorldController.setClockSpeed);

export default worldRoutes;
