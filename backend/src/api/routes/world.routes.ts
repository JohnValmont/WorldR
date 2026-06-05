import { Router } from 'express';
import { WorldController } from '../controllers/world.controller';

const worldRoutes = Router();

worldRoutes.get('/clock', WorldController.getClock);
worldRoutes.get('/bootstrap', WorldController.getBootstrap);

export default worldRoutes;
