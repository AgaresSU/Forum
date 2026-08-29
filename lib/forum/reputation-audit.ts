import { getDatabase } from '@/lib/auth/database';
import { ensureCommunitySchema } from '@/lib/forum/database';
import type { CommunityViewer } from '@/lib/forum/repository';

type ReputationEventRow = {
  id: string;
  actor_user_id: string | null;
  recipient_user_id: string | null;
  actor_username: string;
  recipient_username: string;
  target_type: string;
  target_id: string;
  action: 'added' | 'replaced' | 'removed';
  previous_reaction_type: string | null;
  reaction_type: string | null;
  score_delta: number;
  created_at: number;
};

export type ReputationRisk = 'burst' | 'pair' | 'churn';

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000));
}

function identity(id: string | null, username: string) {
  return id || `deleted:${username}`;
}

export async function listReputationAudit(
  actor: CommunityViewer,
  filters: { query?: string; action?: string; risk?: string } = {},
) {
  if (actor.role !== 'admin') return null;
  await ensureCommunitySchema();
  const result = await getDatabase()
    .prepare(
      `SELECT id, actor_user_id, recipient_user_id, actor_username,
              recipient_username, target_type, target_id, action,
              previous_reaction_type, reaction_type, score_delta, created_at
       FROM reputation_events
       ORDER BY created_at DESC, id DESC
       LIMIT 1000`,
    )
    .all<ReputationEventRow>();

  const actorHour = new Map<string, number>();
  const pairDay = new Map<string, number>();
  const targetWindow = new Map<string, number>();
  for (const event of result.results) {
    const actorKey = identity(event.actor_user_id, event.actor_username);
    const recipientKey = identity(
      event.recipient_user_id,
      event.recipient_username,
    );
    const hourKey = `${actorKey}:${Math.floor(event.created_at / 3600)}`;
    const dayKey = `${actorKey}:${recipientKey}:${Math.floor(event.created_at / 86400)}`;
    const targetKey = `${actorKey}:${event.target_type}:${event.target_id}:${Math.floor(event.created_at / 600)}`;
    actorHour.set(hourKey, (actorHour.get(hourKey) || 0) + 1);
    pairDay.set(dayKey, (pairDay.get(dayKey) || 0) + 1);
    targetWindow.set(targetKey, (targetWindow.get(targetKey) || 0) + 1);
  }

  const withRisk = result.results.map((event) => {
    const actorKey = identity(event.actor_user_id, event.actor_username);
    const recipientKey = identity(
      event.recipient_user_id,
      event.recipient_username,
    );
    const flags: ReputationRisk[] = [];
    if (
      (actorHour.get(`${actorKey}:${Math.floor(event.created_at / 3600)}`) ||
        0) >= 20
    ) {
      flags.push('burst');
    }
    if (
      (pairDay.get(
        `${actorKey}:${recipientKey}:${Math.floor(event.created_at / 86400)}`,
      ) || 0) >= 8
    ) {
      flags.push('pair');
    }
    if (
      (targetWindow.get(
        `${actorKey}:${event.target_type}:${event.target_id}:${Math.floor(event.created_at / 600)}`,
      ) || 0) >= 4
    ) {
      flags.push('churn');
    }
    return { ...event, flags, created: formatDate(event.created_at) };
  });

  const query = filters.query?.trim().toLocaleLowerCase('ru') || '';
  const events = withRisk.filter((event) => {
    if (
      query &&
      !`${event.actor_username} ${event.recipient_username} ${event.target_type} ${event.target_id}`
        .toLocaleLowerCase('ru')
        .includes(query)
    ) {
      return false;
    }
    if (
      filters.action &&
      filters.action !== 'all' &&
      event.action !== filters.action
    ) {
      return false;
    }
    if (filters.risk === 'flagged' && !event.flags.length) return false;
    if (
      filters.risk &&
      !['all', 'flagged'].includes(filters.risk) &&
      !event.flags.includes(filters.risk as ReputationRisk)
    ) {
      return false;
    }
    return true;
  });

  const now = Math.floor(Date.now() / 1000);
  const lastDay = withRisk.filter((event) => event.created_at >= now - 86400);
  return {
    events,
    stats: {
      lastDay: lastDay.length,
      netScore: lastDay.reduce((total, event) => total + event.score_delta, 0),
      flagged: withRisk.filter((event) => event.flags.length > 0).length,
      actors: new Set(
        lastDay.map((event) =>
          identity(event.actor_user_id, event.actor_username),
        ),
      ).size,
    },
    scanned: withRisk.length,
  };
}
