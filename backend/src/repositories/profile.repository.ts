import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { PlayerProfile, IdeologyType } from '../types';

export class ProfileRepository extends BaseRepository {
  public async findByUserId(userId: string, trx?: Knex.Transaction): Promise<PlayerProfile | null> {
    const profile = await this.getDb(trx)('player_profiles').where({ user_id: userId }).first();
    return profile || null;
  }

  public async create(
    data: { user_id: string; display_name: string; bio?: string; ideology: IdeologyType; avatar_code?: string },
    trx?: Knex.Transaction
  ): Promise<PlayerProfile> {
    const [created] = await this.getDb(trx)('player_profiles').insert({
      user_id: data.user_id,
      display_name: data.display_name,
      bio: data.bio || null,
      ideology: data.ideology,
      avatar_code: data.avatar_code || 'default'
    }).returning('*');
    return created;
  }

  public async update(
    userId: string,
    data: Partial<Pick<PlayerProfile, 'display_name' | 'bio' | 'ideology' | 'avatar_code'>>,
    trx?: Knex.Transaction
  ): Promise<PlayerProfile> {
    const [updated] = await this.getDb(trx)('player_profiles')
      .where({ user_id: userId })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return updated;
  }
}

export const profileRepository = new ProfileRepository();
