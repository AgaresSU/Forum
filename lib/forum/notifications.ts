import { getDatabase } from '@/lib/auth/database';
import { ensureCommunitySchema } from '@/lib/forum/database';

export type NotificationInput = {
  notificationType: string;
  entityType: string;
  entityId: string;
  title: string;
  body: string;
  href: string;
};

export function notificationStatements(
  database: D1Database,
  recipients: Iterable<string>,
  actorUserId: string | null,
  input: NotificationInput,
  createdAt: number,
) {
  return [...new Set(recipients)]
    .filter((userId) => userId && userId !== actorUserId)
    .map((userId) =>
      database
        .prepare(
          `INSERT INTO notifications (
            id, user_id, actor_user_id, notification_type, entity_type,
            entity_id, title, body, href, is_read, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          userId,
          actorUserId,
          input.notificationType,
          input.entityType,
          input.entityId,
          input.title,
          input.body,
          input.href,
          createdAt,
        ),
    );
}

function formatRelativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (seconds < 60) return 'только что';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин. назад`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} ч. назад`;
  if (seconds < 172_800) return 'вчера';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp * 1000));
}

export async function getUnreadNotificationCount(userId: string) {
  await ensureCommunitySchema();
  const result = await getDatabase()
    .prepare(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
    )
    .bind(userId)
    .first<{ count: number }>();
  return result?.count || 0;
}

export async function listNotifications(userId: string, limit = 100) {
  await ensureCommunitySchema();
  const result = await getDatabase()
    .prepare(
      `SELECT notifications.id, notifications.notification_type,
              notifications.entity_type, notifications.entity_id,
              notifications.title, notifications.body, notifications.href,
              notifications.is_read, notifications.created_at,
              users.username AS actor
       FROM notifications
       LEFT JOIN users ON users.id = notifications.actor_user_id
       WHERE notifications.user_id = ?
       ORDER BY notifications.created_at DESC
       LIMIT ?`,
    )
    .bind(userId, limit)
    .all<{
      id: string;
      notification_type: string;
      entity_type: string;
      entity_id: string;
      title: string;
      body: string;
      href: string;
      is_read: number;
      created_at: number;
      actor: string | null;
    }>();
  return result.results.map((notification) => ({
    ...notification,
    isRead: Boolean(notification.is_read),
    created: formatRelativeTime(notification.created_at),
  }));
}

export async function markNotificationRead(userId: string, id: string) {
  await ensureCommunitySchema();
  const result = await getDatabase()
    .prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    )
    .bind(id, userId)
    .run();
  return Boolean(result.meta.changes);
}

export async function markAllNotificationsRead(userId: string) {
  await ensureCommunitySchema();
  const result = await getDatabase()
    .prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    )
    .bind(userId)
    .run();
  return result.meta.changes || 0;
}
