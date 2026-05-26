import { Request, Response, NextFunction } from 'express';
import { voterBlocService } from '../../services/voter-bloc.service';

export class VoterBlocController {
  public async getBlocsForNation(req: Request, res: Response, next: NextFunction) {
    try {
      const { nationId } = req.params;
      const result = await voterBlocService.getBlocsForNation(nationId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const voterBlocController = new VoterBlocController();
