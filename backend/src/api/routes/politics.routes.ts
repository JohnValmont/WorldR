import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware';
import { AppError } from '../../utils/errors';
import {
  getStateOverview,
  getCycle,
  getConstituencies,
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
  getFormingCoalition,
  getCouncil,
  getLedger,
  proposeBill,
  voteBill,
  donateToParty,
  petitionParty,
  respondToPetition,
  getMyPetitions,
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
import { getOrCreateCurrentCycle, bribeVote, getBillCoercions, worldClockToArc } from '../services/politics.service';
import { getDesk } from '../services/desk.service';
import {
  callFavour, challengeLeadership, chooseSituation, fundraise, offerPact, playerPolitics, PlayerPolitics, rally, respondPact, runAd,
} from '../services/floor.service';
import { getGovernment, getLawsInForce } from '../services/statecraft.service';
import type { GovernmentInfo } from '../services/statecraft.service';
import { getCapitol } from '../services/capitol.service';
import { appointMinister } from '../services/statecraft.service';
import { db } from '../../config/database';

const router = Router();

// Politics is open to every signed-in player (Phase 2). Only the world-clock
// "force tick" stays admin-only (world.routes.ts).
router.use([authMiddleware]);

// ── Capitol: one read model for the rebuilt Politics screens ───────────────
router.get('/capitol', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCapitol((req as any).user?.id ?? null, (req.query.stateId as string) || undefined);
    if (!data) return next(new AppError('No active state', 404, 'NOT_FOUND'));
    return res.json(data);
  } catch (error) { next(error); }
});

// ── The Floor: the redesigned politics game (docs/POLITICS_FLOOR.md) ───────
// One read model for the screens...
router.get('/desk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDesk((req as any).user?.id ?? null, (req.query.stateId as string) || undefined);
    if (!data) return next(new AppError('No active state', 404, 'NOT_FOUND'));
    return res.json(data);
  } catch (error) { next(error); }
});

// ...and a handful of actions. Each runs in one transaction with the player's
// character, party, seat and the sitting government already looked up.
interface FloorCtx { trx: any; stateId: string; arc: number; phase: string; gov: GovernmentInfo; laws: Record<string, string>; me: PlayerPolitics }
function floorAction(handler: (ctx: FloorCtx, req: Request) => Promise<any>, opts: { blockDuringElection?: boolean } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      const state = await resolveStateForPhase(req);
      if (!state) return next(new AppError('No active state', 404, 'NOT_FOUND'));
      const result = await db.transaction(async trx => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('Create a character first.', 404, 'NOT_FOUND');
        const clock = await trx('world_clock').first();
        const arc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });
        const cycle = await getOrCreateCurrentCycle(state.id, trx);
        if (opts.blockDuringElection && ['polling', 'formation'].includes(cycle.phase)) {
          throw new AppError('Parliament is dissolved while the election is counted and a government forms.', 409, 'CONFLICT');
        }
        const gov = await getGovernment(trx, state.id);
        const laws = await getLawsInForce(trx, state.id);
        const me = await playerPolitics(trx, state.id, character, gov);
        return handler({ trx, stateId: state.id, arc, phase: cycle.phase, gov, laws, me }, req);
      });
      return res.json(result);
    } catch (error) { next(error); }
  };
}
const asId = (v: any, what: string): string => {
  if (!UUID_REGEX.test(String(v ?? ''))) throw new AppError(`${what} is not a valid id`, 400, 'BAD_REQUEST');
  return String(v);
};
const asVote = (v: any): 'yea' | 'nay' => {
  if (v !== 'yea' && v !== 'nay') throw new AppError('vote must be yea or nay', 400, 'BAD_REQUEST');
  return v;
};

router.post('/desk/situations/:id/choose', floorAction((c, req) => {
  const option = Number(req.body?.option);
  if (!Number.isInteger(option) || option < 0) throw new AppError('option must be a whole number', 400, 'BAD_REQUEST');
  return chooseSituation(c.trx, c.stateId, c.me, asId(req.params.id, 'situation'), option, c.arc);
}));
router.post('/desk/rally', floorAction((c, req) => rally(c.trx, c.stateId, c.me, String(req.body?.segment ?? ''), c.phase, c.arc)));
router.post('/desk/ad', floorAction(c => runAd(c.trx, c.stateId, c.me, c.arc)));
router.post('/desk/fundraise', floorAction(c => fundraise(c.trx, c.stateId, c.me, c.arc)));
router.post('/pacts', floorAction((c, req) => offerPact(c.trx, c.stateId, c.me, {
  billId: asId(req.body?.billId, 'billId'), toPartyId: asId(req.body?.toPartyId, 'toPartyId'),
  askedVote: asVote(req.body?.askedVote), cash: Number(req.body?.cash) || 0,
}, c.gov, c.laws, c.arc), { blockDuringElection: true }));
router.post('/pacts/:id/respond', floorAction((c, req) => respondPact(c.trx, c.stateId, c.me, asId(req.params.id, 'pact'), !!req.body?.accept, c.arc), { blockDuringElection: true }));
router.post('/favours/:id/call', floorAction((c, req) => callFavour(c.trx, c.stateId, c.me, asId(req.params.id, 'favour'), asId(req.body?.billId, 'billId'), asVote(req.body?.vote), c.arc), { blockDuringElection: true }));
router.post('/party/challenge', floorAction(c => challengeLeadership(c.trx, c.stateId, c.me, c.arc)));

