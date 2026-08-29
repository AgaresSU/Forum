import { getDatabase } from '@/lib/auth/database';
import { canAccessRole, canModerate, roleLabel } from '@/lib/forum/access';
import { ensureCommunitySchema } from '@/lib/forum/database';

export type CommunityViewer = {
  id: string;
  role: string;
};

type ForumNodeRow = {
  id: string;
  slug: string;
  minimum_role: string;
  requires_moderation: number;
};

type TopicRow = {
  id: string;
  forum_id: string;
  forum_slug: string;
  author_id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  access_level: string;
  is_pinned: number;
  is_locked: number;
  is_commercial: number;
  commercial_disclosure: string | null;
  view_count: number;
  reply_count: number;
  last_post_at: number;
  created_at: number;
  author: string;
  author_role: string;
};

type PostRow = {
  id: string;
  author_id: string;
  body: string;
  status: string;
  is_first_post: number;
  created_at: number;
  author: string;
  author_role: string;
};

export type PersistedTopicListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  authorRole: string;
  replies: number;
  views: number;
  updated: string;
  pinned: boolean;
  commercial: boolean;
  access: 'member' | 'pro';
  status: string;
};

export type PersistedTopicPost = {
  id: string;
  author: string;
  authorRole: string;
  initials: string;
  published: string;
  body: string[];
  reactions: number;
  status: string;
};

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

function makeSlug(title: string) {
  const base = title
    .toLocaleLowerCase('ru')
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return `${base || 'topic'}-${crypto.randomUUID().slice(0, 8)}`;
}

function excerptFromBody(body: string) {
  const normalized = body.replace(/\s+/g, ' ').trim();
  return normalized.length > 220 ? `${normalized.slice(0, 217)}…` : normalized;
}

async function getForumNode(slug: string) {
  await ensureCommunitySchema();
  return getDatabase()
    .prepare(
      `SELECT id, slug, minimum_role, requires_moderation
       FROM forum_nodes
       WHERE slug = ? AND node_type = 'forum' AND is_published = 1`,
    )
    .bind(slug)
    .first<ForumNodeRow>();
}

async function getTopicRow(slug: string) {
  await ensureCommunitySchema();
  return getDatabase()
    .prepare(
      `SELECT topics.*, forum_nodes.slug AS forum_slug,
              users.username AS author, users.role AS author_role
       FROM topics
       JOIN forum_nodes ON forum_nodes.id = topics.forum_id
       JOIN users ON users.id = topics.author_id
       WHERE topics.slug = ?`,
    )
    .bind(slug)
    .first<TopicRow>();
}

function canViewTopic(topic: TopicRow, viewer: CommunityViewer) {
  if (!canAccessRole(viewer.role, topic.access_level)) return false;
  return (
    topic.status === 'published' ||
    topic.author_id === viewer.id ||
    canModerate(viewer.role)
  );
}

