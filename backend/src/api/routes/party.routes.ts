import { Router } from 'express';
import { z } from 'zod';
import { partyController } from '../controllers/party.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router({ mergeParams: true });

const createPartySchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    abbreviation: z.string().min(1).max(10),
    ideology: z.enum([
      'far_left', 'left', 'centre_left', 'centrist',
      'centre_right', 'right', 'far_right',
      'libertarian', 'authoritarian', 'green', 'nationalist'
    ]),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
  })
});

router.get('/', authMiddleware, partyController.getParties);
router.get('/my', authMiddleware, partyController.getMyParty);
router.get('/:party_id', authMiddleware, partyController.getPartyDetails);
router.post('/', authMiddleware, validate(createPartySchema), partyController.createParty);
router.post('/:party_id/join', authMiddleware, partyController.joinParty);
router.delete('/leave', authMiddleware, partyController.leaveParty);
router.post('/action/rally', authMiddleware, partyController.runRally);
router.post('/action/fundraise', authMiddleware, partyController.runFundraise);

export default router;
