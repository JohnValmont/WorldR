import { Router } from 'express';
import { InvestmentsController } from '../controllers/investments.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Loans
router.get('/loan-offers', InvestmentsController.loanOffers);
router.post('/loan-offers', InvestmentsController.createLoanOffer);
router.delete('/loan-offers/:offerId', InvestmentsController.cancelLoanOffer);
router.post('/loan-offers/:offerId/accept', InvestmentsController.acceptLoanOffer);
router.post('/loans/:loanId/repay', InvestmentsController.repayLoan);
router.get('/my-loans', InvestmentsController.myLoans);

// Private equity placements
router.get('/placements', InvestmentsController.placements);
router.get('/my-placements', InvestmentsController.myPlacements);
router.post('/placements', InvestmentsController.createPlacement);
router.delete('/placements/:placementId', InvestmentsController.cancelPlacement);
router.post('/placements/:placementId/accept', InvestmentsController.acceptPlacement);

export default router;