export async function createTopic(
  viewer: CommunityViewer,
  input: {
    forumSlug: string;
    title: string;
    body: string;
    isCommercial: boolean;
    commercialDisclosure?: string;
  },
) {
  const forum = await getForumNode(input.forumSlug);
  if (!forum) return { ok: false as const, code: 'FORUM_NOT_FOUND' as const };
  if (!canAccessRole(viewer.role, forum.minimum_role))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };

  const database = getDatabase();
  const topicId = crypto.randomUUID();
  const postId = crypto.randomUUID();
  const slug = makeSlug(input.title);
  const now = Math.floor(Date.now() / 1000);
  const status =
    forum.requires_moderation && !canModerate(viewer.role)
      ? 'pending'
      : 'published';
  const statements = [
    database
      .prepare(
        `INSERT INTO topics (
          id, forum_id, author_id, slug, title, excerpt, status, access_level,
          is_commercial, commercial_disclosure, last_post_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        topicId,
        forum.id,
        viewer.id,
        slug,
        input.title,
        excerptFromBody(input.body),
        status,
        forum.minimum_role,
        input.isCommercial ? 1 : 0,
        input.isCommercial ? input.commercialDisclosure || null : null,
        now,
        now,
        now,
      ),
    database
      .prepare(
        `INSERT INTO posts (
          id, topic_id, author_id, body, status, is_first_post, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .bind(postId, topicId, viewer.id, input.body, status, now, now),
    database
      .prepare(
        `INSERT INTO community_events (
          id, actor_user_id, event_type, entity_type, entity_id, payload_json, status, created_at
        ) VALUES (?, ?, ?, 'topic', ?, ?, 'pending', ?)`,
      )
      .bind(
        crypto.randomUUID(),
        viewer.id,
        'topic.created',
        topicId,
        JSON.stringify({ forumSlug: input.forumSlug, status }),
        now,
      ),
  ];
  if (status === 'published') {
    statements.push(
      database
        .prepare(
          `INSERT INTO community_events (
            id, actor_user_id, event_type, entity_type, entity_id, payload_json, status, created_at
          ) VALUES (?, ?, 'topic.published', 'topic', ?, ?, 'pending', ?)`,
        )
        .bind(
          crypto.randomUUID(),
          viewer.id,
          topicId,
          JSON.stringify({ forumSlug: input.forumSlug }),
          now,
        ),
    );
  }

  await database.batch(statements);

  return { ok: true as const, topicId, slug, status };
}

export async function listForumTopics(
  forumSlug: string,
  viewer: CommunityViewer,
) {
  const forum = await getForumNode(forumSlug);
  if (!forum || !canAccessRole(viewer.role, forum.minimum_role)) return [];
  const moderator = canModerate(viewer.role) ? 1 : 0;
  const result = await getDatabase()
    .prepare(
      `SELECT topics.*, forum_nodes.slug AS forum_slug,
              users.username AS author, users.role AS author_role
       FROM topics
       JOIN forum_nodes ON forum_nodes.id = topics.forum_id
       JOIN users ON users.id = topics.author_id
       WHERE topics.forum_id = ?
         AND (topics.status = 'published' OR topics.author_id = ? OR ? = 1)
       ORDER BY topics.is_pinned DESC, topics.last_post_at DESC
       LIMIT 50`,
    )
    .bind(forum.id, viewer.id, moderator)
    .all<TopicRow>();

  return result.results.map<PersistedTopicListItem>((topic) => ({
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    excerpt: topic.excerpt,
    author: topic.author,
    authorRole: roleLabel(topic.author_role),
    replies: topic.reply_count,
    views: topic.view_count,
    updated: formatRelativeTime(topic.last_post_at),
    pinned: Boolean(topic.is_pinned),
    commercial: Boolean(topic.is_commercial),
    access: topic.access_level === 'pro' ? 'pro' : 'member',
    status: topic.status,
  }));
}

export async function getTopicView(slug: string, viewer: CommunityViewer) {
  const topic = await getTopicRow(slug);
  if (!topic || !canViewTopic(topic, viewer)) return null;

  const moderator = canModerate(viewer.role) ? 1 : 0;
  const postsResult = await getDatabase()
    .prepare(
      `SELECT posts.*, users.username AS author, users.role AS author_role
       FROM posts
       JOIN users ON users.id = posts.author_id
       WHERE posts.topic_id = ?
         AND (posts.status = 'published' OR posts.author_id = ? OR ? = 1)
       ORDER BY posts.created_at ASC`,
    )
    .bind(topic.id, viewer.id, moderator)
    .all<PostRow>();

  const subscription = await getDatabase()
    .prepare(
      'SELECT 1 AS subscribed FROM topic_subscriptions WHERE user_id = ? AND topic_id = ?',
    )
    .bind(viewer.id, topic.id)
    .first<{ subscribed: number }>();
  const subscriberCount = await getDatabase()
    .prepare(
      'SELECT COUNT(*) AS count FROM topic_subscriptions WHERE topic_id = ?',
    )
    .bind(topic.id)
    .first<{ count: number }>();

  return {
    id: topic.id,
    forumSlug: topic.forum_slug,
    authorId: topic.author_id,
    title: topic.title,
    slug: topic.slug,
    excerpt: topic.excerpt,
    author: topic.author,
    authorRole: roleLabel(topic.author_role),
    replies: topic.reply_count,
    views: topic.view_count,
    updated: formatRelativeTime(topic.last_post_at),
    pinned: Boolean(topic.is_pinned),
    locked: Boolean(topic.is_locked),
    commercial: Boolean(topic.is_commercial),
    commercialDisclosure: topic.commercial_disclosure,
    access:
      topic.access_level === 'pro' ? ('pro' as const) : ('member' as const),
    status: topic.status,
    subscribed: Boolean(subscription),
    subscriberCount: subscriberCount?.count || 0,
    posts: postsResult.results.map<PersistedTopicPost>((post) => ({
      id: post.id,
      author: post.author,
      authorRole: roleLabel(post.author_role),
      initials: post.author.slice(0, 2).toLocaleUpperCase('ru'),
      published: formatRelativeTime(post.created_at),
      body: post.body.split(/\n{2,}/).filter(Boolean),
      reactions: 0,
      status: post.status,
    })),
  };
}

export async function addTopicPost(
  viewer: CommunityViewer,
  slug: string,
  body: string,
) {
  const topic = await getTopicRow(slug);
  if (!topic) return { ok: false as const, code: 'TOPIC_NOT_FOUND' as const };
  if (!canAccessRole(viewer.role, topic.access_level))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  if (topic.status !== 'published')
    return { ok: false as const, code: 'TOPIC_PENDING' as const };
  if (topic.is_locked)
    return { ok: false as const, code: 'TOPIC_LOCKED' as const };

  const database = getDatabase();
  const postId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await database.batch([
    database
      .prepare(
        `INSERT INTO posts (
          id, topic_id, author_id, body, status, is_first_post, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'published', 0, ?, ?)`,
      )
      .bind(postId, topic.id, viewer.id, body, now, now),
    database
      .prepare(
        `UPDATE topics
         SET reply_count = reply_count + 1, last_post_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(now, now, topic.id),
    database
      .prepare(
        `INSERT INTO community_events (
          id, actor_user_id, event_type, entity_type, entity_id, payload_json, status, created_at
        ) VALUES (?, ?, 'post.created', 'post', ?, ?, 'pending', ?)`,
      )
      .bind(
        crypto.randomUUID(),
        viewer.id,
        postId,
        JSON.stringify({ topicId: topic.id }),
        now,
      ),
  ]);
  return { ok: true as const, postId };
}

export async function toggleSubscription(
  viewer: CommunityViewer,
  input: { targetType: 'forum' | 'topic'; slug: string },
) {
  await ensureCommunitySchema();
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const forumTarget =
    input.targetType === 'forum' ? await getForumNode(input.slug) : null;
  const topicTarget =
    input.targetType === 'topic' ? await getTopicRow(input.slug) : null;
  const target = forumTarget || topicTarget;
  if (!target) return { ok: false as const, code: 'NOT_FOUND' as const };

  const minimumRole =
    forumTarget?.minimum_role || topicTarget?.access_level || 'member';
  if (!canAccessRole(viewer.role, minimumRole))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };

  const table =
    input.targetType === 'forum'
      ? 'forum_subscriptions'
      : 'topic_subscriptions';
  const targetColumn = input.targetType === 'forum' ? 'forum_id' : 'topic_id';
  const existing = await database
    .prepare(
      `SELECT 1 AS subscribed FROM ${table} WHERE user_id = ? AND ${targetColumn} = ?`,
    )
    .bind(viewer.id, target.id)
    .first<{ subscribed: number }>();

  if (existing) {
    await database.batch([
      database
        .prepare(
          `DELETE FROM ${table} WHERE user_id = ? AND ${targetColumn} = ?`,
        )
        .bind(viewer.id, target.id),
      database
        .prepare(
          `INSERT INTO community_events (
            id, actor_user_id, event_type, entity_type, entity_id, payload_json, status, created_at
          ) VALUES (?, ?, 'subscription.changed', ?, ?, ?, 'pending', ?)`,
        )
        .bind(
          crypto.randomUUID(),
          viewer.id,
          input.targetType,
          target.id,
          JSON.stringify({ subscribed: false }),
          now,
        ),
    ]);
    return { ok: true as const, subscribed: false };
  }

  await database.batch([
    database
      .prepare(
        `INSERT INTO ${table} (user_id, ${targetColumn}, notification_mode, created_at)
         VALUES (?, ?, 'in_app', ?)`,
      )
      .bind(viewer.id, target.id, now),
    database
      .prepare(
        `INSERT INTO community_events (
          id, actor_user_id, event_type, entity_type, entity_id, payload_json, status, created_at
        ) VALUES (?, ?, 'subscription.changed', ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        crypto.randomUUID(),
        viewer.id,
        input.targetType,
        target.id,
        JSON.stringify({ subscribed: true }),
        now,
      ),
  ]);
  return { ok: true as const, subscribed: true };
}

export async function getForumSubscription(
  forumSlug: string,
  viewer: CommunityViewer,
) {
  const forum = await getForumNode(forumSlug);
  if (!forum) return { subscribed: false, count: 0 };
  const database = getDatabase();
  const [subscription, count] = await Promise.all([
    database
      .prepare(
        'SELECT 1 AS subscribed FROM forum_subscriptions WHERE user_id = ? AND forum_id = ?',
      )
      .bind(viewer.id, forum.id)
      .first<{ subscribed: number }>(),
    database
      .prepare(
        'SELECT COUNT(*) AS count FROM forum_subscriptions WHERE forum_id = ?',
      )
      .bind(forum.id)
      .first<{ count: number }>(),
  ]);
  return { subscribed: Boolean(subscription), count: count?.count || 0 };
}

export async function createModerationReport(
  viewer: CommunityViewer,
  input: {
    targetType: 'topic' | 'post' | 'content' | 'group';
    targetId: string;
    reason: string;
    details: string;
  },
) {
  await ensureCommunitySchema();
  const database = getDatabase();
  if (input.targetType !== 'topic')
    return { ok: false as const, code: 'UNSUPPORTED_TARGET' as const };
  const topic = await database
    .prepare(
      `SELECT topics.*, forum_nodes.slug AS forum_slug,
              users.username AS author, users.role AS author_role
       FROM topics
       JOIN forum_nodes ON forum_nodes.id = topics.forum_id
       JOIN users ON users.id = topics.author_id
       WHERE topics.id = ?`,
    )
    .bind(input.targetId)
    .first<TopicRow>();
  if (!topic) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (!canViewTopic(topic, viewer))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const statements = [
    database
      .prepare(
        `INSERT INTO moderation_reports (
          id, reporter_id, target_type, target_id, reason, details, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      )
      .bind(
        id,
        viewer.id,
        input.targetType,
        input.targetId,
        input.reason,
        input.details,
        now,
        now,
      ),
  ];
  if (input.targetType === 'topic') {
    statements.push(
      database
        .prepare(
          `INSERT INTO community_events (
            id, actor_user_id, event_type, entity_type, entity_id, payload_json, status, created_at
          ) VALUES (?, ?, 'topic.reported', 'topic', ?, ?, 'pending', ?)`,
        )
        .bind(
          crypto.randomUUID(),
          viewer.id,
          input.targetId,
          JSON.stringify({ reportId: id, reason: input.reason }),
          now,
        ),
    );
  }
  await database.batch(statements);
  return { ok: true as const, id };
}

export async function listModerationQueue(viewer: CommunityViewer) {
  if (!canModerate(viewer.role)) return null;
  await ensureCommunitySchema();
  const database = getDatabase();
  const [topics, reports] = await Promise.all([
    database
      .prepare(
        `SELECT topics.id, topics.slug, topics.title, topics.excerpt, topics.is_commercial,
                topics.commercial_disclosure, topics.created_at,
                forum_nodes.title AS forum_title, users.username AS author
         FROM topics
         JOIN forum_nodes ON forum_nodes.id = topics.forum_id
         JOIN users ON users.id = topics.author_id
         WHERE topics.status = 'pending'
         ORDER BY topics.created_at ASC
         LIMIT 100`,
      )
      .all<{
        id: string;
        slug: string;
        title: string;
        excerpt: string;
        is_commercial: number;
        commercial_disclosure: string | null;
        created_at: number;
        forum_title: string;
        author: string;
      }>(),
    database
      .prepare(
        `SELECT moderation_reports.id, moderation_reports.target_type, moderation_reports.target_id,
                moderation_reports.reason, moderation_reports.details, moderation_reports.created_at,
                users.username AS reporter, topics.slug AS target_slug, topics.title AS target_title
         FROM moderation_reports
         JOIN users ON users.id = moderation_reports.reporter_id
         LEFT JOIN topics
           ON moderation_reports.target_type = 'topic' AND topics.id = moderation_reports.target_id
         WHERE moderation_reports.status = 'open'
         ORDER BY moderation_reports.created_at ASC
         LIMIT 100`,
      )
      .all<{
        id: string;
        target_type: string;
        target_id: string;
        reason: string;
        details: string;
        created_at: number;
        reporter: string;
        target_slug: string | null;
        target_title: string | null;
      }>(),
  ]);

  return {
    topics: topics.results.map((topic) => ({
      ...topic,
      created: formatRelativeTime(topic.created_at),
    })),
    reports: reports.results.map((report) => ({
      ...report,
      created: formatRelativeTime(report.created_at),
    })),
  };
}

export async function moderateTopic(
  viewer: CommunityViewer,
  id: string,
  action: 'approve' | 'reject',
) {
  if (!canModerate(viewer.role))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  await ensureCommunitySchema();
  const database = getDatabase();
  const topic = await database
    .prepare('SELECT id, status FROM topics WHERE id = ?')
    .bind(id)
    .first<{ id: string; status: string }>();
  if (!topic) return { ok: false as const, code: 'NOT_FOUND' as const };
  const now = Math.floor(Date.now() / 1000);
  const status = action === 'approve' ? 'published' : 'rejected';
  const statements = [
    database
      .prepare('UPDATE topics SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, now, id),
    database
      .prepare('UPDATE posts SET status = ?, updated_at = ? WHERE topic_id = ?')
      .bind(status, now, id),
  ];
  if (action === 'approve') {
    statements.push(
      database
        .prepare(
          `INSERT INTO community_events (
            id, actor_user_id, event_type, entity_type, entity_id, status, created_at
          ) VALUES (?, ?, 'topic.published', 'topic', ?, 'pending', ?)`,
        )
        .bind(crypto.randomUUID(), viewer.id, id, now),
    );
  }
  await database.batch(statements);
  return { ok: true as const, status };
}

export async function resolveModerationReport(
  viewer: CommunityViewer,
  id: string,
  action: 'resolve' | 'dismiss',
) {
  if (!canModerate(viewer.role))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  await ensureCommunitySchema();
  const now = Math.floor(Date.now() / 1000);
  const result = await getDatabase()
    .prepare(
      `UPDATE moderation_reports
       SET status = ?, assigned_to_id = ?, resolved_at = ?, updated_at = ?
       WHERE id = ? AND status = 'open'`,
    )
    .bind(
      action === 'resolve' ? 'resolved' : 'dismissed',
      viewer.id,
      now,
      now,
      id,
    )
    .run();
  return result.meta.changes
    ? { ok: true as const }
    : { ok: false as const, code: 'NOT_FOUND' as const };
}
