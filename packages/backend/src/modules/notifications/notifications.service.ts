// ============================================================
// Notifications Service
// ============================================================

import { getDb } from '../../database/connection';
import nodemailer from 'nodemailer';
import { config } from '../../config';
import logger from '../../config/logger';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

export class NotificationsService {
  async list(userId: string, page = 1, pageSize = 20, isRead?: string) {
    const db = getDb();
    let query = db('notifications').where({ user_id: userId }).orderBy('created_at', 'desc');

    if (isRead === 'true') query = query.where({ is_read: true });
    if (isRead === 'false') query = query.where({ is_read: false });

    const countResult = await query.clone().count('id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const notifications = await query.offset((page - 1) * pageSize).limit(pageSize);

    return { data: notifications, meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) } };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await getDb()('notifications').where({ user_id: userId, is_read: false }).count('id as count').first();
    return parseInt(result?.count as string || '0', 10);
  }

  async markAsRead(id: string, userId: string) {
    await getDb()('notifications').where({ id, user_id: userId }).update({ is_read: true, read_at: new Date() });
  }

  async markAllAsRead(userId: string) {
    await getDb()('notifications').where({ user_id: userId, is_read: false }).update({ is_read: true, read_at: new Date() });
  }

  /**
   * Create an in-app notification and optionally send email
   */
  async create(params: {
    tenantId?: string;
    userId: string;
    title: string;
    message: string;
    type?: string;
    data?: Record<string, unknown>;
    sendEmail?: boolean;
  }) {
    const db = getDb();

    const [notification] = await db('notifications').insert({
      tenant_id: params.tenantId || null,
      user_id: params.userId,
      type: params.type || 'in_app',
      title: params.title,
      message: params.message,
      data: params.data ? JSON.stringify(params.data) : '{}',
    }).returning('*');

    if (params.sendEmail) {
      try {
        const user = await db('users').where({ id: params.userId }).first();
        if (user) {
          await transporter.sendMail({
            from: config.smtp.from,
            to: user.email,
            subject: `SmartSeed: ${params.title}`,
            html: `<h2>${params.title}</h2><p>${params.message}</p><hr><p style="color:#888">SmartSeed Platform</p>`,
          });
        }
      } catch (err) {
        logger.warn('Failed to send email notification', { error: (err as Error).message });
      }
    }

    return notification;
  }

  /**
   * Notify all users of a tenant
   */
  async notifyTenant(tenantId: string, title: string, message: string, data?: Record<string, unknown>) {
    const users = await getDb()('users').where({ tenant_id: tenantId, is_active: true });
    for (const user of users) {
      await this.create({ tenantId, userId: user.id, title, message, data });
    }
  }
}

export const notificationsService = new NotificationsService();

