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
    email: z.string().email(),
    otp: z.string().length(6).regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
  })
});

const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    token: z.string().min(1),
    password: z.string().min(6)
  })
});

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/refresh-token', validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/verify', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
