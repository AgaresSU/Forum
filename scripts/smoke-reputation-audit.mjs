import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const wranglerCli = fileURLToPath(
  new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url),
);
const suffix = Date.now();
const password = 'ForumPass123!';
const authorEmail = `reputation-author+${suffix}@local.test`;
const actorEmail = `reputation-actor+${suffix}@local.test`;
const adminEmail = `reputation-admin+${suffix}@local.test`;
const authorUsername = `rpa_${suffix}`;
const actorUsername = `rpr_${suffix}`;
const adminUsername = `rpm_${suffix}`;

function executeSql(command) {
  const result = spawnSync(
    process.execPath,
    [
      wranglerCli,
      'd1',
      'execute',
      'site-creator-d1',
      '--config',
      'dist/server/wrangler.json',
      '--local',
      '--persist-to',
      '.wrangler/state',
      '--command',
      command,
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
  if (result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || result.stdout);
  }
  return result.stdout;
}

async function post(session, path, body, expected = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(session.cookie ? { cookie: session.cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) session.cookie = setCookie.split(';', 1)[0];
  const result = await response.json();
  if (response.status !== expected) {
    throw new Error(
      `POST ${path}: expected ${expected}, received ${response.status}: ${JSON.stringify(result)}`,
    );
  }
  if (expected < 400 && !result.ok) {
    throw new Error(`${path}: ${result.message || 'request failed'}`);
  }
  return result;
}

async function page(session, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: session.cookie ? { cookie: session.cookie } : {},
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`GET ${path}: expected 200, received ${response.status}`);
  }
  return body;
}

async function register(email, username) {
  const session = { cookie: '' };
  const registration = await post(
    session,
    '/api/auth/register',
    { email, username, password, passwordConfirmation: password },
  );
  await post(session, '/api/auth/verify-email', {
    email,
    code: registration.devCode,
  });
  return session;
}

let topicId = '';
let schemaInitialized = false;
try {
  const authorSession = await register(authorEmail, authorUsername);
  await page(authorSession, '/forum');
  schemaInitialized = true;
  const actorSession = await register(actorEmail, actorUsername);
  const adminSession = await register(adminEmail, adminUsername);
  executeSql(`UPDATE users SET role = 'admin' WHERE email = '${adminEmail}'`);

  const topic = await post(
    authorSession,
    '/api/forum/topics',
    {
      forumSlug: 'development',
      title: `Аудит репутации ${suffix}`,
      body: 'Изолированная публикация проверяет атомарный журнал репутационных событий, дельты баллов и сигналы частого переключения реакций.',
      isCommercial: false,
    },
    201,
  );
  topicId = topic.topicId;

  for (const reactionType of ['helpful', 'insightful', 'insightful', 'thanks']) {
    await post(actorSession, '/api/forum/reactions', {
      targetType: 'topic',
      targetId: topicId,
      reactionType,
    });
  }

  const auditCheck = executeSql(
    `SELECT COUNT(*) AS event_count, SUM(score_delta) AS net_delta,
            GROUP_CONCAT(action || ':' || score_delta, ',') AS changes
     FROM reputation_events
     WHERE actor_username = '${actorUsername}' AND target_id = '${topicId}'`,
  );
  if (
    !auditCheck.includes('"event_count": 4') ||
    !auditCheck.includes('"net_delta": 1') ||
    !auditCheck.includes('added:2') ||
    !auditCheck.includes('replaced:1') ||
    !auditCheck.includes('removed:-3') ||
    !auditCheck.includes('added:1')
  ) {
    throw new Error(`Unexpected reputation audit trail: ${auditCheck}`);
  }

  const memberView = await page(actorSession, '/admin/reputation');
  if (!memberView.includes('доступен только администраторам')) {
    throw new Error('Member reputation audit guard is missing');
  }
  const adminView = await page(
    adminSession,
    `/admin/reputation?q=${encodeURIComponent(actorUsername)}&risk=churn`,
  );
  if (
    !adminView.includes(actorUsername) ||
    !adminView.includes(authorUsername) ||
    !adminView.includes('Частые переключения')
  ) {
    throw new Error('Admin risk-filtered audit view is incomplete');
  }

  process.stdout.write(
    `${JSON.stringify({ appendOnlyEvents: true, exactDeltas: true, atomicReactionAudit: true, adminGuard: true, churnSignal: true })}\n`,
  );
} finally {
  executeSql(
    `${schemaInitialized ? `DELETE FROM reputation_events WHERE actor_username = '${actorUsername}' OR recipient_username = '${authorUsername}';` : ''}
     DELETE FROM reactions WHERE user_id IN (SELECT id FROM users WHERE email IN ('${authorEmail}', '${actorEmail}', '${adminEmail}'));
     DELETE FROM community_events WHERE actor_user_id IN (SELECT id FROM users WHERE email IN ('${authorEmail}', '${actorEmail}', '${adminEmail}'));
     DELETE FROM topics WHERE id = '${topicId}';
     DELETE FROM auth_rate_limits WHERE key IN (
       SELECT 'forum-topic:' || id FROM users WHERE email IN ('${authorEmail}', '${actorEmail}', '${adminEmail}')
       UNION SELECT 'reaction:' || id FROM users WHERE email IN ('${authorEmail}', '${actorEmail}', '${adminEmail}')
       UNION SELECT 'verify-email:' || id FROM users WHERE email IN ('${authorEmail}', '${actorEmail}', '${adminEmail}')
     );
     DELETE FROM security_events WHERE user_id IN (SELECT id FROM users WHERE email IN ('${authorEmail}', '${actorEmail}', '${adminEmail}'));
     DELETE FROM users WHERE email IN ('${authorEmail}', '${actorEmail}', '${adminEmail}');`,
  );
}
