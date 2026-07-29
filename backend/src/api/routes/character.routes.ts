import { Router } from 'express';
import { CharacterController } from '../controllers/character.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/me', CharacterController.getMe);
router.post('/', CharacterController.createCharacter);
router.delete('/me', CharacterController.deleteMe);
router.post('/me/recalculate-net-worth', CharacterController.recalculateNetWorthHistory);

export default router;
