import { Router } from 'express';
import { LogisticsController } from '../controllers/logistics.controller';
import { authMiddleware, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/procurement', LogisticsController.getProcurement);
router.get('/company/:companyId', authMiddleware, LogisticsController.getCompanyLogistics);
router.post('/company/:companyId/staff/hire', authMiddleware, LogisticsController.hireStaff);
router.post('/company/:companyId/staff/fire', authMiddleware, LogisticsController.fireStaff);
router.post('/company/:companyId/vehicles/purchase', authMiddleware, LogisticsController.purchaseVehicle);
router.post('/company/:companyId/vehicles/:vehicleId/maintenance', authMiddleware, LogisticsController.performMaintenance);
router.post('/company/:companyId/facilities/lease', authMiddleware, LogisticsController.leaseFacility);
router.post('/company/:companyId/operations/assign', authMiddleware, LogisticsController.assignOperation);
router.post('/company/:companyId/operations/process-test', [authMiddleware, requireAdmin], LogisticsController.processTest);
router.post('/company/:companyId/contracts/:contractId/assign', authMiddleware, LogisticsController.assignVehicleToContract);
router.post('/company/:companyId/contracts/:contractId/accept', authMiddleware, LogisticsController.acceptDirectContract);
router.post('/company/:companyId/contracts/:contractId/resolve', authMiddleware, LogisticsController.resolveContract);

export default router;
