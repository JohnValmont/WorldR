import { Router } from 'express';
import { partyStaffController } from '../controllers/party-staff.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

// GET /nations/:nationId/parties/:partyId/staff
router.get('/', authMiddleware, partyStaffController.getStaffForParty.bind(partyStaffController));

// POST /nations/:nationId/parties/:partyId/staff — hire staff
router.post('/', authMiddleware, partyStaffController.hireStaff.bind(partyStaffController));

// DELETE /nations/:nationId/parties/:partyId/staff/:staffId — fire staff
router.delete('/:staffId', authMiddleware, partyStaffController.fireStaff.bind(partyStaffController));

export default router;
