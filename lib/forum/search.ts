import { getDatabase } from '@/lib/auth/database';
import { canAccessRole } from '@/lib/forum/access';
import { ensureCommunitySchema } from '@/lib/forum/database';
import type { CommunityViewer } from '@/lib/forum/repository';

export type CommunitySearchType = 'all' | 'forum' | 'journal' | 'library';

type SearchCandidate = {
  id: string;
  entity_type: 'topic' | 'article' | 'manual';
  slug: string;
  title: string;
  summary: string;
  searchable_body: string;
  access_level: string;
  author: string;
  updated_at: number;
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

function normalized(value: string) {
  return value.toLocaleLowerCase('ru').replace(/\s+/g, ' ').trim();
}

function matchesCandidate(candidate: SearchCandidate, query: string) {
  const tokens = query.split(' ').filter(Boolean);
  const title = normalized(candidate.title);
  const summary = normalized(candidate.summary);
  const body = normalized(candidate.searchable_body);
  const haystack = `${title} ${summary} ${body}`;
  if (!tokens.every((token) => haystack.includes(token))) return null;
  const rank = title.includes(query)
    ? 0
    : summary.includes(query)
      ? 1
      : tokens.every((token) => title.includes(token))
        ? 2
        : 3;
  return { rank };
}

export async function searchCommunity(
  viewer: CommunityViewer,
  rawQuery: string,
  type: CommunitySearchType = 'all',
) {
  const query = normalized(rawQuery).slice(0, 100);
  if (query.length < 2) return [];
  await ensureCommunitySchema();
  const canReadPro = canAccessRole(viewer.role, 'pro') ? 1 : 0;
  const database = getDatabase();
  const candidates: SearchCandidate[] = [];

  if (type === 'all' || type === 'forum') {
    const topics = await database
      .prepare(
        `SELECT topics.id, 'topic' AS entity_type, topics.slug, topics.title,
                topics.excerpt AS summary,
                COALESCE((
                  SELECT GROUP_CONCAT(posts.body, ' ')
                  FROM posts
                  WHERE posts.topic_id = topics.id
                    AND posts.status = 'published'
                ), '') AS searchable_body,
                topics.access_level, users.username AS author,
                topics.updated_at
         FROM topics
         JOIN users ON users.id = topics.author_id
         WHERE topics.status = 'published'
           AND (topics.access_level = 'member' OR ? = 1)
         ORDER BY topics.updated_at DESC
         LIMIT 300`,
      )
      .bind(canReadPro)
      .all<SearchCandidate>();
    candidates.push(...topics.results);
  }

  if (type === 'all' || type === 'journal' || type === 'library') {
    const contentType =
      type === 'journal' ? 'article' : type === 'library' ? 'manual' : null;
    const content = await database
      .prepare(
        `SELECT content_records.id, content_records.content_type AS entity_type,
                content_records.slug, content_records.title,
                content_records.summary,
                CASE
                  WHEN content_records.access_level = 'member' OR ? = 1
                    THEN content_records.body
                  ELSE ''
                END AS searchable_body,
                content_records.access_level, users.username AS author,
                content_records.updated_at
         FROM content_records
         JOIN users ON users.id = content_records.author_id
         WHERE content_records.status = 'published'
           AND (? IS NULL OR content_records.content_type = ?)
         ORDER BY content_records.updated_at DESC
         LIMIT 300`,
      )
      .bind(canReadPro, contentType, contentType)
      .all<SearchCandidate>();
    candidates.push(...content.results);
  }

  return candidates
    .flatMap((candidate) => {
      const match = matchesCandidate(candidate, query);
      if (!match) return [];
      const kind =
        candidate.entity_type === 'topic'
          ? ('forum' as const)
          : candidate.entity_type === 'article'
            ? ('journal' as const)
            : ('library' as const);
      return [
        {
          id: candidate.id,
          kind,
          title: candidate.title,
          summary: candidate.summary,
          author: candidate.author,
          access:
            candidate.access_level === 'pro'
              ? ('pro' as const)
              : ('member' as const),
          locked: !canAccessRole(viewer.role, candidate.access_level),
          href:
            kind === 'forum'
              ? `/forum/topic/${candidate.slug}`
              : `/${kind}/${candidate.slug}`,
          updated: formatRelativeTime(candidate.updated_at),
          updatedAt: candidate.updated_at,
          rank: match.rank,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.rank - right.rank || right.updatedAt - left.updatedAt,
    )
    .slice(0, 50);
}

export type CommunitySearchResult = Awaited<
  ReturnType<typeof searchCommunity>
>[number];
