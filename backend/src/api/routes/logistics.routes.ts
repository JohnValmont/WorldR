import { Router } from 'express';
import { LogisticsController } from '../controllers/logistics.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/procurement', LogisticsController.getProcurement);
router.get('/company/:companyId', authMiddleware, LogisticsController.getCompanyLogistics);
router.post('/company/:companyId/staff/hire', authMiddleware, LogisticsController.hireStaff);
router.post('/company/:companyId/staff/fire', authMiddleware, LogisticsController.fireStaff);
router.post('/company/:companyId/vehicles/purchase', authMiddleware, LogisticsController.purchaseVehicle);
router.post('/company/:companyId/facilities/lease', authMiddleware, LogisticsController.leaseFacility);
router.post('/company/:companyId/operations/assign', authMiddleware, LogisticsController.assignOperation);
router.post('/company/:companyId/operations/process-test', [authMiddleware, requireAdmin], LogisticsController.processTest);

export default router;
