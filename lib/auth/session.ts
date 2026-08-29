import { randomToken, hashToken } from '@/lib/auth/crypto';
import { ensureAuthSchema, getDatabase, type AuthUserRow } from '@/lib/auth/database';

export const SESSION_COOKIE = 'osnova_session';
const SESSION_TTL = 60 * 60 * 24 * 30;

function parseCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export function publicUser(user: AuthUserRow) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    emailVerified: Boolean(user.email_verified_at),
    totpEnabled: Boolean(user.totp_enabled),
    telegramEnabled: Boolean(user.telegram_enabled),
    telegramUsername: user.telegram_username,
  };
}

export async function issueSession(userId: string) {
  await ensureAuthSchema();
  const token = randomToken();
  const now = Math.floor(Date.now() / 1000);
  await getDatabase()
    .prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, await hashToken(token), now + SESSION_TTL, now)
    .run();
  return token;
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function getSessionUser(cookieHeader: string | null) {
  await ensureAuthSchema();
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  return getDatabase()
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .bind(await hashToken(token), now)
    .first<AuthUserRow>();
}

export function getRequestUser(request: Request) {
  return getSessionUser(request.headers.get('cookie'));
}

export async function revokeRequestSession(request: Request) {
  const token = parseCookie(request.headers.get('cookie'), SESSION_COOKIE);
  if (!token) return;
  await ensureAuthSchema();
  await getDatabase().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hashToken(token)).run();
}
