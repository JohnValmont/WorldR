import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { Notification, NotificationType, NotificationCategory } from '../types';

export class NotificationRepository extends BaseRepository {
  public async findByUserId(
    userId: string,
    limit = 50,
    trx?: Knex.Transaction
  ): Promise<Notification[]> {
    return this.getDb(trx)('notifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  public async countUnread(userId: string, trx?: Knex.Transaction): Promise<number> {
    const result = await this.getDb(trx)('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }

  public async create(
    data: {
      user_id: string;
      nation_id?: string | null;
      type: NotificationType;
      category: NotificationCategory;
      title: string;
      message: string;
      data?: Record<string, any> | null;
    },
    trx?: Knex.Transaction
  ): Promise<Notification> {
    const [created] = await this.getDb(trx)('notifications').insert({
      user_id: data.user_id,
      nation_id: data.nation_id ?? null,
      type: data.type,
      category: data.category,
      title: data.title,
      message: data.message,
      data: data.data ? JSON.stringify(data.data) : null,
      is_read: false
    }).returning('*');
    return created;
  }

  public async markRead(id: string, userId: string, trx?: Knex.Transaction): Promise<void> {
    await this.getDb(trx)('notifications')
      .where({ id, user_id: userId })
      .update({ is_read: true });
  }

  public async markAllRead(userId: string, trx?: Knex.Transaction): Promise<void> {
    await this.getDb(trx)('notifications')
      .where({ user_id: userId })
      .update({ is_read: true });
  }
}

export const notificationRepository = new NotificationRepository();
