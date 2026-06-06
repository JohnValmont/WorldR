import { Router } from 'express';
import { ManufacturingController } from '../controllers/manufacturing.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public bootstrap — vehicle classes, factory types, component options
router.get('/bootstrap', ManufacturingController.getBootstrap);

// Company-scoped manufacturing routes (auth required)
router.get('/companies/:companyId/manufacturing/data', authMiddleware, ManufacturingController.getCompanyManufacturingData);
router.post('/companies/:companyId/manufacturing/factories/lease', authMiddleware, ManufacturingController.leaseFactory);
router.post('/companies/:companyId/manufacturing/models', authMiddleware, ManufacturingController.createVehicleModel);
router.patch('/companies/:companyId/manufacturing/models/:modelId/price', authMiddleware, ManufacturingController.updateModelPrice);
router.post('/companies/:companyId/manufacturing/production/save-plan', authMiddleware, ManufacturingController.saveProductionPlan);
router.post('/companies/:companyId/manufacturing/staff/hire', authMiddleware, ManufacturingController.hireStaff);
router.post('/companies/:companyId/manufacturing/staff/fire', authMiddleware, ManufacturingController.fireStaff);

// Admin-only: process manufacturing arc
router.post('/admin/manufacturing/process-company/:companyId', [authMiddleware, requireAdmin], ManufacturingController.processManufacturingArc);

export default router;
