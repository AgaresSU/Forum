import { consumeAuthToken, enforceRateLimit, findAuthToken, getUserByEmail, recordSecurityEvent, setEmailVerified } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { verificationSchema } from '@/lib/auth/schemas';
import { issueSession, sessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  const parsed = verificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const user = await getUserByEmail(parsed.data.email);
  if (!user) return json({ ok: false, message: 'Код недействителен или истёк' }, 400);
  if (user.email_verified_at) return json({ ok: true, alreadyVerified: true });
  if (!(await enforceRateLimit(`verify-email:${user.id}`, 8, 15 * 60))) {
    return json({ ok: false, message: 'Слишком много попыток. Запросите новый код позже.' }, 429);
  }

  const token = await findAuthToken('verify_email', parsed.data.code, user.id);
  if (!token) return json({ ok: false, message: 'Код недействителен или истёк' }, 400);
  await consumeAuthToken(token.id);
  await setEmailVerified(user.id);
  await recordSecurityEvent(user.id, 'email_verified');
  const session = await issueSession(user.id);
  return json({ ok: true, next: '/forum' }, { headers: { 'set-cookie': sessionCookie(session) } });
}
