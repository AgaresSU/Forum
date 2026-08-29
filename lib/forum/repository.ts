import { getDatabase } from '@/lib/auth/database';
import { canAccessRole, canModerate, roleLabel } from '@/lib/forum/access';
import { ensureCommunitySchema } from '@/lib/forum/database';
import { notificationStatements } from '@/lib/forum/notifications';

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
  assigned_to_id: string | null;
  assigned_to: string | null;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  access_level: string;
  is_pinned: number;
  is_locked: number;
  is_commercial: number;
  commercial_disclosure: string | null;
  moderation_note: string | null;
  moderation_decided_at: number | null;
  resubmission_count: number;
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
              users.username AS author, users.role AS author_role,
              assigned.username AS assigned_to
       FROM topics
       JOIN forum_nodes ON forum_nodes.id = topics.forum_id
       JOIN users ON users.id = topics.author_id
       LEFT JOIN users AS assigned ON assigned.id = topics.assigned_to_id
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
  const recipientRows =
    status === 'published'
      ? await database
          .prepare(
            'SELECT user_id AS id FROM forum_subscriptions WHERE forum_id = ?',
          )
          .bind(forum.id)
          .all<{ id: string }>()
      : await database
          .prepare("SELECT id FROM users WHERE role IN ('moderator', 'admin')")
          .all<{ id: string }>();
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
        `INSERT OR IGNORE INTO topic_subscriptions (
          user_id, topic_id, notification_mode, created_at
        ) VALUES (?, ?, 'in_app', ?)`,
      )
      .bind(viewer.id, topicId, now),
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
  statements.push(
    ...notificationStatements(
      database,
      recipientRows.results.map((recipient) => recipient.id),
      viewer.id,
      {
        notificationType:
          status === 'published' ? 'forum_topic' : 'moderation_pending',
        entityType: 'topic',
        entityId: topicId,
        title:
          status === 'published'
            ? `Новая тема: ${input.title}`
            : `Тема ожидает проверки: ${input.title}`,
        body:
          status === 'published'
            ? `В подписанном разделе «${input.forumSlug}» появилась новая тема.`
            : 'Публикация добавлена в очередь премодерации.',
        href: status === 'published' ? `/forum/topic/${slug}` : '/moderation',
      },
      now,
    ),
  );
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
  const moderationHistory =
    topic.author_id === viewer.id || canModerate(viewer.role)
      ? await getDatabase()
          .prepare(
            `SELECT moderation_actions.action, moderation_actions.note,
                    moderation_actions.created_at, users.username AS actor
             FROM moderation_actions
             JOIN users ON users.id = moderation_actions.actor_user_id
             WHERE moderation_actions.topic_id = ?
             ORDER BY moderation_actions.created_at DESC
             LIMIT 50`,
          )
          .bind(topic.id)
          .all<{
            action: string;
            note: string;
            created_at: number;
            actor: string;
          }>()
      : null;

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
    moderationNote:
      topic.author_id === viewer.id || canModerate(viewer.role)
        ? topic.moderation_note
        : null,
    moderationDecidedAt: topic.moderation_decided_at,
    resubmissionCount: topic.resubmission_count,
    assignedTo: topic.assigned_to,
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
    moderationHistory:
      moderationHistory?.results.map((action) => ({
        ...action,
        created: formatRelativeTime(action.created_at),
      })) || [],
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
  const subscriberRows = await database
    .prepare(
      `SELECT user_id AS id FROM topic_subscriptions WHERE topic_id = ?
       UNION
       SELECT ? AS id
       UNION
       SELECT user_id AS id FROM forum_subscriptions WHERE forum_id = ?`,
    )
    .bind(topic.id, topic.author_id, topic.forum_id)
    .all<{ id: string }>();
  const mentionNames = [
    ...new Set(
      [...body.matchAll(/@([a-z0-9_]{3,24})/giu)].map((match) =>
        match[1].toLowerCase(),
      ),
    ),
  ];
  const mentionedRows = mentionNames.length
    ? await database
        .prepare(
          `SELECT id FROM users WHERE username IN (${mentionNames.map(() => '?').join(', ')})`,
        )
        .bind(...mentionNames)
        .all<{ id: string }>()
    : { results: [] as { id: string }[] };
  const mentionedIds = new Set(mentionedRows.results.map((user) => user.id));
  const replyRecipients = subscriberRows.results
    .map((recipient) => recipient.id)
    .filter((id) => !mentionedIds.has(id));
  const statements = [
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
  ];
  statements.push(
    ...notificationStatements(
      database,
      replyRecipients,
      viewer.id,
      {
        notificationType: 'topic_reply',
        entityType: 'post',
        entityId: postId,
        title: `Новый ответ: ${topic.title}`,
        body: excerptFromBody(body),
        href: `/forum/topic/${topic.slug}#post-${postId}`,
      },
      now,
    ),
    ...notificationStatements(
      database,
      mentionedIds,
      viewer.id,
      {
        notificationType: 'mention',
        entityType: 'post',
        entityId: postId,
        title: `Вас упомянули в теме «${topic.title}»`,
        body: excerptFromBody(body),
        href: `/forum/topic/${topic.slug}#post-${postId}`,
      },
      now,
    ),
  );
  await database.batch(statements);
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
  const moderators = await database
    .prepare("SELECT id FROM users WHERE role IN ('moderator', 'admin')")
    .all<{ id: string }>();
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
  statements.push(
    ...notificationStatements(
      database,
      moderators.results.map((moderator) => moderator.id),
      viewer.id,
      {
        notificationType: 'moderation_report',
        entityType: 'report',
        entityId: id,
        title: `Новая жалоба: ${topic.title}`,
        body: input.details,
        href: '/moderation',
      },
      now,
    ),
  );
  await database.batch(statements);
  return { ok: true as const, id };
}

