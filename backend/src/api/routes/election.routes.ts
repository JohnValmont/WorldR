import { Router } from 'express';
import { electionController } from '../controllers/election.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.get('/status', authMiddleware, electionController.getElectionStatus);
router.get('/latest', authMiddleware, electionController.getLatestElection);
router.get('/', authMiddleware, electionController.getElectionHistory);

export default router;
