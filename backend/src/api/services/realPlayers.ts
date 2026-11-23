/**
 * Real players vs system accounts.
 *
 * Some characters belong to accounts nobody can log in to: the business
 * system account (system_npc@worldr.game, which owns "DRX Market Maker" and
 * the NPC companies) and any seeded NPC chairmen (<name>@npc.worldr.game).
 * They are not players. Every public list or count of players (World page
 * Operators, rich list, Corridors, influence ranking, citizens count) must
 * exclude them with this one rule, so the lists always agree.
 *
 * The query must join users; pass its alias (default 'u').
 */
import {
  NO_LOGIN_PASSWORD_HASH,
  NPC_EMAIL_DOMAIN_SUFFIX,
  SYSTEM_NPC_EMAIL,
} from '../constants/world';

/** Knex modifier: `.join('users as u', 'u.id', 'c.user_id').modify(whereRealUser)`. */
export function whereRealUser(qb: any, alias = 'u'): void {
  qb.whereNot(`${alias}.password_hash`, NO_LOGIN_PASSWORD_HASH)
    .whereNot(`${alias}.email`, SYSTEM_NPC_EMAIL)
    .whereRaw(`LOWER(${alias}.email) NOT LIKE ?`, [`%${NPC_EMAIL_DOMAIN_SUFFIX}`]);
}

/** The same rule for raw SQL: `AND ${sql}` with `bindings` spliced in at that spot. */
export function realUserSql(alias = 'u'): { sql: string; bindings: string[] } {
  return {
    sql: `${alias}.password_hash <> ? AND ${alias}.email <> ? AND LOWER(${alias}.email) NOT LIKE ?`,
    bindings: [NO_LOGIN_PASSWORD_HASH, SYSTEM_NPC_EMAIL, `%${NPC_EMAIL_DOMAIN_SUFFIX}`],
  };
}
