import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { NATIONS_BY_COUNTRY } from '../constants/nations';

/**
 * Channels: 'world' (everyone), 'private' (direct messages), and two politics
 * rooms the server resolves from who you are: 'nation' (citizens of your
 * nation only) and 'party' (members of your party only). Any other channel
 * name is refused, so nobody can read a room by guessing its name.
 */
async function resolveChannel(character: any, requested: unknown): Promise<string> {
  const ch = typeof requested === 'string' ? requested : 'world';
  if (ch === 'world' || ch === 'private') return ch;
  if (ch === 'nation') {
    const code = NATIONS_BY_COUNTRY[character.motherland_country_id]?.polStateCode;
    if (!code) throw new AppError('Your nation has no chamber yet.', 404, 'NOT_FOUND');
    return `nation:${code}`;
  }
  if (ch === 'party') {
    const m = await db('pol_party_members').where({ character_id: character.id }).first();
    if (!m) throw new AppError('Join a party to use its room.', 403, 'FORBIDDEN');
    return `party:${m.party_id}`;
  }
  throw new AppError('Unknown channel.', 400, 'BAD_REQUEST');
}

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
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const character = await db('characters')
        .where({ user_id: userId, status: 'active' })
        .first();
      if (!character) {
        return next(new AppError('No active character found', 404, 'NOT_FOUND'));
      }

      const after = req.query.after ? Number(req.query.after) : null;
      let limit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
      if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
      if (limit > MAX_LIMIT) limit = MAX_LIMIT;

      const channel = await resolveChannel(character, req.query.channel);
      const withId = typeof req.query.with === 'string' && /^[0-9a-f-]{36}$/i.test(req.query.with) ? req.query.with : null;

      const base = db('chat_messages as m')
        .join('characters as c', 'c.id', 'm.character_id')
        .leftJoin('characters as t', 't.id', 'm.target_character_id')
        .select(
          'm.id', 
          'm.character_id', 
          'c.name as character_name', 
          'm.target_character_id',
          't.name as target_character_name',
          'm.body', 
          'm.channel',
          'm.created_at'
        );

      if (channel === 'private') {
        base.where('m.channel', 'private')
            .andWhere(function() {
              if (withId) {
                this.where(q => q.where('m.character_id', character.id).andWhere('m.target_character_id', withId))
                    .orWhere(q => q.where('m.character_id', withId).andWhere('m.target_character_id', character.id));
              } else {
                this.where('m.character_id', character.id)
                    .orWhere('m.target_character_id', character.id);
              }
            });
      } else {
        base.where('m.channel', channel);
      }

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
   * POST /chat/messages { body, channel, target_character_id }
   */
  public static async postMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const rawBody = typeof req.body?.body === 'string' ? req.body.body : '';
      const body = rawBody.trim();
      const requestedChannel = req.body?.channel;
      const targetCharacterId = req.body?.target_character_id || null;

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

      const channel = await resolveChannel(character, requestedChannel);
      if (channel === 'private') {
        if (!targetCharacterId) {
          return next(new AppError('Target character required for private message', 400, 'BAD_REQUEST'));
        }
        if (targetCharacterId === character.id) {
          return next(new AppError('Cannot message yourself', 400, 'BAD_REQUEST'));
        }
      }

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
        .insert({ 
          character_id: character.id, 
          body,
          channel,
          target_character_id: targetCharacterId
        })
        .returning(['id', 'character_id', 'target_character_id', 'body', 'channel', 'created_at']);

      let targetCharacterName = null;
      if (targetCharacterId) {
        const target = await db('characters').where({ id: targetCharacterId }).first();
        if (target) targetCharacterName = target.name;
      }

      res.status(201).json({
        message: { 
          ...inserted, 
          character_name: character.name,
          target_character_name: targetCharacterName
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
