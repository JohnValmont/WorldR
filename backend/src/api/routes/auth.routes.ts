import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(6)
  })
});

const loginSchema = z.object({
  body: z.object({
    username: z.string(),
    password: z.string()
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string()
  })
});

const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1)
  })
});

const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

const updateNationSchema = z.object({
  body: z.object({
    nation_id: z.string().uuid()
  })
});

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/refresh-token', validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.patch('/nation', authMiddleware, validate(updateNationSchema), authController.updateNation);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/verify', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);

export default router;
