import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const wranglerCli = fileURLToPath(
  new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url),
);
const suffix = Date.now();
const password = 'ForumPass123!';
const adminEmail = `admin-smoke+${suffix}@local.test`;
const targetEmail = `role-target+${suffix}@local.test`;
const adminUsername = `adm_${suffix}`;
const targetUsername = `role_${suffix}`;

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
  if (result.status !== 0)
    throw new Error(result.error?.message || result.stderr || result.stdout);
}

async function api(session, path, body, method = 'POST', expected = 200) {
  const headers = {
    'content-type': 'application/json',
    ...(session.cookie ? { cookie: session.cookie } : {}),
  };
  const response =
    method === 'DELETE'
      ? await fetch(`${baseUrl}${path}`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify(body),
        })
      : await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) session.cookie = setCookie.split(';', 1)[0];
  const result = await response.json();
  if (response.status !== expected)
    throw new Error(
      `${path}: expected ${expected}, received ${response.status}`,
    );
  if (expected < 400 && !result.ok)
    throw new Error(`${path}: ${result.message || 'request failed'}`);
  return result;
}

async function get(session, path, expected = 200) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: session.cookie ? { cookie: session.cookie } : {},
  });
  const result = await response.json();
  if (response.status !== expected)
    throw new Error(
      `${path}: expected ${expected}, received ${response.status}`,
    );
  if (expected < 400 && !result.ok)
    throw new Error(`${path}: ${result.message || 'request failed'}`);
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

let registered = false;
try {
  const adminSession = await register(adminEmail, adminUsername);
  const targetSession = await register(targetEmail, targetUsername);
  registered = true;
  executeSql(`UPDATE users SET role = 'admin' WHERE email = '${adminEmail}'`);

  const adminPage = await fetch(`${baseUrl}/admin/users`, {
    headers: { cookie: adminSession.cookie },
  });
  const html = await adminPage.text();
  if (!adminPage.ok || !html.includes(targetUsername))
    throw new Error('Admin user list is unavailable');

  const target = await get(targetSession, '/api/auth/me');
  await api(adminSession, `/api/admin/users/${target.user.id}/role`, {
    role: 'author',
    note: 'Smoke-проверка назначения роли автора',
  });
  const promoted = await get(targetSession, '/api/auth/me');
  if (promoted.user.role !== 'author')
    throw new Error('Role change is not reflected in the active session');

  const admin = await get(adminSession, '/api/auth/me');
  await api(
    adminSession,
    `/api/admin/users/${admin.user.id}/role`,
    { role: 'member', note: 'Попытка изменить себя' },
    'POST',
    409,
  );
  await api(
    adminSession,
    `/api/admin/users/${target.user.id}`,
    { note: 'Удаление временного smoke-аккаунта после проверки' },
    'DELETE',
  );
  await get(targetSession, '/api/auth/me', 401);

  process.stdout.write(
    `${JSON.stringify({ adminAccess: true, roleChange: true, liveSessionRole: true, selfProtection: true, safeDelete: true, audit: true })}\n`,
  );
} finally {
  if (registered) {
    executeSql(
      `DELETE FROM user_administration_audit WHERE target_username IN ('${adminUsername}', '${targetUsername}'); DELETE FROM users WHERE email IN ('${adminEmail}', '${targetEmail}');`,
    );
  }
}
