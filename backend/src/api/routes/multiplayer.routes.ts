import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { multiplayerController } from '../controllers/multiplayer.controller';

const router = Router();

const assignCabinetSchema = z.object({
  body: z.object({
    targetUserId: z.string().uuid(),
    role: z.enum([
      'head_of_government',
      'finance_minister',
      'economy_minister',
      'welfare_minister',
      'interior_minister',
      'labor_minister',
      'parliamentary_leader',
      'opposition_leader',
      'advisor'
    ])
  })
});

const createProposalSchema = z.object({
  body: z.object({
    type: z.enum(['budget', 'tax', 'law']),
    title: z.string().min(3).max(150),
    details: z.object({}).passthrough(),
    timeoutMs: z.number().int().min(10000).max(300000).optional()
  })
});

const castVoteSchema = z.object({
  body: z.object({
    option: z.enum(['yes', 'no', 'abstain'])
  })
});

const createNegotiationSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid(),
    terms: z.object({}).passthrough()
  })
});

const respondNegotiationSchema = z.object({
  body: z.object({
    status: z.enum(['accepted', 'declined'])
  })
});

router.get('/:nation_id/cabinet', authMiddleware, multiplayerController.getCabinet);
router.post('/:nation_id/cabinet/assign', authMiddleware, validate(assignCabinetSchema), multiplayerController.assignCabinetRole);

router.get('/:nation_id/proposals', authMiddleware, multiplayerController.getActiveProposals);
router.post('/:nation_id/proposals', authMiddleware, validate(createProposalSchema), multiplayerController.createProposal);
router.post('/:nation_id/proposals/:proposal_id/vote', authMiddleware, validate(castVoteSchema), multiplayerController.castVote);

router.get('/:nation_id/negotiations', authMiddleware, multiplayerController.getActiveNegotiations);
router.post('/:nation_id/negotiations', authMiddleware, validate(createNegotiationSchema), multiplayerController.createNegotiation);
router.post('/:nation_id/negotiations/:negotiation_id/respond', authMiddleware, validate(respondNegotiationSchema), multiplayerController.respondToNegotiation);

export default router;
