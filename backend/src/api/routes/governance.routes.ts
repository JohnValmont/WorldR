import { Router } from 'express';
import { governanceController } from '../controllers/governance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// GET /world/continents — all continents
router.get('/continents', governanceController.getAllContinents.bind(governanceController));

// GET /world/governance-systems — all governance system types
router.get('/governance-systems', governanceController.getAllGovernanceSystems.bind(governanceController));

// GET /nations/:nationId/governance — nation governance details
router.get('/nations/:nationId/governance', authMiddleware, governanceController.getNationGovernance.bind(governanceController));

export default router;
