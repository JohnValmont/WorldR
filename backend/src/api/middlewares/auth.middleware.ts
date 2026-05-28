import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../utils/errors';
import { userRepository } from '../../repositories/user.repository';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      id: string;
      username: string;
      email: string;
      role: 'user' | 'admin' | 'moderator';
      is_verified: boolean;
    };

    const user = await userRepository.findById(decoded.id);
    req.user = {
      ...decoded,
      role: user ? user.role : decoded.role
    };
    next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired authentication token'));
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Unauthorized access'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permission privileges', code: 'FORBIDDEN' });
    }

    next();
  };
}
