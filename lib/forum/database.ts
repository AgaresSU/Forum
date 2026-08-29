import { env } from 'cloudflare:workers';

import { ensureAuthSchema } from '@/lib/auth/database';
import { forumSections } from '@/lib/forum/catalog';
import type { CommunityEventType } from '@/lib/forum/policy';
import { findTopic, getForumTopics } from '@/lib/forum/sample-content';

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
  'CREATE INDEX IF NOT EXISTS idx_topics_status_created ON topics(status, created_at)',
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
      .bind(
        sectionId,
        section.slug,
        section.title,
        section.description,
        sectionPosition,
        now,
        now,
      );

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

function stableContentId(value: string) {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function seededRole(label: string) {
  if (label === 'Эксперт' || label === 'Куратор') return 'expert';
  if (label === 'Автор') return 'author';
  if (label === 'Редакция') return 'moderator';
  return 'member';
}

async function batchInChunks(
  database: D1Database,
  statements: D1PreparedStatement[],
) {
  for (let index = 0; index < statements.length; index += 50) {
    await database.batch(statements.slice(index, index + 50));
  }
}

async function seedCuratedTopics() {
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const entries = forumSections.flatMap((section) =>
    section.forums.flatMap((forum) =>
      getForumTopics(forum).map((topic) => ({
        section,
        forum,
        topic,
        detail: findTopic(topic.slug),
      })),
    ),
  );
  const seeded = await database
    .prepare(
      "SELECT COUNT(*) AS count FROM topics WHERE id LIKE 'sample-topic:%'",
    )
    .first<{ count: number }>();
  if ((seeded?.count || 0) >= entries.length) return;

  const authors = new Map<string, string>();
  for (const entry of entries) {
    for (const post of entry.detail?.posts || []) {
      if (!authors.has(post.author)) authors.set(post.author, post.authorRole);
    }
  }

  const authorStatements = [...authors.entries()].map(
    ([author, authorRole]) => {
      const contentId = stableContentId(author);
      return database
        .prepare(
          `INSERT OR IGNORE INTO users (
          id, email, username, password_hash, role, email_verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'disabled', ?, ?, ?, ?)`,
        )
        .bind(
          `content-user:${contentId}`,
          `content-${contentId}@osnova.local`,
          author,
          seededRole(authorRole),
          now,
          now,
          now,
        );
    },
  );

  const contentStatements = entries.flatMap((entry, topicIndex) => {
    const detail = entry.detail;
    if (!detail) return [];
    const topicId = `sample-topic:${entry.topic.slug}`;
    const createdAt = now - topicIndex * 60;
    const topicStatement = database
      .prepare(
        `INSERT OR IGNORE INTO topics (
          id, forum_id, author_id, slug, title, excerpt, status, access_level,
          is_pinned, is_locked, is_commercial, commercial_disclosure,
          view_count, reply_count, last_post_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        topicId,
        `forum:${entry.forum.slug}`,
        `content-user:${stableContentId(detail.posts[0]?.author || entry.topic.author)}`,
        entry.topic.slug,
        entry.topic.title,
        entry.topic.excerpt,
        entry.topic.access,
        entry.topic.pinned ? 1 : 0,
        entry.topic.commercial ? 1 : 0,
        entry.topic.commercial
          ? 'Материал содержит партнёрский контекст. Условия вознаграждения и риски раскрыты в публикации.'
          : null,
        entry.topic.views,
        Math.max(0, detail.posts.length - 1),
        createdAt + detail.posts.length,
        createdAt,
        createdAt + detail.posts.length,
      );

    const postStatements = detail.posts.map((post, postIndex) =>
      database
        .prepare(
          `INSERT OR IGNORE INTO posts (
            id, topic_id, author_id, body, status, is_first_post, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'published', ?, ?, ?)`,
        )
        .bind(
          `sample-post:${entry.topic.slug}:${post.id}`,
          topicId,
          `content-user:${stableContentId(post.author)}`,
          post.body.join('\n\n'),
          postIndex === 0 ? 1 : 0,
          createdAt + postIndex,
          createdAt + postIndex,
        ),
    );

    return [topicStatement, ...postStatements];
  });

  await batchInChunks(database, [...authorStatements, ...contentStatements]);
}

export function ensureCommunitySchema() {
  communitySchemaReady ??= (async () => {
    await ensureAuthSchema();
    const database = getDatabase();
    await database.batch(
      communitySchemaStatements.map((statement) => database.prepare(statement)),
    );
    await seedForumNodes();
    await seedCuratedTopics();
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
