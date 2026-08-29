import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const wranglerCli = fileURLToPath(
  new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url),
);
const suffix = Date.now();
const password = 'ForumPass123!';
const authorEmail = `editorial-author+${suffix}@local.test`;
const managerEmail = `editorial-manager+${suffix}@local.test`;

function executeLocalSql(command) {
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
      `Local D1 command failed: ${result.error?.message || result.stderr || result.stdout || result.status}`,
    );
  }
}

function changeRole(email, role) {
  executeLocalSql(`UPDATE users SET role = '${role}' WHERE email = '${email}'`);
}

async function api(session, path, body) {
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
  if (!response.ok || !result.ok) {
    throw new Error(`${path}: ${result.message || response.status}`);
  }
  return result;
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

async function page(session, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie: session.cookie },
  });
  const html = await response.text();
  if (!response.ok)
    throw new Error(`${path}: expected 200, received ${response.status}`);
  return html;
}

const originalBody =
  'Первая проверочная редакция описывает законный и воспроизводимый процесс. В ней есть условия, последовательность действий, ожидаемый результат и безопасный способ отменить изменения.';
const reviewedBody =
  'Вторая проверочная редакция уточняет законный и воспроизводимый процесс. Она добавляет критерии готовности, ограничения, проверку результата и понятный безопасный откат изменений.';
const draftBody =
  'Неопубликованный черновик изменяет рабочий текст, но не должен быть виден читателям до нового решения редакции. Это отдельная проверка стабильности публичной версии.';
const baseFields = {
  title: `Проверка редакционного процесса ${suffix}`,
  summary:
    'Сквозной локальный тест создания, проверки, публикации и отката материала.',
  accessLevel: 'member',
  isCommercial: false,
  discussionSlug: 'go-connection-leak',
};

let authorRegistered = false;
let managerRegistered = false;
let contentId = '';
try {
  const authorSession = await register(authorEmail, `ed_author_${suffix}`);
  authorRegistered = true;
  const managerSession = await register(managerEmail, `ed_manager_${suffix}`);
  managerRegistered = true;
  changeRole(authorEmail, 'author');
  changeRole(managerEmail, 'moderator');

  const created = await api(authorSession, '/api/editor/content', {
    contentType: 'article',
    ...baseFields,
    body: originalBody,
    changeNote: 'Создан материал для сквозной проверки.',
  });
  contentId = created.id;
  const editorPath = `/editor/${encodeURIComponent(created.id)}`;
  if (!(await page(authorSession, editorPath)).includes(baseFields.title)) {
    throw new Error('Author cannot open the created material');
  }

  await api(authorSession, `/api/editor/content/${created.id}`, {
    action: 'save',
    ...baseFields,
    body: reviewedBody,
    changeNote: 'Уточнены критерии готовности и безопасный откат.',
  });
  await api(authorSession, `/api/editor/content/${created.id}`, {
    action: 'submit',
    ...baseFields,
    body: reviewedBody,
    changeNote: 'Редакция готова к проверке.',
  });
  await api(managerSession, `/api/editor/content/${created.id}`, {
    action: 'publish',
    ...baseFields,
    body: reviewedBody,
    changeNote: 'Проверено редакцией и опубликовано.',
  });

  const publicPath = `/journal/${encodeURIComponent(created.slug)}`;
  const publishedHtml = await page(authorSession, publicPath);
  if (!publishedHtml.includes(reviewedBody)) {
    throw new Error('Published revision is not visible to a member');
  }

  await api(authorSession, `/api/editor/content/${created.id}`, {
    action: 'save',
    ...baseFields,
    body: draftBody,
    changeNote: 'Проверка изоляции нового черновика.',
  });
  const stableHtml = await page(authorSession, publicPath);
  if (!stableHtml.includes(reviewedBody) || stableHtml.includes(draftBody)) {
    throw new Error('Draft changed the public revision before publication');
  }

  await api(authorSession, `/api/editor/content/${created.id}`, {
    action: 'submit',
    ...baseFields,
    body: draftBody,
    changeNote: 'Черновик отправлен на повторную проверку.',
  });
  await api(managerSession, `/api/editor/content/${created.id}`, {
    action: 'reject',
    ...baseFields,
    body: draftBody,
    changeNote: 'Вернуть автору: требуется дополнительная проверка результата.',
  });
  const afterRejectHtml = await page(authorSession, publicPath);
  if (
    !afterRejectHtml.includes(reviewedBody) ||
    afterRejectHtml.includes(draftBody)
  ) {
    throw new Error('Rejected revision changed the public material');
  }

  const restored = await api(
    authorSession,
    `/api/editor/content/${created.id}/restore`,
    { revision: 1 },
  );
  if (restored.workflowStatus !== 'draft') {
    throw new Error('Restored revision must become a draft');
  }
  await api(managerSession, `/api/editor/content/${created.id}`, {
    action: 'publish',
    ...baseFields,
    body: originalBody,
    changeNote: 'Восстановлена и опубликована первая редакция.',
  });
  const restoredHtml = await page(authorSession, publicPath);
  if (
    !restoredHtml.includes(originalBody) ||
    restoredHtml.includes(reviewedBody)
  ) {
    throw new Error('Restored revision was not published');
  }

  process.stdout.write(
    `${JSON.stringify({
      authorRole: true,
      managerRole: true,
      draft: true,
      submit: true,
      publish: true,
      publicRevisionIsolation: true,
      reject: true,
      restore: true,
      linkedDiscussion: true,
    })}\n`,
  );
} finally {
  const cleanup = [];
  if (contentId)
    cleanup.push(`DELETE FROM content_records WHERE id = '${contentId}'`);
  if (authorRegistered || managerRegistered) {
    cleanup.push(
      `DELETE FROM users WHERE email IN ('${authorEmail}', '${managerEmail}')`,
    );
  }
  if (cleanup.length) executeLocalSql(`${cleanup.join('; ')};`);
}
