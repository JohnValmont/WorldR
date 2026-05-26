import { Router } from 'express';
import { voterBlocController } from '../controllers/voter-bloc.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

// GET /nations/:nationId/voter-blocs — get all voter blocs with party affinities
router.get('/', authMiddleware, voterBlocController.getBlocsForNation.bind(voterBlocController));

export default router;
