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
  getTenders,
  getMyAp,
  doGeneralAction,
  recruitNpc,
  setDoctrine,
  setTenet,
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

// Blocks an action during specific phases (all other phases are allowed).
// Used for actions that are open most of the time but must be frozen while an
// election is actively resolving (polling/formation).
function blockPhases(...blockedPhases: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeState = await db('pol_states').where({ is_active: true }).first();
      if (!activeState) return next(new AppError('No active state', 404, 'NOT_FOUND'));

      const cycle = await getOrCreateCurrentCycle(activeState.id);
      if (blockedPhases.includes(cycle.phase)) {
        return next(new AppError(`This action is not available while the ${cycle.phase} phase is in progress.`, 409, 'CONFLICT'));
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

// Party-building actions — ALWAYS OPEN.
// Devlog #1 opened these on the frontend (found/join/leave/platform in any phase);
// the backend now matches so players don't hit a silent 409 outside the filing window.
router.post('/parties', authMiddleware, foundParty);
router.post('/parties/:id/join', authMiddleware, joinParty);
router.post('/parties/:id/leave', authMiddleware, leaveParty);
router.put('/parties/:id/platform', authMiddleware, updatePlatform);

// Candidacy is open in every phase EXCEPT while an election is actively resolving
// (polling/formation) — this matches PartyTab's `canRunForOffice` guard.
router.post('/candidacy', authMiddleware, blockPhases('polling', 'formation'), declareCandidacy);

// Campaigning is ALWAYS open (GDD $3), except while an election is actively
// resolving (polling/formation) — matching the candidacy guard above.
router.post('/campaign/actions', authMiddleware, blockPhases('polling', 'formation'), queueCampaignAction);
router.get('/polls', authMiddleware, getPolls);

// Phase 4
router.post('/formation/coalition', authMiddleware, requirePhase('formation'), manageCoalition);
router.get('/council', authMiddleware, getCouncil);
router.get('/ledger', authMiddleware, getLedger);

// Legislation is ALWAYS open (GDD $3): propose & vote any time except while an
// election is actively resolving (polling/formation).
router.get('/bills', authMiddleware, getBills);
router.post('/bills', authMiddleware, blockPhases('polling', 'formation'), proposeBill);
router.post('/bills/:id/vote', authMiddleware, blockPhases('polling', 'formation'), voteBill);
router.post('/lobby/donate', authMiddleware, donateToParty);
router.post('/lobby/petition', authMiddleware, petitionParty);

// Phase 5B: Tenders
router.get('/tenders', authMiddleware, getTenders);
router.post('/tenders', authMiddleware, blockPhases('polling', 'formation'), postTender);
router.post('/tenders/:id/bid', authMiddleware, bidTender);

// ── AP System ──────────────────────────────────────────────────────────
// Available any phase, any office.
router.get('/ap', authMiddleware, getMyAp);
router.post('/general-action', authMiddleware, doGeneralAction);
router.post('/recruit', authMiddleware, recruitNpc);
router.patch('/parties/:id/doctrine', authMiddleware, setDoctrine);
router.patch('/parties/:id/tenet', authMiddleware, setTenet);

export default router;
