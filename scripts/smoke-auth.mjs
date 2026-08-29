import * as OTPAuth from 'otpauth';

const baseUrl = process.env.AUTH_SMOKE_BASE_URL || 'http://127.0.0.1:3000';
let cookie = '';
const protectedPages = [
  '/forum',
  '/forum/section/development',
  '/forum/section/affiliate-programs',
  '/forum/topic/go-connection-leak',
  '/forum/topic/affiliate-checklist',
  '/journal',
  '/library',
  '/groups',
];

async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';', 1)[0];
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`${path}: ${result.message || response.status}`);
  return result;
}

async function expectAnonymousRedirect(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  const location = response.headers.get('location') || '';
  if (![302, 307, 308].includes(response.status) || !location.startsWith('/auth?mode=login')) {
    throw new Error(`${path}: expected auth redirect, received ${response.status} ${location}`);
  }
}

async function expectProtectedPage(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { cookie } });
  if (!response.ok) throw new Error(`${path}: expected 200, received ${response.status}`);
  const html = await response.text();
  if (!html.includes('Основа')) throw new Error(`${path}: community shell was not rendered`);
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
await request('/api/auth/2fa/telegram/confirm', { code: telegramSetup.devCode });
await request('/api/auth/logout', {});

const login = await request('/api/auth/login', { login: username, password });
const telegramCode = await request('/api/auth/2fa/telegram/send', { challengeId: login.challengeId });
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
  })}\n`,
);
