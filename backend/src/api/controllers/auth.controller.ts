import { Request, Response, NextFunction } from 'express';
import { authService } from '../../services/auth.service';
import { db } from '../../config/database';

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { user } = await authService.register(email, password);
      res.status(201).json({
        message: 'Registration successful. A 6-digit verification code has been sent to your email.',
        user
      });
    } catch (error) {
      next(error);
    }
  }

  public async guestLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.guestLogin();

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        accessToken: result.accessToken,
        user: {
          ...result.user,
          role: result.user.role,
          character: null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const character = await db('characters').where({ user_id: result.user.id, status: 'active' }).first();
      
      const role = (result.user.email.toLowerCase() === 'kyxplayss@gmail.com' || result.user.email.toLowerCase() === 'infoforbiddengaming@gmail.com') ? 'admin' : result.user.role;

      res.status(200).json({
        accessToken: result.accessToken,
        user: {
          ...result.user,
          role,
          character: character || null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: 'Email and verification code are required' });
      await authService.verifyEmail(email, otp);
      res.status(200).json({ message: 'Email verified successfully. You may now log in.' });
    } catch (error) {
      next(error);
    }
  }

  public async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      await authService.resendVerification(email);
      res.status(200).json({ message: 'Verification email re-sent if the address is registered and unverified.' });
    } catch (error) {
      next(error);
    }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      await authService.forgotPassword(email);
      // Always return the same message whether the email exists or not (anti-enumeration)
      res.status(200).json({ message: 'If an account exists with that email, a reset link will be sent.' });
    } catch (error) {
      next(error);
    }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, token, password } = req.body;
      if (!email || !token || !password) {
        return res.status(400).json({ error: 'Email, token, and new password are required' });
      }
      await authService.resetPassword(email, token, password);
      res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken;
      if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required' });
      const result = await authService.refresh(refreshToken);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken;
      if (refreshToken) await authService.logout(refreshToken);
      res.clearCookie('refreshToken');
      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  public async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const user = await authService.getUserProfile(req.user.id);
      
      const character = await db('characters').where({ user_id: user.id, status: 'active' }).first();
      
      const role = (user.email.toLowerCase() === 'kyxplayss@gmail.com' || user.email.toLowerCase() === 'infoforbiddengaming@gmail.com') ? 'admin' : user.role;

      const safeUser = {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role,
        isAdmin: role === 'admin',
        character: character || null
      };

      res.status(200).json(safeUser);
    } catch (error) {
      next(error);
    }
  }
}
export const authController = new AuthController();
