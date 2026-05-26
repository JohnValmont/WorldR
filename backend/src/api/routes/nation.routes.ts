import { Router } from 'express';
import { z } from 'zod';
import { nationController } from '../controllers/nation.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

const budgetUpdateSchema = z.object({
  body: z.object({
    taxes: z.array(z.object({
      name: z.enum(['Income Tax', 'Corporate Tax', 'Sales Tax', 'Property Tax', 'Tariffs']),
      rate: z.number().min(0.0).max(1.0)
    })).optional(),
    budgets: z.array(z.object({
      name: z.enum(['Education', 'Healthcare', 'Infrastructure', 'Welfare', 'Administration']),
      allocation: z.number().nonnegative()
    })).optional()
  })
});

const spawnNationSchema = z.object({
  body: z.object({
    templateName: z.string(),
    nationName: z.string().min(3).max(100),
    region: z.string().optional(),
    continent: z.string().optional()
  })
});

router.get('/', nationController.listNations);
router.post('/spawn', authMiddleware, validate(spawnNationSchema), nationController.spawnNation);
router.get('/:nation_id', authMiddleware, nationController.getNationState);
router.patch('/:nation_id/budget', authMiddleware, validate(budgetUpdateSchema), nationController.updateFiscalPolicy);
router.post('/:nation_id/tick', authMiddleware, nationController.triggerTick);
router.get('/:nation_id/history', authMiddleware, nationController.getHistory);

export default router;
