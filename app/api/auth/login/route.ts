import { hashToken, randomToken, verifyPassword } from '@/lib/auth/crypto';
import { createAuthToken, enforceRateLimit, getUserByLogin, recordSecurityEvent } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { loginSchema } from '@/lib/auth/schemas';
import { issueSession, publicUser, sessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`login:${await hashToken(parsed.data.login.toLowerCase())}`, 10, 10 * 60))) {
    return json({ ok: false, message: 'Слишком много попыток. Попробуйте через 10 минут.' }, 429);
  }
  const user = await getUserByLogin(parsed.data.login);
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    await recordSecurityEvent(user?.id || null, 'login_failed');
    return json({ ok: false, message: 'Неверный логин или пароль' }, 401);
  }
  if (!user.email_verified_at) {
    return json({ ok: false, code: 'EMAIL_NOT_VERIFIED', email: user.email, message: 'Сначала подтвердите почту' }, 403);
  }

  const methods = [
    ...(user.totp_enabled ? ['totp' as const] : []),
    ...(user.telegram_enabled ? ['telegram' as const] : []),
  ];
  if (methods.length) {
    const challengeId = randomToken();
    await createAuthToken({ userId: user.id, purpose: 'login_challenge', token: challengeId, ttlSeconds: 10 * 60, metadata: { methods } });
    return json({ ok: true, requiresTwoFactor: true, challengeId, methods });
  }

  const session = await issueSession(user.id);
  await recordSecurityEvent(user.id, 'login_succeeded');
  return json({ ok: true, user: publicUser(user) }, { headers: { 'set-cookie': sessionCookie(session) } });
}
