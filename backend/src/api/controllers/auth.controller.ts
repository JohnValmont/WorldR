import { Request, Response, NextFunction } from 'express';
import { authService } from '../../services/auth.service';

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password } = req.body;
      const { user, verificationToken } = await authService.register(username, email, password);
      res.status(201).json({
        message: 'Registration successful. Check your email for the verification token.',
        user,
        // Return token in dev mode for easy testing; strip in production
        ...(process.env.NODE_ENV !== 'production' ? { verificationToken } : {})
      });
    } catch (error) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }

  public async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'Verification token is required' });
      await authService.verifyEmail(token);
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
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  public async updateNation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { nation_id } = req.body;
      const result = await authService.updateNation(req.user.id, nation_id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
export const authController = new AuthController();
