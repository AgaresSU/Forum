import { getDatabase } from '@/lib/auth/database';
import { ensureCommunitySchema } from '@/lib/forum/database';
import type { CommunityViewer } from '@/lib/forum/repository';

const allowedRoles = new Set([
  'member',
  'author',
  'expert',
  'pro',
  'partner',
  'moderator',
  'admin',
]);

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000));
}

export async function listManagedUsers(actor: CommunityViewer) {
  if (actor.role !== 'admin') return null;
  await ensureCommunitySchema();
  const database = getDatabase();
  const [users, audit] = await Promise.all([
    database
      .prepare(
        `SELECT users.id, users.email, users.username, users.role,
                users.email_verified_at, users.created_at,
                (SELECT COUNT(*) FROM topics WHERE author_id = users.id) +
                (SELECT COUNT(*) FROM posts WHERE author_id = users.id) +
                (SELECT COUNT(*) FROM content_records WHERE author_id = users.id)
                  AS authored_count
         FROM users
         WHERE users.password_hash != 'disabled'
         ORDER BY CASE users.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,
                  users.created_at DESC
         LIMIT 250`,
      )
      .all<{
        id: string;
        email: string;
        username: string;
        role: string;
        email_verified_at: number | null;
        created_at: number;
        authored_count: number;
      }>(),
    database
      .prepare(
        `SELECT user_administration_audit.id,
                user_administration_audit.target_username,
                user_administration_audit.action,
                user_administration_audit.previous_role,
                user_administration_audit.new_role,
                user_administration_audit.note,
                user_administration_audit.created_at,
                users.username AS actor
         FROM user_administration_audit
         LEFT JOIN users ON users.id = user_administration_audit.actor_user_id
         ORDER BY user_administration_audit.created_at DESC
         LIMIT 100`,
      )
      .all<{
        id: string;
        target_username: string;
        action: string;
        previous_role: string | null;
        new_role: string | null;
        note: string;
        created_at: number;
        actor: string | null;
      }>(),
  ]);
  return {
    users: users.results.map((user) => ({
      ...user,
      verified: Boolean(user.email_verified_at),
      created: formatDate(user.created_at),
    })),
    audit: audit.results.map((entry) => ({
      ...entry,
      created: formatDate(entry.created_at),
    })),
  };
}

async function getTargetUser(id: string) {
  return getDatabase()
    .prepare(
      `SELECT id, username, role, password_hash
       FROM users WHERE id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      username: string;
      role: string;
      password_hash: string;
    }>();
}

async function isLastAdmin(targetRole: string) {
  if (targetRole !== 'admin') return false;
  const count = await getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'")
    .first<{ count: number }>();
  return (count?.count || 0) <= 1;
}

export async function changeManagedUserRole(
  actor: CommunityViewer,
  targetId: string,
  role: string,
  note = '',
) {
  if (actor.role !== 'admin')
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  if (!allowedRoles.has(role))
    return { ok: false as const, code: 'INVALID_ROLE' as const };
  await ensureCommunitySchema();
  const target = await getTargetUser(targetId);
  if (!target) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (target.password_hash === 'disabled')
    return { ok: false as const, code: 'SYSTEM_ACCOUNT' as const };
  if (target.id === actor.id)
    return { ok: false as const, code: 'SELF_CHANGE' as const };
  if (target.role === role) return { ok: true as const, role, unchanged: true };
  if (role !== 'admin' && (await isLastAdmin(target.role))) {
    return { ok: false as const, code: 'LAST_ADMIN' as const };
  }

  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  await database.batch([
    database
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(role, now, target.id),
    database
      .prepare(
        `INSERT INTO user_administration_audit (
          id, target_user_id, actor_user_id, target_username, action,
          previous_role, new_role, note, created_at
        ) VALUES (?, ?, ?, ?, 'role_changed', ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        target.id,
        actor.id,
        target.username,
        target.role,
        role,
        note,
        now,
      ),
  ]);
  return { ok: true as const, role, unchanged: false };
}

export async function deleteManagedUser(
  actor: CommunityViewer,
  targetId: string,
  note: string,
) {
  if (actor.role !== 'admin')
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  await ensureCommunitySchema();
  const target = await getTargetUser(targetId);
  if (!target) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (target.password_hash === 'disabled')
    return { ok: false as const, code: 'SYSTEM_ACCOUNT' as const };
  if (target.id === actor.id)
    return { ok: false as const, code: 'SELF_DELETE' as const };
  if (await isLastAdmin(target.role))
    return { ok: false as const, code: 'LAST_ADMIN' as const };

  const activity = await getDatabase()
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM topics WHERE author_id = ?) +
        (SELECT COUNT(*) FROM posts WHERE author_id = ?) +
        (SELECT COUNT(*) FROM content_records WHERE author_id = ?) +
        (SELECT COUNT(*) FROM community_groups WHERE owner_id = ?) +
        (SELECT COUNT(*) FROM moderation_reports WHERE reporter_id = ?) +
        (SELECT COUNT(*) FROM moderation_actions WHERE actor_user_id = ?)
          AS count`,
    )
    .bind(target.id, target.id, target.id, target.id, target.id, target.id)
    .first<{ count: number }>();
  if ((activity?.count || 0) > 0)
    return { ok: false as const, code: 'HAS_ACTIVITY' as const };

  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  await database.batch([
    database
      .prepare(
        `INSERT INTO user_administration_audit (
          id, target_user_id, actor_user_id, target_username, action,
          previous_role, new_role, note, created_at
        ) VALUES (?, ?, ?, ?, 'user_deleted', ?, NULL, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        target.id,
        actor.id,
        target.username,
        target.role,
        note,
        now,
      ),
    database.prepare('DELETE FROM users WHERE id = ?').bind(target.id),
  ]);
  return { ok: true as const };
}
