import { Request, Response, NextFunction } from 'express';
import { partyStaffService } from '../../services/party-staff.service';
import { ValidationError } from '../../utils/errors';

export class PartyStaffController {
  public async getStaffForParty(req: Request, res: Response, next: NextFunction) {
    try {
      const { nationId, partyId } = req.params;
      const result = await partyStaffService.getStaffForParty(partyId, nationId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async hireStaff(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { nationId, partyId } = req.params;
      const { role, seniority, name } = req.body;

      if (!role || !seniority) {
        throw new ValidationError('role and seniority are required');
      }

      const staff = await partyStaffService.hireStaff(req.user.id, partyId, nationId, { role, seniority, name });
      res.status(201).json({ staff });
    } catch (error) {
      next(error);
    }
  }

  public async fireStaff(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { nationId, partyId, staffId } = req.params;
      await partyStaffService.fireStaff(req.user.id, staffId, partyId, nationId);
      res.status(200).json({ message: 'Staff member dismissed' });
    } catch (error) {
      next(error);
    }
  }
}

export const partyStaffController = new PartyStaffController();
