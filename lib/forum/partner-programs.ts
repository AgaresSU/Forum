import { getDatabase } from '@/lib/auth/database';
import { ensureCommunitySchema, recordCommunityEvent } from '@/lib/forum/database';
import type { CommunityViewer } from '@/lib/forum/repository';

export const partnerProgramCategories = {
  hosting: 'Хостинг и инфраструктура',
  devtools: 'Инструменты разработки',
  education: 'Образование',
  saas: 'SaaS и сервисы',
  finance: 'Финансовые сервисы',
  other: 'Другое',
} as const;

export type PartnerProgramCategory = keyof typeof partnerProgramCategories;

type PartnerProgramRow = {
  id: string;
  slug: string;
  name: string;
  category: PartnerProgramCategory;
  description: string;
  website_url: string;
  referral_url: string;
  reward_summary: string;
  payout_terms: string;
  commercial_disclosure: string;
  status: 'pending' | 'published' | 'paused' | 'rejected';
  moderation_note: string | null;
  submitted_by_id: string;
  submitted_by: string;
  reviewed_by: string | null;
  reviewed_at: number | null;
  created_at: number;
  updated_at: number;
  clicks_30d: number;
  participants_30d: number;
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp * 1000));
}

function mapProgram(row: PartnerProgramRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    categoryLabel: partnerProgramCategories[row.category],
    description: row.description,
    websiteUrl: row.website_url,
    referralUrl: row.referral_url,
    websiteHost: new URL(row.website_url).hostname.replace(/^www\./, ''),
    rewardSummary: row.reward_summary,
    payoutTerms: row.payout_terms,
    commercialDisclosure: row.commercial_disclosure,
    status: row.status,
    moderationNote: row.moderation_note,
    submittedById: row.submitted_by_id,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? formatDate(row.reviewed_at) : null,
    created: formatDate(row.created_at),
    updated: formatDate(row.updated_at),
    clicks30d: row.clicks_30d,
    participants30d: row.participants_30d,
  };
}

export type PartnerProgram = ReturnType<typeof mapProgram>;

function slugify(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return normalized || 'program';
}

