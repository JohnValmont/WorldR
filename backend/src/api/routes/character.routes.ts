import { Router } from 'express';
import { CharacterController } from '../controllers/character.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/me', CharacterController.getMe);
router.post('/', CharacterController.createCharacter);

export default router;
