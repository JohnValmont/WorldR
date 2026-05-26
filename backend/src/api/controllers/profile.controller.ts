import { Request, Response, NextFunction } from 'express';
import { profileRepository } from '../../repositories/profile.repository';
import { UnauthorizedError, NotFoundError, ConflictError } from '../../utils/errors';
import { IdeologyType } from '../../types';

export class ProfileController {
  public async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const profile = await profileRepository.findByUserId(req.user.id);
      if (!profile) throw new NotFoundError('Profile not found. Complete onboarding to create one.');
      res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  }

  public async createProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const existing = await profileRepository.findByUserId(req.user.id);
      if (existing) throw new ConflictError('Profile already exists. Use PATCH to update.');

      const { display_name, bio, ideology, avatar_code } = req.body;
      const profile = await profileRepository.create({
        user_id: req.user.id,
        display_name,
        bio,
        ideology: ideology as IdeologyType,
        avatar_code
      });

      res.status(201).json({ message: 'Profile created', profile });
    } catch (error) {
      next(error);
    }
  }

  public async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { display_name, bio, ideology, avatar_code } = req.body;
      const profile = await profileRepository.update(req.user.id, {
        ...(display_name !== undefined && { display_name }),
        ...(bio !== undefined && { bio }),
        ...(ideology !== undefined && { ideology: ideology as IdeologyType }),
        ...(avatar_code !== undefined && { avatar_code })
      });
      res.status(200).json({ message: 'Profile updated', profile });
    } catch (error) {
      next(error);
    }
  }
}
export const profileController = new ProfileController();
