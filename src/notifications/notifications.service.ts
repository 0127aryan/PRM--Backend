import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async createNotification(
    userId: number,
    title: string,
    message: string,
    type: string,
  ): Promise<Notification> {
    const notification = this.repo.create({
      userId,
      title,
      message,
      type,
      isRead: false,
    });
    return this.repo.save(notification);
  }

  async listForUser(userId: number): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: {
        isRead: 'ASC', // false (unread) comes before true (read)
        createdAt: 'DESC', // newest first
      },
    });
  }

  async markAsRead(userId: number, id: number): Promise<void> {
    const notification = await this.repo.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    await this.repo.save(notification);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }
}
