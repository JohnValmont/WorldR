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
  dissolveParty,
  transferLeadership,
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
  getMyPc,
  spendPcAction,
  getPartyFactionsHandler,
  getCoalitionAgreement,
  getMyScandals,
  actOnScandal,
  getPartyScandalsSummaryHandler,
  getMyCampaign,
  setCampaignStrategyHandler,
  allocateCampaignBudget,
  getMyInterestGroups,
  doOutreach,
  doRallySupport,
  getMyMedia,
  doExclusiveInterviewHandler,
  doPressConferenceHandler,
  getNewsFeedHandler,
  getLegacyHandler,
} from '../controllers/politics.controller';
import { getOrCreateCurrentCycle } from '../services/politics.service';
import { db } from '../../config/database';

const router = Router();

// Helper to resolve state for phase middleware
async function resolveStateForPhase(req: Request) {
  const code = (req.query.stateId || req.body.stateId || req.body.jurisdictionId || 'national') as string;
  let state = await db('pol_states').where({ code }).first();
  if (!state) state = await db('pol_states').where({ id: code }).first();
  if (!state) state = await db('pol_states').where({ is_active: true }).first();
  return state;
}

// Phase-gate middleware
function requirePhase(allowedPhase: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeState = await resolveStateForPhase(req);
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
      const activeState = await resolveStateForPhase(req);
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
router.post('/parties/:id/dissolve', authMiddleware, dissolveParty);
router.post('/parties/:id/transfer', authMiddleware, transferLeadership);
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

// ── Political Capital System ─────────────────────────────────────────────
// PC is a persistent strategic resource (carries over between arcs).
router.get('/pc', authMiddleware, getMyPc);
router.post('/pc/spend', authMiddleware, spendPcAction);

// ── Faction System ──────────────────────────────────────────────────────
// Internal party factions — publicly readable (opposing parties can scout).
router.get('/parties/:id/factions', authMiddleware, getPartyFactionsHandler);

// ── Coalition Agreement System ──────────────────────────────────────────
router.get('/coalition/agreement', authMiddleware, getCoalitionAgreement);

// ── Scandal System ──────────────────────────────────────────────────────
// Player scandal management.
router.get('/scandals', authMiddleware, getMyScandals);
router.post('/scandals/:id/intervene', authMiddleware, actOnScandal);
router.get('/parties/:id/scandals', authMiddleware, getPartyScandalsSummaryHandler);

// ── Campaign Command Object (Phase 5) ────────────────────────────────────────
// Persistent multi-arc campaign management for the current election cycle.
router.get('/campaign', authMiddleware, getMyCampaign);
router.post('/campaign/strategy', authMiddleware, setCampaignStrategyHandler);
router.post('/campaign/budget', authMiddleware, allocateCampaignBudget);

// ── Interest Groups (Phase 6) ─────────────────────────────────────────────────
// Per-party relationships with the 5 voter segment interest groups.
router.get('/interest-groups', authMiddleware, getMyInterestGroups);
router.post('/interest-groups/:groupId/outreach', authMiddleware, doOutreach);
router.post('/interest-groups/:groupId/rally', authMiddleware, doRallySupport);

// ── Media Ecosystem (Phase 7) ────────────────────────────────────────────────
router.get('/media', authMiddleware, getMyMedia);
router.get('/news', authMiddleware, getNewsFeedHandler);
router.post('/media/press-conference', authMiddleware, doPressConferenceHandler);
router.post('/media/:outletId/exclusive', authMiddleware, doExclusiveInterviewHandler);

// ── Legacy System (Phase 8) ──────────────────────────────────────────────────
router.get('/legacy/:characterId', authMiddleware, getLegacyHandler);

export default router;
