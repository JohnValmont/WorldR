import { Router } from 'express';
import { ManufacturingController } from '../controllers/manufacturing.controller';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public bootstrap — vehicle classes, factory types, component options
router.get('/manufacturing/bootstrap', ManufacturingController.getBootstrap);

// Company-scoped manufacturing routes (auth required)
router.get('/companies/:companyId/manufacturing/data', authMiddleware, ManufacturingController.getCompanyManufacturingData);
router.post('/companies/:companyId/manufacturing/components/procure', authMiddleware, ManufacturingController.procureComponents);
router.post('/companies/:companyId/manufacturing/licenses', authMiddleware, ManufacturingController.purchaseLicense);
router.post('/companies/:companyId/manufacturing/land', authMiddleware, ManufacturingController.purchaseLand);
router.post('/companies/:companyId/manufacturing/factories/construct', authMiddleware, ManufacturingController.constructFactory);
router.post('/companies/:companyId/manufacturing/factories/:factoryId/production-lines/construct', authMiddleware, ManufacturingController.constructProductionLine);
router.delete('/companies/:companyId/manufacturing/land/:landPlotId', authMiddleware, ManufacturingController.sellLand);
router.delete('/companies/:companyId/manufacturing/factories/:factoryId', authMiddleware, ManufacturingController.scrapFactory);
router.delete('/companies/:companyId/manufacturing/production/lines/:lineId', authMiddleware, ManufacturingController.scrapProductionLine);

router.post('/companies/:companyId/manufacturing/models', authMiddleware, ManufacturingController.createVehicleModel);
router.post('/companies/:companyId/manufacturing/models/:modelId/launch', authMiddleware, ManufacturingController.launchVehicleModel);
router.patch('/companies/:companyId/manufacturing/models/:modelId/price', authMiddleware, ManufacturingController.updateModelPrice);
router.post('/companies/:companyId/manufacturing/models/:modelId/facelift', authMiddleware, ManufacturingController.createFacelift);
router.post('/companies/:companyId/manufacturing/models/:modelId/discontinue', authMiddleware, ManufacturingController.discontinueModel);
router.get('/companies/:companyId/manufacturing/models/snapshots', authMiddleware, ManufacturingController.getModelSnapshots);
router.post('/companies/:companyId/manufacturing/production/save-plan', authMiddleware, ManufacturingController.saveProductionPlan);
router.post('/companies/:companyId/manufacturing/staff/hire', authMiddleware, ManufacturingController.hireStaff);
router.post('/companies/:companyId/manufacturing/staff/fire', authMiddleware, ManufacturingController.fireStaff);
router.post('/companies/:companyId/manufacturing/programmes/start', authMiddleware, ManufacturingController.startEngineeringProgramme);

router.patch('/companies/:companyId/manufacturing/production/lines/:lineId/pause', authMiddleware, ManufacturingController.pauseProductionLine);
router.patch('/companies/:companyId/manufacturing/production/lines/:lineId/resume', authMiddleware, ManufacturingController.resumeProductionLine);
router.post('/companies/:companyId/manufacturing/factories/:factoryId/expand', authMiddleware, ManufacturingController.startFactoryExpansion);
router.post('/companies/:companyId/manufacturing/factories/:factoryId/recover-condition', authMiddleware, ManufacturingController.recoverFactoryCondition);
router.post('/companies/:companyId/manufacturing/factories/:factoryId/toggle-auto-recovery', authMiddleware, ManufacturingController.toggleFactoryAutoRecovery);

// Market & Sales routes
router.get('/companies/:companyId/manufacturing/markets', authMiddleware, ManufacturingController.getMarkets);
router.get('/companies/:companyId/manufacturing/analytics', authMiddleware, AnalyticsController.getSelfAnalytics);
router.post('/companies/:companyId/manufacturing/research', authMiddleware, AnalyticsController.purchaseMarketResearch);
router.get('/market/structure/:countryId/last-month', authMiddleware, AnalyticsController.getMarketStructure);
router.post('/companies/:companyId/manufacturing/markets/allocate', authMiddleware, ManufacturingController.setAllocation);
router.delete('/companies/:companyId/manufacturing/markets/allocations/:allocId', authMiddleware, ManufacturingController.removeAllocation);
router.patch('/companies/:companyId/manufacturing/markets/:marketId/marketing', authMiddleware, ManufacturingController.setMarketingTier);

// Admin-only: process manufacturing month
router.post('/admin/manufacturing/process-company/:companyId', [authMiddleware, requireAdmin], ManufacturingController.processManufacturingArc);

// Phase 3: Engineering Report & Knowledge
router.get('/companies/:companyId/manufacturing/models/:modelId/engineering-report', authMiddleware, ManufacturingController.getEngineeringReport);
router.get('/companies/:companyId/manufacturing/knowledge', authMiddleware, ManufacturingController.getCompanyKnowledge);

export default router;
