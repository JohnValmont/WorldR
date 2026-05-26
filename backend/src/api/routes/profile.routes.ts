import { Router } from 'express';
import { z } from 'zod';
import { profileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

const ideologyEnum = z.enum([
  'far_left', 'left', 'centre_left', 'centrist',
  'centre_right', 'right', 'far_right',
  'libertarian', 'authoritarian', 'green', 'nationalist'
]);

const createProfileSchema = z.object({
  body: z.object({
    display_name: z.string().min(2).max(100),
    bio: z.string().max(300).optional(),
    ideology: ideologyEnum,
    avatar_code: z.string().optional()
  })
});

const updateProfileSchema = z.object({
  body: z.object({
    display_name: z.string().min(2).max(100).optional(),
    bio: z.string().max(300).optional(),
    ideology: ideologyEnum.optional(),
    avatar_code: z.string().optional()
  })
});

router.get('/', authMiddleware, profileController.getProfile);
router.post('/', authMiddleware, validate(createProfileSchema), profileController.createProfile);
router.patch('/', authMiddleware, validate(updateProfileSchema), profileController.updateProfile);

export default router;
