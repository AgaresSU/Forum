import { getDatabase } from '@/lib/auth/database';
import { canModerate } from '@/lib/forum/access';
import { ensureCommunitySchema } from '@/lib/forum/database';
import { notificationStatements } from '@/lib/forum/notifications';
import type { CommunityViewer } from '@/lib/forum/repository';

const editorialRoles = new Set(['author', 'expert', 'moderator', 'admin']);

export type EditorialWorkflowInput = {
  title: string;
  summary: string;
  body: string;
  accessLevel: 'member' | 'pro';
  isCommercial: boolean;
  commercialDisclosure?: string;
  discussionSlug?: string;
  changeNote?: string;
};

type ContentBaseRow = {
  id: string;
  author_id: string;
  content_type: 'article' | 'manual';
  slug: string;
  status: string;
  revision: number;
  published_at: number | null;
  author: string;
};

type RevisionRow = {
  id: string;
  revision: number;
  workflow_status: string;
  title: string;
  summary: string;
  body: string;
  access_level: string;
  is_commercial: number;
  commercial_disclosure: string | null;
  change_note: string;
  created_at: number;
  editor: string;
  discussion_slug: string | null;
};

export function canUseEditorialWorkspace(role: string) {
  return editorialRoles.has(role);
}

export function canManageEditorialWorkflow(role: string) {
  return canModerate(role);
}

