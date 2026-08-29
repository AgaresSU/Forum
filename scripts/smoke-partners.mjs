import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const wranglerCli = fileURLToPath(
  new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url),
);
const suffix = Date.now();
const password = 'ForumPass123!';
const memberEmail = `partner-member+${suffix}@local.test`;
const partnerEmail = `partner-submit+${suffix}@local.test`;
const adminEmail = `partner-admin+${suffix}@local.test`;
const memberUsername = `pcm_${suffix}`;
const partnerUsername = `pcp_${suffix}`;
const adminUsername = `pca_${suffix}`;
const programName = `Smoke DevTools ${suffix}`;

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
}

async function api(session, path, body, method = 'POST', expected = 200) {
  const options = {
    headers: {
      'content-type': 'application/json',
      ...(session.cookie ? { cookie: session.cookie } : {}),
    },
    body: JSON.stringify(body),
  };
  const response =
    method === 'PATCH'
      ? await fetch(`${baseUrl}${path}`, { ...options, method: 'PATCH' })
      : await fetch(`${baseUrl}${path}`, { ...options, method: 'POST' });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) session.cookie = setCookie.split(';', 1)[0];
  const result = await response.json();
  if (response.status !== expected) {
    throw new Error(
      `${method} ${path}: expected ${expected}, received ${response.status}: ${JSON.stringify(result)}`,
    );
  }
  if (expected < 400 && !result.ok) {
    throw new Error(`${method} ${path}: ${result.message || 'request failed'}`);
  }
  return result;
}

async function page(session, path, expected = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: session?.cookie ? { cookie: session.cookie } : {},
  });
  const body = await response.text();
  if (response.status !== expected) {
    throw new Error(
      `GET ${path}: expected ${expected}, received ${response.status}`,
    );
  }
  return { response, body };
}

async function register(email, username) {
  const session = { cookie: '' };
  const registration = await api(session, '/api/auth/register', {
    email,
    username,
    password,
    passwordConfirmation: password,
  });
  await api(session, '/api/auth/verify-email', {
    email,
    code: registration.devCode,
  });
  return session;
}

const validProgram = {
  name: programName,
  category: 'devtools',
  description:
    'Изолированная тестовая программа для проверки каталога и серверной модели доступа.',
  websiteUrl: 'https://example.com/product',
  referralUrl: `https://example.com/product?ref=${suffix}`,
  rewardSummary: 'Фиксированная комиссия после подтверждённой оплаты.',
  payoutTerms: 'Выплата после окончания тестового периода и подтверждения операции.',
  commercialDisclosure:
    'Автор карточки получает комиссию после оплаты, цена для пользователя не меняется.',
};

let registered = false;
let programId = '';
try {
  const guestResponse = await fetch(`${baseUrl}/partners`, { redirect: 'manual' });
  if (
    ![302, 307, 308].includes(guestResponse.status) ||
    !(guestResponse.headers.get('location') || '').startsWith('/auth?mode=login')
  ) {
    throw new Error('Guest catalog redirect is missing');
  }

  const memberSession = await register(memberEmail, memberUsername);
  const partnerSession = await register(partnerEmail, partnerUsername);
  const adminSession = await register(adminEmail, adminUsername);
  registered = true;
  executeSql(
    `UPDATE users SET role = 'partner' WHERE email = '${partnerEmail}'; UPDATE users SET role = 'admin' WHERE email = '${adminEmail}';`,
  );

  const initialMemberPage = await page(memberSession, '/partners');
  if (initialMemberPage.body.includes('Добавить партнёрскую программу')) {
    throw new Error('Member can see the partner submission form');
  }
  await api(memberSession, '/api/partners', validProgram, 'POST', 403);
  await api(
    partnerSession,
    '/api/partners',
    { ...validProgram, commercialDisclosure: 'Слишком кратко' },
    'POST',
    400,
  );

  const created = await api(
    partnerSession,
    '/api/partners',
    validProgram,
    'POST',
    201,
  );
  programId = created.id;
  if (created.status !== 'pending') {
    throw new Error('Partner submission bypassed moderation');
  }

  const hiddenPage = await page(memberSession, '/partners');
  if (hiddenPage.body.includes(programName)) {
    throw new Error('Pending program is visible to a member');
  }
  const ownPage = await page(partnerSession, '/partners');
  if (!ownPage.body.includes(programName) || !ownPage.body.includes('На проверке')) {
    throw new Error('Partner cannot see their pending submission');
  }

  await api(
    partnerSession,
    `/api/partners/${programId}`,
    { status: 'published', note: '' },
    'PATCH',
    403,
  );
  await api(
    adminSession,
    `/api/partners/${programId}`,
    { status: 'rejected', note: '' },
    'PATCH',
    400,
  );
  await api(
    adminSession,
    `/api/partners/${programId}`,
    { status: 'published', note: 'Условия и раскрытие проверены' },
    'PATCH',
  );

  const publishedPage = await page(
    memberSession,
    '/partners?q=Smoke&category=devtools',
  );
  if (
    !publishedPage.body.includes(programName) ||
    !publishedPage.body.includes('Реклама · раскрытие выгоды') ||
    !publishedPage.body.includes('Реферальный переход')
  ) {
    throw new Error('Published program is missing required disclosure markers');
  }

  process.stdout.write(
    `${JSON.stringify({ guestClosed: true, roleSubmission: true, disclosureRequired: true, premoderation: true, adminReview: true, referralMarked: true })}\n`,
  );
} finally {
  if (registered) {
    const programFilter = programId ? `entity_id = '${programId}'` : '1 = 0';
    executeSql(
      `DELETE FROM community_events WHERE entity_type = 'partner_program' AND ${programFilter}; DELETE FROM partner_programs WHERE id = '${programId}'; DELETE FROM auth_rate_limits WHERE key LIKE 'partner-program:%' OR key LIKE 'partner-review:%'; DELETE FROM users WHERE email IN ('${memberEmail}', '${partnerEmail}', '${adminEmail}');`,
    );
  }
}
