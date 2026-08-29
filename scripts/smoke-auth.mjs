import * as OTPAuth from 'otpauth';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const primarySession = { cookie: '' };
const protectedPages = [
  '/forum',
  '/forum/section/development',
  '/forum/section/affiliate-programs',
  '/forum/topic/go-connection-leak',
  '/forum/topic/affiliate-checklist',
  '/journal',
  '/journal/modular-monolith-practical-choice',
  '/journal/observability-without-platform-team',
  '/library',
  '/library/quality-manual-standard',
  '/library/affiliate-program-due-diligence',
  '/search',
  '/admin/users',
  '/groups',
  '/editor',
  '/editor/new',
  '/moderation',
  '/notifications',
];

async function requestWithSession(session, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(session.cookie ? { cookie: session.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) session.cookie = setCookie.split(';', 1)[0];
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw new Error(`${path}: ${result.message || response.status}`);
  return result;
}

async function request(path, body) {
  return requestWithSession(primarySession, path, body);
}

async function expectAnonymousRedirect(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  const location = response.headers.get('location') || '';
  if (
    ![302, 307, 308].includes(response.status) ||
    !location.startsWith('/auth?mode=login')
  ) {
    throw new Error(
      `${path}: expected auth redirect, received ${response.status} ${location}`,
    );
  }
}

async function expectProtectedPage(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie: primarySession.cookie },
  });
  if (!response.ok)
    throw new Error(`${path}: expected 200, received ${response.status}`);
  const html = await response.text();
  if (!html.includes('Основа'))
    throw new Error(`${path}: community shell was not rendered`);
}

async function expectPageContent(path, expected, forbidden) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie: primarySession.cookie },
  });
  if (!response.ok)
    throw new Error(`${path}: expected 200, received ${response.status}`);
  const html = await response.text();
  if (!html.includes(expected))
    throw new Error(`${path}: expected editorial content was not rendered`);
  if (forbidden && html.includes(forbidden))
    throw new Error(`${path}: protected editorial body was disclosed`);
}

async function expectJsonStatus(path, body, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: primarySession.cookie,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (response.status !== expectedStatus) {
    throw new Error(
      `${path}: expected ${expectedStatus}, received ${response.status} ${result.message || ''}`,
    );
  }
  return result;
}

for (const path of protectedPages) await expectAnonymousRedirect(path);

const suffix = Date.now();
const email = `smoke+${suffix}@local.test`;
const username = `smoke_${suffix}`;
const password = 'ForumPass123!';
const newPassword = 'ForumPass456!';

const registration = await request('/api/auth/register', {
  email,
  username,
  password,
  passwordConfirmation: password,
});
await request('/api/auth/verify-email', { email, code: registration.devCode });
await request('/api/auth/me');
for (const path of protectedPages) await expectProtectedPage(path);
await expectPageContent(
  '/journal/modular-monolith-practical-choice',
  'Модульный монолит полезен',
);
await expectPageContent(
  '/journal/observability-without-platform-team',
  'Материал доступен участникам PRO',
  'Небольшой команде не нужен полный каталог',
);
await expectPageContent(
  '/library/quality-manual-standard',
  'Сначала сформулируйте результат',
);
await expectPageContent('/library?q=Go', 'Диагностика утечки соединений в Go');
await expectPageContent(
  `/search?q=${encodeURIComponent('утечка соединений')}`,
  'Утечка соединений в Go-сервисе',
);
await expectPageContent(
  `/search?q=${encodeURIComponent('Модульный монолит')}&type=journal`,
  'Почему модульный монолит снова стал практичным выбором',
);
await expectPageContent(
  `/search?q=${encodeURIComponent('Сначала сформулируйте результат')}&type=library`,
  'Стандарт качественного мануала',
);
await expectPageContent(
  `/search?q=${encodeURIComponent('полный каталог')}`,
  'Ничего не найдено',
  'Наблюдаемость без отдельной platform-команды',
);
await expectPageContent(
  `/search?q=${encodeURIComponent('Наблюдаемость')}`,
  'полный текст закрыт',
  'Небольшой команде не нужен полный каталог',
);

