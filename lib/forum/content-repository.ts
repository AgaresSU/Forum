import { getDatabase } from '@/lib/auth/database';
import { canAccessRole } from '@/lib/forum/access';
import { ensureCommunitySchema } from '@/lib/forum/database';
import type { CommunityViewer } from '@/lib/forum/repository';

export type EditorialContentType = 'article' | 'manual';

type EditorialRow = {
  id: string;
  content_type: string;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  body_length: number;
  access_level: string;
  revision: number;
  is_commercial: number;
  commercial_disclosure: string | null;
  published_at: number;
  updated_at: number;
  author: string;
  discussion_slug: string | null;
  category: string | null;
};

function formatRelativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (seconds < 60) return 'только что';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин. назад`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} ч. назад`;
  if (seconds < 172_800) return 'вчера';
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)} дн. назад`;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp * 1000));
}

function readingMinutes(bodyLength: number) {
  return Math.max(2, Math.ceil(bodyLength / 1_100));
}

function mapEditorialRow(row: EditorialRow, viewerRole?: string) {
  const locked = viewerRole
    ? !canAccessRole(viewerRole, row.access_level)
    : false;
  return {
    id: row.id,
    contentType: row.content_type as EditorialContentType,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: locked || !row.body ? [] : row.body.split(/\n{2,}/).filter(Boolean),
    author: row.author,
    category:
      row.category ||
      (row.content_type === 'manual' ? 'База знаний' : 'Журнал'),
    access: row.access_level === 'pro' ? ('pro' as const) : ('member' as const),
    locked,
    revision: row.revision,
    commercial: Boolean(row.is_commercial),
    commercialDisclosure: row.commercial_disclosure,
    discussionSlug: row.discussion_slug,
    readingMinutes: readingMinutes(row.body_length),
    publishedAt: row.published_at,
    published: formatRelativeTime(row.published_at),
    updated: formatRelativeTime(row.updated_at),
  };
}

const editorialSelect = `
  SELECT content_records.id, content_records.content_type, content_records.slug,
         content_records.title, content_records.summary, NULL AS body,
         LENGTH(content_records.body) AS body_length,
         content_records.access_level, content_records.revision,
         content_records.is_commercial, content_records.commercial_disclosure,
         content_records.published_at, content_records.updated_at,
         users.username AS author, topics.slug AS discussion_slug,
         forum_nodes.title AS category
  FROM content_records
  JOIN users ON users.id = content_records.author_id
  LEFT JOIN topics ON topics.id = content_records.discussion_topic_id
  LEFT JOIN forum_nodes ON forum_nodes.id = topics.forum_id
`;

export async function listEditorialContent(
  contentType: EditorialContentType,
  viewer: CommunityViewer,
) {
  await ensureCommunitySchema();
  const result = await getDatabase()
    .prepare(
      `${editorialSelect}
       WHERE content_records.content_type = ?
         AND content_records.status = 'published'
         AND content_records.published_at IS NOT NULL
       ORDER BY content_records.published_at DESC, content_records.title ASC`,
    )
    .bind(contentType)
    .all<EditorialRow>();
  return result.results.map((row) => mapEditorialRow(row, viewer.role));
}

async function findEditorialContent(
  contentType: EditorialContentType,
  slug: string,
) {
  await ensureCommunitySchema();
  return getDatabase()
    .prepare(
      `${editorialSelect}
       WHERE content_records.content_type = ?
         AND content_records.slug = ?
         AND content_records.status = 'published'
       LIMIT 1`,
    )
    .bind(contentType, slug)
    .first<EditorialRow>();
}

export async function getEditorialContent(
  contentType: EditorialContentType,
  slug: string,
  viewer: CommunityViewer,
) {
  const row = await findEditorialContent(contentType, slug);
  if (!row) return null;
  if (canAccessRole(viewer.role, row.access_level)) {
    const body = await getDatabase()
      .prepare(
        "SELECT body FROM content_records WHERE id = ? AND status = 'published'",
      )
      .bind(row.id)
      .first<{ body: string }>();
    row.body = body?.body || null;
  }
  return mapEditorialRow(row, viewer.role);
}

export async function getEditorialContentMetadata(
  contentType: EditorialContentType,
  slug: string,
) {
  const row = await findEditorialContent(contentType, slug);
  return row ? { title: row.title, summary: row.summary } : null;
}

export type EditorialContentRecord = NonNullable<
  Awaited<ReturnType<typeof getEditorialContent>>
>;
