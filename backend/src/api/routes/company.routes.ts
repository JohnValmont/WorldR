import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/my', CompanyController.getMyCompanies);
router.post('/', CompanyController.createCompany);
router.get('/:id', CompanyController.getCompany);
router.post('/:id/withdraw-capital', CompanyController.withdrawCapital);
router.patch('/:id/finances', CompanyController.updateFinances);

export default router;