export async function listModerationQueue(viewer: CommunityViewer) {
  if (!canModerate(viewer.role)) return null;
  await ensureCommunitySchema();
  const database = getDatabase();
  const [topics, reports, history] = await Promise.all([
    database
      .prepare(
        `SELECT topics.id, topics.slug, topics.title, topics.excerpt, topics.is_commercial,
                topics.commercial_disclosure, topics.created_at,
                topics.assigned_to_id, topics.resubmission_count,
                forum_nodes.title AS forum_title, users.username AS author,
                assigned.username AS assigned_to
         FROM topics
         JOIN forum_nodes ON forum_nodes.id = topics.forum_id
         JOIN users ON users.id = topics.author_id
         LEFT JOIN users AS assigned ON assigned.id = topics.assigned_to_id
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
        assigned_to_id: string | null;
        assigned_to: string | null;
        resubmission_count: number;
      }>(),
    database
      .prepare(
        `SELECT moderation_reports.id, moderation_reports.target_type, moderation_reports.target_id,
                moderation_reports.reason, moderation_reports.details, moderation_reports.created_at,
                users.username AS reporter, topics.slug AS target_slug,
                topics.title AS target_title, assigned.username AS assigned_to
         FROM moderation_reports
         JOIN users ON users.id = moderation_reports.reporter_id
         LEFT JOIN users AS assigned ON assigned.id = moderation_reports.assigned_to_id
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
        assigned_to: string | null;
      }>(),
    database
      .prepare(
        `SELECT moderation_actions.action, moderation_actions.note,
                moderation_actions.created_at, users.username AS actor,
                topics.slug AS topic_slug, topics.title AS topic_title,
                moderation_actions.report_id
         FROM moderation_actions
         JOIN users ON users.id = moderation_actions.actor_user_id
         LEFT JOIN topics ON topics.id = moderation_actions.topic_id
         ORDER BY moderation_actions.created_at DESC
         LIMIT 50`,
      )
      .all<{
        action: string;
        note: string;
        created_at: number;
        actor: string;
        topic_slug: string | null;
        topic_title: string | null;
        report_id: string | null;
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
    history: history.results.map((action) => ({
      ...action,
      created: formatRelativeTime(action.created_at),
    })),
  };
}

export async function moderateTopic(
  viewer: CommunityViewer,
  id: string,
  action: 'approve' | 'reject' | 'block' | 'claim',
  note = '',
) {
  if (!canModerate(viewer.role))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  await ensureCommunitySchema();
  const database = getDatabase();
  const topic = await database
    .prepare(
      `SELECT id, forum_id, author_id, slug, title, status, assigned_to_id
       FROM topics WHERE id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      forum_id: string;
      author_id: string;
      slug: string;
      title: string;
      status: string;
      assigned_to_id: string | null;
    }>();
  if (!topic) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (
    topic.assigned_to_id &&
    topic.assigned_to_id !== viewer.id &&
    viewer.role !== 'admin'
  ) {
    return { ok: false as const, code: 'ALREADY_ASSIGNED' as const };
  }
  const now = Math.floor(Date.now() / 1000);
  if (action === 'claim') {
    if (topic.status !== 'pending')
      return { ok: false as const, code: 'INVALID_STATUS' as const };
    await database.batch([
      database
        .prepare(
          'UPDATE topics SET assigned_to_id = ?, updated_at = ? WHERE id = ?',
        )
        .bind(viewer.id, now, id),
      database
        .prepare(
          `INSERT INTO moderation_actions (
            id, actor_user_id, topic_id, action, note, created_at
          ) VALUES (?, ?, ?, 'claimed', ?, ?)`,
        )
        .bind(crypto.randomUUID(), viewer.id, id, note, now),
    ]);
    return { ok: true as const, status: topic.status };
  }
  if (
    (action === 'approve' || action === 'reject') &&
    topic.status !== 'pending'
  ) {
    return { ok: false as const, code: 'INVALID_STATUS' as const };
  }
  if (action === 'block' && !['pending', 'published'].includes(topic.status)) {
    return { ok: false as const, code: 'INVALID_STATUS' as const };
  }

  const status =
    action === 'approve'
      ? 'published'
      : action === 'reject'
        ? 'rejected'
        : 'blocked';
  const notificationTitle =
    action === 'approve'
      ? `Тема опубликована: ${topic.title}`
      : action === 'reject'
        ? `Тема возвращена на доработку: ${topic.title}`
        : `Тема заблокирована: ${topic.title}`;
  const statements = [
    database
      .prepare(
        `UPDATE topics
         SET status = ?, is_locked = ?, assigned_to_id = ?, moderation_note = ?,
             moderation_decided_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        status,
        action === 'approve' ? 0 : 1,
        viewer.id,
        note || null,
        now,
        now,
        id,
      ),
    database
      .prepare('UPDATE posts SET status = ?, updated_at = ? WHERE topic_id = ?')
      .bind(status, now, id),
    database
      .prepare(
        `INSERT INTO moderation_actions (
          id, actor_user_id, topic_id, action, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), viewer.id, id, action, note, now),
    ...notificationStatements(
      database,
      [topic.author_id],
      viewer.id,
      {
        notificationType: `moderation_${action}`,
        entityType: 'topic',
        entityId: id,
        title: notificationTitle,
        body: note || 'Решение сохранено в истории модерации.',
        href: `/forum/topic/${topic.slug}`,
      },
      now,
    ),
  ];
  if (action === 'approve') {
    const forumSubscribers = await database
      .prepare(
        'SELECT user_id AS id FROM forum_subscriptions WHERE forum_id = ?',
      )
      .bind(topic.forum_id)
      .all<{ id: string }>();
    statements.push(
      database
        .prepare(
          `INSERT INTO community_events (
            id, actor_user_id, event_type, entity_type, entity_id, status, created_at
          ) VALUES (?, ?, 'topic.published', 'topic', ?, 'pending', ?)`,
        )
        .bind(crypto.randomUUID(), viewer.id, id, now),
      ...notificationStatements(
        database,
        forumSubscribers.results.map((subscriber) => subscriber.id),
        topic.author_id,
        {
          notificationType: 'forum_topic',
          entityType: 'topic',
          entityId: id,
          title: `Новая тема: ${topic.title}`,
          body: 'Проверенная тема опубликована в подписанном разделе.',
          href: `/forum/topic/${topic.slug}`,
        },
        now,
      ),
    );
  }
  await database.batch(statements);
  return { ok: true as const, status };
}

export async function resolveModerationReport(
  viewer: CommunityViewer,
  id: string,
  action: 'resolve' | 'dismiss' | 'claim',
  note = '',
) {
  if (!canModerate(viewer.role))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  await ensureCommunitySchema();
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const report = await database
    .prepare(
      `SELECT moderation_reports.id, moderation_reports.reporter_id,
              moderation_reports.assigned_to_id, moderation_reports.status,
              moderation_reports.target_id, topics.slug AS topic_slug,
              topics.title AS topic_title
       FROM moderation_reports
       LEFT JOIN topics
         ON moderation_reports.target_type = 'topic' AND topics.id = moderation_reports.target_id
       WHERE moderation_reports.id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      reporter_id: string;
      assigned_to_id: string | null;
      status: string;
      target_id: string;
      topic_slug: string | null;
      topic_title: string | null;
    }>();
  if (!report || report.status !== 'open')
    return { ok: false as const, code: 'NOT_FOUND' as const };
  if (
    report.assigned_to_id &&
    report.assigned_to_id !== viewer.id &&
    viewer.role !== 'admin'
  ) {
    return { ok: false as const, code: 'ALREADY_ASSIGNED' as const };
  }
  if (action === 'claim') {
    await database.batch([
      database
        .prepare(
          'UPDATE moderation_reports SET assigned_to_id = ?, updated_at = ? WHERE id = ?',
        )
        .bind(viewer.id, now, id),
      database
        .prepare(
          `INSERT INTO moderation_actions (
            id, actor_user_id, report_id, action, note, created_at
          ) VALUES (?, ?, ?, 'claimed', ?, ?)`,
        )
        .bind(crypto.randomUUID(), viewer.id, id, note, now),
    ]);
    return { ok: true as const };
  }
  await database.batch([
    database
      .prepare(
        `UPDATE moderation_reports
         SET status = ?, assigned_to_id = ?, resolved_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        action === 'resolve' ? 'resolved' : 'dismissed',
        viewer.id,
        now,
        now,
        id,
      ),
    database
      .prepare(
        `INSERT INTO moderation_actions (
          id, actor_user_id, report_id, action, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), viewer.id, id, action, note, now),
    ...notificationStatements(
      database,
      [report.reporter_id],
      viewer.id,
      {
        notificationType: `report_${action}`,
        entityType: 'report',
        entityId: id,
        title:
          action === 'resolve'
            ? `Жалоба рассмотрена${report.topic_title ? `: ${report.topic_title}` : ''}`
            : 'Жалоба отклонена',
        body: note || 'Решение модератора сохранено.',
        href: report.topic_slug
          ? `/forum/topic/${report.topic_slug}`
          : '/notifications',
      },
      now,
    ),
  ]);
  return { ok: true as const };
}

export async function resubmitTopic(
  viewer: CommunityViewer,
  slug: string,
  input: { body: string; commercialDisclosure?: string },
) {
  const topic = await getTopicRow(slug);
  if (!topic) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (topic.author_id !== viewer.id)
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  if (topic.status !== 'rejected')
    return { ok: false as const, code: 'INVALID_STATUS' as const };
  if (
    topic.is_commercial &&
    (!input.commercialDisclosure || input.commercialDisclosure.length < 20)
  ) {
    return { ok: false as const, code: 'DISCLOSURE_REQUIRED' as const };
  }

  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const moderators = await database
    .prepare("SELECT id FROM users WHERE role IN ('moderator', 'admin')")
    .all<{ id: string }>();
  await database.batch([
    database
      .prepare(
        `UPDATE topics
         SET excerpt = ?, status = 'pending', is_locked = 0, assigned_to_id = NULL,
             commercial_disclosure = ?, moderation_note = NULL,
             moderation_decided_at = NULL,
             resubmission_count = resubmission_count + 1, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        excerptFromBody(input.body),
        topic.is_commercial
          ? input.commercialDisclosure || topic.commercial_disclosure
          : topic.commercial_disclosure,
        now,
        topic.id,
      ),
    database
      .prepare(
        `UPDATE posts
         SET body = ?, status = 'pending', edited_at = ?, updated_at = ?
         WHERE topic_id = ? AND is_first_post = 1`,
      )
      .bind(input.body, now, now, topic.id),
    database
      .prepare(
        `INSERT INTO moderation_actions (
          id, actor_user_id, topic_id, action, note, created_at
        ) VALUES (?, ?, ?, 'resubmitted', 'Материал обновлён автором', ?)`,
      )
      .bind(crypto.randomUUID(), viewer.id, topic.id, now),
    database
      .prepare(
        `INSERT INTO community_events (
          id, actor_user_id, event_type, entity_type, entity_id, status, created_at
        ) VALUES (?, ?, 'topic.resubmitted', 'topic', ?, 'pending', ?)`,
      )
      .bind(crypto.randomUUID(), viewer.id, topic.id, now),
    ...notificationStatements(
      database,
      moderators.results.map((moderator) => moderator.id),
      viewer.id,
      {
        notificationType: 'moderation_resubmitted',
        entityType: 'topic',
        entityId: topic.id,
        title: `Тема повторно отправлена: ${topic.title}`,
        body: 'Автор внёс изменения после решения модератора.',
        href: '/moderation',
      },
      now,
    ),
  ]);
  return { ok: true as const, status: 'pending' as const };
}