// ── Cabinet: the Premier appoints ministers ────────────────────────────────
router.post('/cabinet/:postKey/appoint', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const char = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!char) return next(new AppError('No character found', 404, 'NOT_FOUND'));
    const targetCharId: string | null = req.body?.characterId ?? null;
    if (targetCharId !== null && !UUID_REGEX.test(String(targetCharId))) {
      return next(new AppError('characterId must be a character id or null', 400, 'BAD_REQUEST'));
    }
    const state = await resolveStateForPhase(req);
    if (!state) return next(new AppError('No active state', 404, 'NOT_FOUND'));
    const clock = await db('world_clock').first();
    const arc = clock.pol_current_year * 12 + (clock.pol_current_month - 1);
    await db.transaction(trx => appointMinister(trx, state.id, char.id, req.params.postKey, targetCharId, arc));
    return res.json({ success: true });
  } catch (error: any) {
    if (error?.status) return next(new AppError(error.message, error.status, error.status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST'));
    next(error);
  }
});

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Helper to resolve state for phase middleware
async function resolveStateForPhase(req: Request) {
  const code = (req.query.stateId || req.body.stateId || req.body.jurisdictionId || 'national') as string;
  let state = await db('pol_states').where({ code }).first();
  if (!state && UUID_REGEX.test(code)) {
    state = await db('pol_states').where({ id: code }).first();
  }
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
router.get('/constituencies', authMiddleware, getConstituencies);
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
router.get('/formation/coalition', authMiddleware, requirePhase('formation'), getFormingCoalition);
router.post('/formation/coalition', authMiddleware, requirePhase('formation'), manageCoalition);
router.get('/council', authMiddleware, getCouncil);
router.get('/ledger', authMiddleware, getLedger);

// Legislation is ALWAYS open (GDD $3): propose & vote any time except while an
// election is actively resolving (polling/formation).
router.get('/bills', authMiddleware, getBills);
router.post('/bills', authMiddleware, blockPhases('polling', 'formation'), proposeBill);
router.post('/bills/:id/vote', authMiddleware, blockPhases('polling', 'formation'), voteBill);

// ── Bill Coercion (Phase 1: Bribery) ─────────────────────────────────────────
// Available any time a bill is proposed, blocked during election resolution.
// v1: opposition-vs-NPC only. Human-vs-human coercion deferred.
router.get('/bills/:id/coercions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    const char = await db('characters').where({ user_id: userId }).first();
    if (!char) return next(new AppError('No character found', 404, 'NOT_FOUND'));
    const data = await getBillCoercions(req.params.id, char.id);
    return res.json(data);
  } catch (error) { next(error); }
});

router.post('/bills/:id/bribe', authMiddleware, blockPhases('polling', 'formation'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    const { targetCharId, voteForced } = req.body;
    if (!targetCharId || !['yea', 'nay'].includes(voteForced)) {
      return next(new AppError('targetCharId and voteForced (yea|nay) are required', 400, 'BAD_REQUEST'));
    }
    const char = await db('characters').where({ user_id: userId }).first();
    if (!char) return next(new AppError('No character found', 404, 'NOT_FOUND'));
    const clock = await db('world_clock').first();
    const currentArc = clock.pol_current_year * 12 + clock.pol_current_month;
    const result = await db.transaction(trx =>
      bribeVote(trx, char.id, req.params.id, targetCharId, voteForced, currentArc)
    );
    return res.json(result);
  } catch (error) { next(error); }
});
router.post('/lobby/donate', authMiddleware, donateToParty);
router.post('/lobby/petition', authMiddleware, petitionParty);
router.post('/lobby/petitions/:id/respond', authMiddleware, respondToPetition);
router.get('/lobby/petitions', authMiddleware, getMyPetitions);

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
router.post('/media/exclusive-interview', authMiddleware, async (req, res, next) => {
  // Convenience: pick the outlet with the highest warmth and do an exclusive there
  req.params.outletId = 'auto';
  return doExclusiveInterviewHandler(req, res, next);
});
router.post('/media/:outletId/exclusive', authMiddleware, doExclusiveInterviewHandler);


// ── Legacy System (Phase 8) ──────────────────────────────────────────────────
router.get('/legacy/:characterId', authMiddleware, getLegacyHandler);

export default router;