function canEditRecord(actor: CommunityViewer, record: ContentBaseRow) {
  return (
    canUseEditorialWorkspace(actor.role) &&
    (canManageEditorialWorkflow(actor.role) || record.author_id === actor.id)
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

function makeContentSlug(title: string) {
  const base = title
    .toLocaleLowerCase('ru')
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return `${base || 'material'}-${crypto.randomUUID().slice(0, 8)}`;
}

async function resolveDiscussionTopic(
  actor: CommunityViewer,
  discussionSlug: string | undefined,
  accessLevel: 'member' | 'pro',
) {
  const normalized = discussionSlug?.trim();
  if (!normalized) return { ok: true as const, topicId: null, topicSlug: null };
  const topic = await getDatabase()
    .prepare(
      `SELECT id, slug, author_id, status, access_level
       FROM topics WHERE slug = ?`,
    )
    .bind(normalized)
    .first<{
      id: string;
      slug: string;
      author_id: string;
      status: string;
      access_level: string;
    }>();
  if (!topic)
    return { ok: false as const, code: 'DISCUSSION_NOT_FOUND' as const };
  if (
    topic.status !== 'published' &&
    topic.author_id !== actor.id &&
    !canManageEditorialWorkflow(actor.role)
  ) {
    return { ok: false as const, code: 'DISCUSSION_ACCESS_DENIED' as const };
  }
  if (accessLevel === 'member' && topic.access_level === 'pro') {
    return { ok: false as const, code: 'DISCUSSION_ACCESS_MISMATCH' as const };
  }
  return { ok: true as const, topicId: topic.id, topicSlug: topic.slug };
}

async function getContentBase(id: string) {
  return getDatabase()
    .prepare(
      `SELECT content_records.id, content_records.author_id,
              content_records.content_type, content_records.slug,
              content_records.status, content_records.revision,
              content_records.published_at, users.username AS author
       FROM content_records
       JOIN users ON users.id = content_records.author_id
       WHERE content_records.id = ?`,
    )
    .bind(id)
    .first<ContentBaseRow>();
}

async function nextRevisionNumber(contentRecordId: string) {
  const result = await getDatabase()
    .prepare(
      'SELECT COALESCE(MAX(revision), 0) + 1 AS revision FROM content_revisions WHERE content_record_id = ?',
    )
    .bind(contentRecordId)
    .first<{ revision: number }>();
  return result?.revision || 1;
}

export async function createEditorialRecord(
  actor: CommunityViewer,
  input: EditorialWorkflowInput & { contentType: 'article' | 'manual' },
) {
  if (!canUseEditorialWorkspace(actor.role))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  await ensureCommunitySchema();
  const discussion = await resolveDiscussionTopic(
    actor,
    input.discussionSlug,
    input.accessLevel,
  );
  if (!discussion.ok) return discussion;

  const database = getDatabase();
  const id = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const slug = makeContentSlug(input.title);
  const now = Math.floor(Date.now() / 1000);
  await database.batch([
    database
      .prepare(
        `INSERT INTO content_records (
          id, author_id, discussion_topic_id, content_type, slug, title,
          summary, body, status, access_level, revision, is_commercial,
          commercial_disclosure, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 1, ?, ?, NULL, ?, ?)`,
      )
      .bind(
        id,
        actor.id,
        discussion.topicId,
        input.contentType,
        slug,
        input.title,
        input.summary,
        input.body,
        input.accessLevel,
        input.isCommercial ? 1 : 0,
        input.isCommercial ? input.commercialDisclosure || null : null,
        now,
        now,
      ),
    database
      .prepare(
        `INSERT INTO content_revisions (
          id, content_record_id, editor_id, discussion_topic_id, revision,
          workflow_status, title, summary, body, access_level, is_commercial,
          commercial_disclosure, change_note, created_at
        ) VALUES (?, ?, ?, ?, 1, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        revisionId,
        id,
        actor.id,
        discussion.topicId,
        input.title,
        input.summary,
        input.body,
        input.accessLevel,
        input.isCommercial ? 1 : 0,
        input.isCommercial ? input.commercialDisclosure || null : null,
        input.changeNote || 'Создан черновик',
        now,
      ),
  ]);
  return { ok: true as const, id, slug, revision: 1 };
}

export async function listEditorialWorkspace(actor: CommunityViewer) {
  if (!canUseEditorialWorkspace(actor.role)) return null;
  await ensureCommunitySchema();
  const manager = canManageEditorialWorkflow(actor.role) ? 1 : 0;
  const result = await getDatabase()
    .prepare(
      `SELECT content_records.id, content_records.content_type,
              content_records.slug, content_records.status AS public_status,
              content_records.published_at, users.username AS author,
              latest.revision, latest.workflow_status, latest.title,
              latest.created_at, editor.username AS editor,
              topics.slug AS discussion_slug
       FROM content_records
       JOIN users ON users.id = content_records.author_id
       JOIN content_revisions AS latest
         ON latest.content_record_id = content_records.id
        AND latest.revision = (
          SELECT MAX(candidate.revision)
          FROM content_revisions AS candidate
          WHERE candidate.content_record_id = content_records.id
        )
       JOIN users AS editor ON editor.id = latest.editor_id
       LEFT JOIN topics ON topics.id = latest.discussion_topic_id
       WHERE (? = 1 OR content_records.author_id = ?)
       ORDER BY
         CASE latest.workflow_status
           WHEN 'pending' THEN 0 WHEN 'draft' THEN 1
           WHEN 'rejected' THEN 2 ELSE 3
         END,
         latest.created_at DESC
       LIMIT 100`,
    )
    .bind(manager, actor.id)
    .all<{
      id: string;
      content_type: string;
      slug: string;
      public_status: string;
      published_at: number | null;
      author: string;
      revision: number;
      workflow_status: string;
      title: string;
      created_at: number;
      editor: string;
      discussion_slug: string | null;
    }>();
  return result.results.map((record) => ({
    ...record,
    created: formatRelativeTime(record.created_at),
  }));
}

export async function getEditorialWorkspaceRecord(
  actor: CommunityViewer,
  id: string,
) {
  if (!canUseEditorialWorkspace(actor.role)) return null;
  await ensureCommunitySchema();
  const base = await getContentBase(id);
  if (!base || !canEditRecord(actor, base)) return null;

  const database = getDatabase();
  const [latest, history] = await Promise.all([
    database
      .prepare(
        `SELECT content_revisions.id, content_revisions.revision,
                content_revisions.workflow_status, content_revisions.title,
                content_revisions.summary, content_revisions.body,
                content_revisions.access_level,
                content_revisions.is_commercial,
                content_revisions.commercial_disclosure,
                content_revisions.change_note, content_revisions.created_at,
                users.username AS editor, topics.slug AS discussion_slug
         FROM content_revisions
         JOIN users ON users.id = content_revisions.editor_id
         LEFT JOIN topics ON topics.id = content_revisions.discussion_topic_id
         WHERE content_revisions.content_record_id = ?
         ORDER BY content_revisions.revision DESC
         LIMIT 1`,
      )
      .bind(id)
      .first<RevisionRow>(),
    database
      .prepare(
        `SELECT content_revisions.revision,
                content_revisions.workflow_status,
                content_revisions.title, content_revisions.change_note,
                content_revisions.created_at, users.username AS editor,
                topics.slug AS discussion_slug
         FROM content_revisions
         JOIN users ON users.id = content_revisions.editor_id
         LEFT JOIN topics ON topics.id = content_revisions.discussion_topic_id
         WHERE content_revisions.content_record_id = ?
         ORDER BY content_revisions.revision DESC
         LIMIT 50`,
      )
      .bind(id)
      .all<{
        revision: number;
        workflow_status: string;
        title: string;
        change_note: string;
        created_at: number;
        editor: string;
        discussion_slug: string | null;
      }>(),
  ]);
  if (!latest) return null;
  return {
    id: base.id,
    contentType: base.content_type,
    slug: base.slug,
    author: base.author,
    publicStatus: base.status,
    publishedAt: base.published_at,
    canPublish: canManageEditorialWorkflow(actor.role),
    latest: {
      revision: latest.revision,
      workflowStatus: latest.workflow_status,
      title: latest.title,
      summary: latest.summary,
      body: latest.body,
      accessLevel:
        latest.access_level === 'pro' ? ('pro' as const) : ('member' as const),
      isCommercial: Boolean(latest.is_commercial),
      commercialDisclosure: latest.commercial_disclosure || '',
      changeNote: latest.change_note,
      discussionSlug: latest.discussion_slug || '',
      editor: latest.editor,
      created: formatRelativeTime(latest.created_at),
    },
    history: history.results.map((revision) => ({
      ...revision,
      created: formatRelativeTime(revision.created_at),
    })),
  };
}

export async function appendEditorialRevision(
  actor: CommunityViewer,
  id: string,
  action: 'save' | 'submit' | 'publish' | 'reject',
  input: EditorialWorkflowInput,
) {
  if (!canUseEditorialWorkspace(actor.role))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  await ensureCommunitySchema();
  const base = await getContentBase(id);
  if (!base) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (!canEditRecord(actor, base))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  const manager = canManageEditorialWorkflow(actor.role);
  if ((action === 'publish' || action === 'reject') && !manager) {
    return { ok: false as const, code: 'PUBLISH_DENIED' as const };
  }

  const database = getDatabase();
  const latest = await database
    .prepare(
      `SELECT workflow_status FROM content_revisions
       WHERE content_record_id = ? ORDER BY revision DESC LIMIT 1`,
    )
    .bind(id)
    .first<{ workflow_status: string }>();
  if (action === 'reject' && latest?.workflow_status !== 'pending') {
    return { ok: false as const, code: 'INVALID_STATUS' as const };
  }
  const discussion = await resolveDiscussionTopic(
    actor,
    input.discussionSlug,
    input.accessLevel,
  );
  if (!discussion.ok) return discussion;

  const revision = await nextRevisionNumber(id);
  const workflowStatus =
    action === 'save'
      ? 'draft'
      : action === 'submit'
        ? 'pending'
        : action === 'publish'
          ? 'published'
          : 'rejected';
  const now = Math.floor(Date.now() / 1000);
  const statements = [
    database
      .prepare(
        `INSERT INTO content_revisions (
          id, content_record_id, editor_id, discussion_topic_id, revision,
          workflow_status, title, summary, body, access_level, is_commercial,
          commercial_disclosure, change_note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        id,
        actor.id,
        discussion.topicId,
        revision,
        workflowStatus,
        input.title,
        input.summary,
        input.body,
        input.accessLevel,
        input.isCommercial ? 1 : 0,
        input.isCommercial ? input.commercialDisclosure || null : null,
        input.changeNote || '',
        now,
      ),
  ];

  if (action === 'publish') {
    statements.push(
      database
        .prepare(
          `UPDATE content_records
           SET discussion_topic_id = ?, title = ?, summary = ?, body = ?,
               status = 'published', access_level = ?, revision = ?,
               is_commercial = ?, commercial_disclosure = ?,
               published_at = COALESCE(published_at, ?), updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          discussion.topicId,
          input.title,
          input.summary,
          input.body,
          input.accessLevel,
          revision,
          input.isCommercial ? 1 : 0,
          input.isCommercial ? input.commercialDisclosure || null : null,
          now,
          now,
          id,
        ),
      database
        .prepare(
          `INSERT INTO community_events (
            id, actor_user_id, event_type, entity_type, entity_id, status, created_at
          ) VALUES (?, ?, 'content.published', 'content', ?, 'pending', ?)`,
        )
        .bind(crypto.randomUUID(), actor.id, id, now),
    );
  } else if (base.status === 'published') {
    statements.push(
      database
        .prepare('UPDATE content_records SET updated_at = ? WHERE id = ?')
        .bind(now, id),
    );
  } else {
    statements.push(
      database
        .prepare(
          `UPDATE content_records
           SET discussion_topic_id = ?, title = ?, summary = ?, body = ?,
               status = ?, access_level = ?, revision = ?, is_commercial = ?,
               commercial_disclosure = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          discussion.topicId,
          input.title,
          input.summary,
          input.body,
          workflowStatus,
          input.accessLevel,
          revision,
          input.isCommercial ? 1 : 0,
          input.isCommercial ? input.commercialDisclosure || null : null,
          now,
          id,
        ),
    );
  }

  if (action === 'submit') {
    const moderators = await database
      .prepare("SELECT id FROM users WHERE role IN ('moderator', 'admin')")
      .all<{ id: string }>();
    statements.push(
      ...notificationStatements(
        database,
        moderators.results.map((user) => user.id),
        actor.id,
        {
          notificationType: 'editorial_pending',
          entityType: 'content',
          entityId: id,
          title: `Материал ожидает редакции: ${input.title}`,
          body:
            input.changeNote || 'Автор отправил новую редакцию на проверку.',
          href: `/editor/${id}`,
        },
        now,
      ),
    );
  }
  if (action === 'publish' || action === 'reject') {
    statements.push(
      ...notificationStatements(
        database,
        [base.author_id],
        actor.id,
        {
          notificationType: `editorial_${action}`,
          entityType: 'content',
          entityId: id,
          title:
            action === 'publish'
              ? `Материал опубликован: ${input.title}`
              : `Материал возвращён: ${input.title}`,
          body:
            input.changeNote ||
            (action === 'publish'
              ? 'Новая редакция опубликована.'
              : 'Материал требует доработки.'),
          href: `/editor/${id}`,
        },
        now,
      ),
    );
  }
  await database.batch(statements);
  return { ok: true as const, revision, workflowStatus };
}

export async function restoreEditorialRevision(
  actor: CommunityViewer,
  id: string,
  revisionToRestore: number,
) {
  if (!canUseEditorialWorkspace(actor.role))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  await ensureCommunitySchema();
  const base = await getContentBase(id);
  if (!base) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (!canEditRecord(actor, base))
    return { ok: false as const, code: 'ACCESS_DENIED' as const };

  const database = getDatabase();
  const source = await database
    .prepare(
      `SELECT discussion_topic_id, title, summary, body, access_level,
              is_commercial, commercial_disclosure
       FROM content_revisions
       WHERE content_record_id = ? AND revision = ?`,
    )
    .bind(id, revisionToRestore)
    .first<{
      discussion_topic_id: string | null;
      title: string;
      summary: string;
      body: string;
      access_level: string;
      is_commercial: number;
      commercial_disclosure: string | null;
    }>();
  if (!source)
    return { ok: false as const, code: 'REVISION_NOT_FOUND' as const };
  const revision = await nextRevisionNumber(id);
  const now = Math.floor(Date.now() / 1000);
  const statements = [
    database
      .prepare(
        `INSERT INTO content_revisions (
          id, content_record_id, editor_id, discussion_topic_id, revision,
          workflow_status, title, summary, body, access_level, is_commercial,
          commercial_disclosure, change_note, created_at
        ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        id,
        actor.id,
        source.discussion_topic_id,
        revision,
        source.title,
        source.summary,
        source.body,
        source.access_level,
        source.is_commercial,
        source.commercial_disclosure,
        `Восстановлена редакция ${revisionToRestore}`,
        now,
      ),
  ];
  if (base.status === 'published') {
    statements.push(
      database
        .prepare('UPDATE content_records SET updated_at = ? WHERE id = ?')
        .bind(now, id),
    );
  } else {
    statements.push(
      database
        .prepare(
          `UPDATE content_records
           SET discussion_topic_id = ?, title = ?, summary = ?, body = ?,
               status = 'draft', access_level = ?, revision = ?,
               is_commercial = ?, commercial_disclosure = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          source.discussion_topic_id,
          source.title,
          source.summary,
          source.body,
          source.access_level,
          revision,
          source.is_commercial,
          source.commercial_disclosure,
          now,
          id,
        ),
    );
  }
  await database.batch(statements);
  return { ok: true as const, revision, workflowStatus: 'draft' as const };
}
