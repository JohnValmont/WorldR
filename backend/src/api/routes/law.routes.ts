import { Router } from 'express';
import { z } from 'zod';
import { lawController } from '../controllers/law.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router({ mergeParams: true });

const proposeLawSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(255),
    description: z.string().optional(),
    effects: z.array(z.object({
      target_type: z.enum(['sector', 'population_group', 'tax', 'budget_item', 'nation']),
      target_name: z.string(),
      parameter_name: z.string(),
      modifier_type: z.enum(['multiplier', 'additive']),
      modifier_value: z.number()
    })).optional()
  })
});

const proposeBillSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(255),
    policies: z.array(z.object({
      sectorKey: z.string(),
      policyKey: z.string(),
      optionKey: z.string()
    })).min(1)
  })
});

const updateLawStatusSchema = z.object({
  body: z.object({
    status: z.enum(['passed', 'proposed', 'repealed'])
  })
});

router.get('/config', authMiddleware, lawController.getLawsConfig);
router.get('/', authMiddleware, lawController.getLaws);
router.post('/', authMiddleware, validate(proposeLawSchema), lawController.proposeLaw);
router.post('/propose-bill', authMiddleware, validate(proposeBillSchema), lawController.proposeBill);
router.patch('/:law_id', authMiddleware, validate(updateLawStatusSchema), lawController.updateLawStatus);

export default router;
