import { Router } from 'express';
import { z } from 'zod';
import { parameterController } from '../controllers/parameter.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

const globalParameterSchema = z.object({
  body: z.object({
    category: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    value: z.number(),
    description: z.string().optional()
  })
});

const overrideParameterSchema = z.object({
  body: z.object({
    category: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    value: z.number()
  })
});

// GET /api/v1/parameters - Read global parameters
router.get('/', authMiddleware, parameterController.getGlobalParameters);

// POST /api/v1/parameters - Admin updates global parameter
router.post(
  '/',
  authMiddleware,
  requireRole(['admin']),
  validate(globalParameterSchema),
  parameterController.updateGlobalParameter
);

// GET /api/v1/parameters/nations/:nation_id - Read nation-resolved parameters
router.get('/nations/:nation_id', authMiddleware, parameterController.getNationParameters);

// POST /api/v1/parameters/nations/:nation_id - Admin updates nation parameter override
router.post(
  '/nations/:nation_id',
  authMiddleware,
  requireRole(['admin']),
  validate(overrideParameterSchema),
  parameterController.updateNationOverride
);

export default router;