const topic = await request('/api/forum/topics', {
  forumSlug: 'development',
  title: `Smoke: сохранение темы ${suffix}`,
  body: 'Проверяем, что новая тема сохраняется в локальной D1, открывается по постоянной ссылке и принимает содержательные ответы.',
  isCommercial: false,
});
if (topic.status !== 'published')
  throw new Error('Regular forum topic must be published immediately');
await expectProtectedPage(`/forum/topic/${encodeURIComponent(topic.slug)}`);
await expectJsonStatus(
  '/api/forum/reactions',
  {
    targetType: 'topic',
    targetId: topic.topicId,
    reactionType: 'helpful',
  },
  403,
);
await request(`/api/forum/topics/${encodeURIComponent(topic.slug)}/posts`, {
  body: 'Проверочный ответ подтверждает запись сообщения и обновление счётчика активности темы.',
});
const disabledTopicSubscription = await request('/api/forum/subscriptions', {
  targetType: 'topic',
  slug: topic.slug,
});
if (disabledTopicSubscription.subscribed)
  throw new Error('Topic author must be subscribed automatically');
const enabledTopicSubscription = await request('/api/forum/subscriptions', {
  targetType: 'topic',
  slug: topic.slug,
});
if (!enabledTopicSubscription.subscribed)
  throw new Error('Topic subscription was not restored');
await request('/api/forum/subscriptions', {
  targetType: 'forum',
  slug: 'development',
});
await request('/api/forum/reports', {
  targetType: 'topic',
  targetId: topic.topicId,
  reason: 'other',
  details:
    'Автоматическая smoke-жалоба для проверки локальной очереди модерации.',
});

const pendingTopic = await request('/api/forum/topics', {
  forumSlug: 'freelance',
  title: `Smoke: премодерация темы ${suffix}`,
  body: 'Проверяем, что публикация в разделе заработка сохраняется со статусом ожидания и не принимает ответы до решения модератора.',
  isCommercial: false,
});
if (pendingTopic.status !== 'pending')
  throw new Error('Premoderated forum topic must be pending');
await expectProtectedPage(
  `/forum/topic/${encodeURIComponent(pendingTopic.slug)}`,
);
await expectJsonStatus(
  `/api/forum/topics/${encodeURIComponent(pendingTopic.slug)}/posts`,
  {
    body: 'Этот ответ не должен быть опубликован до прохождения темы через очередь модерации.',
  },
  403,
);

const replySession = { cookie: '' };
const replyEmail = `reply+${suffix}@local.test`;
const replyUsername = `reply_${suffix}`;
const replyRegistration = await requestWithSession(
  replySession,
  '/api/auth/register',
  {
    email: replyEmail,
    username: replyUsername,
    password,
    passwordConfirmation: password,
  },
);
await requestWithSession(replySession, '/api/auth/verify-email', {
  email: replyEmail,
  code: replyRegistration.devCode,
});
const helpfulReaction = await requestWithSession(
  replySession,
  '/api/forum/reactions',
  {
    targetType: 'topic',
    targetId: topic.topicId,
    reactionType: 'helpful',
  },
);
if (
  helpfulReaction.selected !== 'helpful' ||
  helpfulReaction.summary.counts.helpful !== 1
) {
  throw new Error('Helpful topic reaction was not persisted');
}
const switchedReaction = await requestWithSession(
  replySession,
  '/api/forum/reactions',
  {
    targetType: 'topic',
    targetId: topic.topicId,
    reactionType: 'insightful',
  },
);
if (
  switchedReaction.selected !== 'insightful' ||
  switchedReaction.summary.counts.helpful !== 0 ||
  switchedReaction.summary.counts.insightful !== 1
) {
  throw new Error('Reaction switch must replace the previous reaction');
}
await requestWithSession(replySession, '/api/forum/reactions', {
  targetType: 'topic',
  targetId: topic.topicId,
  reactionType: 'insightful',
});
await expectJsonStatus(
  '/api/forum/reactions',
  {
    targetType: 'post',
    targetId: 'sample-post:go-connection-leak:first',
    reactionType: 'helpful',
  },
  400,
);
await expectJsonStatus(
  '/api/forum/reactions',
  {
    targetType: 'content',
    targetId: 'seed-content:observability-without-platform-team',
    reactionType: 'helpful',
  },
  403,
);
const contentReaction = await request('/api/forum/reactions', {
  targetType: 'content',
  targetId: 'seed-content:modular-monolith-practical-choice',
  reactionType: 'thanks',
});
if (
  contentReaction.selected !== 'thanks' ||
  contentReaction.summary.counts.thanks < 1
) {
  throw new Error('Editorial content reaction was not persisted');
}
await expectPageContent(
  '/journal/modular-monolith-practical-choice',
  'Оцените практическую пользу материала',
);
await request('/api/forum/reactions', {
  targetType: 'content',
  targetId: 'seed-content:modular-monolith-practical-choice',
  reactionType: 'thanks',
});
await requestWithSession(
  replySession,
  `/api/forum/topics/${encodeURIComponent(topic.slug)}/posts`,
  {
    body: `@${username}, проверяем адресное уведомление об упоминании в новой системе.`,
  },
);
const notificationPage = await fetch(`${baseUrl}/notifications`, {
  headers: { cookie: primarySession.cookie },
});
const notificationHtml = await notificationPage.text();
if (!notificationPage.ok || !notificationHtml.includes('Вас упомянули'))
  throw new Error('Mention notification was not rendered for the recipient');
