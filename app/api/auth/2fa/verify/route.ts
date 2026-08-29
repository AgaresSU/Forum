import { decryptSecret, hashToken, verifyTotp } from '@/lib/auth/crypto';
import { consumeAuthToken, enforceRateLimit, findAuthToken, getUserById, recordSecurityEvent } from '@/lib/auth/database';
import { json } from '@/lib/auth/http';
import { issueSession, sessionCookie } from '@/lib/auth/session';
import { z } from 'zod';

const schema = z.object({
  challengeId: z.string().min(20),
  method: z.enum(['totp', 'telegram']),
  code: z.string().trim().regex(/^\d{6}$/u),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, message: 'Проверьте код подтверждения' }, 400);
  const challenge = await findAuthToken('login_challenge', parsed.data.challengeId);
  if (!challenge) return json({ ok: false, message: 'Сессия входа истекла' }, 400);
  if (!(await enforceRateLimit(`two-factor:${challenge.user_id}`, 8, 10 * 60))) {
    return json({ ok: false, message: 'Слишком много попыток. Начните вход заново позже.' }, 429);
  }
  const user = await getUserById(challenge.user_id);
  if (!user) return json({ ok: false, message: 'Сессия входа недействительна' }, 400);

  let valid = false;
  let telegramTokenId: string | null = null;
  if (parsed.data.method === 'totp' && user.totp_enabled && user.totp_secret_encrypted) {
    valid = await verifyTotp(await decryptSecret(user.totp_secret_encrypted), parsed.data.code);
  }
  if (parsed.data.method === 'telegram' && user.telegram_enabled) {
    const purpose = `telegram_login:${await hashToken(parsed.data.challengeId)}`;
    const telegramToken = await findAuthToken(purpose, parsed.data.code, user.id);
    valid = Boolean(telegramToken);
    telegramTokenId = telegramToken?.id || null;
  }
  if (!valid) {
    await recordSecurityEvent(user.id, 'two_factor_failed', { method: parsed.data.method });
    return json({ ok: false, message: 'Код не подошёл или истёк' }, 400);
  }

  await consumeAuthToken(challenge.id);
  if (telegramTokenId) await consumeAuthToken(telegramTokenId);
  const session = await issueSession(user.id);
  await recordSecurityEvent(user.id, 'two_factor_succeeded', { method: parsed.data.method });
  return json({ ok: true, next: '/forum' }, { headers: { 'set-cookie': sessionCookie(session) } });
}
