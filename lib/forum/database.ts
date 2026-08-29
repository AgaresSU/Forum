import { env } from 'cloudflare:workers';

import { ensureAuthSchema } from '@/lib/auth/database';
import { forumSections } from '@/lib/forum/catalog';
import type { CommunityEventType } from '@/lib/forum/policy';

const communitySchemaStatements = [
  `CREATE TABLE IF NOT EXISTS forum_nodes (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES forum_nodes(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    node_type TEXT NOT NULL DEFAULT 'forum',
    icon_key TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    minimum_role TEXT NOT NULL DEFAULT 'member',
    requires_moderation INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_nodes_slug ON forum_nodes(slug)',
  'CREATE INDEX IF NOT EXISTS idx_forum_nodes_parent_position ON forum_nodes(parent_id, position)',
  `CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    forum_id TEXT NOT NULL REFERENCES forum_nodes(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published',
    access_level TEXT NOT NULL DEFAULT 'member',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    is_commercial INTEGER NOT NULL DEFAULT 0,
    commercial_disclosure TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    last_post_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug)',
  'CREATE INDEX IF NOT EXISTS idx_topics_forum_status_last_post ON topics(forum_id, status, last_post_at)',
  'CREATE INDEX IF NOT EXISTS idx_topics_author_created ON topics(author_id, created_at)',
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    is_first_post INTEGER NOT NULL DEFAULT 0,
    edited_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_posts_topic_created ON posts(topic_id, created_at)',
  'CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at)',
  `CREATE TABLE IF NOT EXISTS content_records (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    discussion_topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
    content_type TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    access_level TEXT NOT NULL DEFAULT 'member',
    revision INTEGER NOT NULL DEFAULT 1,
    is_commercial INTEGER NOT NULL DEFAULT 0,
    commercial_disclosure TEXT,
    published_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_content_records_slug ON content_records(slug)',
  'CREATE INDEX IF NOT EXISTS idx_content_records_type_status_published ON content_records(content_type, status, published_at)',
  'CREATE INDEX IF NOT EXISTS idx_content_records_author_created ON content_records(author_id, created_at)',
  `CREATE TABLE IF NOT EXISTS community_groups (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'closed',
    minimum_role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_community_groups_slug ON community_groups(slug)',
  'CREATE INDEX IF NOT EXISTS idx_community_groups_status_created ON community_groups(status, created_at)',
  `CREATE TABLE IF NOT EXISTS community_group_members (
    group_id TEXT NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    joined_at INTEGER NOT NULL,
    PRIMARY KEY(group_id, user_id)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_group_members_user_status ON community_group_members(user_id, status)',
  `CREATE TABLE IF NOT EXISTS forum_subscriptions (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    forum_id TEXT NOT NULL REFERENCES forum_nodes(id) ON DELETE CASCADE,
    notification_mode TEXT NOT NULL DEFAULT 'in_app',
    created_at INTEGER NOT NULL,
    PRIMARY KEY(user_id, forum_id)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_forum_subscriptions_forum ON forum_subscriptions(forum_id)',
  `CREATE TABLE IF NOT EXISTS topic_subscriptions (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    notification_mode TEXT NOT NULL DEFAULT 'in_app',
    created_at INTEGER NOT NULL,
    PRIMARY KEY(user_id, topic_id)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_topic_subscriptions_topic ON topic_subscriptions(topic_id)',
  `CREATE TABLE IF NOT EXISTS moderation_reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_to_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    resolved_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_moderation_reports_status_created ON moderation_reports(status, created_at)',
  'CREATE INDEX IF NOT EXISTS idx_moderation_reports_target ON moderation_reports(target_type, target_id)',
  `CREATE TABLE IF NOT EXISTS community_events (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload_json TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    processed_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_community_events_status_created ON community_events(status, created_at)',
];

let communitySchemaReady: Promise<void> | undefined;

function getDatabase() {
  return (env as unknown as { DB: D1Database }).DB;
}

async function seedForumNodes() {
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const statements = forumSections.flatMap((section, sectionPosition) => {
    const sectionId = `section:${section.slug}`;
    const sectionStatement = database
      .prepare(
        `INSERT INTO forum_nodes (
          id, parent_id, slug, title, description, node_type, icon_key, position,
          minimum_role, requires_moderation, is_published, created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, 'category', NULL, ?, 'member', 0, 1, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          position = excluded.position,
          updated_at = excluded.updated_at`,
      )
      .bind(sectionId, section.slug, section.title, section.description, sectionPosition, now, now);

    const forumStatements = section.forums.map((forum, forumPosition) =>
      database
        .prepare(
          `INSERT INTO forum_nodes (
            id, parent_id, slug, title, description, node_type, icon_key, position,
            minimum_role, requires_moderation, is_published, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'forum', ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            parent_id = excluded.parent_id,
            title = excluded.title,
            description = excluded.description,
            icon_key = excluded.icon_key,
            position = excluded.position,
            minimum_role = excluded.minimum_role,
            requires_moderation = excluded.requires_moderation,
            updated_at = excluded.updated_at`,
        )
        .bind(
          `forum:${forum.slug}`,
          sectionId,
          forum.slug,
          forum.title,
          forum.description,
          forum.icon,
          forumPosition,
          forum.access,
          section.slug === 'income' || section.slug === 'promotion' ? 1 : 0,
          now,
          now,
        ),
    );

    return [sectionStatement, ...forumStatements];
  });

  await database.batch(statements);
}

export function ensureCommunitySchema() {
  communitySchemaReady ??= (async () => {
    await ensureAuthSchema();
    const database = getDatabase();
    await database.batch(communitySchemaStatements.map((statement) => database.prepare(statement)));
    await seedForumNodes();
    await database.prepare('PRAGMA optimize').run();
  })();
  return communitySchemaReady;
}

export async function recordCommunityEvent(input: {
  actorUserId?: string;
  eventType: CommunityEventType;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
}) {
  await ensureCommunitySchema();
  await getDatabase()
    .prepare(
      `INSERT INTO community_events (
        id, actor_user_id, event_type, entity_type, entity_id, payload_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.actorUserId || null,
      input.eventType,
      input.entityType,
      input.entityId,
      input.payload ? JSON.stringify(input.payload) : null,
      Math.floor(Date.now() / 1000),
    )
    .run();
}
