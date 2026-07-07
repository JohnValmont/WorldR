import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/my', CompanyController.getMyCompanies);
router.get('/structures', CompanyController.getStructures);
router.post('/', CompanyController.createCompany);
router.get('/:id', CompanyController.getCompany);
router.post('/:id/inject-capital', CompanyController.injectCapital);
router.post('/:id/issue-shares', CompanyController.issueShares);
router.post('/:id/withdraw-capital', CompanyController.withdrawCapital);
router.patch('/:id/finances', CompanyController.updateFinances);
router.post('/:id/convert-structure', CompanyController.convertStructure);
router.put('/:id/dividend-policy', CompanyController.setDividendPolicy);
router.get('/:id/cap-table', CompanyController.getCapTable);

export default router;
