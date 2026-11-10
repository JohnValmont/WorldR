import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../utils/errors';
import { userRepository } from '../../repositories/user.repository';
import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import { LAST_SEEN_UPDATE_INTERVAL_MS } from '../constants/world';

/**
 * Record player activity for "active players" stats. Throttled so a busy
 * player costs at most one tiny UPDATE every few minutes, and fire-and-forget
 * so it can never slow down or fail the actual request.
 */
function touchLastSeen(userId: number, lastSeenAt: Date | string | null | undefined): void {
  const last = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  if (Date.now() - last < LAST_SEEN_UPDATE_INTERVAL_MS) return;
  db('users')
    .where({ id: userId })
    .update({ last_seen_at: db.fn.now() })
    .catch(err => logger.warn('[auth] last_seen_at update skipped:', err?.message));
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      id: number;
      email: string;
      role: 'user' | 'admin' | 'moderator';
      is_verified: boolean;
    };

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return next(new UnauthorizedError('User account not found'));
    }

    // The database role is the single source of truth (see ADMIN_EMAILS in env.ts).
    req.user = {
      ...decoded,
      role: user.role,
    };
    touchLastSeen(user.id, (user as any).last_seen_at);
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

export const requireAdmin = requireRole(['admin']);
