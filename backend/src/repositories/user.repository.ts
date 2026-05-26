import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { User } from '../types';

export class UserRepository extends BaseRepository {
  public async findById(id: string, trx?: Knex.Transaction): Promise<User | null> {
    const user = await this.getDb(trx)('users').where({ id }).first();
    return user || null;
  }

  public async findByUsername(username: string, trx?: Knex.Transaction): Promise<User | null> {
    const user = await this.getDb(trx)('users')
      .whereRaw('LOWER(username) = LOWER(?)', [username])
      .first();
    return user || null;
  }

  public async findByEmail(email: string, trx?: Knex.Transaction): Promise<User | null> {
    const user = await this.getDb(trx)('users')
      .whereRaw('LOWER(email) = LOWER(?)', [email])
      .first();
    return user || null;
  }

  public async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>, trx?: Knex.Transaction): Promise<User> {
    const [created] = await this.getDb(trx)('users').insert(user).returning('*');
    return created;
  }

  public async updateNationId(userId: string, nationId: string | null, trx?: Knex.Transaction): Promise<void> {
    await this.getDb(trx)('users').where({ id: userId }).update({ nation_id: nationId, updated_at: new Date() });
  }

  public async markVerified(userId: string, trx?: Knex.Transaction): Promise<void> {
    await this.getDb(trx)('users').where({ id: userId }).update({ is_verified: true, updated_at: new Date() });
  }
}
export const userRepository = new UserRepository();
