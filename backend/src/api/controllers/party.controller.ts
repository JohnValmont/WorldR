import { Request, Response, NextFunction } from 'express';
import { partyService } from '../../services/party.service';
import { UnauthorizedError, ValidationError } from '../../utils/errors';
import { IdeologyType } from '../../types';

export class PartyController {
  public async getParties(req: Request, res: Response, next: NextFunction) {
    try {
      const nationId = req.params.nationId || req.params.nation_id;
      const parties = await partyService.getPartiesForNation(nationId);
      res.status(200).json({ parties });
    } catch (error) {
      next(error);
    }
  }

  public async getPartyDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const partyId = req.params.partyId || req.params.party_id;
      const result = await partyService.getPartyDetails(partyId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getMyParty(req: Request, res: Response, next: NextFunction) {
    try {
      const nationId = req.params.nationId || req.params.nation_id;
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await partyService.getUserParty(req.user.id, nationId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async createParty(req: Request, res: Response, next: NextFunction) {
    try {
      const nationId = req.params.nationId || req.params.nation_id;
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { name, abbreviation, ideology, description, color } = req.body;
      const party = await partyService.createParty(req.user.id, nationId, {
        name,
        abbreviation,
        ideology: ideology as IdeologyType,
        description,
        color
      });

      res.status(201).json({ message: 'Party created successfully', party });
    } catch (error) {
      next(error);
    }
  }

  public async joinParty(req: Request, res: Response, next: NextFunction) {
    try {
      const nationId = req.params.nationId || req.params.nation_id;
      const partyId = req.params.partyId || req.params.party_id;
      if (!req.user) throw new UnauthorizedError('Authentication required');

      await partyService.joinParty(req.user.id, partyId, nationId);
      res.status(200).json({ message: 'Joined party successfully' });
    } catch (error) {
      next(error);
    }
  }

  public async leaveParty(req: Request, res: Response, next: NextFunction) {
    try {
      const nationId = req.params.nationId || req.params.nation_id;
      if (!req.user) throw new UnauthorizedError('Authentication required');

      await partyService.leaveParty(req.user.id, nationId);
      res.status(200).json({ message: 'Left party successfully' });
    } catch (error) {
      next(error);
    }
  }
}
export const partyController = new PartyController();