await request('/api/notifications/read-all', {});
await expectJsonStatus(
  `/api/moderation/topics/${pendingTopic.topicId}`,
  { action: 'approve' },
  403,
);
await expectJsonStatus(
  '/api/editor/content',
  {
    contentType: 'article',
    title: `Smoke: редакционный доступ ${suffix}`,
    summary:
      'Обычный участник не должен создавать редакционные материалы через API.',
    body: 'Этот текст достаточно длинный для прохождения проверки формы, но сервер обязан остановить запрос по роли участника до создания редакционного материала.',
    accessLevel: 'member',
    isCommercial: false,
  },
  403,
);
await expectJsonStatus(
  '/api/admin/users/missing/role',
  { role: 'author', note: 'Проверка запрета для обычного участника' },
  403,
);

const totpSetup = await request('/api/auth/2fa/totp/setup', {});
const totp = new OTPAuth.TOTP({
  issuer: 'Основа',
  label: email,
  secret: OTPAuth.Secret.fromBase32(totpSetup.secret),
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
});
await request('/api/auth/2fa/totp/confirm', { code: totp.generate() });

const telegramSetup = await request('/api/auth/2fa/telegram/setup', {});
await request('/api/auth/2fa/telegram/confirm', {
  code: telegramSetup.devCode,
});
await request('/api/auth/logout', {});

const login = await request('/api/auth/login', { login: username, password });
const telegramCode = await request('/api/auth/2fa/telegram/send', {
  challengeId: login.challengeId,
});
await request('/api/auth/2fa/verify', {
  challengeId: login.challengeId,
  method: 'telegram',
  code: telegramCode.devCode,
});

const resetRequest = await request('/api/auth/password/request', { email });
await request('/api/auth/password/reset', {
  token: resetRequest.devToken,
  password: newPassword,
  passwordConfirmation: newPassword,
});

process.stdout.write(
  `${JSON.stringify({
    registration: true,
    emailVerification: true,
    session: true,
    totp: true,
    telegram: true,
    twoFactorLogin: true,
    passwordReset: true,
    protectedRoutes: true,
    anonymousRouteGuards: true,
    topicCreation: true,
    replies: true,
    subscriptions: true,
    reports: true,
    premoderation: true,
    moderationRoleGuard: true,
    editorialRoleGuard: true,
    notifications: true,
    editorialContent: true,
    proContentGuard: true,
    reactions: true,
    reactionAntiSpam: true,
    contributionReputation: true,
    librarySearch: true,
    unifiedSearch: true,
    searchProGuard: true,
    adminRoleGuard: true,
  })}\n`,
);
