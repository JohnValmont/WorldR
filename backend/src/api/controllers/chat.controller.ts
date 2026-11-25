import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { NATIONS_BY_COUNTRY } from '../constants/nations';
import {
  CHAT_DEFAULT_LIMIT, CHAT_MAX_LIMIT, CHAT_MAX_MESSAGE_LENGTH, CHAT_REPORT_REASON_MAX_LENGTH,
} from '../constants/chat';
import { canSeeMessage, isMuted, muteHours, rateLimitReason, shouldAutoHide } from '../services/chat.rules';

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

/** Every stored room name this character may read (for report checks). */
async function readableRooms(character: any): Promise<string[]> {
  const rooms = ['world'];
  const code = NATIONS_BY_COUNTRY[character.motherland_country_id]?.polStateCode;
  if (code) rooms.push(`nation:${code}`);
  const m = await db('pol_party_members').where({ character_id: character.id }).first();
  if (m) rooms.push(`party:${m.party_id}`);
  return rooms;
}

async function activeCharacter(userId: number | string | undefined) {
  if (!userId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
  if (!character) throw new AppError('No active character found', 404, 'NOT_FOUND');
  return character;
}

function muteMessage(until: Date | string): string {
  return `You are muted in chat until ${new Date(until).toUTCString().replace(' GMT', ' UTC')}. You can still read.`;
}

export class ChatController {
  /**
   * GET /chat/messages?after=<id>&limit=<n>
   * - Without `after`: returns the latest N messages (ascending order).
   * - With `after`: returns only messages with id > after (incremental poll).
   * Hidden (moderated) messages are never served. `me` tells the screen who is
   * reading, whether they may moderate and whether they are muted.
   */
  public static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await activeCharacter(req.user?.id);

      const after = req.query.after ? Number(req.query.after) : null;
      let limit = req.query.limit ? Number(req.query.limit) : CHAT_DEFAULT_LIMIT;
      if (!Number.isFinite(limit) || limit < 1) limit = CHAT_DEFAULT_LIMIT;
      if (limit > CHAT_MAX_LIMIT) limit = CHAT_MAX_LIMIT;

      const channel = await resolveChannel(character, req.query.channel);
      const withId = typeof req.query.with === 'string' && /^[0-9a-f-]{36}$/i.test(req.query.with) ? req.query.with : null;

      const base = db('chat_messages as m')
        .join('characters as c', 'c.id', 'm.character_id')
        .leftJoin('characters as t', 't.id', 'm.target_character_id')
        .whereNull('m.hidden_at')
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

      const [messages, user] = await Promise.all([
        (async () => {
          if (after !== null && Number.isFinite(after)) {
            return base.where('m.id', '>', after).orderBy('m.id', 'asc').limit(limit);
          }
          const latest = await base.orderBy('m.id', 'desc').limit(limit);
          return latest.reverse();
        })(),
        db('users').where({ id: character.user_id }).first('role', 'chat_muted_until'),
      ]);

      const mutedUntil = isMuted(user?.chat_muted_until) ? new Date(user.chat_muted_until).toISOString() : null;
      res.status(200).json({
        messages,
        me: { characterId: character.id, canModerate: user?.role === 'admin', mutedUntil },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /chat/messages { body, channel, target_character_id }
   */
  public static async postMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const rawBody = typeof req.body?.body === 'string' ? req.body.body : '';
      const body = rawBody.trim();
      const requestedChannel = req.body?.channel;
      const targetCharacterId = req.body?.target_character_id || null;

      if (!body) {
        return next(new AppError('Message cannot be empty', 400, 'BAD_REQUEST'));
      }
      if (body.length > CHAT_MAX_MESSAGE_LENGTH) {
        return next(new AppError(`Message too long (max ${CHAT_MAX_MESSAGE_LENGTH} characters)`, 400, 'BAD_REQUEST'));
      }

      const character = await activeCharacter(req.user?.id);

      const user = await db('users').where({ id: character.user_id }).first('chat_muted_until');
      if (isMuted(user?.chat_muted_until)) {
        return next(new AppError(muteMessage(user.chat_muted_until), 403, 'CHAT_MUTED'));
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

      const recent = await db('chat_messages')
        .where({ character_id: character.id })
        .where('created_at', '>', new Date(Date.now() - 60_000))
        .pluck('created_at');
      const wait = rateLimitReason(recent);
      if (wait) {
        return next(new AppError(wait, 429, 'RATE_LIMITED'));
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

  /**
   * POST /chat/messages/:id/report { reason? }
   * Any player who can see a message (not their own) may report it once.
   * Enough different reporters hide it automatically until an admin decides.
   */
  public static async reportMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await activeCharacter(req.user?.id);
      const messageId = Number(req.params.id);
      if (!Number.isInteger(messageId) || messageId <= 0) throw new AppError('Unknown message.', 404, 'NOT_FOUND');
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, CHAT_REPORT_REASON_MAX_LENGTH) : null;

      const result = await db.transaction(async (trx) => {
        const msg = await trx('chat_messages').where({ id: messageId }).forUpdate().first();
        if (!msg || msg.hidden_at) throw new AppError('Unknown message.', 404, 'NOT_FOUND');
        if (msg.character_id === character.id) throw new AppError('You cannot report your own message.', 400, 'BAD_REQUEST');
        if (!canSeeMessage(msg, { characterId: character.id, rooms: await readableRooms(character) })) {
          throw new AppError('Unknown message.', 404, 'NOT_FOUND');
        }

        await trx('chat_reports')
          .insert({ message_id: messageId, reporter_character_id: character.id, reason: reason || null })
          .onConflict(['message_id', 'reporter_character_id']).ignore();

        const [{ n }] = await trx('chat_reports')
          .where({ message_id: messageId }).whereNull('resolved_at')
          .countDistinct({ n: 'reporter_character_id' });
        const hidden = shouldAutoHide(Number(n));
        if (hidden) {
          await trx('chat_messages').where({ id: messageId }).update({ hidden_at: trx.fn.now(), hidden_reason: 'reports' });
        }
        return { hidden };
      });

      res.status(200).json({ reported: true, hidden: result.hidden });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /chat/reports (admin): messages with open reports, newest first,
   * including ones already hidden automatically.
   */
  public static async listReports(_req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await db('chat_reports as r')
        .join('chat_messages as m', 'm.id', 'r.message_id')
        .join('characters as c', 'c.id', 'm.character_id')
        .whereNull('r.resolved_at')
        .groupBy('m.id', 'c.id')
        .select(
          'm.id as message_id', 'm.body', 'm.channel', 'm.created_at', 'm.hidden_at', 'm.hidden_reason',
          'c.id as author_character_id', 'c.name as author_name', 'c.user_id as author_user_id',
          db.raw('COUNT(DISTINCT r.reporter_character_id)::int AS reports'),
          db.raw("STRING_AGG(DISTINCT NULLIF(r.reason, ''), ' | ') AS reasons"),
          db.raw('MAX(r.created_at) AS last_reported_at'),
        )
        .orderBy('last_reported_at', 'desc')
        .limit(100);
      const muted = await db('users').whereIn('id', rows.map((r: any) => r.author_user_id)).select('id', 'chat_muted_until');
      const mutedMap = new Map(muted.map((u: any) => [String(u.id), isMuted(u.chat_muted_until) ? u.chat_muted_until : null]));
      res.status(200).json({
        reports: rows.map(({ author_user_id, ...r }: any) => ({ ...r, author_muted_until: mutedMap.get(String(author_user_id)) ?? null })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /chat/messages/:id/moderate (admin) { action: 'hide' | 'restore' | 'dismiss' }
   * hide: the message disappears for everyone; restore: it comes back;
   * dismiss: reports are closed and the message stays (or comes back if reports hid it).
   */
  public static async moderateMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const messageId = Number(req.params.id);
      const action = req.body?.action;
      if (!Number.isInteger(messageId) || messageId <= 0) throw new AppError('Unknown message.', 404, 'NOT_FOUND');
      if (!['hide', 'restore', 'dismiss'].includes(action)) throw new AppError('Action must be hide, restore or dismiss.', 400, 'BAD_REQUEST');

      await db.transaction(async (trx) => {
        const msg = await trx('chat_messages').where({ id: messageId }).forUpdate().first();
        if (!msg) throw new AppError('Unknown message.', 404, 'NOT_FOUND');
        if (action === 'hide') {
          await trx('chat_messages').where({ id: messageId }).update({ hidden_at: trx.fn.now(), hidden_reason: 'admin' });
        } else {
          await trx('chat_messages').where({ id: messageId }).update({ hidden_at: null, hidden_reason: null });
        }
        await trx('chat_reports').where({ message_id: messageId }).whereNull('resolved_at')
          .update({ resolved_at: trx.fn.now(), resolution: action === 'hide' ? 'hidden' : 'dismissed' });
      });
      res.status(200).json({ ok: true, action });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /chat/characters/:characterId/mute (admin) { hours?, reason? } — hours 0 lifts the mute.
   * The mute is on the player's account, so a new character does not escape it.
   */
  public static async muteCharacter(req: Request, res: Response, next: NextFunction) {
    try {
      const target = await db('characters').where({ id: String(req.params.characterId) }).first();
      if (!target) throw new AppError('Unknown player.', 404, 'NOT_FOUND');
      const targetUser = await db('users').where({ id: target.user_id }).first('id', 'role');
      if (!targetUser) throw new AppError('Unknown player.', 404, 'NOT_FOUND');
      if (targetUser.role === 'admin') throw new AppError('Admins cannot be muted.', 400, 'BAD_REQUEST');

      const lift = Number(req.body?.hours) === 0;
      const hours = muteHours(req.body?.hours);
      const until = lift ? null : new Date(Date.now() + hours * 3_600_000);
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, CHAT_REPORT_REASON_MAX_LENGTH) : null;
      await db('users').where({ id: targetUser.id }).update({ chat_muted_until: until, chat_mute_reason: lift ? null : reason });
      res.status(200).json({ ok: true, mutedUntil: until ? until.toISOString() : null, name: target.name });
    } catch (error) {
      next(error);
    }
  }
}
