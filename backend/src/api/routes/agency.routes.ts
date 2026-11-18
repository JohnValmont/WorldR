/**
 * The Meridian Wire (docs/WORLD_STAGE.md): the world's neutral news agency.
 * Read the front page and archive; file, endorse, report or withdraw dispatches.
 * World-wide, so it does not run in the player's nation.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware';
import { AppError } from '../../utils/errors';
import {
  fileDispatch, getEdition, getFront, moderateDispatch, reactToDispatch, retractDispatch,
} from '../services/agency.service';

const router = Router();
router.use(authMiddleware);

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const asId = (v: any) => {
  if (!UUID.test(String(v ?? ''))) throw new AppError('Not a valid dispatch id', 400, 'BAD_REQUEST');
  return String(v);
};
const wrap = (fn: (req: Request) => Promise<any>) => async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await fn(req)); } catch (e) { next(e); }
};
const userOf = (req: Request): string => {
  const id = (req as any).user?.id;
  if (!id) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  return id;
};

router.get('/front', wrap(req => getFront(userOf(req))));
router.get('/editions/:arc', wrap(req => {
  const arc = Number(req.params.arc);
  if (!Number.isInteger(arc)) throw new AppError('arc must be a whole number', 400, 'BAD_REQUEST');
  return getEdition(arc, userOf(req));
}));
router.post('/dispatches', wrap(req => fileDispatch(userOf(req), { headline: req.body?.headline, body: req.body?.body })));
router.post('/dispatches/:id/react', wrap(req => {
  const kind = req.body?.kind;
  if (kind !== 'endorse' && kind !== 'report') throw new AppError('kind must be endorse or report', 400, 'BAD_REQUEST');
  return reactToDispatch(userOf(req), asId(req.params.id), kind);
}));
router.post('/dispatches/:id/withdraw', wrap(req => retractDispatch(userOf(req), asId(req.params.id))));
router.post('/dispatches/:id/moderate', requireAdmin, wrap(req => moderateDispatch(asId(req.params.id), String(req.body?.status ?? ''))));

export default router;
