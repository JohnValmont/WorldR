import { Request, Response, NextFunction } from 'express';
import { multiplayerService } from '../../services/multiplayer.service';
import { UnauthorizedError } from '../../utils/errors';

export class MultiplayerController {
  private validateNationAccess(req: Request, nationId: string): void {
    if (req.user?.role !== 'admin' && req.user?.nation_id !== nationId) {
      throw new UnauthorizedError('Access denied: You do not belong to this nation');
    }
  }

  public async getCabinet(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      this.validateNationAccess(req, nation_id);

      const cabinet = await multiplayerService.getCabinet(nation_id);
      res.status(200).json(cabinet);
    } catch (error) {
      next(error);
    }
  }

  public async assignCabinetRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const { targetUserId, role } = req.body;
      const assignerId = req.user?.id;

      if (!assignerId) {
        throw new UnauthorizedError('Authentication required');
      }
      this.validateNationAccess(req, nation_id);

      await multiplayerService.assignRole(nation_id, assignerId, targetUserId, role);
      res.status(200).json({ message: 'Role assigned successfully' });
    } catch (error) {
      next(error);
    }
  }

  public async getActiveProposals(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      this.validateNationAccess(req, nation_id);

      const proposals = await multiplayerService.getActiveProposals(nation_id);
      res.status(200).json(proposals);
    } catch (error) {
      next(error);
    }
  }

  public async createProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const { type, details, title, timeoutMs } = req.body;
      const proposerId = req.user?.id;

      if (!proposerId) {
        throw new UnauthorizedError('Authentication required');
      }
      this.validateNationAccess(req, nation_id);

      const proposal = await multiplayerService.createProposal(
        nation_id,
        proposerId,
        type,
        details,
        title,
        timeoutMs
      );
      res.status(201).json(proposal);
    } catch (error) {
      next(error);
    }
  }

  public async castVote(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id, proposal_id } = req.params;
      const { option } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }
      this.validateNationAccess(req, nation_id);

      const result = await multiplayerService.castVote(nation_id, userId, proposal_id, option);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getActiveNegotiations(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      this.validateNationAccess(req, nation_id);

      const negotiations = await multiplayerService.getActiveNegotiations(nation_id);
      res.status(200).json(negotiations);
    } catch (error) {
      next(error);
    }
  }

  public async createNegotiation(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id } = req.params;
      const { receiverId, terms } = req.body;
      const senderId = req.user?.id;

      if (!senderId) {
        throw new UnauthorizedError('Authentication required');
      }
      this.validateNationAccess(req, nation_id);

      const negotiation = await multiplayerService.createNegotiation(
        nation_id,
        senderId,
        receiverId,
        terms
      );
      res.status(201).json(negotiation);
    } catch (error) {
      next(error);
    }
  }

  public async respondToNegotiation(req: Request, res: Response, next: NextFunction) {
    try {
      const { nation_id, negotiation_id } = req.params;
      const { status } = req.body;
      const receiverId = req.user?.id;

      if (!receiverId) {
        throw new UnauthorizedError('Authentication required');
      }
      this.validateNationAccess(req, nation_id);

      const result = await multiplayerService.respondToNegotiation(
        nation_id,
        receiverId,
        negotiation_id,
        status
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const multiplayerController = new MultiplayerController();
