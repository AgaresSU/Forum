import { getDatabase } from '@/lib/auth/database';
import { canAccessRole } from '@/lib/forum/access';
import { ensureCommunitySchema } from '@/lib/forum/database';
import type { CommunityViewer } from '@/lib/forum/repository';

export type ReactionTargetType = 'topic' | 'post' | 'content';
export type ReactionType = 'helpful' | 'insightful' | 'thanks';

export type ReactionSummary = {
  counts: Record<ReactionType, number>;
  myReaction: ReactionType | null;
};

export type ContributionSummary = {
  score: number;
  reactions: number;
  label: string;
};

type ReactionTarget = {
  targetType: ReactionTargetType;
  targetId: string;
};

type ResolvedTarget = {
  authorId: string;
  accessLevel: string;
  status: string;
  firstPost?: boolean;
};

const reactionWeights: Record<ReactionType, number> = {
  helpful: 2,
  insightful: 3,
  thanks: 1,
};

function emptyReactionSummary(): ReactionSummary {
  return {
    counts: { helpful: 0, insightful: 0, thanks: 0 },
    myReaction: null,
  };
}

function targetKey(targetType: ReactionTargetType, targetId: string) {
  return `${targetType}:${targetId}`;
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function contributionLabel(score: number) {
  if (score >= 50) return 'Экспертный вклад';
  if (score >= 20) return 'Надёжный участник';
  if (score >= 5) return 'Полезный участник';
  return 'Новый вклад';
}

async function resolveTarget(
  targetType: ReactionTargetType,
  targetId: string,
): Promise<ResolvedTarget | null> {
  const database = getDatabase();
  if (targetType === 'topic') {
    return database
      .prepare(
        `SELECT author_id AS authorId, access_level AS accessLevel, status
         FROM topics WHERE id = ?`,
      )
      .bind(targetId)
      .first<ResolvedTarget>();
  }
  if (targetType === 'post') {
    return database
      .prepare(
        `SELECT posts.author_id AS authorId,
                topics.access_level AS accessLevel,
                CASE
                  WHEN posts.status = 'published' AND topics.status = 'published'
                    THEN 'published'
                  ELSE 'unavailable'
                END AS status,
                posts.is_first_post AS firstPost
         FROM posts
         JOIN topics ON topics.id = posts.topic_id
         WHERE posts.id = ?`,
      )
      .bind(targetId)
      .first<ResolvedTarget>();
  }
  return database
    .prepare(
      `SELECT author_id AS authorId, access_level AS accessLevel, status
       FROM content_records WHERE id = ?`,
    )
    .bind(targetId)
    .first<ResolvedTarget>();
}

export async function setReaction(
  viewer: CommunityViewer,
  input: ReactionTarget & { reactionType: ReactionType },
) {
  await ensureCommunitySchema();
  const target = await resolveTarget(input.targetType, input.targetId);
  if (!target) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (target.firstPost)
    return { ok: false as const, code: 'FIRST_POST_USE_TOPIC' as const };
  if (
    target.status !== 'published' ||
    !canAccessRole(viewer.role, target.accessLevel)
  ) {
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  }
  if (target.authorId === viewer.id)
    return { ok: false as const, code: 'OWN_TARGET' as const };

  const database = getDatabase();
  const existing = await database
    .prepare(
      `SELECT id, reaction_type FROM reactions
       WHERE user_id = ? AND target_type = ? AND target_id = ?`,
    )
    .bind(viewer.id, input.targetType, input.targetId)
    .first<{ id: string; reaction_type: string }>();
  const now = Math.floor(Date.now() / 1000);
  let selected: ReactionType | null = input.reactionType;
  if (existing?.reaction_type === input.reactionType) {
    await database
      .prepare('DELETE FROM reactions WHERE id = ? AND user_id = ?')
      .bind(existing.id, viewer.id)
      .run();
    selected = null;
  } else if (existing) {
    await database
      .prepare(
        'UPDATE reactions SET reaction_type = ?, created_at = ? WHERE id = ? AND user_id = ?',
      )
      .bind(input.reactionType, now, existing.id, viewer.id)
      .run();
  } else {
    await database
      .prepare(
        `INSERT INTO reactions (
          id, user_id, target_type, target_id, reaction_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        viewer.id,
        input.targetType,
        input.targetId,
        input.reactionType,
        now,
      )
      .run();
  }
  const summary = await getReactionSummary(
    viewer.id,
    input.targetType,
    input.targetId,
  );
  return { ok: true as const, selected, summary };
}

export async function getReactionSummary(
  viewerId: string,
  targetType: ReactionTargetType,
  targetId: string,
) {
  const result = await getReactionSummaries(viewerId, [
    { targetType, targetId },
  ]);
  return result.get(targetKey(targetType, targetId)) || emptyReactionSummary();
}

export async function getReactionSummaries(
  viewerId: string,
  targets: ReactionTarget[],
) {
  await ensureCommunitySchema();
  const summaries = new Map<string, ReactionSummary>();
  for (const target of targets) {
    summaries.set(
      targetKey(target.targetType, target.targetId),
      emptyReactionSummary(),
    );
  }

  const database = getDatabase();
  for (const targetType of ['topic', 'post', 'content'] as const) {
    const ids = [
      ...new Set(
        targets
          .filter((target) => target.targetType === targetType)
          .map((target) => target.targetId),
      ),
    ];
    for (const group of chunks(ids, 80)) {
      if (!group.length) continue;
      const placeholders = group.map(() => '?').join(', ');
      const result = await database
        .prepare(
          `SELECT target_id, reaction_type, COUNT(*) AS count,
                  MAX(CASE WHEN user_id = ? THEN reaction_type END) AS my_reaction
           FROM reactions
           WHERE target_type = ? AND target_id IN (${placeholders})
           GROUP BY target_id, reaction_type`,
        )
        .bind(viewerId, targetType, ...group)
        .all<{
          target_id: string;
          reaction_type: ReactionType;
          count: number;
          my_reaction: ReactionType | null;
        }>();
      for (const row of result.results) {
        const summary = summaries.get(targetKey(targetType, row.target_id));
        if (!summary || !(row.reaction_type in reactionWeights)) continue;
        summary.counts[row.reaction_type] = row.count;
        if (row.my_reaction) summary.myReaction = row.my_reaction;
      }
    }
  }
  return summaries;
}

export async function getContributionSummaries(userIds: string[]) {
  await ensureCommunitySchema();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const summaries = new Map<string, ContributionSummary>();
  for (const userId of uniqueIds) {
    summaries.set(userId, { score: 0, reactions: 0, label: 'Новый вклад' });
  }
  const database = getDatabase();
  for (const group of chunks(uniqueIds, 80)) {
    if (!group.length) continue;
    const placeholders = group.map(() => '?').join(', ');
    const result = await database
      .prepare(
        `SELECT recipient_id,
                SUM(CASE reaction_type
                  WHEN 'insightful' THEN 3 WHEN 'helpful' THEN 2 ELSE 1 END
                ) AS score,
                COUNT(*) AS reactions
         FROM (
           SELECT topics.author_id AS recipient_id, reactions.reaction_type
           FROM reactions
           JOIN topics ON reactions.target_type = 'topic'
                      AND reactions.target_id = topics.id
           WHERE topics.status = 'published'
           UNION ALL
           SELECT posts.author_id AS recipient_id, reactions.reaction_type
           FROM reactions
           JOIN posts ON reactions.target_type = 'post'
                     AND reactions.target_id = posts.id
           JOIN topics ON topics.id = posts.topic_id
           WHERE posts.status = 'published' AND topics.status = 'published'
             AND posts.is_first_post = 0
           UNION ALL
           SELECT content_records.author_id AS recipient_id,
                  reactions.reaction_type
           FROM reactions
           JOIN content_records ON reactions.target_type = 'content'
                               AND reactions.target_id = content_records.id
           WHERE content_records.status = 'published'
         ) AS received
         WHERE recipient_id IN (${placeholders})
         GROUP BY recipient_id`,
      )
      .bind(...group)
      .all<{ recipient_id: string; score: number; reactions: number }>();
    for (const row of result.results) {
      summaries.set(row.recipient_id, {
        score: row.score,
        reactions: row.reactions,
        label: contributionLabel(row.score),
      });
    }
  }
  return summaries;
}

export function reactionSummaryKey(
  targetType: ReactionTargetType,
  targetId: string,
) {
  return targetKey(targetType, targetId);
}
