import { Router } from 'express';
import { BankController } from '../controllers/bank.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/dossier/personal', BankController.getPersonalCreditDossier);
router.post('/loan/personal/take', BankController.takePersonalLoan);
router.get('/dossier/:companyId', BankController.getCreditDossier);
router.post('/loan/:companyId/take', BankController.takeLoan);
router.get('/institution/:bankId', BankController.getInstitutionData);

export default router;
