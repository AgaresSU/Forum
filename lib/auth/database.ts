import { env } from 'cloudflare:workers';

import { hashToken } from '@/lib/auth/crypto';

export type AuthUserRow = {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: string;
  email_verified_at: number | null;
  totp_secret_encrypted: string | null;
  totp_enabled: number;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_enabled: number;
  created_at: number;
  updated_at: number;
};

export type AuthTokenRow = {
  id: string;
  user_id: string;
  purpose: string;
  token_hash: string;
  metadata_json: string | null;
  expires_at: number;
  consumed_at: number | null;
  created_at: number;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    email_verified_at INTEGER,
    totp_secret_encrypted TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    telegram_chat_id TEXT,
    telegram_username TEXT,
    telegram_enabled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)',
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at)',
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    metadata_json TEXT,
    expires_at INTEGER NOT NULL,
    consumed_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_tokens_hash_purpose ON auth_tokens(token_hash, purpose)',
  'CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_purpose ON auth_tokens(user_id, purpose, expires_at)',
  `CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    metadata_json TEXT,
    created_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_security_events_user_created ON security_events(user_id, created_at)',
  `CREATE TABLE IF NOT EXISTS auth_rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    window_started_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
];

let schemaReady: Promise<void> | undefined;

export function getDatabase() {
  return (env as unknown as { DB: D1Database }).DB;
}

export function ensureAuthSchema() {
  schemaReady ??= (async () => {
    const database = getDatabase();
    await database.batch(schemaStatements.map((statement) => database.prepare(statement)));
    await database.prepare('PRAGMA optimize').run();
  })();
  return schemaReady;
}

export async function createUser(input: { email: string; username: string; passwordHash: string }) {
  await ensureAuthSchema();
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await getDatabase()
    .prepare('INSERT INTO users (id, email, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, input.email, input.username, input.passwordHash, 'member', now, now)
    .run();
  return getUserById(id);
}

export async function getUserById(id: string) {
  await ensureAuthSchema();
  return getDatabase().prepare('SELECT * FROM users WHERE id = ?').bind(id).first<AuthUserRow>();
}

export async function getUserByEmail(email: string) {
  await ensureAuthSchema();
  return getDatabase().prepare('SELECT * FROM users WHERE email = ?').bind(email).first<AuthUserRow>();
}

export async function getUserByLogin(login: string) {
  await ensureAuthSchema();
  const normalized = login.trim().toLowerCase();
  return getDatabase().prepare('SELECT * FROM users WHERE email = ? OR username = ?').bind(normalized, normalized).first<AuthUserRow>();
}

export async function setEmailVerified(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  await getDatabase().prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?').bind(now, now, userId).run();
}

export async function setPassword(userId: string, passwordHash: string) {
  const now = Math.floor(Date.now() / 1000);
  await getDatabase().batch([
    getDatabase().prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(passwordHash, now, userId),
    getDatabase().prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
  ]);
}

export async function setPendingTotp(userId: string, encryptedSecret: string) {
  const now = Math.floor(Date.now() / 1000);
  await getDatabase().prepare('UPDATE users SET totp_secret_encrypted = ?, totp_enabled = 0, updated_at = ? WHERE id = ?').bind(encryptedSecret, now, userId).run();
}

export async function enableTotp(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  await getDatabase().prepare('UPDATE users SET totp_enabled = 1, updated_at = ? WHERE id = ?').bind(now, userId).run();
}

export async function setTelegram(userId: string, chatId: string, username: string | null) {
  const now = Math.floor(Date.now() / 1000);
  await getDatabase().prepare('UPDATE users SET telegram_chat_id = ?, telegram_username = ?, telegram_enabled = 1, updated_at = ? WHERE id = ?').bind(chatId, username, now, userId).run();
}

export async function createAuthToken(input: {
  userId: string;
  purpose: string;
  token: string;
  ttlSeconds: number;
  metadata?: Record<string, unknown>;
}) {
  await ensureAuthSchema();
  const now = Math.floor(Date.now() / 1000);
  await getDatabase()
    .prepare('INSERT INTO auth_tokens (id, user_id, purpose, token_hash, metadata_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(
      crypto.randomUUID(),
      input.userId,
      input.purpose,
      await hashToken(input.token),
      input.metadata ? JSON.stringify(input.metadata) : null,
      now + input.ttlSeconds,
      now,
    )
    .run();
}

export async function findAuthToken(purpose: string, token: string, userId?: string) {
  await ensureAuthSchema();
  const now = Math.floor(Date.now() / 1000);
  const tokenHash = await hashToken(token);
  const query = userId
    ? 'SELECT * FROM auth_tokens WHERE purpose = ? AND token_hash = ? AND user_id = ? AND consumed_at IS NULL AND expires_at > ?'
    : 'SELECT * FROM auth_tokens WHERE purpose = ? AND token_hash = ? AND consumed_at IS NULL AND expires_at > ?';
  const statement = getDatabase().prepare(query);
  return userId
    ? statement.bind(purpose, tokenHash, userId, now).first<AuthTokenRow>()
    : statement.bind(purpose, tokenHash, now).first<AuthTokenRow>();
}

export async function consumeAuthToken(id: string) {
  const now = Math.floor(Date.now() / 1000);
  await getDatabase().prepare('UPDATE auth_tokens SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL').bind(now, id).run();
}

export async function deleteTokens(userId: string, purpose: string) {
  await ensureAuthSchema();
  await getDatabase().prepare('DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?').bind(userId, purpose).run();
}

export async function recordSecurityEvent(userId: string | null, eventType: string, metadata?: Record<string, unknown>) {
  await ensureAuthSchema();
  await getDatabase()
    .prepare('INSERT INTO security_events (id, user_id, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, eventType, metadata ? JSON.stringify(metadata) : null, Math.floor(Date.now() / 1000))
    .run();
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  await ensureAuthSchema();
  const now = Math.floor(Date.now() / 1000);
  const existing = await getDatabase()
    .prepare('SELECT count, window_started_at FROM auth_rate_limits WHERE key = ? AND expires_at > ?')
    .bind(key, now)
    .first<{ count: number; window_started_at: number }>();
  if (!existing || existing.window_started_at <= now - windowSeconds) {
    await getDatabase()
      .prepare('INSERT INTO auth_rate_limits (key, count, window_started_at, expires_at) VALUES (?, 1, ?, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_started_at = excluded.window_started_at, expires_at = excluded.expires_at')
      .bind(key, now, now + windowSeconds)
      .run();
    return true;
  }
  if (existing.count >= limit) return false;
  await getDatabase().prepare('UPDATE auth_rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
  return true;
}
