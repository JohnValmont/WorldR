import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

const MAX_MESSAGE_LENGTH = 500;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MIN_SECONDS_BETWEEN_MESSAGES = 2;

export class ChatController {
  /**
   * GET /chat/messages?after=<id>&limit=<n>
   * - Without `after`: returns the latest N messages (ascending order).
   * - With `after`: returns only messages with id > after (incremental poll).
   */
  public static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const after = req.query.after ? Number(req.query.after) : null;
      let limit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
      if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
      if (limit > MAX_LIMIT) limit = MAX_LIMIT;

      const base = db('chat_messages as m')
        .join('characters as c', 'c.id', 'm.character_id')
        .select('m.id', 'm.character_id', 'c.name as character_name', 'm.body', 'm.created_at');

      let messages;
      if (after !== null && Number.isFinite(after)) {
        messages = await base.where('m.id', '>', after).orderBy('m.id', 'asc').limit(limit);
      } else {
        const latest = await base.orderBy('m.id', 'desc').limit(limit);
        messages = latest.reverse();
      }

      res.status(200).json({ messages });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /chat/messages { body }
   * Sends a message as the user's active character.
   */
  public static async postMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const rawBody = typeof req.body?.body === 'string' ? req.body.body : '';
      const body = rawBody.trim();
      if (!body) {
        return next(new AppError('Message cannot be empty', 400, 'BAD_REQUEST'));
      }
      if (body.length > MAX_MESSAGE_LENGTH) {
        return next(new AppError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`, 400, 'BAD_REQUEST'));
      }

      const character = await db('characters')
        .where({ user_id: userId, status: 'active' })
        .first();
      if (!character) {
        return next(new AppError('No active character found', 404, 'NOT_FOUND'));
      }

      // Simple anti-spam: minimum gap between messages per character
      const lastMessage = await db('chat_messages')
        .where({ character_id: character.id })
        .orderBy('id', 'desc')
        .first();
      if (lastMessage) {
        const elapsedMs = Date.now() - new Date(lastMessage.created_at).getTime();
        if (elapsedMs < MIN_SECONDS_BETWEEN_MESSAGES * 1000) {
          return next(new AppError('You are sending messages too quickly', 429, 'RATE_LIMITED'));
        }
      }

      const [inserted] = await db('chat_messages')
        .insert({ character_id: character.id, body })
        .returning(['id', 'character_id', 'body', 'created_at']);

      res.status(201).json({
        message: { ...inserted, character_name: character.name }
      });
    } catch (error) {
      next(error);
    }
  }
}