async function uniqueSlug(name: string) {
  const database = getDatabase();
  const base = slugify(name);
  const existing = await database
    .prepare('SELECT 1 FROM partner_programs WHERE slug = ?')
    .bind(base)
    .first();
  if (!existing) return base;
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function listPartnerPrograms(
  viewer: CommunityViewer,
  filters: { query?: string; category?: string } = {},
) {
  await ensureCommunitySchema();
  const database = getDatabase();
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (viewer.role === 'admin') {
    conditions.push('1 = 1');
  } else if (viewer.role === 'partner') {
    conditions.push(
      '(partner_programs.status = ? OR partner_programs.submitted_by_id = ?)',
    );
    bindings.push('published', viewer.id);
  } else {
    conditions.push('partner_programs.status = ?');
    bindings.push('published');
  }

  const query = filters.query?.trim();
  if (query) {
    conditions.push(
      `(partner_programs.name LIKE ? ESCAPE '\\' OR
        partner_programs.description LIKE ? ESCAPE '\\' OR
        partner_programs.reward_summary LIKE ? ESCAPE '\\')`,
    );
    const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    bindings.push(pattern, pattern, pattern);
  }

  if (
    filters.category &&
    filters.category in partnerProgramCategories
  ) {
    conditions.push('partner_programs.category = ?');
    bindings.push(filters.category);
  }

  const rows = await database
    .prepare(
      `SELECT partner_programs.*,
              submitter.username AS submitted_by,
              reviewer.username AS reviewed_by,
              (SELECT COUNT(*) FROM partner_referral_clicks
               WHERE partner_referral_clicks.program_id = partner_programs.id
                 AND partner_referral_clicks.created_at >= CAST(strftime('%s', 'now') AS INTEGER) - 2592000)
                AS clicks_30d,
              (SELECT COUNT(DISTINCT partner_referral_clicks.user_id)
               FROM partner_referral_clicks
               WHERE partner_referral_clicks.program_id = partner_programs.id
                 AND partner_referral_clicks.created_at >= CAST(strftime('%s', 'now') AS INTEGER) - 2592000)
                AS participants_30d
       FROM partner_programs
       JOIN users AS submitter ON submitter.id = partner_programs.submitted_by_id
       LEFT JOIN users AS reviewer ON reviewer.id = partner_programs.reviewed_by_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE partner_programs.status
           WHEN 'published' THEN 0
           WHEN 'pending' THEN 1
           WHEN 'paused' THEN 2
           ELSE 3
         END,
         partner_programs.updated_at DESC
       LIMIT 250`,
    )
    .bind(...bindings)
    .all<PartnerProgramRow>();

  const stats = await database
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COUNT(DISTINCT category) AS categories,
         (SELECT COUNT(*) FROM partner_referral_clicks
          WHERE created_at >= CAST(strftime('%s', 'now') AS INTEGER) - 2592000)
           AS clicks,
         (SELECT COUNT(DISTINCT user_id) FROM partner_referral_clicks
          WHERE created_at >= CAST(strftime('%s', 'now') AS INTEGER) - 2592000)
           AS participants
       FROM partner_programs
       WHERE status = 'published'`,
    )
    .first<{
      total: number;
      categories: number;
      clicks: number;
      participants: number;
    }>();

  return {
    programs: rows.results.map(mapProgram),
    stats: {
      published: stats?.total || 0,
      categories: stats?.categories || 0,
      clicks30d: stats?.clicks || 0,
      participants30d: stats?.participants || 0,
    },
  };
}

export type PartnerProgramInput = {
  name: string;
  category: PartnerProgramCategory;
  description: string;
  websiteUrl: string;
  referralUrl: string;
  rewardSummary: string;
  payoutTerms: string;
  commercialDisclosure: string;
};

export async function createPartnerProgram(
  actor: CommunityViewer,
  input: PartnerProgramInput,
) {
  if (actor.role !== 'partner' && actor.role !== 'admin') {
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  }
  await ensureCommunitySchema();
  const database = getDatabase();
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(input.name);
  const now = Math.floor(Date.now() / 1000);
  const status = actor.role === 'admin' ? 'published' : 'pending';
  const reviewedById = actor.role === 'admin' ? actor.id : null;
  const reviewedAt = actor.role === 'admin' ? now : null;

  await database
    .prepare(
      `INSERT INTO partner_programs (
         id, submitted_by_id, reviewed_by_id, slug, name, category,
         description, website_url, referral_url, reward_summary, payout_terms,
         commercial_disclosure, status, reviewed_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      actor.id,
      reviewedById,
      slug,
      input.name,
      input.category,
      input.description,
      input.websiteUrl,
      input.referralUrl,
      input.rewardSummary,
      input.payoutTerms,
      input.commercialDisclosure,
      status,
      reviewedAt,
      now,
      now,
    )
    .run();

  await recordCommunityEvent({
    actorUserId: actor.id,
    eventType: 'partner_program.created',
    entityType: 'partner_program',
    entityId: id,
    payload: { status, category: input.category },
  });
  return { ok: true as const, id, slug, status };
}

export async function reviewPartnerProgram(
  actor: CommunityViewer,
  id: string,
  status: 'published' | 'paused' | 'rejected',
  note = '',
) {
  if (actor.role !== 'admin') {
    return { ok: false as const, code: 'ACCESS_DENIED' as const };
  }
  await ensureCommunitySchema();
  const database = getDatabase();
  const existing = await database
    .prepare('SELECT id, status FROM partner_programs WHERE id = ?')
    .bind(id)
    .first<{ id: string; status: string }>();
  if (!existing) return { ok: false as const, code: 'NOT_FOUND' as const };

  const now = Math.floor(Date.now() / 1000);
  await database
    .prepare(
      `UPDATE partner_programs
       SET status = ?, moderation_note = ?, reviewed_by_id = ?,
           reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(status, note || null, actor.id, now, now, id)
    .run();
  await recordCommunityEvent({
    actorUserId: actor.id,
    eventType: 'partner_program.reviewed',
    entityType: 'partner_program',
    entityId: id,
    payload: { previousStatus: existing.status, status, note: note || null },
  });
  return { ok: true as const, status };
}

export async function recordPartnerReferralClick(
  viewer: CommunityViewer,
  slug: string,
) {
  await ensureCommunitySchema();
  const database = getDatabase();
  const program = await database
    .prepare(
      `SELECT id, referral_url
       FROM partner_programs
       WHERE slug = ? AND status = 'published'`,
    )
    .bind(slug)
    .first<{ id: string; referral_url: string }>();
  if (!program) return { ok: false as const, code: 'NOT_FOUND' as const };
  let url: URL;
  try {
    url = new URL(program.referral_url);
  } catch {
    return { ok: false as const, code: 'INVALID_URL' as const };
  }
  if (url.protocol !== 'https:') {
    return { ok: false as const, code: 'INVALID_URL' as const };
  }

  const now = Math.floor(Date.now() / 1000);
  await database
    .prepare(
      `INSERT OR IGNORE INTO partner_referral_clicks (
         id, program_id, user_id, day_bucket, source, created_at
       ) VALUES (?, ?, ?, ?, 'catalog', ?)`,
    )
    .bind(
      crypto.randomUUID(),
      program.id,
      viewer.id,
      Math.floor(now / 86400),
      now,
    )
    .run();
  return { ok: true as const, url: url.toString() };
}
