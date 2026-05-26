import { Request, Response, NextFunction } from 'express';
import { notificationRepository } from '../../repositories/notification.repository';
import { UnauthorizedError } from '../../utils/errors';

export class NotificationController {
  public async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const notifications = await notificationRepository.findByUserId(req.user.id, limit);
      const unreadCount = await notificationRepository.countUnread(req.user.id);
      res.status(200).json({ notifications, unreadCount });
    } catch (error) {
      next(error);
    }
  }

  public async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { id } = req.params;
      await notificationRepository.markRead(id, req.user.id);
      res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
      next(error);
    }
  }

  public async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      await notificationRepository.markAllRead(req.user.id);
      res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }
}
export const notificationController = new NotificationController();
