import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const wranglerCli = fileURLToPath(
  new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url),
);
const suffix = Date.now();
const password = 'ForumPass123!';
const roles = [
  'member',
  'author',
  'expert',
  'pro',
  'partner',
  'moderator',
  'admin',
];
const editorialRoles = new Set(['author', 'expert', 'moderator', 'admin']);
const proRoles = new Set(['pro', 'partner', 'moderator', 'admin']);
const moderationRoles = new Set(['moderator', 'admin']);
const accounts = roles.map((role) => ({
  role,
  email: `matrix-${role}+${suffix}@local.test`,
  username: `mx_${role.slice(0, 6)}_${String(suffix).slice(-8)}`,
  session: { cookie: '' },
}));

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
    throw new Error(
      result.error?.message || result.stderr || result.stdout || 'D1 failed',
    );
  }
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
      `${path}: expected ${expected}, received ${response.status} (${result.message || 'no message'})`,
    );
  }
  if (expected < 400 && !result.ok)
    throw new Error(`${path}: ${result.message || 'request failed'}`);
  return result;
}

async function page(session, path, expectedText, forbiddenText) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: session.cookie ? { cookie: session.cookie } : {},
  });
  const html = await response.text();
  if (!response.ok)
    throw new Error(`${path}: expected 200, received ${response.status}`);
  if (expectedText && !html.includes(expectedText))
    throw new Error(`${path}: expected «${expectedText}»`);
  if (forbiddenText && html.includes(forbiddenText))
    throw new Error(`${path}: disclosed forbidden text «${forbiddenText}»`);
  return html;
}

async function register(account) {
  const registration = await post(account.session, '/api/auth/register', {
    email: account.email,
    username: account.username,
    password,
    passwordConfirmation: password,
  });
  await post(account.session, '/api/auth/verify-email', {
    email: account.email,
    code: registration.devCode,
  });
}

let registered = false;
try {
  const anonymous = await fetch(`${baseUrl}/forum`, { redirect: 'manual' });
  if (
    ![302, 307, 308].includes(anonymous.status) ||
    !(anonymous.headers.get('location') || '').startsWith('/auth?mode=login')
  ) {
    throw new Error('Guest forum access must redirect to sign-in');
  }

  for (const account of accounts) await register(account);
  registered = true;
  for (const account of accounts) {
    executeSql(
      `UPDATE users SET role = '${account.role}' WHERE email = '${account.email}'`,
    );
  }

  for (const account of accounts) {
    const { role, session } = account;
    await page(session, '/forum', 'Форумы «Основы»');

    if (proRoles.has(role)) {
      await page(
        session,
        '/journal/observability-without-platform-team',
        'Небольшой команде не нужен полный каталог',
      );
    } else {
      await page(
        session,
        '/journal/observability-without-platform-team',
        'Материал доступен участникам PRO',
        'Небольшой команде не нужен полный каталог',
      );
    }

    await page(
      session,
      '/editor',
      editorialRoles.has(role)
        ? 'Материалы и версии'
        : 'Редактор доступен авторам',
    );
    await page(
      session,
      '/moderation',
      moderationRoles.has(role)
        ? 'Очередь модерации'
        : 'Раздел доступен модераторам',
    );
    await page(
      session,
      '/admin/users',
      role === 'admin' ? 'Пользователи и роли' : 'Раздел администратора',
    );

    await post(
      session,
      '/api/moderation/topics/missing',
      { action: 'approve' },
      moderationRoles.has(role) ? 404 : 403,
    );
    await post(
      session,
      '/api/admin/users/missing/role',
      { role: 'author', note: 'Проверка полной матрицы ролей' },
      role === 'admin' ? 404 : 403,
    );

    await post(
      session,
      '/api/editor/content',
      {
        contentType: 'article',
        title: `Матрица роли ${role} ${suffix}`,
        summary:
          'Изолированный материал для проверки серверного редакционного доступа.',
        body: 'Этот тестовый материал содержит достаточно текста для прохождения валидации и проверяет, что редакционный API доступен только авторским и служебным ролям сообщества.',
        accessLevel: 'member',
        isCommercial: false,
      },
      editorialRoles.has(role) ? 201 : 403,
    );

    const freeTopic = await post(
      session,
      '/api/forum/topics',
      {
        forumSlug: 'development',
        title: `Матрица доступа ${role} ${suffix}`,
        body: 'Проверяем базовое право каждой зарегистрированной роли создавать содержательную тему в бесплатном разделе сообщества и получать постоянную ссылку.',
        isCommercial: false,
      },
      201,
    );
    if (freeTopic.status !== 'published')
      throw new Error(`${role}: free topic must be published`);

    await post(
      session,
      '/api/forum/topics',
      {
        forumSlug: 'affiliate-programs',
        title: `PRO-матрица ${role} ${suffix}`,
        body: 'Проверяем серверный уровень доступа к разделу партнёрских программ без раскрытия закрытых тем и без обхода проверки через прямой API-запрос.',
        isCommercial: false,
      },
      proRoles.has(role) ? 201 : 403,
    );

    const reactionStatus = proRoles.has(role) ? 200 : 403;
    await post(
      session,
      '/api/forum/reactions',
      {
        targetType: 'content',
        targetId: 'seed-content:observability-without-platform-team',
        reactionType: 'helpful',
      },
      reactionStatus,
    );
    if (reactionStatus === 200) {
      await post(session, '/api/forum/reactions', {
        targetType: 'content',
        targetId: 'seed-content:observability-without-platform-team',
        reactionType: 'helpful',
      });
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      guest: true,
      member: true,
      author: true,
      expert: true,
      pro: true,
      partner: true,
      moderator: true,
      admin: true,
      editorialMatrix: true,
      proMatrix: true,
      moderationMatrix: true,
      administrationMatrix: true,
      reactionMatrix: true,
    })}\n`,
  );
} finally {
  if (registered) {
    const emails = accounts.map((account) => `'${account.email}'`).join(', ');
    executeSql(
      `DELETE FROM reactions WHERE user_id IN (SELECT id FROM users WHERE email IN (${emails}));
       DELETE FROM community_events WHERE actor_user_id IN (SELECT id FROM users WHERE email IN (${emails}));
       DELETE FROM security_events WHERE user_id IN (SELECT id FROM users WHERE email IN (${emails}));
       DELETE FROM content_records WHERE author_id IN (SELECT id FROM users WHERE email IN (${emails}));
       DELETE FROM topics WHERE author_id IN (SELECT id FROM users WHERE email IN (${emails}));
       DELETE FROM auth_rate_limits WHERE key IN (
         SELECT 'forum-topic:' || id FROM users WHERE email IN (${emails})
         UNION SELECT 'reaction:' || id FROM users WHERE email IN (${emails})
         UNION SELECT 'editorial-create:' || id FROM users WHERE email IN (${emails})
         UNION SELECT 'admin-users:' || id FROM users WHERE email IN (${emails})
         UNION SELECT 'verify-email:' || id FROM users WHERE email IN (${emails})
       );
       DELETE FROM users WHERE email IN (${emails});`,
    );
  }
}
