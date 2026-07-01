import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { AppError } from '../../utils/errors';
import {
  getStateOverview,
  getCycle,
  getParties,
  foundParty,
  joinParty,
  leaveParty,
  updatePlatform,
  declareCandidacy,
  queueCampaignAction,
  getPolls,
  manageCoalition,
  getCouncil,
  getLedger,
  proposeBill,
  voteBill,
  donateToParty,
  petitionParty,
  postTender,
  bidTender,
  getBills,
  getTenders
} from '../controllers/politics.controller';
import { getOrCreateCurrentCycle } from '../services/politics.service';
import { db } from '../../config/database';

const router = Router();

// Phase-gate middleware
function requirePhase(allowedPhase: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeState = await db('pol_states').where({ is_active: true }).first();
      if (!activeState) return next(new AppError('No active state', 404, 'NOT_FOUND'));

      const cycle = await getOrCreateCurrentCycle(activeState.id);
      if (cycle.phase !== allowedPhase) {
        return next(new AppError(`This action is only allowed during the ${allowedPhase} phase. Current phase: ${cycle.phase}`, 409, 'CONFLICT'));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Public-ish / overview routes (auth still required by our API design, but no phase restriction)
router.get('/state', authMiddleware, getStateOverview);
router.get('/cycle', authMiddleware, getCycle);
router.get('/parties', authMiddleware, getParties);

// Actions (Phase-gated to 'filing')
router.post('/parties', authMiddleware, requirePhase('filing'), foundParty);
router.post('/parties/:id/join', authMiddleware, requirePhase('filing'), joinParty);
router.post('/parties/:id/leave', authMiddleware, leaveParty); // Spec didn't explicitly say "FILING only" for leave, but it's safe to not gate it, or I can gate it. Spec says for join/found: "FILING phase only." For leave: "-> leave. If leader leaves...". I will leave it ungated.
router.put('/parties/:id/platform', authMiddleware, requirePhase('filing'), updatePlatform);
router.post('/candidacy', authMiddleware, requirePhase('filing'), declareCandidacy);

// Phase 3A
router.post('/campaign/actions', authMiddleware, requirePhase('campaign'), queueCampaignAction);
router.get('/polls', authMiddleware, getPolls);

// Phase 4
router.post('/formation/coalition', authMiddleware, requirePhase('formation'), manageCoalition);
router.get('/council', authMiddleware, getCouncil);
router.get('/ledger', authMiddleware, getLedger);

// Phase 5A
router.get('/bills', authMiddleware, getBills);
router.post('/bills', authMiddleware, requirePhase('governing'), proposeBill);
router.post('/bills/:id/vote', authMiddleware, requirePhase('governing'), voteBill);
router.post('/lobby/donate', authMiddleware, donateToParty);
router.post('/lobby/petition', authMiddleware, petitionParty);

// Phase 5B: Tenders
router.get('/tenders', authMiddleware, getTenders);
router.post('/tenders', authMiddleware, requirePhase('governing'), postTender);
router.post('/tenders/:id/bid', authMiddleware, bidTender);

export default router;
